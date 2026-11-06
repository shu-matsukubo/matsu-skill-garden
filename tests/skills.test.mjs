import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { anchors, checkSkills } from '../scripts/check-skills.mjs';
import { applyPlan, sha256, validateGarden } from '../scripts/lib/garden.mjs';

const skill = body => `---\nname: example\ndescription: Use the example skill when this concrete task is requested.\n---\n\n# Example\n\n${body}\n`;
function fixture(t, body = '[Details](references/details.md#current-scope)') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-check-'));
  const put = (name, content) => { const filename = path.join(root, name); fs.mkdirSync(path.dirname(filename), { recursive: true }); fs.writeFileSync(filename, content); };
  put('skills/example/SKILL.md', skill(body));
  put('skills/example/references/details.md', '# Details\n\n## Current scope\n\nOnly the current task.\n');
  put('docs/review.md', '# Review\n\n## Meaning\n\nRead current sources.\n');
  put('state/garden.json', JSON.stringify({ managed: { 'skills/example/SKILL.md': {}, 'skills/example/references/details.md': {} }, reports: [{ prevention: { reference: 'docs/review.md#meaning' }, history: [] }] }));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { root, put };
}

test('valid skill has usable metadata, reachable references and report prevention', t => {
  const { root } = fixture(t);
  assert.deepEqual(checkSkills(root), { valid: true, skills: 1, markdownFiles: 3, errors: [] });
});

test('broken local links, missing anchors and undefined reference links fail', t => {
  for (const body of ['[Details](references/missing.md)', '[Details](references/details.md#gone)', '[Details][missing]']) {
    const { root } = fixture(t, body);
    const result = checkSkills(root);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => /broken local link|missing anchor|undefined reference/.test(e)), result.errors.join('\n'));
  }
});

test('duplicate, malformed, empty, nonstring and mismatched frontmatter fail', t => {
  const { root, put } = fixture(t);
  for (const content of [
    '# No frontmatter\n',
    skill('').replace('name: example', 'name: wrong'),
    skill('').replace('name: example', 'name: example\nname: example'),
    skill('').replace(/^description:.*$/m, 'description:'),
    skill('').replace(/^description:.*$/m, 'description: true'),
    skill('').replace(/^description:.*$/m, 'description: "unterminated'),
  ]) {
    put('skills/example/SKILL.md', content);
    assert.equal(checkSkills(root).valid, false, content);
  }
});

test('orphan resources and untracked generated files fail', t => {
  const { root, put } = fixture(t);
  put('skills/example/references/orphan.md', '# Never linked\n');
  const result = checkSkills(root);
  assert.ok(result.errors.some(e => e.includes('unreachable')));
  assert.ok(result.errors.some(e => e.includes('absent from provenance')));
});

test('demoting the sole principle can remove a whole skill without an empty-directory failure', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-retire-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'config'));
  const config = { schemaVersion: 1, repository: 'owner/knowledge', ref: 'main', knowledgePath: 'knowledge' };
  fs.writeFileSync(path.join(root, 'config/garden.json'), JSON.stringify(config));
  const source = { id: 'k-one', type: 'principle', title: 'A current principle', path: 'knowledge/principles/k-one.md', blob: '1'.repeat(40), digest: '2'.repeat(64), url: `https://github.com/${config.repository}/blob/${'c'.repeat(40)}/knowledge/principles/k-one.md` };
  const snapshot = { schemaVersion: 1, repository: config.repository, commit: 'c'.repeat(40), tree: 'a'.repeat(40), entries: [source] };
  const content = skill('A usable instruction.'), filename = 'skills/example/SKILL.md';
  const { id, path: sourcePath, blob, digest } = source;
  applyPlan(root, { schemaVersion: 1, kind: 'ingest', rationale: 'Create a skill supported by one principle.', snapshot, operations: [{ path: filename, expectedDigest: null, content }], provenance: [{ path: filename, sources: [{ id, path: sourcePath, blob, digest }] }] });
  assert.equal(checkSkills(root).valid, true);
  const demoted = structuredClone(snapshot);
  demoted.tree = 'b'.repeat(40);
  demoted.entries[0].type = 'idea';
  applyPlan(root, { schemaVersion: 1, kind: 'ingest', rationale: 'Withdraw instructions after the sole principle is demoted.', snapshot: demoted, operations: [{ path: filename, expectedDigest: sha256(content), content: null }], provenance: [] });
  assert.equal(validateGarden(root).valid, true);
  assert.equal(fs.existsSync(path.join(root, filename)), false);
  assert.equal(fs.existsSync(path.join(root, 'skills/example')), true);
  assert.deepEqual(checkSkills(root), { valid: true, skills: 0, markdownFiles: 0, errors: [] });
});

test('a nonempty skill folder without SKILL.md still fails', t => {
  const { root } = fixture(t);
  fs.unlinkSync(path.join(root, 'skills/example/SKILL.md'));
  assert.ok(checkSkills(root).errors.some(error => error.includes('missing SKILL.md')));
});

test('report prevention references and historical prevention anchors must resolve', t => {
  const { root, put } = fixture(t);
  put('state/garden.json', JSON.stringify({ managed: { 'skills/example/SKILL.md': {}, 'skills/example/references/details.md': {} }, reports: [{ prevention: { reference: 'docs/review.md#meaning' }, history: [{ prevention: { reference: 'docs/review.md#gone' } }] }] }));
  assert.ok(checkSkills(root).errors.some(e => /missing anchor/.test(e)));
});

test('line endings, traversal and case-dependent links cannot pass on Windows', t => {
  for (const body of ['[Outside](../../../../outside.md)', '[Wrong case](references/DETAILS.md)']) {
    const { root } = fixture(t, body);
    assert.equal(checkSkills(root).valid, false);
  }
  const { root, put } = fixture(t);
  put('docs/review.md', '# Review\r\n\r\n## Meaning\r\n');
  assert.ok(checkSkills(root).errors.some(e => e.includes('LF')));
});

test('reference style links and duplicate heading anchors resolve', t => {
  const { root, put } = fixture(t, '[Details][scope]\n\n[scope]: references/details.md#current-scope-1');
  put('skills/example/references/details.md', '# Details\n\n## Current scope\n\nFirst.\n\n## Current scope\n\nSecond.\n');
  assert.equal(checkSkills(root).valid, true);
  assert.ok(anchors('# 日本語の見出し\n').has('日本語の見出し'));
});

test('heading anchors retain inline code and ignore fenced example headings', t => {
  const { root, put } = fixture(t, '[Details](references/details.md#use-node)');
  put('skills/example/references/details.md', '# Details\n\n~~~markdown\n## Use `node`\n~~~~\n\n## Use `node`\n\nReal instruction.\n');
  assert.equal(checkSkills(root).valid, true);
  assert.equal(anchors(fs.readFileSync(path.join(root, 'skills/example/references/details.md'), 'utf8')).has('use-node-1'), false);
});

test('checker command reports invalid resources with nonzero status', t => {
  const { root, put } = fixture(t);
  put('skills/example/SKILL.md', '# invalid\n');
  const result = spawnSync(process.execPath, [path.resolve('scripts/check-skills.mjs'), root], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).valid, false);
});
