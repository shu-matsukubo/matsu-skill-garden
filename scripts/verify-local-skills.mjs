#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const normalized = p => process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p);
const inSource = (source, filename) => normalized(filename).startsWith(normalized(source) + path.sep);

export function verifyDiscovery(source, response) {
  source = fs.realpathSync(source);
  const expected = fs.readdirSync(source, { withFileTypes: true }).filter(e => e.isDirectory() && fs.existsSync(path.join(source, e.name, 'SKILL.md'))).map(e => ({ name: e.name, path: fs.realpathSync(path.join(source, e.name, 'SKILL.md')) }));
  if (!Array.isArray(response?.data) || response.data.length !== 1 || !Array.isArray(response.data[0].skills) || !Array.isArray(response.data[0].errors)) throw new Error('Invalid Codex skills/list response');
  const { skills, errors } = response.data[0];
  if (errors.some(e => typeof e.path === 'string' && inSource(source, e.path))) throw new Error('Codex could not load a managed Skill');
  const missing = expected.filter(e => !skills.some(s => s.name === e.name && s.scope === 'user' && s.enabled === true && typeof s.path === 'string' && normalized(s.path) === normalized(e.path)));
  const stale = skills.filter(s => typeof s.path === 'string' && inSource(source, s.path) && !expected.some(e => s.name === e.name && normalized(e.path) === normalized(s.path)));
  if (missing.length || stale.length) throw new Error(`Codex inventory mismatch; missing: ${missing.map(s => s.name).join(', ')}; stale: ${stale.map(s => s.name).join(', ')}`);
  return { verified: true, recognized: expected.map(e => e.name), stale: [] };
}

export async function verifyLocalSkills(source, executable = process.platform === 'win32' ? 'codex.exe' : 'codex') {
  // A fresh cwd outside the repo proves user-scope discovery rather than project discovery.
  const probe = fs.mkdtempSync(path.join(os.tmpdir(), 'garden-skills-discovery-'));
  const child = spawn(executable, ['app-server', '--stdio'], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  let buffer = '', sequence = 0;
  const pending = new Map();
  const fail = error => { for (const promise of pending.values()) promise.reject(error); pending.clear(); };
  child.stderr.on('data', () => {});
  child.stdin.on('error', fail);
  child.on('error', fail);
  child.on('exit', (code, signal) => fail(new Error(`Codex app-server exited before discovery (${code ?? signal})`)));
  child.stdout.on('data', bytes => {
    buffer += bytes.toString();
    if (buffer.length > 4 * 1024 * 1024) { fail(new Error('Oversized app-server response')); child.kill(); return; }
    let end;
    while ((end = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
      let message;
      try { message = JSON.parse(line); } catch { fail(new Error('Invalid app-server JSON')); child.kill(); return; }
      if (pending.has(message.id)) {
        const promise = pending.get(message.id); pending.delete(message.id);
        if (message.error) promise.reject(new Error(`Codex RPC error: ${JSON.stringify(message.error)}`));
        else promise.resolve(message.result);
      }
    }
  });
  const request = (method, params) => new Promise((resolve, reject) => {
    const id = ++sequence; pending.set(id, { resolve, reject });
    child.stdin.write(JSON.stringify({ id, method, params }) + '\n', error => { if (error) fail(error); });
  });
  const timer = setTimeout(() => { fail(new Error('Codex discovery timed out')); child.kill(); }, 30_000);
  try {
    await request('initialize', { clientInfo: { name: 'garden_skill_sync', version: '1.0.0' } });
    child.stdin.write(JSON.stringify({ method: 'initialized' }) + '\n');
    return verifyDiscovery(source, await request('skills/list', { cwds: [probe], forceReload: true }));
  } finally {
    clearTimeout(timer); child.stdin.end(); child.kill();
    fs.rmdirSync(probe);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 4 || process.argv[2] !== '--source') throw new Error('Usage: verify-local-skills.mjs --source DIR');
    console.log(JSON.stringify(await verifyLocalSkills(path.resolve(process.argv[3]))));
  } catch (error) { console.error(JSON.stringify({ error: error.message })); process.exitCode = 1; }
}
