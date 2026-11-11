import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { checkSkills } from '../scripts/check-skills.mjs';
import { applyPlan, collectSnapshot, loadGarden, nextAction, objectDigest, recordReceipt, recordReport, repositoryDigest, resumePlan, reviewBundle, safePath, sha256, snapshotDiff, validateGarden, validateSnapshot, withLock } from '../scripts/lib/garden.mjs';

const config = { schemaVersion: 1, repository: 'shu-matsukubo/matsu-second-brain', ref: 'main', knowledgePath: 'knowledge' };
const hex = (character, count = 40) => character.repeat(count);
function snapshot(tree = 'a', entries) {
  const commit = hex('c');
  return { schemaVersion: 1, repository: config.repository, commit, tree: hex(tree), entries: entries ?? [{ id: 'k-one', type: 'principle', title: 'Use fewer rules', path: 'knowledge/principles/k-one.md', blob: hex('1'), digest: hex('2', 64), url: `https://github.com/${config.repository}/blob/${commit}/knowledge/principles/k-one.md` }] };
}
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'garden-test-'));
  fs.mkdirSync(path.join(root, 'config'));
  fs.writeFileSync(path.join(root, 'config/garden.json'), JSON.stringify(config));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
const source = s => { const { id, path: p, blob, digest } = s.entries[0]; return { id, path: p, blob, digest }; };
function plan(s = snapshot(), kind = 'ingest', operations = [{ path: 'skills/simple/SKILL.md', expectedDigest: null, content: '# Simple\n' }]) {
  return { schemaVersion: 1, kind, rationale: 'Apply the source principle after semantic review.', snapshot: s, operations, provenance: operations.filter(o => o.content !== null).map(o => ({ path: o.path, sources: [source(s)] })) };
}
const prevention = { kind: 'review', reference: 'docs/review.md#complexity', reason: 'Meaning requires judgment.' };
const report = { title: 'Revisit scope', detail: 'Inspect whether this skill adds rules.', scope: 'skills/simple', prevention };

test('ingest, report, full review, then skip; local state changes do not wake exploration', t => {
  const root = fixture(t), s = snapshot();
  assert.equal(nextAction(loadGarden(root).state, s).kind, 'ingest');
  applyPlan(root, plan(s));
  assert.equal(nextAction(loadGarden(root).state, s).kind, 'review');
  const added = recordReport(root, report);
  assert.equal(recordReport(root, report).duplicate, true);
  assert.equal(nextAction(loadGarden(root).state, s).kind, 'report');
  const fix = { ...plan(s, 'report', []), reportId: added.fingerprint, resolution: { outcome: 'Kept the scope with a stated review check.', prevention } };
  applyPlan(root, fix);
  applyPlan(root, { ...plan(s, 'review', []), reviewComplete: true });
  assert.equal(nextAction(loadGarden(root).state, s).kind, 'skip');
  assert.equal(validateGarden(root).reports, 1);
  assert.equal(applyPlan(root, fix).alreadyApplied, true);
});

test('upstream change outranks open report and can use a newer fixed commit', t => {
  const root = fixture(t), s = snapshot();
  applyPlan(root, plan(s)); recordReport(root, report);
  const changed = snapshot('b');
  changed.entries[0].blob = hex('3');
  const next = nextAction(loadGarden(root).state, changed);
  assert.equal(next.kind, 'ingest');
  assert.deepEqual(next.affectedSkills, ['skills/simple/SKILL.md']);
  assert.throws(() => applyPlan(root, plan(changed, 'review', [])), /priority/);
  assert.throws(() => applyPlan(root, plan(changed, 'ingest', [])), /Stale/);
  applyPlan(root, { ...plan(changed, 'ingest', []), provenance: [{ path: 'skills/simple/SKILL.md', sources: [source(changed)] }] });
  assert.equal(nextAction(loadGarden(root).state, changed).kind, 'report');
});

