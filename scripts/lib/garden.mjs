import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

export const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const canonical = value => JSON.stringify(value, (_, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v);
export const objectDigest = value => sha256(canonical(value));
const fail = message => { throw new Error(message); };
const check = (condition, message) => { if (!condition) fail(message); };
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const hash = (value, length) => typeof value === 'string' && new RegExp(`^[a-f0-9]{${length}}$`).test(value);
const readJson = filename => JSON.parse(fs.readFileSync(filename, 'utf8'));
const emptyState = () => ({ schemaVersion: 1, snapshot: null, managed: {}, reports: [], reviewedTree: null, applied: [] });

export function safePath(root, relative) {
  check(typeof relative === 'string' && relative.length > 0 && !relative.includes('\\') && !relative.includes('\0') && !relative.includes(':'), 'Invalid relative path');
  const parts = relative.split('/');
  check(parts.every(p => p && p !== '.' && p !== '..' && !/[. ]$/.test(p) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(p)), 'Unsafe relative path');
  let current = root;
  check(!fs.lstatSync(root).isSymbolicLink(), 'Root must not be a symlink');
  for (const part of parts) {
    current = path.join(current, part);
    if (fs.existsSync(current)) check(!fs.lstatSync(current).isSymbolicLink(), `Symlink forbidden: ${relative}`);
  }
  return current;
}

function atomicWrite(root, relative, content, hooks = {}) {
  const target = safePath(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  // A hard stop may leave this file behind; runtime cache is never published or reviewed.
  const tempPath = `.garden-cache/atomic/${crypto.randomUUID()}.tmp`;
  const temp = safePath(root, tempPath);
  fs.mkdirSync(path.dirname(temp), { recursive: true });
  fs.writeFileSync(temp, content, { flag: 'wx' });
  hooks.afterTempWrite?.({ path: relative, tempPath });
  fs.renameSync(safePath(root, tempPath), safePath(root, relative));
}

function atomicJson(root, relative, value, hooks = {}) {
  atomicWrite(root, relative, `${JSON.stringify(value, null, 2)}\n`, hooks);
}

export function withLock(root, callback) {
  const lock = safePath(root, 'state/run.lock');
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  let fd;
  try { fd = fs.openSync(lock, 'wx'); }
  catch (error) { if (error.code === 'EEXIST') fail('Run lock exists; inspect state/run.lock and remove it only after confirming the owner stopped'); throw error; }
  try {
    fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, host: os.hostname(), startedAt: new Date().toISOString() }));
    return callback();
  } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
}

export function validateSnapshot(snapshot, config) {
  check(snapshot?.schemaVersion === 1 && snapshot.repository === config.repository && hash(snapshot.commit, 40) && hash(snapshot.tree, 40) && Array.isArray(snapshot.entries), 'Invalid snapshot header');
  const ids = new Set(), paths = new Set();
  for (const entry of snapshot.entries) {
    check(nonempty(entry.id) && ['fact', 'principle', 'idea'].includes(entry.type) && nonempty(entry.title), 'Snapshot entry requires id, type (fact/principle/idea), title');
    check(typeof entry.path === 'string' && entry.path.startsWith(`${config.knowledgePath}/`) && !entry.path.includes('\\') && entry.path.split('/').every(p => p && p !== '.' && p !== '..') && entry.path.endsWith('.md'), 'Invalid knowledge path');
    check(hash(entry.blob, 40) && hash(entry.digest, 64), 'Invalid source digest');
    check(entry.url === `https://github.com/${config.repository}/blob/${snapshot.commit}/${entry.path}`, 'Source URL must name the fixed commit and path');
    check(!ids.has(entry.id) && !paths.has(entry.path), 'Duplicate source id or path');
    ids.add(entry.id); paths.add(entry.path);
  }
  return snapshot;
}

