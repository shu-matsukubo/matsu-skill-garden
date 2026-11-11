import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { localSkillBinding, syncLocalSkills } from '../scripts/sync-local-skills.mjs';
import { verifyDiscovery, verifyLocalSkills } from '../scripts/verify-local-skills.mjs';

const script = path.resolve('scripts/link-skills.ps1');
const windows = { skip: process.platform !== 'win32' };
function fixture(t) {
  // Windows runners can expose TEMP through an 8.3 alias; PowerShell reports expanded paths.
  const temporaryRoot = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(temporaryRoot, 'garden-sync-test-'));
  const source = path.join(root, 'source'), destination = path.join(root, 'destination');
  fs.mkdirSync(source); fs.mkdirSync(destination);
  const safe = p => {
    const absolute = path.resolve(root, p);
    assert.ok(absolute.startsWith(root + path.sep), `Test path escaped fixture: ${p}`);
    return absolute;
  };
  const put = (p, content) => { const f = safe(p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, content); };
  const skill = name => put(`source/${name}/SKILL.md`, `---\nname: ${name}\ndescription: Example task.\n---\n\n## 概要\n\nExample.\n`);
  const remove = p => fs.rmSync(safe(p), { recursive: true, force: true });
  t.after(() => {
    assert.ok(path.resolve(root).startsWith(temporaryRoot + path.sep));
    assert.equal(fs.lstatSync(root).isSymbolicLink(), false);
    fs.rmSync(root, { recursive: true, force: true });
  });
  const run = () => spawnSync('pwsh.exe', ['-NoProfile', '-File', script, '-Source', source, '-Destination', destination], { encoding: 'utf8', windowsHide: true });
  const sync = () => { const r = run(); assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout); };
  return { root, source, destination, put, skill, remove, run, sync };
}

test('junction diff handles addition, rename and broken retired targets while keeping existing links', windows, t => {
  const { source, destination, skill, remove, sync } = fixture(t);
  skill('keep'); skill('old');
  assert.equal(sync().Created.length, 2);
  const keep = path.join(destination, 'keep'), stamp = fs.lstatSync(keep).birthtimeMs;
  assert.equal(sync().Created.length, 0);
  assert.equal(fs.lstatSync(keep).birthtimeMs, stamp);
  fs.renameSync(path.join(source, 'old'), path.join(source, 'renamed'));
  // Name in SKILL.md is irrelevant to link ownership; discovery validates metadata separately.
  const renamed = sync();
  assert.deepEqual(renamed.Removed, [path.join(destination, 'old')]);
  assert.deepEqual(renamed.Created, [path.join(destination, 'renamed')]);
  assert.equal(fs.readFileSync(path.join(source, 'renamed/SKILL.md'), 'utf8').includes('name: old'), true);
  remove('source/renamed');
  assert.deepEqual(sync().Removed, [path.join(destination, 'renamed')]);
  assert.equal(fs.lstatSync(keep).birthtimeMs, stamp);
});

test('retiring a Skill removes only its junction and preserves source contents and unmanaged entries', windows, t => {
  const { source, destination, put, skill, sync } = fixture(t);
  skill('retire'); sync();
  fs.renameSync(path.join(source, 'retire/SKILL.md'), path.join(source, 'retire/notes.md'));
  put('destination/ordinary/SKILL.md', 'unmanaged directory');
  put('outside/SKILL.md', 'unmanaged target');
  fs.symlinkSync(path.join(path.dirname(source), 'outside'), path.join(destination, 'foreign'), 'junction');
  fs.symlinkSync(path.join(source, 'retire'), path.join(destination, 'different-alias'), 'junction');
  const result = sync();
  assert.deepEqual(result.Removed, [path.join(destination, 'retire')]);
  assert.equal(fs.readFileSync(path.join(source, 'retire/notes.md'), 'utf8').includes('name: retire'), true);
  assert.equal(fs.readFileSync(path.join(destination, 'ordinary/SKILL.md'), 'utf8'), 'unmanaged directory');
  assert.equal(fs.readFileSync(path.join(destination, 'foreign/SKILL.md'), 'utf8'), 'unmanaged target');
  assert.equal(fs.lstatSync(path.join(destination, 'different-alias')).isSymbolicLink(), true);
});

