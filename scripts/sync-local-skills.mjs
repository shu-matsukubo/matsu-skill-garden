import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { readJson, safePath } from './lib/garden.mjs';

// This workspace-only binding prevents CI and other checkouts from changing user Skills.
export function localSkillBinding(root) {
  const filename = safePath(root, 'config/local-skills.json');
  if (!fs.existsSync(filename)) return null;
  const config = readJson(filename);
  if (config.schemaVersion !== 1 || typeof config.workspace !== 'string' || typeof config.destination !== 'string' || !path.win32.isAbsolute(config.workspace) || !path.win32.isAbsolute(config.destination)) throw new Error('Invalid local Skills binding');
  if (process.platform !== 'win32' || path.resolve(root).toLowerCase() !== path.resolve(config.workspace).toLowerCase()) return null;
  return { source: safePath(root, 'skills'), destination: path.resolve(config.destination) };
}

export function syncLocalSkills(root) {
  const binding = localSkillBinding(root);
  if (!binding) return { skipped: true, reason: 'Not the configured Windows workspace' };
  if (fs.existsSync(safePath(root, 'state/journal.json'))) throw new Error('Resume unfinished journal before syncing local Skills');
  const run = (executable, args) => JSON.parse(execFileSync(executable, args, { encoding: 'utf8', windowsHide: true, timeout: 45_000, maxBuffer: 4 * 1024 * 1024 }));
  const links = run('pwsh.exe', ['-NoProfile', '-File', safePath(root, 'scripts/link-skills.ps1'), '-Source', binding.source, '-Destination', binding.destination, '-LinkType', 'Junction']);
  // No model turn or external-service writes: refresh the local Codex skill inventory only.
  const discovery = run(process.execPath, [safePath(root, 'scripts/verify-local-skills.mjs'), '--source', binding.source]);
  return { links, discovery };
}
