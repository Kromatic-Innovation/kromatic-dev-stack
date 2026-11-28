#!/usr/bin/env node
// check-bundle: keeps the published bundle self-contained.
//
// Scans the docs and skills for three kinds of problem:
//   internal-ref       a name or issue reference from the private setup this
//                      bundle was extracted from (outsiders can't resolve it)
//   unshipped-skill    a reference to a skill that is not in skills/
//   uncontracted-path  a scripts/ or docs/ path that does not exist in the
//                      repo and is not described in ASSUMPTIONS.md
//
// Known problems live in scripts/check-bundle.baseline, one per line:
// <file><TAB><rule><TAB><match>. The check fails on any problem NOT in the
// baseline, and on any baseline line that no longer occurs, so the baseline
// can only shrink. Fixing a problem means deleting its baseline line in the
// same change. The goal is an empty baseline.
//
// Usage: node scripts/check-bundle.mjs [--root DIR] [--update]
//   --update rewrites the baseline from the current tree. Use it sparingly:
//   a reviewer should see every line that gets added.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Names from the private setup. Matched as whole words, case-insensitive.
const INTERNAL_NAMES = ['cwc', 'hestia', 'athenaeum', 'voltaire', 'social-loop', 'kroblog', 'code-workspace-config'];
// Private skills that are NOT shipped here. Matched as whole words.
const UNSHIPPED_SKILLS = [
  'spartacus', 'dijkstra', 'vitruvius', 'dewey', 'cicero', 'socrates',
  'retro-consolidation', 'retro-core', 'good-morning', 'close-out',
  'gh-actions-utils', 'spec-kit', 'repo-planning-cycle', 'caveman',
  'mop-up', 'plan-repo',
];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(md|mjs|js|sh|py|ya?ml)$/.test(name)) out.push(p);
  }
  return out;
}

const word = (w) => new RegExp(`(?<![A-Za-z0-9_-])${w}(?![A-Za-z0-9_-])`, 'gi');

export function scan(rootDir) {
  const files = [
    ...['README.md', 'INSTALL.md', 'ASSUMPTIONS.md'].map((f) => join(rootDir, f)).filter((f) => existsSync(f)),
    ...walk(join(rootDir, 'skills')),
    ...walk(join(rootDir, 'docs')),
  ];
  const assumptionsPath = join(rootDir, 'ASSUMPTIONS.md');
  const assumptions = existsSync(assumptionsPath) ? readFileSync(assumptionsPath, 'utf8') : '';
  const found = new Set();
  const add = (rel, rule, match) => found.add(`${rel}\t${rule}\t${match}`);
  for (const file of files) {
    const rel = relative(rootDir, file);
    const text = readFileSync(file, 'utf8');
    for (const n of INTERNAL_NAMES) {
      for (const m of text.matchAll(word(n))) add(rel, 'internal-ref', m[0].toLowerCase());
    }
    // Issue references like repo#123. A bare #123 in prose is left alone.
    for (const m of text.matchAll(/(?<![A-Za-z0-9_\/-])[a-z][a-z0-9-]*#\d+/gi)) {
      add(rel, 'internal-ref', m[0].toLowerCase());
    }
    for (const s of UNSHIPPED_SKILLS) {
      for (const m of text.matchAll(word(s))) add(rel, 'unshipped-skill', m[0].toLowerCase());
    }
    if (rel !== 'ASSUMPTIONS.md') {
      for (const m of text.matchAll(/(?<![A-Za-z0-9_.\/$-])(?:scripts|docs)\/[A-Za-z0-9_.\/*<>-]*[A-Za-z0-9_*>]/g)) {
        const p = m[0];
        if (existsSync(join(rootDir, p))) continue;
        if (assumptions.includes(p)) continue;
        add(rel, 'uncontracted-path', p);
      }
    }
  }
  return [...found].sort();
}

function main() {
  const args = process.argv.slice(2);
  const rootIdx = args.indexOf('--root');
  const root = rootIdx >= 0 ? resolve(args[rootIdx + 1]) : process.cwd();
  const baselinePath = join(root, 'scripts', 'check-bundle.baseline');
  const current = scan(root);
  if (args.includes('--update')) {
    const header = '# Known bundle problems. Delete a line when you fix it; never add one without review.\n';
    writeFileSync(baselinePath, header + current.map((l) => l + '\n').join(''));
    console.log(`baseline rewritten: ${current.length} entries`);
    return 0;
  }
  const baseline = new Set(
    existsSync(baselinePath)
      ? readFileSync(baselinePath, 'utf8').split('\n').filter((l) => l && !l.startsWith('#'))
      : [],
  );
  const cur = new Set(current);
  const added = current.filter((l) => !baseline.has(l));
  const fixed = [...baseline].filter((l) => !cur.has(l));
  console.log(`check-bundle: ${current.length} problem(s) in tree, ${baseline.size} in baseline`);
  if (added.length) {
    console.error('\nNew problems (fix them, or justify adding them to the baseline):');
    for (const l of added) console.error(`  ${l}`);
  }
  if (fixed.length) {
    console.error('\nFixed but still listed in scripts/check-bundle.baseline (delete these lines):');
    for (const l of fixed) console.error(`  ${l}`);
  }
  return added.length || fixed.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