test('normal-directory and foreign-junction collisions fail before additions or retirements', windows, t => {
  for (const kind of ['directory', 'junction']) {
    const { source, destination, put, skill, run, sync } = fixture(t);
    skill('old'); sync();
    fs.renameSync(path.join(source, 'old/SKILL.md'), path.join(source, 'old/notes.md'));
    skill('added'); skill('collision');
    put('outside/sentinel', 'preserve');
    if (kind === 'directory') put('destination/collision/sentinel', 'preserve');
    else fs.symlinkSync(path.join(path.dirname(source), 'outside'), path.join(destination, 'collision'), 'junction');
    const result = run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /will not be replaced/);
    assert.equal(fs.existsSync(path.join(destination, 'added')), false);
    assert.equal(fs.lstatSync(path.join(destination, 'old')).isSymbolicLink(), true);
    assert.equal(fs.readFileSync(path.join(destination, 'collision/sentinel'), 'utf8'), 'preserve');
  }
});

test('missing source and linked source roots do not trigger mass unlinking', windows, t => {
  const { root, source, destination, skill, remove, run, sync } = fixture(t);
  skill('keep'); sync();
  remove('source');
  assert.notEqual(run().status, 0);
  assert.equal(fs.lstatSync(path.join(destination, 'keep')).isSymbolicLink(), true);
  fs.mkdirSync(path.join(root, 'elsewhere'));
  fs.symlinkSync(path.join(root, 'elsewhere'), source, 'junction');
  assert.notEqual(run().status, 0);
  assert.equal(fs.lstatSync(path.join(destination, 'keep')).isSymbolicLink(), true);
});

test('discovery requires canonical user-scope enabled entries and rejects stale managed entries', t => {
  const { source, skill } = fixture(t); skill('example');
  const expected = { name: 'example', path: fs.realpathSync(path.join(source, 'example/SKILL.md')), scope: 'user', enabled: true };
  const response = entries => ({ data: [{ skills: entries, errors: [] }] });
  assert.equal(verifyDiscovery(source, response([expected])).verified, true);
  for (const entry of [{...expected,scope:'repo'}, {...expected,enabled:false}, {...expected,path:path.join(os.tmpdir(),'other/SKILL.md')}]) assert.throws(() => verifyDiscovery(source, response([entry])), /missing/);
  assert.throws(() => verifyDiscovery(source, response([expected,{...expected,name:'retired',path:path.join(source,'retired/SKILL.md')}])), /stale/);
  assert.throws(() => verifyDiscovery(source, {data:[{skills:[expected],errors:[{path:expected.path,message:'Cannot read'}]}]}), /could not load/);
  assert.throws(() => verifyDiscovery(source, {}), /Invalid/);
});

test('Codex startup failure cannot be reported as verified discovery', async t => {
  const { source, root } = fixture(t);
  await assert.rejects(verifyLocalSkills(source, path.join(root, 'missing-codex')), /ENOENT/);
});

test('CI and another checkout cannot activate the configured local binding', t => {
  const {root,put} = fixture(t);
  put('config/local-skills.json', JSON.stringify({schemaVersion:1,workspace:'C:/different/checkout',destination:'C:/Users/example/.codex/skills'}));
  assert.equal(localSkillBinding(root), null);
  assert.equal(syncLocalSkills(root).skipped, true);
});

test('an active Windows binding refuses synchronization while a journal is unfinished', windows, t => {
  const {root,destination,put} = fixture(t);
  put('config/local-skills.json', JSON.stringify({schemaVersion:1,workspace:root,destination}));
  put('state/journal.json', '{}');
  assert.notEqual(localSkillBinding(root), null);
  assert.throws(() => syncLocalSkills(root), /unfinished journal/);
  assert.deepEqual(fs.readdirSync(destination), []);
});