export function snapshotDiff(previous, current) {
  const before = new Map((previous?.entries ?? []).map(entry => [entry.id, entry]));
  const after = new Map(current.entries.map(entry => [entry.id, entry]));
  const changes = [];
  for (const [id, item] of after) {
    const old = before.get(id);
    if (!old) changes.push({ id, kind: 'added', after: item });
    else if (objectDigest(old) !== objectDigest(item)) {
      // A commit-only URL update does not require rereading or reinterpreting a source.
      if (old.path !== item.path || old.blob !== item.blob || old.digest !== item.digest || old.type !== item.type || old.title !== item.title)
        changes.push({ id, kind: old.type === 'principle' && item.type !== 'principle' ? 'demoted' : 'changed', before: old, after: item });
    }
  }
  for (const [id, item] of before) if (!after.has(id)) changes.push({ id, kind: 'deleted', before: item });
  return changes;
}

export function nextAction(state, snapshot, journal = null) {
  if (journal) return { kind: 'resume', planDigest: journal.planDigest, originalKind: journal.plan.kind };
  if (state.snapshot?.tree === snapshot.tree) check(manifestDigest(state.snapshot) === manifestDigest(snapshot), 'Same tree has inconsistent source manifest');
  if (!state.snapshot || state.snapshot.tree !== snapshot.tree) {
    const changes = snapshotDiff(state.snapshot, snapshot);
    const affected = new Set(changes.filter(c => c.before?.type === 'principle').map(c => c.id));
    return { kind: 'ingest', changes, affectedSkills: Object.entries(state.managed).filter(([, v]) => v.sources.some(s => affected.has(s.id))).map(([p]) => p) };
  }
  const report = state.reports.find(r => r.status === 'open');
  if (report) return { kind: 'report', reportId: report.fingerprint, report };
  if (state.reviewedTree !== snapshot.tree) return { kind: 'review' };
  return { kind: 'skip', reason: 'No open reports; wait for a different knowledge tree' };
}

const manifestDigest = snapshot => objectDigest(snapshot.entries.map(({ url, ...entry }) => entry).sort((a, b) => a.path.localeCompare(b.path)));

export function loadGarden(root) {
  const config = readJson(safePath(root, 'config/garden.json'));
  check(config.schemaVersion === 1 && /^[\w.-]+\/[\w.-]+$/.test(config.repository) && /^[\w/-]+$/.test(config.ref) && config.knowledgePath === 'knowledge', 'Invalid garden config');
  const stateFile = safePath(root, 'state/garden.json');
  const state = fs.existsSync(stateFile) ? readJson(stateFile) : emptyState();
  check(state.schemaVersion === 1 && state.managed && Array.isArray(state.reports) && Array.isArray(state.applied), 'Invalid garden state');
  if (state.snapshot) validateSnapshot(state.snapshot, config);
  const journalFile = safePath(root, 'state/journal.json');
  const journal = fs.existsSync(journalFile) ? readJson(journalFile) : null;
  return { config, state, journal };
}

const fileDigest = filename => fs.existsSync(filename) ? (check(fs.statSync(filename).isFile(), 'Expected regular file'), sha256(fs.readFileSync(filename))) : null;
function checkManaged(root, state) {
  for (const [p, item] of Object.entries(state.managed)) {
    check(p.startsWith('skills/') && p.split('/').length >= 3, 'Managed path must be inside a skill');
    check(fileDigest(safePath(root, p)) === item.digest, `Managed file conflict: ${p}`);
  }
}

export function validateGarden(root) {
  const { config, state, journal } = loadGarden(root);
  check(!journal, 'Unfinished journal; resume before validation');
  checkManaged(root, state);
  validateProvenance(state.managed, state.snapshot);
  const fingerprints = new Set();
  for (const report of state.reports) {
    check(report.fingerprint === reportFingerprint(report) && !fingerprints.has(report.fingerprint) && ['open', 'resolved'].includes(report.status) && Array.isArray(report.history), 'Invalid report or duplicate fingerprint');
    fingerprints.add(report.fingerprint);
    validatePrevention(report.prevention);
    if (report.status === 'resolved') check(nonempty(report.outcome), 'Resolved report needs an outcome');
  }
  return { valid: true, managedFiles: Object.keys(state.managed).length, reports: state.reports.length, repository: config.repository };
}