test('one ingest handles the entire changed, added, demoted and deleted knowledge batch', t => {
  const root = fixture(t);
  const entry = (id, type = 'principle', blob = '1') => {
    const p = `knowledge/${type === 'principle' ? 'principles' : 'ideas'}/${id}.md`;
    return { id, type, title: id, path: p, blob: hex(blob), digest: hex(blob, 64), url: `https://github.com/${config.repository}/blob/${hex('c')}/${p}` };
  };
  const reference = ({ id, path: p, blob, digest }) => ({ id, path: p, blob, digest });
  const before = snapshot('a', [entry('k-alpha'), entry('k-beta'), entry('k-retired')]);
  const skillPath = id => `skills/${id}/SKILL.md`;
  const initial = {
    ...plan(before),
    operations: before.entries.map(e => ({ path: skillPath(e.id), expectedDigest: null, content: `# ${e.id}\n` })),
    provenance: before.entries.map(e => ({ path: skillPath(e.id), sources: [reference(e)] }))
  };
  applyPlan(root, initial);
  const after = snapshot('b', [entry('k-alpha', 'principle', '2'), entry('k-beta', 'idea', '3'), entry('k-gamma', 'principle', '4')]);
  const next = nextAction(loadGarden(root).state, after);
  assert.equal(next.kind, 'ingest');
  assert.deepEqual(Object.fromEntries(next.changes.map(c => [c.id, c.kind])), {
    'k-alpha': 'changed', 'k-beta': 'demoted', 'k-gamma': 'added', 'k-retired': 'deleted'
  });
  assert.deepEqual(new Set(next.affectedSkills), new Set(before.entries.map(e => skillPath(e.id))));
  applyPlan(root, {
    ...plan(after),
    operations: [
      { path: skillPath('k-alpha'), expectedDigest: sha256('# k-alpha\n'), content: '# Updated alpha\n' },
      { path: skillPath('k-beta'), expectedDigest: sha256('# k-beta\n'), content: null },
      { path: skillPath('k-retired'), expectedDigest: sha256('# k-retired\n'), content: null },
      { path: skillPath('k-gamma'), expectedDigest: null, content: '# New gamma\n' }
    ],
    provenance: after.entries.filter(e => e.type === 'principle').map(e => ({ path: skillPath(e.id), sources: [reference(e)] }))
  });
  const state = loadGarden(root).state;
  assert.deepEqual(state.snapshot, after);
  assert.deepEqual(Object.keys(state.managed).sort(), [skillPath('k-alpha'), skillPath('k-gamma')]);
  assert.equal(fs.readFileSync(path.join(root, skillPath('k-alpha')), 'utf8'), '# Updated alpha\n');
  assert.equal(fs.readFileSync(path.join(root, skillPath('k-gamma')), 'utf8'), '# New gamma\n');
  assert.equal(fs.existsSync(path.join(root, skillPath('k-beta'))), false);
  assert.equal(fs.existsSync(path.join(root, skillPath('k-retired'))), false);
  assert.equal(nextAction(state, after).kind, 'review');
  assert.equal(validateGarden(root).valid, true);
});

test('a full review that finds work must run again after the reports are resolved', t => {
  const root = fixture(t), s = snapshot(); applyPlan(root, plan(s));
  applyPlan(root, { ...plan(s, 'review', []), reports: [report], reviewComplete: true });
  const state = loadGarden(root).state;
  assert.equal(state.reviewedTree, null);
  const { reportId } = nextAction(state, s);
  applyPlan(root, { ...plan(s, 'report', []), reportId, resolution: { outcome: 'The reported issue is fixed.', prevention } });
  assert.equal(nextAction(loadGarden(root).state, s).kind, 'review');
  applyPlan(root, { ...plan(s, 'review', []), reviewComplete: true });
  assert.equal(nextAction(loadGarden(root).state, s).kind, 'skip');
});

