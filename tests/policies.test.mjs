import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { policyStatus, recordAssessment, requireAssessment } from '../scripts/policies.mjs';
import { applyPlan, loadGarden, resumePlan, sha256 } from '../scripts/lib/garden.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'garden-policies-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const put = (p, content) => { fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true }); fs.writeFileSync(path.join(root, p), content); };
  put('config/skill-policy.json', JSON.stringify({ schemaVersion: 1, policySkills: ['skills/design-policy', 'skills/writing-policy'] }));
  for (const name of ['design-policy', 'writing-policy', 'example']) put(`skills/${name}/SKILL.md`, `# ${name}\n`);
  put('.agents/skills/maintain/SKILL.md', '# Maintain\n');
  put('scripts/maintain.mjs', '// original\n');
  put('config/garden.json', JSON.stringify({schemaVersion:1, repository:'owner/knowledge', ref:'main', knowledgePath:'knowledge'}));
  const assess = () => {
    const s = policyStatus(root);
    return {schemaVersion:1,policyDigest:s.policyDigest,scopeDigest:s.scopeDigest,evaluations:s.targets.map(target => ({...target,outcome:'unchanged',reason:'The current scope and execution boundary already meet the policy.'}))};
  };
  return { root, put, assess };
}

test('policy edits invalidate every skill, policy itself and maintenance even while upstream sleeps', t => {
  const { root, put, assess } = fixture(t);
  assert.equal(recordAssessment(root, assess()).valid, true);
  put('skills/design-policy/references/verbs.md', '# Changed reference\n');
  const status = policyStatus(root);
  assert.equal(status.pending.length, 5);
  assert.ok(status.pending.some(t => t.path === '@maintenance'));
  assert.throws(() => requireAssessment(root), /assessment required/);
  const cli = spawnSync(process.execPath, [path.resolve('scripts/garden.mjs'), 'next', '--root', root], {encoding:'utf8'});
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(JSON.parse(cli.stdout).kind, 'policy');
});

test('individual changes require reevaluation without rewriting unrelated skill bytes', t => {
  const { root, put, assess } = fixture(t);
  recordAssessment(root, assess());
  const untouched = fs.readFileSync(path.join(root, 'skills/design-policy/SKILL.md'));
  put('skills/example/SKILL.md', '# Changed example\n');
  assert.deepEqual(policyStatus(root).pending.map(t => t.path), ['skills/example']);
  assert.equal(recordAssessment(root, assess()).valid, true);
  assert.deepEqual(fs.readFileSync(path.join(root, 'skills/design-policy/SKILL.md')), untouched);
  put('scripts/maintain.mjs', '// self improvement\n');
  assert.deepEqual(policyStatus(root).pending.map(t => t.path), ['@maintenance']);
});

test('new and retired skills invalidate the full target inventory', t => {
  const { root, put, assess } = fixture(t);
  recordAssessment(root, assess());
  put('skills/another/SKILL.md', '# New\n');
  assert.equal(policyStatus(root).pending.length, 6);
  recordAssessment(root, assess());
  fs.unlinkSync(path.join(root, 'skills/another/SKILL.md'));
  assert.equal(policyStatus(root).pending.length, 5);
});

test('stale, missing, duplicate and unexplained assessments cannot satisfy the gate', t => {
  const { root, put, assess } = fixture(t);
  for (const mutate of [a => { a.policyDigest = 'old'; }, a => {a.scopeDigest='old';}, a => { a.evaluations.pop(); }, a => { a.evaluations[0] = a.evaluations[1]; }, a => { a.evaluations[0].digest='old'; }, a => { a.evaluations[0].reason=' '; }]) {
    const input = assess(); mutate(input);
    assert.throws(() => recordAssessment(root, input));
  }
  const before = assess(); put('scripts/maintain.mjs', '// changed during evaluation\n');
  assert.throws(() => recordAssessment(root, before), /stale/);
  put('state/journal.json', '{}');
  assert.throws(() => recordAssessment(root, assess()), /journal/);
});

test('journal recovery outranks policy reevaluation without requiring network or snapshot', t => {
  const { root, put } = fixture(t);
  put('state/journal.json', JSON.stringify({planDigest:'pending',plan:{kind:'policy'}}));
  const cli = spawnSync(process.execPath, [path.resolve('scripts/garden.mjs'), 'next', '--root', root], {encoding:'utf8'});
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(JSON.parse(cli.stdout).kind, 'resume');
});