function validateProvenance(managed, snapshot) {
  const entries = new Map((snapshot?.entries ?? []).map(e => [e.id, e]));
  const paths = new Set();
  for (const [p, item] of Object.entries(managed)) {
    check(!paths.has(p.toLowerCase()), `Managed paths collide by case: ${p}`);
    paths.add(p.toLowerCase());
    check(hash(item.digest, 64) && Array.isArray(item.sources) && item.sources.length > 0, `Missing principle provenance: ${p}`);
    const ids = new Set();
    for (const source of item.sources) {
      const entry = entries.get(source.id);
      check(entry?.type === 'principle' && ['path', 'blob', 'digest'].every(key => source[key] === entry[key]) && !ids.has(source.id), `Stale, duplicate, missing, or non-principle source: ${p}/${source.id}`);
      ids.add(source.id);
    }
    const skill = p.split('/').slice(0, 2).join('/');
    check(managed[`${skill}/SKILL.md`], `Managed skill missing SKILL.md: ${skill}`);
  }
}

export const reportFingerprint = report => objectDigest({ title: report.title, detail: report.detail, scope: report.scope });
function validatePrevention(prevention) {
  check(prevention && ['test', 'ci', 'review'].includes(prevention.kind) && nonempty(prevention.reference) && nonempty(prevention.reason), 'Report needs prevention kind, reference, and reason');
}
function addReport(state, input) {
  check(['title', 'detail', 'scope'].every(key => nonempty(input[key])), 'Report needs title, detail, and scope');
  validatePrevention(input.prevention);
  const fingerprint = reportFingerprint(input);
  const existing = state.reports.find(r => r.fingerprint === fingerprint);
  if (existing) {
    if (existing.status === 'open' || existing.resolvedTree === state.snapshot?.tree) return { fingerprint, duplicate: true };
    check(nonempty(input.recurrence?.reference) && nonempty(input.recurrence?.reason), 'Recurring finding on a new tree requires recurrence reference and reason');
    existing.history.push({ outcome: existing.outcome, prevention: existing.prevention, resolvedTree: existing.resolvedTree });
    existing.status = 'open'; existing.outcome = null; existing.observedTree = state.snapshot?.tree ?? null;
    existing.recurrence = input.recurrence; existing.prevention = input.prevention;
    state.reviewedTree = null;
    return { fingerprint, duplicate: false, reopened: true };
  }
  state.reports.push({ title: input.title, detail: input.detail, scope: input.scope, prevention: input.prevention, fingerprint, status: 'open', outcome: null, observedTree: state.snapshot?.tree ?? null, history: [] });
  state.reviewedTree = null;
  return { fingerprint, duplicate: false };
}

export function recordReport(root, input) {
  const { state, journal } = loadGarden(root);
  check(!journal, 'Resume unfinished journal before adding reports');
  const result = addReport(state, input);
  atomicJson(root, 'state/garden.json', state);
  return result;
}