test('a review containing only a resolved duplicate cannot imply an issue-free evaluation', t => {
  const root = fixture(t), s = snapshot(); applyPlan(root, plan(s));
  const { fingerprint } = recordReport(root, report);
  applyPlan(root, { ...plan(s, 'report', []), reportId: fingerprint, resolution: { outcome: 'Already corrected.', prevention } });
  applyPlan(root, { ...plan(s, 'review', []), reports: [report] });
  assert.equal(loadGarden(root).state.reports.length, 1);
  assert.equal(nextAction(loadGarden(root).state, s).kind, 'review');
  applyPlan(root, { ...plan(s, 'review', []), reviewComplete: true });
  assert.equal(nextAction(loadGarden(root).state, s).kind, 'skip');
});

test('a new finding invalidates an earlier issue-free evaluation', t => {
  const root = fixture(t), s = snapshot(); applyPlan(root, plan(s));
  applyPlan(root, { ...plan(s, 'review', []), runId: 'first-evaluation', reviewComplete: true });
  assert.equal(nextAction(loadGarden(root).state, s).kind, 'skip');
  const { fingerprint } = recordReport(root, report);
  assert.equal(loadGarden(root).state.reviewedTree, null);
  applyPlan(root, { ...plan(s, 'report', []), reportId: fingerprint, resolution: { outcome: 'Fixed a later finding.', prevention } });
  assert.equal(nextAction(loadGarden(root).state, s).kind, 'review');
  applyPlan(root, { ...plan(s, 'review', []), runId: 'second-evaluation', reviewComplete: true });
  assert.equal(nextAction(loadGarden(root).state, s).kind, 'skip');
});

test('principle deletion and demotion cannot leave stale generated files', t => {
  const root = fixture(t), s = snapshot(); applyPlan(root, plan(s));
  const demoted = snapshot('b'); demoted.entries[0].type = 'idea';
  assert.equal(snapshotDiff(s, demoted)[0].kind, 'demoted');
  assert.throws(() => applyPlan(root, plan(demoted, 'ingest', [])), /non-principle/);
  const deleted = snapshot('d', []);
  assert.equal(snapshotDiff(s, deleted)[0].kind, 'deleted');
  assert.throws(() => applyPlan(root, plan(deleted, 'ingest', [])), /missing/);
  applyPlan(root, plan(deleted, 'ingest', [{ path: 'skills/simple/SKILL.md', expectedDigest: sha256('# Simple\n'), content: null }]));
  assert.equal(fs.existsSync(path.join(root, 'skills/simple/SKILL.md')), false);
  assert.equal(validateGarden(root).managedFiles, 0);
});

test('idea cannot be used as principle evidence', t => {
  const root = fixture(t), s = snapshot(); s.entries[0].type = 'idea';
  assert.throws(() => applyPlan(root, plan(s)), /non-principle/);
  assert.equal(fs.existsSync(path.join(root, 'skills/simple/SKILL.md')), false);
});

test('unfinished journal resumes before upstream changes; interrupted writes are idempotent', t => {
  const root = fixture(t), p = plan();
  assert.throws(() => applyPlan(root, p, { afterOperation: () => { throw new Error('power loss'); } }), /power loss/);
  assert.equal(nextAction(loadGarden(root).state, snapshot('b'), loadGarden(root).journal).kind, 'resume');
  assert.throws(() => applyPlan(root, { ...p, rationale: 'Different plan' }), /Different plan/);
  assert.equal(resumePlan(root).applied, true);
  assert.equal(applyPlan(root, p).alreadyApplied, true);
  assert.equal(loadGarden(root).state.applied.length, 1);
  assert.equal(validateGarden(root).valid, true);
});

test('failure after state write resumes cleanup without double apply', t => {
  const root = fixture(t);
  assert.throws(() => applyPlan(root, plan(), { afterState: () => { throw new Error('stop'); } }), /stop/);
  resumePlan(root);
  assert.equal(loadGarden(root).state.applied.length, 1);
});

