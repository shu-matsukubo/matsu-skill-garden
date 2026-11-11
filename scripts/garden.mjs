#!/usr/bin/env node
import path from 'node:path';
import { policyStatus, requireAssessment } from './policies.mjs';
import { applyPlan, atomicJson, collectSnapshot, loadGarden, nextAction, readJson, recordReceipt, recordReport, repositoryDigest, resumePlan, reviewBundle, safePath, validateGarden, validateSnapshot, withLock } from './lib/garden.mjs';

const [command, ...args] = process.argv.slice(2);
const options = {};
try {
  for (let i = 0; i < args.length; i += 2) {
    if (!/^--[a-z-]+$/.test(args[i]) || !args[i + 1] || args[i + 1].startsWith('--') || options[args[i].slice(2)]) throw new Error('Options must be unique --name value pairs');
    options[args[i].slice(2)] = args[i + 1];
  }
  const root = path.resolve(options.root ?? process.cwd());
  const input = name => { if (!options[name]) throw new Error(`Missing --${name}`); return readJson(path.resolve(options[name])); };
  const cacheOutput = () => {
    if (!options.output) throw new Error('Missing --output');
    const filename = path.resolve(options.output);
    const relative = path.relative(root, filename).split(path.sep).join('/');
    if (!relative.startsWith('.garden-cache/')) throw new Error('Output must be inside .garden-cache/');
    safePath(root, relative);
    return { filename, relative };
  };
  const result = withLock(root, () => {
    const { config, state, journal } = loadGarden(root);
    switch (command) {
      case 'snapshot': {
        // Cache only source metadata; generated files and state are never snapshot outputs.
        const { filename, relative } = cacheOutput();
        const snapshot = collectSnapshot(config, options.previous ? input('previous') : state.snapshot);
        atomicJson(root, relative, snapshot);
        return { output: filename, commit: snapshot.commit, tree: snapshot.tree, entries: snapshot.entries.length };
      }
      case 'next': {
        if (journal) return nextAction(state, null, journal);
        const policy = policyStatus(root);
        if (!policy.valid) return { kind: 'policy', ...policy };
        return nextAction(state, validateSnapshot(input('snapshot'), config));
      }
      case 'apply': return applyPlan(root, input('plan'));
      case 'resume': return resumePlan(root);
      case 'report-add': return recordReport(root, input('file'));
      case 'validate': requireAssessment(root); return validateGarden(root);
      case 'digest': return repositoryDigest(root);
      case 'review-bundle': return reviewBundle(root, cacheOutput().relative);
      case 'review-receipt': return recordReceipt(root, input('file'));
      case 'verify-receipt': return recordReceipt(root, readJson(safePath(root, 'state/review-receipt.json')), true);
      default: throw new Error('Usage: garden.mjs snapshot|next|apply|resume|report-add|validate|digest|review-bundle|review-receipt|verify-receipt [--root DIR] [--snapshot FILE|--plan FILE|--file FILE|--output FILE|--previous FILE]');
    }
  });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(JSON.stringify({ error: error.message }));
  process.exitCode = 1;
}