export function preparePlan(root, plan, recovery = null) {
  const { config, state, journal } = recovery ?? loadGarden(root);
  check(!journal, 'Resume unfinished journal first');
  check(plan?.schemaVersion === 1 && nonempty(plan.rationale) && ['ingest', 'report', 'review'].includes(plan.kind) && Array.isArray(plan.operations) && Array.isArray(plan.provenance), 'Invalid plan');
  validateSnapshot(plan.snapshot, config);
  const planDigest = objectDigest(plan);
  if (state.applied.includes(planDigest)) return { alreadyApplied: true, planDigest };
  const next = nextAction(state, plan.snapshot);
  check(plan.kind === next.kind && (plan.kind !== 'report' || plan.reportId === next.reportId), `Plan violates priority: expected ${next.kind}`);
  if (!recovery) checkManaged(root, state);
  const target = structuredClone(state), operations = [], seen = new Set();
  for (const operation of plan.operations) {
    const p = operation.path;
    check(typeof p === 'string' && p.startsWith('skills/') && p.split('/').length >= 3 && !seen.has(p.toLowerCase()), 'Operations must name unique skills files');
    const absolute = safePath(root, p);
    check(operation.expectedDigest === null || hash(operation.expectedDigest, 64), 'Invalid expectedDigest');
    check(operation.content === null || typeof operation.content === 'string', 'Content must be a string or null for deletion');
    if (!recovery) check(fileDigest(absolute) === operation.expectedDigest, `Expected digest conflict: ${p}`);
    if (operation.content === null) check(state.managed[p], `Cannot delete unmanaged file: ${p}`);
    seen.add(p.toLowerCase());
    const after = operation.content === null ? null : sha256(operation.content);
    operations.push({ ...operation, after });
    if (after === null) delete target.managed[p];
    else target.managed[p] = { digest: after, sources: state.managed[p]?.sources ?? [] };
  }
  const sourcePaths = new Set();
  for (const item of plan.provenance) {
    check(typeof item.path === 'string' && target.managed[item.path] && !sourcePaths.has(item.path), 'Provenance must name unique managed files');
    sourcePaths.add(item.path);
    target.managed[item.path].sources = item.sources;
  }
  // Every previously generated file must still have live principle evidence after a deletion or demotion.
  target.snapshot = plan.snapshot;
  validateProvenance(target.managed, plan.snapshot);
  check(Array.isArray(plan.reports ?? []), 'reports must be an array');
  for (const report of plan.reports ?? []) addReport(target, report);
  if (plan.kind === 'report') {
    check(nonempty(plan.resolution?.outcome), 'Report plan needs a resolution outcome');
    validatePrevention(plan.resolution.prevention);
    const report = target.reports.find(r => r.fingerprint === plan.reportId);
    report.status = 'resolved'; report.outcome = plan.resolution.outcome; report.prevention = plan.resolution.prevention; report.resolvedTree = plan.snapshot.tree;
  }
  if (plan.kind === 'review') {
    check(plan.reviewComplete === true || (plan.reports?.length ?? 0) > 0, 'Review must finish or create a report');
    target.reviewedTree = plan.reviewComplete === true && !target.reports.some(report => report.status === 'open') ? plan.snapshot.tree : null;
  }
  if (plan.kind === 'ingest') target.reviewedTree = null;
  target.applied.push(planDigest);
  return { schemaVersion: 1, planDigest, plan, baseState: state, baseStateDigest: objectDigest(state), targetState: target, operations };
}

export function applyPlan(root, plan, hooks = {}) {
  const current = loadGarden(root);
  const planDigest = objectDigest(plan);
  if (current.journal) {
    check(current.journal.planDigest === planDigest, 'Different plan is pending; resume it first');
    return resumePlan(root, hooks);
  }
  const journal = preparePlan(root, plan);
  if (journal.alreadyApplied) return journal;
  atomicJson(root, 'state/journal.json', journal, hooks);
  hooks.afterJournal?.();
  return resumePlan(root, hooks);
}

export function resumePlan(root, hooks = {}) {
  const { config, state, journal } = loadGarden(root);
  check(journal && journal.schemaVersion === 1 && journal.planDigest === objectDigest(journal.plan), 'Missing or corrupt journal');
  check(journal.baseStateDigest === objectDigest(journal.baseState), 'Corrupt journal base state');
  const reconstructed = preparePlan(root, journal.plan, { config, state: journal.baseState, journal: null });
  check(objectDigest(reconstructed) === objectDigest(journal), 'Journal target state or operations disagree with the plan');
  check(objectDigest(state) === journal.baseStateDigest || objectDigest(state) === objectDigest(journal.targetState), 'State changed during pending plan');
  // Validate all paths and digests before writing any file, including partially applied operations.
  for (const operation of journal.operations) {
    check(operation.path.startsWith('skills/'), 'Journal path outside skills');
    check(operation.after === (operation.content === null ? null : sha256(operation.content)), 'Corrupt journal content');
    const actual = fileDigest(safePath(root, operation.path));
    check(actual === operation.expectedDigest || actual === operation.after, `Resume conflict: ${operation.path}`);
  }
  for (const [p, item] of Object.entries(journal.targetState.managed)) {
    if (!journal.operations.some(o => o.path === p)) check(fileDigest(safePath(root, p)) === item.digest, `Unchanged managed file conflict: ${p}`);
  }
  for (const operation of journal.operations) {
    const absolute = safePath(root, operation.path);
    if (fileDigest(absolute) === operation.after) continue;
    if (operation.content === null) fs.unlinkSync(absolute);
    else atomicWrite(root, operation.path, operation.content, hooks);
    hooks.afterOperation?.(operation);
  }
  atomicJson(root, 'state/garden.json', journal.targetState, hooks);
  hooks.afterState?.();
  fs.unlinkSync(safePath(root, 'state/journal.json'));
  return { applied: true, planDigest: journal.planDigest, kind: journal.plan.kind };
}