test('resume preflights every operation before writing and rejects file or state conflicts', t => {
  const root = fixture(t), p = plan();
  p.operations.push({ path: 'skills/simple/reference.md', expectedDigest: null, content: 'reference' });
  p.provenance.push({ path: 'skills/simple/reference.md', sources: [source(p.snapshot)] });
  assert.throws(() => applyPlan(root, p, { afterJournal: () => { throw new Error('stop'); } }), /stop/);
  fs.mkdirSync(path.join(root, 'skills/simple'), { recursive: true });
  fs.writeFileSync(path.join(root, 'skills/simple/reference.md'), 'conflicting edit');
  assert.throws(() => resumePlan(root), /Resume conflict/);
  assert.equal(fs.existsSync(path.join(root, 'skills/simple/SKILL.md')), false);
  fs.unlinkSync(path.join(root, 'skills/simple/reference.md'));
  fs.writeFileSync(path.join(root, 'state/garden.json'), JSON.stringify({ ...loadGarden(root).state, reviewedTree: 'unrelated' }));
  assert.throws(() => resumePlan(root), /State changed/);
});

test('expected digest guards manual edits and all managed files', t => {
  const root = fixture(t), s = snapshot(); applyPlan(root, plan(s));
  fs.writeFileSync(path.join(root, 'skills/simple/SKILL.md'), 'manual change');
  assert.throws(() => validateGarden(root), /conflict/);
  assert.throws(() => applyPlan(root, { ...plan(s, 'review', []), reviewComplete: true }), /conflict/);
});

test('managed boundary rejects traversal, backslashes, reserved paths and case aliases', t => {
  const root = fixture(t);
  for (const p of ['skills/../escape', 'skills/x/../../escape', '/skills/x', 'skills\\x\\SKILL.md', 'skills/x/C:foo', 'skills/x/CON.md', 'skills/x/a.']) assert.throws(() => safePath(root, p));
  const p = plan(); p.operations[0].path = 'README.md';
  assert.throws(() => applyPlan(root, p), /skills files/);
  const q = plan(); q.operations.push({ path: 'skills/SIMPLE/SKILL.md', content: '# alias', expectedDigest: null });
  assert.throws(() => applyPlan(root, q), /unique/);
});

test('symlink cannot redirect writes outside the garden', t => {
  const root = fixture(t), outside = fixture(t);
  try { fs.symlinkSync(outside, path.join(root, 'skills'), 'junction'); }
  catch (error) { if (error.code === 'EPERM') return t.skip('Host cannot create junction'); throw error; }
  assert.throws(() => applyPlan(root, plan()), /Symlink/);
  assert.equal(fs.existsSync(path.join(outside, 'simple/SKILL.md')), false);
});

test('run lock excludes concurrent mutation, releases on failure, and never steals a stale lock', t => {
  const root = fixture(t);
  assert.throws(() => withLock(root, () => withLock(root, () => {})), /Run lock/);
  assert.equal(fs.existsSync(path.join(root, 'state/run.lock')), false);
  assert.throws(() => withLock(root, () => { throw new Error('fail'); }), /fail/);
  fs.writeFileSync(path.join(root, 'state/run.lock'), '{"pid":0}');
  assert.throws(() => withLock(root, () => {}), /Run lock/);
});

test('report resolution requires outcome and concrete prevention; duplicate resolved findings stay deduplicated', t => {
  const root = fixture(t), s = snapshot(); applyPlan(root, plan(s));
  assert.throws(() => recordReport(root, { ...report, prevention: null }), /prevention/);
  const { fingerprint } = recordReport(root, report);
  const p = { ...plan(s, 'report', []), reportId: fingerprint };
  assert.throws(() => applyPlan(root, p), /outcome/);
  p.resolution = { outcome: 'Fixed', prevention: { kind: 'test', reference: 'tests/garden.test.mjs', reason: 'Regression assertion.' } };
  applyPlan(root, p);
  assert.equal(recordReport(root, report).duplicate, true);
  assert.equal(loadGarden(root).state.reports.length, 1);
});