test('policy plans preserve source snapshot and reports and recover partial writes', t => {
  const { root, put } = fixture(t);
  const commit = 'a'.repeat(40);
  const source = {id:'k-example',type:'principle',title:'Example',path:'knowledge/principles/example.md',blob:'b'.repeat(40),digest:'c'.repeat(64),url:`https://github.com/owner/knowledge/blob/${commit}/knowledge/principles/example.md`};
  const snapshot = {schemaVersion:1,repository:'owner/knowledge',commit,tree:'d'.repeat(40),entries:[source]};
  const {id,path:sourcePath,blob,digest} = source;
  const original = '# example\n';
  const state = {schemaVersion:1,snapshot,managed:{'skills/example/SKILL.md':{digest:sha256(original),sources:[{id,path:sourcePath,blob,digest}]}},reports:[{status:'open',fingerprint:'keep'}],reviewedTree:snapshot.tree,applied:[]};
  put('state/garden.json', JSON.stringify(state));
  const plan = {schemaVersion:1,kind:'policy',rationale:'Apply current design policy without unrelated source/report work.',snapshot,operations:[{path:'skills/example/SKILL.md',expectedDigest:sha256(original),content:'# Revised example\n'}],provenance:[],reports:[]};
  assert.throws(() => applyPlan(root, {...plan,snapshot:{...snapshot,commit:'e'.repeat(40),entries:[{...source,url:source.url.replace(commit,'e'.repeat(40))}]}}), /preserve/);
  assert.throws(() => applyPlan(root, {...plan,resolution:{outcome:'unrelated'}}), /cannot resolve/);
  assert.throws(() => applyPlan(root, {...plan,operations:[{path:'skills/design-policy/SKILL.md',expectedDigest:sha256('# design-policy\n'),content:'# Changed\n'}]}), /Git history/);
  assert.throws(() => applyPlan(root, plan, {afterOperation:() => {throw new Error('simulated interruption');}}), /interruption/);
  assert.equal(resumePlan(root).applied, true);
  const after = loadGarden(root).state;
  assert.deepEqual(after.snapshot, snapshot);
  assert.deepEqual(after.reports, state.reports);
  assert.equal(after.reviewedTree, null);
  assert.equal(after.managed['skills/example/SKILL.md'].digest, sha256('# Revised example\n'));
});

function seeded(t) {
  const f=fixture(t), commit='a'.repeat(40);
  const source={id:'k-example',type:'principle',title:'Example',path:'knowledge/principles/example.md',blob:'b'.repeat(40),digest:'c'.repeat(64),url:`https://github.com/owner/knowledge/blob/${commit}/knowledge/principles/example.md`};
  const snapshot={schemaVersion:1,repository:'owner/knowledge',commit,tree:'d'.repeat(40),entries:[source]};
  const {id,path:p,blob,digest}=source;
  f.put('state/garden.json',JSON.stringify({schemaVersion:1,snapshot,managed:{'skills/example/SKILL.md':{digest:sha256('# example\n'),sources:[{id,path:p,blob,digest}]}},reports:[],reviewedTree:null,applied:[]}));
  return {...f,snapshot};
}

test('restoring assessed bytes cannot invalidate recovery of an interrupted policy journal', t => {
  const {root,assess,snapshot}=seeded(t);
  recordAssessment(root,assess());
  const change={schemaVersion:1,kind:'review',rationale:'Evaluate source and update a generated skill.',snapshot,operations:[{path:'skills/example/SKILL.md',expectedDigest:sha256('# example\n'),content:'# intermediate\n'}],provenance:[],reviewComplete:true};
  applyPlan(root,change);
  assert.equal(policyStatus(root).valid,false);
  const restore={...change,kind:'policy',rationale:'Restore content that already satisfied the policy.',reviewComplete:undefined,operations:[{path:'skills/example/SKILL.md',expectedDigest:sha256('# intermediate\n'),content:'# example\n'}]};
  assert.throws(()=>applyPlan(root,restore,{afterOperation:()=>{throw new Error('interrupted after restore');}}),/interrupted/);
  assert.equal(policyStatus(root).valid,true);
  assert.equal(resumePlan(root).applied,true);
  assert.equal(loadGarden(root).state.managed['skills/example/SKILL.md'].digest,sha256('# example\n'));
});

test('new source plans obey policy priority while journal recovery and applied retries remain valid', t => {
  const {root,put,assess,snapshot}=seeded(t);
  const plan={schemaVersion:1,kind:'review',rationale:'Complete source review.',snapshot,operations:[],provenance:[],reviewComplete:true};
  for(const kind of ['ingest','report','review']) assert.throws(()=>applyPlan(root,{...plan,kind}),/policy assessment required/);
  recordAssessment(root,assess());
  assert.throws(()=>applyPlan(root,plan,{afterJournal:()=>{throw new Error('interrupted before writes');}}),/interrupted/);
  put('skills/design-policy/references/new.md','# A changed policy\n');
  assert.equal(policyStatus(root).valid,false);
  assert.equal(resumePlan(root).applied,true);
  assert.equal(applyPlan(root,plan).alreadyApplied,true);
});