const githubApi = endpoint => JSON.parse(execFileSync('gh', ['api', endpoint], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 30_000 }));

function sourceBytes(repository, blobSha, sourcePath, api) {
  const blob = api(`repos/${repository}/git/blobs/${blobSha}`);
  check(blob.encoding === 'base64' && typeof blob.content === 'string', 'Invalid blob response');
  const bytes = Buffer.from(blob.content.replace(/\s/g, ''), 'base64');
  const actual = crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  check(actual === blobSha, `Blob hash mismatch: ${sourcePath}`);
  return bytes;
}

function knowledgeContent(bytes, sourcePath) {
  const decoded = bytes.toString('utf8');
  check(Buffer.from(decoded).equals(bytes), `Source is not UTF-8: ${sourcePath}`);
  const text = decoded.replace(/^\uFEFF/, '');
  const block = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  check(block, `Missing frontmatter: ${sourcePath}`);
  const frontmatter = block[1];
  let jsonMetadata = null;
  if (frontmatter.trim().startsWith('{')) {
    try { jsonMetadata = JSON.parse(frontmatter); }
    catch { fail(`Invalid JSON frontmatter: ${sourcePath}`); }
    check(jsonMetadata && typeof jsonMetadata === 'object' && !Array.isArray(jsonMetadata), `Invalid JSON frontmatter object: ${sourcePath}`);
  }
  const field = name => {
    if (jsonMetadata) {
      check(nonempty(jsonMetadata[name]), `Missing or invalid ${name}: ${sourcePath}`);
      return jsonMetadata[name];
    }
    const matches = [...frontmatter.matchAll(new RegExp(`^${name}:\\s*(.*?)\\s*$`, 'gm'))];
    check(matches.length === 1, `Missing or duplicate ${name}: ${sourcePath}`);
    let value = matches[0][1].trim();
    if (value.startsWith('"')) { try { value = JSON.parse(value); } catch { fail(`Unsupported ${name} quoting: ${sourcePath}`); } }
    else if (value.startsWith("'")) { check(value.endsWith("'"), 'Invalid YAML quoting'); value = value.slice(1, -1).replace(/''/g, "'"); }
    else { check(!/^[>|\[{&*!]/.test(value), `Unsupported ${name} YAML: ${sourcePath}`); value = value.replace(/\s+#.*$/, '').trim(); }
    check(nonempty(value), `Empty ${name}: ${sourcePath}`);
    return value;
  };
  return { id: field('id'), type: field('type'), title: field('title'), body: text.slice(block[0].length) };
}

export function collectSnapshot(config, previous = null, api = githubApi) {
  if (previous) validateSnapshot(previous, config);
  const commit = api(`repos/${config.repository}/commits/${config.ref}`);
  check(hash(commit.sha, 40) && hash(commit.commit?.tree?.sha, 40), 'Invalid commit response');
  const tree = api(`repos/${config.repository}/git/trees/${commit.commit.tree.sha}?recursive=1`);
  check(tree.sha === commit.commit.tree.sha && tree.truncated === false && Array.isArray(tree.tree), 'Incomplete or inconsistent tree response');
  const knowledge = tree.tree.find(e => e.path === config.knowledgePath && e.type === 'tree');
  check(knowledge && hash(knowledge.sha, 40), 'knowledge tree missing');
  const oldEntries = new Map((previous?.entries ?? []).map(e => [`${e.path}:${e.blob}`, e]));
  const entries = tree.tree.filter(e => e.type === 'blob' && e.path.startsWith(`${config.knowledgePath}/`) && e.path.endsWith('.md')).map(item => {
    check(item.mode === '100644' || item.mode === '100755', 'Source symlink forbidden');
    const old = oldEntries.get(`${item.path}:${item.sha}`);
    const url = `https://github.com/${config.repository}/blob/${commit.sha}/${item.path}`;
    if (old) return { ...old, url };
    const bytes = sourceBytes(config.repository, item.sha, item.path, api);
    const { id, type, title } = knowledgeContent(bytes, item.path);
    return { id, type, title, path: item.path, blob: item.sha, digest: sha256(bytes), url };
  }).sort((a, b) => a.path.localeCompare(b.path));
  return validateSnapshot({ schemaVersion: 1, repository: config.repository, commit: commit.sha, tree: knowledge.sha, entries }, config);
}

// Review the entire publishable repository, excluding only fixed runtime/cache paths and the receipt itself.
export function repositoryInventory(root) {
  const entries = [];
  const walk = (directory, prefix = '') => {
    for (const item of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = prefix ? `${prefix}/${item.name}` : item.name;
      if (['.git', 'node_modules', '.garden-cache'].includes(p) || ['state/run.lock', 'state/journal.json', 'state/review-receipt.json'].includes(p)) continue;
      const absolute = safePath(root, p);
      if (item.isDirectory()) walk(absolute, p);
      else {
        check(item.isFile(), `Nonregular repository file: ${p}`);
        const bytes = fs.readFileSync(absolute);
        entries.push({ path: p, digest: sha256(bytes), bytes });
      }
    }
  };
  walk(root);
  return entries;
}

const inventoryDigest = entries => ({ digest: objectDigest(entries.map(({ path: p, digest }) => ({ path: p, digest }))), files: entries.length });

export function repositoryDigest(root) {
  return inventoryDigest(repositoryInventory(root));
}

export function reviewBundle(root, output, api = githubApi) {
  check(typeof output === 'string' && output.startsWith('.garden-cache/'), 'Review bundle output must be inside .garden-cache/');
  const filename = safePath(root, output);
  validateGarden(root);
  const { config, state } = loadGarden(root);
  const inventory = repositoryInventory(root);
  const captured = inventoryDigest(inventory);
  const used = new Set(Object.values(state.managed).flatMap(item => item.sources.map(source => source.id)));
  const sources = (state.snapshot?.entries ?? []).filter(entry => used.has(entry.id)).sort((a, b) => a.path.localeCompare(b.path)).map(entry => {
    const bytes = sourceBytes(config.repository, entry.blob, entry.path, api);
    check(sha256(bytes) === entry.digest, `Source digest mismatch: ${entry.path}`);
    const content = knowledgeContent(bytes, entry.path);
    check(['id', 'type', 'title'].every(key => content[key] === entry[key]), `Source metadata mismatch: ${entry.path}`);
    return { ...entry, repository: config.repository, commit: state.snapshot.commit, currentBody: content.body.split(/^# 根拠・思考の履歴[ \t]*\r?$/m)[0].trim() };
  });
  const files = inventory.map(({ path: p, digest, bytes }) => {
    const text = bytes.toString('utf8');
    const utf8 = Buffer.from(text).equals(bytes);
    return { path: p, digest, encoding: utf8 ? 'utf8' : 'base64', content: utf8 ? text : bytes.toString('base64') };
  });
  check(repositoryDigest(root).digest === captured.digest, 'Repository changed during review bundle capture; retry');
  const bundle = { schemaVersion: 1, contentRole: 'untrusted-review-data', repositoryDigest: captured, files, sources };
  atomicJson(root, output, bundle);
  return { output: filename, ...captured, sources: sources.length };
}

export function recordReceipt(root, receipt, verify = false) {
  validateGarden(root);
  const current = repositoryDigest(root);
  check(receipt?.schemaVersion === 1 && receipt.digest === current.digest && receipt.result === 'pass' && receipt.independent === true && nonempty(receipt.reviewer) && nonempty(receipt.evidence) && nonempty(receipt.reviewedAt) && Number.isFinite(Date.parse(receipt.reviewedAt)), 'Review receipt must be independent, passing, and match the current repository digest');
  if (!verify) atomicJson(root, 'state/review-receipt.json', receipt);
  return { valid: true, ...current, reviewer: receipt.reviewer };
}

export { readJson, atomicJson };