test('evidenced local recurrence reopens a report on the same source tree and preserves history', t => {
  const root = fixture(t), s = snapshot(); applyPlan(root, plan(s));
  const {fingerprint} = recordReport(root, report);
  applyPlan(root, {...plan(s, 'report', []), reportId:fingerprint, resolution:{outcome:'Original correction',prevention}});
  assert.equal(recordReport(root, report).duplicate, true);
  assert.equal(recordReport(root, {...report,recurrence:{reference:'scripts/policies.mjs',reason:'A local maintenance change reintroduced the same failure without upstream changes.'}}).reopened, true);
  const item=loadGarden(root).state.reports[0];
  assert.equal(item.status, 'open');
  assert.equal(item.history[0].outcome, 'Original correction');
  assert.equal(item.history[0].resolvedTree, s.tree);
  assert.equal(nextAction(loadGarden(root).state, s).kind, 'report');
  assert.equal(validateGarden(root).valid, true);
});

test('snapshot validates fixed URLs, unique ids, and same-tree metadata consistency', t => {
  const root = fixture(t), s = snapshot(); applyPlan(root, plan(s));
  const bad = structuredClone(s); bad.entries[0].url = `https://github.com/${config.repository}/blob/main/x`;
  assert.throws(() => validateSnapshot(bad, config), /fixed commit/);
  const duplicate = structuredClone(s); duplicate.entries.push(duplicate.entries[0]);
  assert.throws(() => validateSnapshot(duplicate, config), /Duplicate/);
  const badType = structuredClone(s); badType.entries[0].type = 'instruction';
  assert.throws(() => validateSnapshot(badType, config), /fact\/principle\/idea/);
  const inconsistent = structuredClone(s); inconsistent.entries[0].digest = hex('7', 64);
  assert.throws(() => nextAction(loadGarden(root).state, inconsistent), /inconsistent/);
  assert.throws(() => applyPlan(root, { ...plan(inconsistent, 'review', []), reviewComplete: true }), /inconsistent/);
});

function apiFixture(body = '---\nid: k-one\ntype: principle\ntitle: "Use fewer rules"\n---\nBody\n') {
  const content = Buffer.from(body);
  const blob = crypto.createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex');
  const calls = [];
  const api = endpoint => {
    calls.push(endpoint);
    if (endpoint.includes('/commits/')) return { sha: hex('c'), commit: { tree: { sha: hex('d') } } };
    if (endpoint.includes('/git/trees/')) return { sha: hex('d'), truncated: false, tree: [{ path: 'knowledge', type: 'tree', sha: hex('a') }, { path: 'knowledge/principles/k-one.md', type: 'blob', mode: '100644', sha: blob }] };
    if (endpoint.includes('/git/blobs/')) return { encoding: 'base64', content: content.toString('base64') };
    throw new Error('unexpected endpoint');
  };
  return { api, calls };
}

test('fixed commit snapshot verifies Git blob hashes and reuses unchanged metadata without body reads', () => {
  const { api, calls } = apiFixture();
  const first = collectSnapshot(config, null, api);
  assert.equal(first.entries[0].id, 'k-one');
  assert.equal(calls.length, 3);
  calls.length = 0;
  assert.deepEqual(collectSnapshot(config, first, api), first);
  assert.equal(calls.length, 2);
  assert.ok(calls[1].includes(hex('d')));
});

test('snapshot reads JSON object frontmatter used by upstream principles', () => {
  const body = '---\n{\n  "id": "k-cfb0bb408a84ca5f",\n  "title": "Review by consequence",\n  "type": "principle",\n  "tags": ["review"],\n  "updated": "2026-11-06"\n}\n---\n本文は従来どおり保持する。\n';
  const { api } = apiFixture(body);
  const actual = collectSnapshot(config, null, api);
  assert.equal(actual.entries[0].id, 'k-cfb0bb408a84ca5f');
  assert.equal(actual.entries[0].type, 'principle');
  assert.equal(actual.entries[0].title, 'Review by consequence');
  assert.equal(actual.entries[0].digest, sha256(body));
});

