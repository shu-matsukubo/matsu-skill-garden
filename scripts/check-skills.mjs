#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const excluded = new Set(['.git', '.garden-cache', 'node_modules']);
const runtime = new Set(['state/run.lock', 'state/journal.json']);
const posix = p => p.split(path.sep).join('/');
function stripFences(text) {
  let fence = null;
  return text.split('\n').map(line => {
    if (fence) {
      if (new RegExp(`^ {0,3}${fence.character}{${fence.length},}\\s*$`).test(line)) fence = null;
      return '';
    }
    const opening = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (opening) { fence = { character: opening[1][0], length: opening[1].length }; return ''; }
    return line;
  }).join('\n');
}
const stripCode = text => stripFences(text).replace(/`[^`\n]*`/g, '');
const slug = heading => heading.toLowerCase().replace(/<[^>]*>/g, '').replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu, '').replace(/\s/g, '-');
export function anchors(text) {
  const result = new Set(), counts = new Map();
  for (const match of stripFences(text).matchAll(/^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const base = slug(match[1]), count = counts.get(base) ?? 0;
    result.add(count ? `${base}-${count}` : base); counts.set(base, count + 1);
  }
  for (const match of text.matchAll(/<(?:a|[a-z][\w-]*)\b[^>]*\bid=["']([^"']+)["']/gi)) result.add(match[1]);
  return result;
}

function filesUnder(root) {
  const files = [];
  const walk = (directory, prefix = '') => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (excluded.has(entry.name) || runtime.has(relative)) continue;
      if (entry.isSymbolicLink()) throw new Error(`Symlink is not a repository resource: ${relative}`);
      if (entry.isDirectory()) walk(path.join(directory, entry.name), relative);
      else if (entry.isFile()) files.push(relative);
    }
  };
  walk(root); return files;
}

function metadata(text, filename) {
  const block = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1];
  if (!block) throw new Error(`${filename}: missing LF frontmatter`);
  const result = {};
  // This repository authors simple scalar frontmatter; reject unsupported YAML rather than misread it.
  for (const line of block.split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const match = /^(name|description):[ \t]*(.+)$/.exec(line);
    if (!match || result[match[1]] !== undefined) throw new Error(`${filename}: unsupported or duplicate frontmatter field`);
    let value = match[2];
    if (value.startsWith('"')) { try { value = JSON.parse(value); } catch { throw new Error(`${filename}: invalid quoted scalar`); } }
    else if (value.startsWith("'")) {
      if (!/^'(?:[^']|'')*'$/.test(value)) throw new Error(`${filename}: invalid quoted scalar`);
      value = value.slice(1, -1).replace(/''/g, "'");
    } else if (/^[>|\[\]{&*!#]/.test(value) || /:\s|\s+#/.test(value) || /^(?:null|true|false|~|[+-]?\d+(?:\.\d+)?)$/i.test(value)) throw new Error(`${filename}: unsupported scalar`);
    if (typeof value !== 'string' || !value.trim()) throw new Error(`${filename}: empty scalar`);
    result[match[1]] = value.trim();
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result.name ?? '') || result.name.length >= 64 || !result.description || result.description.length > 1024) throw new Error(`${filename}: invalid name or description`);
  if (path.basename(path.dirname(filename)) !== result.name) throw new Error(`${filename}: name must match its folder`);
  if (!text.slice(text.indexOf('\n---\n') + 5).trim()) throw new Error(`${filename}: missing skill body`);
  if (/\[TODO(?:\b|:)|\[TBD\]/.test(text)) throw new Error(`${filename}: unfinished scaffold`);
  return result;
}

export function checkSkills(root = process.cwd()) {
  root = path.resolve(root);
  const files = filesUnder(root), errors = [], contents = new Map(), edges = new Map();
  const add = (file, error) => errors.push(`${file}: ${error.message ?? error}`);
  for (const file of files) {
    if (/\.(?:md|mjs|json|ya?ml)$/.test(file) || ['.gitattributes', '.gitignore'].includes(file)) {
      const content = fs.readFileSync(path.join(root, file), 'utf8');
      if (content.includes('\r')) add(file, 'text must use LF (review digest must survive checkout)');
      contents.set(file, content);
    }
  }
  const resolveReference = (file, target) => {
    if (/^https?:\/\//i.test(target) || /^mailto:/i.test(target)) return null;
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//') || target.includes('\\')) throw new Error(`unsupported link ${target}`);
    const [rawFile, rawAnchor] = target.split('#');
    const absolute = path.resolve(root, path.dirname(file), decodeURIComponent(rawFile || path.basename(file)));
    const relative = posix(path.relative(root, absolute));
    if (relative.startsWith('../') || path.isAbsolute(relative) || !fs.existsSync(absolute)) throw new Error(`broken local link ${target}`);
    // The inventory rejects symlinks; case-sensitive membership catches links that only work on Windows.
    if (fs.statSync(absolute).isFile() ? !files.includes(relative) : relative && !files.some(f => f.startsWith(`${relative}/`))) throw new Error(`nonportable or excluded link ${target}`);
    if (rawAnchor && (!relative.endsWith('.md') || !anchors(contents.get(relative) ?? fs.readFileSync(absolute, 'utf8')).has(decodeURIComponent(rawAnchor)))) throw new Error(`missing anchor ${target}`);
    return relative;
  };
  for (const [file, content] of contents) {
    if (!file.endsWith('.md')) continue;
    edges.set(file, []);
    const text = stripCode(content);
    const targets = [...text.matchAll(/!?\[[^\]\n]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+["'][^\n]*?["'])?\s*\)/g)].map(m => m[1] ?? m[2]);
    const definitions = new Map([...text.matchAll(/^ {0,3}\[([^\]]+)\]:\s*(?:<([^>]+)>|(\S+))/gm)].map(m => [m[1].toLowerCase(), m[2] ?? m[3]]));
    targets.push(...definitions.values());
    for (const match of text.matchAll(/!?\[([^\]\n]+)\]\[([^\]\n]*)\]/g)) if (!definitions.has((match[2] || match[1]).toLowerCase())) add(file, `undefined reference link ${match[2] || match[1]}`);
    for (const target of targets) {
      try { const next = resolveReference(file, target); if (next) edges.get(file).push(next); }
      catch (error) { add(file, error); }
    }
  }
  const entrypoints = files.filter(f => /^(?:skills|\.agents\/skills)\/[^/]+\/SKILL\.md$/.test(f));
  for (const file of entrypoints) {
    try { metadata(contents.get(file) ?? '', file); } catch (error) { add(file, error); }
    const directory = file.slice(0, -'SKILL.md'.length), reachable = new Set([file]), queue = [file];
    while (queue.length) for (const next of edges.get(queue.shift()) ?? []) if (next.startsWith(directory) && !reachable.has(next)) { reachable.add(next); queue.push(next); }
    for (const resource of files.filter(f => f.startsWith(directory))) if (!reachable.has(resource) && !resource.startsWith(`${directory}agents/`)) add(resource, 'skill resource is unreachable from SKILL.md');
  }
  for (const base of ['skills', '.agents/skills']) {
    if (!fs.existsSync(path.join(root, base))) continue;
    for (const entry of fs.readdirSync(path.join(root, base), { withFileTypes: true })) {
      const directory = `${base}/${entry.name}`;
      // Whole-skill retirement leaves empty directories locally; Git does not publish them.
      if (entry.isDirectory() && files.some(file => file.startsWith(`${directory}/`)) && !entrypoints.includes(`${directory}/SKILL.md`)) add(directory, 'missing SKILL.md');
    }
  }
  const stateFile = path.join(root, 'state/garden.json');
  if (fs.existsSync(stateFile)) {
    try {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      for (const file of files.filter(f => f.startsWith('skills/'))) if (!state.managed?.[file]) add(file, 'generated file is absent from provenance state');
      for (const report of state.reports ?? []) {
        const preventions = [report.prevention, ...(report.history ?? []).map(item => item.prevention)];
        for (const prevention of preventions) {
          if (!prevention?.reference) throw new Error('report prevention reference is missing');
          if (/^[a-z]+:/i.test(prevention.reference)) throw new Error('report prevention must name a local executable check or review perspective');
          resolveReference('README.md', prevention.reference);
        }
      }
    } catch (error) { add('state/garden.json', error); }
  }
  return { valid: errors.length === 0, skills: entrypoints.length, markdownFiles: [...contents.keys()].filter(f => f.endsWith('.md')).length, errors };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const result = checkSkills(process.argv[2]); console.log(JSON.stringify(result, null, 2)); if (!result.valid) process.exitCode = 1; }
  catch (error) { console.error(JSON.stringify({ error: error.message })); process.exitCode = 1; }
}
