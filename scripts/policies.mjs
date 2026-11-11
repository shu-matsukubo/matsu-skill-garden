#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { atomicJson, objectDigest, readJson, repositoryInventory, safePath, withLock } from './lib/garden.mjs';

export function policyConfig(root) {
  const file = safePath(root, 'config/skill-policy.json');
  if (!fs.existsSync(file)) return null;
  const config = readJson(file);
  if (config.schemaVersion !== 1 || !Array.isArray(config.policySkills) || config.policySkills.length < 2 ||
      new Set(config.policySkills).size !== config.policySkills.length ||
      config.policySkills.some(p => !/^skills\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p))) throw new Error('Invalid skill policy config');
  for (const p of config.policySkills) if (!fs.existsSync(safePath(root, `${p}/SKILL.md`))) throw new Error(`Missing policy skill: ${p}`);
  return config;
}

export function policyStatus(root) {
  const config = policyConfig(root);
  if (!config) return { valid: true, configured: false, pending: [] };
  const inventory = repositoryInventory(root);
  const digest = entries => objectDigest(entries.map(({ path, digest }) => ({ path, digest })));
  const policies = inventory.filter(f => config.policySkills.some(p => f.path.startsWith(`${p}/`)) || f.path === 'config/skill-policy.json');
  const policyDigest = digest(policies);
  const names = inventory.filter(f => /^(skills|\.agents\/skills)\/[^/]+\/SKILL\.md$/.test(f.path)).map(f => f.path.slice(0, -9));
  const targets = names.map(name => ({ path: name, digest: digest(inventory.filter(f => f.path.startsWith(`${name}/`))) }));
  // Include the mechanism itself; exclude mutable state/receipts to avoid a self-invalidating assessment.
  const maintenance = inventory.filter(f => /^(scripts\/|tests\/|docs\/|prompts\/|config\/|\.github\/|\.agents\/)/.test(f.path) || /^(AGENTS\.md|README\.md|package(?:-lock)?\.json|\.gitignore|\.gitattributes)$/.test(f.path));
  targets.push({ path: '@maintenance', digest: digest(maintenance) });
  targets.sort((a, b) => a.path.localeCompare(b.path));
  const scopeDigest = objectDigest(targets.map(t => t.path));
  const filename = safePath(root, 'state/policy-assessment.json');
  const saved = fs.existsSync(filename) ? readJson(filename) : null;
  const globalStale = saved?.schemaVersion !== 1 || saved.policyDigest !== policyDigest || saved.scopeDigest !== scopeDigest;
  const pending = targets.filter(t => globalStale || !saved?.evaluations?.some(e => e.path === t.path && e.digest === t.digest && validEvaluation(e)));
  return { valid: pending.length === 0, configured: true, policyDigest, scopeDigest, targets, pending };
}

function validEvaluation(e) {
  return ['updated', 'unchanged'].includes(e.outcome) && typeof e.reason === 'string' && !!e.reason.trim();
}

export function recordAssessment(root, assessment) {
  if (fs.existsSync(safePath(root, 'state/journal.json'))) throw new Error('Resume unfinished journal before policy assessment');
  const status = policyStatus(root);
  if (!status.configured || assessment.schemaVersion !== 1 || assessment.policyDigest !== status.policyDigest || assessment.scopeDigest !== status.scopeDigest || !Array.isArray(assessment.evaluations)) throw new Error('Assessment does not match current policy/scope');
  if (assessment.evaluations.length !== status.targets.length || new Set(assessment.evaluations.map(e => e.path)).size !== status.targets.length) throw new Error('Assess every target exactly once');
  for (const target of status.targets) {
    const e = assessment.evaluations.find(e => e.path === target.path);
    if (!e || e.digest !== target.digest || !validEvaluation(e)) throw new Error(`Missing, stale or unexplained evaluation: ${target.path}`);
  }
  atomicJson(root, 'state/policy-assessment.json', assessment);
  return policyStatus(root);
}

export function requireAssessment(root) {
  const status = policyStatus(root);
  if (!status.valid) throw new Error(`Policy assessment required: ${status.pending.map(t => t.path).join(', ')}`);
  return status;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command = 'status', input] = process.argv.slice(2);
    const root = process.cwd();
    const result = command === 'status' ? policyStatus(root) : command === 'check' ? requireAssessment(root) : command === 'record' && input ? withLock(root, () => recordAssessment(root, readJson(path.resolve(input)))) : (() => { throw new Error('Usage: policies.mjs status|check|record FILE'); })();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) { console.error(JSON.stringify({ error: error.message })); process.exitCode = 1; }
}