test('invalid JSON or nonstring JSON metadata fails explicitly', () => {
  for (const frontmatter of ['{"id":broken}', '{"id":1,"type":"principle","title":"Title"}']) {
    const { api } = apiFixture(`---\n${frontmatter}\n---\nBody\n`);
    assert.throws(() => collectSnapshot(config, null, api));
  }
});

test('network errors, truncated trees, missing knowledge and corrupt blobs fail instead of becoming empty snapshots', () => {
  assert.throws(() => collectSnapshot(config, null, () => { throw new Error('HTTP 503'); }), /503/);
  const { api } = apiFixture();
  assert.throws(() => collectSnapshot(config, null, e => e.includes('/git/trees/') ? { sha: hex('d'), truncated: true, tree: [] } : api(e)), /Incomplete/);
  assert.throws(() => collectSnapshot(config, null, e => e.includes('/git/trees/') ? { sha: hex('d'), truncated: false, tree: [] } : api(e)), /missing/);
  assert.throws(() => collectSnapshot(config, null, e => e.includes('/git/blobs/') ? { encoding: 'base64', content: Buffer.from('wrong').toString('base64') } : api(e)), /hash mismatch/);
});

test('review receipt covers snapshot, reports, skills and code and invalidates after any publishable edit', t => {
  const root = fixture(t); applyPlan(root, plan());
  const first = repositoryDigest(root).digest;
  const receipt = { schemaVersion: 1, digest: first, result: 'pass', independent: true, reviewer: 'separate run', evidence: 'review-id-1', reviewedAt: '2026-11-07T00:00:00Z', model: 'current capable model', reasoning: 'high' };
  assert.equal(recordReceipt(root, receipt).valid, true);
  assert.equal(repositoryDigest(root).digest, first);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'state/review-receipt.json'))).reasoning, 'high');
  recordReport(root, report);
  assert.notEqual(repositoryDigest(root).digest, first);
  assert.throws(() => recordReceipt(root, receipt, true), /match/);
  const current = { ...receipt, digest: repositoryDigest(root).digest, independent: false };
  assert.throws(() => recordReceipt(root, current), /independent/);
});

test('CLI errors produce machine-readable nonzero exits', t => {
  const root = fixture(t);
  const result = spawnSync(process.execPath, [path.resolve('scripts/garden.mjs'), 'next', '--root', root], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(JSON.parse(result.stderr).error, /snapshot/);
  assert.equal(fs.existsSync(path.join(root, 'state/run.lock')), false);
});

test('resolved finding on a newer knowledge tree reopens with evidence and keeps the prior resolution', t => {
  const root = fixture(t), s = snapshot(); applyPlan(root, plan(s));
  const { fingerprint } = recordReport(root, report);
  applyPlan(root, { ...plan(s, 'report', []), reportId: fingerprint, resolution: { outcome: 'Original correction', prevention } });
  const changed = snapshot('b');
  applyPlan(root, plan(changed, 'ingest', []));
  assert.throws(() => recordReport(root, report), /recurrence/);
  assert.equal(recordReport(root, { ...report, recurrence: { reference: changed.entries[0].url, reason: 'The changed knowledge tree exposes the same failure again.' } }).reopened, true);
  const item = loadGarden(root).state.reports[0];
  assert.equal(item.status, 'open');
  assert.equal(item.history.length, 1);
  assert.equal(item.history[0].outcome, 'Original correction');
  assert.equal(item.history[0].resolvedTree, s.tree);
  assert.equal(nextAction(loadGarden(root).state, changed).kind, 'report');
  assert.equal(validateGarden(root).valid, true);
});

test('journal target-state corruption is detected before resume writes', t => {
  const root = fixture(t);
  assert.throws(() => applyPlan(root, plan(), { afterJournal: () => { throw new Error('stop'); } }), /stop/);
  const filename = path.join(root, 'state/journal.json');
  const journal = JSON.parse(fs.readFileSync(filename));
  journal.targetState.reviewedTree = 'corrupt';
  fs.writeFileSync(filename, JSON.stringify(journal));
  assert.throws(() => resumePlan(root), /disagree/);
  assert.equal(fs.existsSync(path.join(root, 'skills/simple/SKILL.md')), false);
});

test('CLI next resumes without fetching a new snapshot; snapshot output cannot overwrite state', t => {
  const root = fixture(t);
  assert.throws(() => applyPlan(root, plan(), { afterJournal: () => { throw new Error('stop'); } }), /stop/);
  const run = (...args) => spawnSync(process.execPath, [path.resolve('scripts/garden.mjs'), ...args, '--root', root], { encoding: 'utf8' });
  const next = run('next');
  assert.equal(next.status, 0);
  assert.equal(JSON.parse(next.stdout).kind, 'resume');
  const badOutput = run('snapshot', '--output', path.join(root, 'state/garden.json'));
  assert.equal(badOutput.status, 1);
  assert.match(JSON.parse(badOutput.stderr).error, /garden-cache/);
  assert.equal(fs.existsSync(path.join(root, 'state/garden.json')), false);
});

test('crashes after atomic temp writes leave only excluded cache files and recover to the clean digest', t => {
  const baseline = fixture(t);
  const p = plan(snapshot(), 'ingest', [{ path: 'skills/simple/SKILL.md', expectedDigest: null, content: '---\nname: simple\ndescription: Use fewer rules.\n---\n# Simple\n' }]);
  applyPlan(baseline, p);
  const cleanDigest = repositoryDigest(baseline);
  assert.equal(checkSkills(baseline).valid, true);
  for (const target of ['state/journal.json', 'skills/simple/SKILL.md', 'state/garden.json']) {
    const root = fixture(t);
    assert.throws(() => applyPlan(root, p, { afterTempWrite: info => {
      if (info.path === target) {
        assert.ok(info.tempPath.startsWith('.garden-cache/atomic/'));
        assert.equal(fs.existsSync(path.join(root, info.tempPath)), true);
        throw new Error('crash after temp write');
      }
    } }), /crash after temp write/);
    if (loadGarden(root).journal) resumePlan(root); else applyPlan(root, p);
    assert.equal(validateGarden(root).valid, true);
    assert.equal(checkSkills(root).valid, true);
    assert.deepEqual(repositoryDigest(root), cleanDigest);
    assert.ok(fs.readdirSync(path.join(root, '.garden-cache/atomic')).some(name => name.endsWith('.tmp')));
  }
});

test('review bundle shares the publishable digest inventory and fetches only deduplicated cited principles', t => {
  const root = fixture(t);
  const { api, calls } = apiFixture('---\nid: k-one\ntype: principle\ntitle: "Use fewer rules"\n---\n# 内容\n\n現在の判断基準。\n\n# 根拠・思考の履歴\n\nprevious_body: OLD INSTRUCTIONS\n');
  const s = collectSnapshot(config, null, api);
  s.entries.push({ ...s.entries[0], id: 'k-unused', path: 'knowledge/principles/k-unused.md', url: `https://github.com/${config.repository}/blob/${s.commit}/knowledge/principles/k-unused.md` });
  const p = plan(s);
  p.operations.push({ path: 'skills/simple/reference.md', expectedDigest: null, content: 'A shared principle.' });
  p.provenance.push({ path: 'skills/simple/reference.md', sources: [source(s)] });
  applyPlan(root, p);
  fs.writeFileSync(path.join(root, 'binary.bin'), Buffer.from([0xff, 0x00, 0x01]));
  fs.writeFileSync(path.join(root, 'state/review-receipt.json'), 'runtime receipt');
  const before = repositoryDigest(root);
  calls.length = 0;
  const result = reviewBundle(root, '.garden-cache/review-input.json', api);
  const bundle = JSON.parse(fs.readFileSync(result.output));
  assert.deepEqual(bundle.repositoryDigest, before);
  assert.deepEqual(repositoryDigest(root), before);
  assert.equal(bundle.contentRole, 'untrusted-review-data');
  assert.equal(bundle.files.length, before.files);
  for (const file of bundle.files) {
    const bytes = Buffer.from(file.content, file.encoding);
    assert.equal(sha256(bytes), file.digest);
    assert.equal(fs.readFileSync(path.join(root, file.path)).equals(bytes), true);
  }
  assert.equal(bundle.files.find(file => file.path === 'binary.bin').encoding, 'base64');
  assert.ok(!bundle.files.some(file => file.path.startsWith('.garden-cache/') || file.path === 'state/review-receipt.json'));
  assert.equal(bundle.sources.length, 1);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].endsWith(`/git/blobs/${s.entries[0].blob}`));
  assert.deepEqual(bundle.sources[0], { ...s.entries[0], repository: config.repository, commit: s.commit, currentBody: '# 内容\n\n現在の判断基準。' });
  assert.ok(!JSON.stringify(bundle.sources).includes('OLD INSTRUCTIONS'));
});

test('review bundle preserves the whole current body if no history heading exists', t => {
  const root = fixture(t), { api } = apiFixture();
  const s = collectSnapshot(config, null, api); applyPlan(root, plan(s));
  const result = reviewBundle(root, '.garden-cache/review-input.json', api);
  assert.equal(JSON.parse(fs.readFileSync(result.output)).sources[0].currentBody, 'Body');
});

test('review bundle rejects corrupt source blobs, source digests, metadata, and network failures without writing a bundle', t => {
  const cases = [
    { api: () => ({ encoding: 'base64', content: Buffer.from('corrupt').toString('base64') }), error: /Blob hash mismatch/ },
    { mutate: s => { s.entries[0].digest = hex('9', 64); }, error: /Source digest mismatch/ },
    { mutate: s => { s.entries[0].id = 'wrong-id'; }, error: /Source metadata mismatch/ },
    { api: () => { throw new Error('HTTP 503'); }, error: /HTTP 503/ },
  ];
  for (const item of cases) {
    const root = fixture(t), { api } = apiFixture();
    const s = collectSnapshot(config, null, api); item.mutate?.(s); applyPlan(root, plan(s));
    const before = repositoryDigest(root);
    assert.throws(() => reviewBundle(root, '.garden-cache/review-input.json', item.api ?? api), item.error);
    assert.equal(fs.existsSync(path.join(root, '.garden-cache/review-input.json')), false);
    assert.deepEqual(repositoryDigest(root), before);
  }
});

test('review bundle detects repository edits during source capture and restricts output to cache', t => {
  const root = fixture(t), { api } = apiFixture();
  const s = collectSnapshot(config, null, api); applyPlan(root, plan(s));
  for (const output of ['state/garden.json', '../escape.json', '.garden-cache/../state/garden.json']) {
    assert.throws(() => reviewBundle(root, output, api));
  }
  assert.throws(() => reviewBundle(root, '.garden-cache/review-input.json', endpoint => {
    fs.writeFileSync(path.join(root, 'README.md'), 'Concurrent edit');
    return api(endpoint);
  }), /Repository changed/);
  assert.equal(fs.existsSync(path.join(root, '.garden-cache/review-input.json')), false);
});

test('review-bundle CLI returns nonzero and releases the lock when source retrieval fails', t => {
  const root = fixture(t), { api } = apiFixture();
  const s = collectSnapshot(config, null, api); applyPlan(root, plan(s));
  const result = spawnSync(process.execPath, [path.resolve('scripts/garden.mjs'), 'review-bundle', '--root', root, '--output', path.join(root, '.garden-cache/review-input.json')], { encoding: 'utf8', env: { ...process.env, PATH: root } });
  assert.equal(result.status, 1);
  assert.match(JSON.parse(result.stderr).error, /gh|ENOENT/);
  assert.equal(fs.existsSync(path.join(root, '.garden-cache/review-input.json')), false);
  assert.equal(fs.existsSync(path.join(root, 'state/run.lock')), false);
});
