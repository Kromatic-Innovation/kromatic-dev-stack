// Run: node --test scripts/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { scan } from './check-bundle.mjs';

function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), 'check-bundle-'));
  for (const [p, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), body);
  }
  return dir;
}

test('clean tree has no problems', () => {
  const dir = fixture({ 'README.md': 'Use /occam and /quine. See scripts/real.sh.', 'scripts/real.sh': '' });
  assert.deepEqual(scan(dir), []);
});

test('flags internal names and repo#N references', () => {
  const dir = fixture({ 'skills/x/SKILL.md': 'Per cwc#12 and the hestia queue.' });
  assert.deepEqual(scan(dir), [
    'skills/x/SKILL.md\tinternal-ref\tcwc',
    'skills/x/SKILL.md\tinternal-ref\tcwc#12',
    'skills/x/SKILL.md\tinternal-ref\thestia',
  ]);
});

test('flags unshipped skills as whole words only', () => {
  const dir = fixture({ 'skills/x/SKILL.md': 'Hand to spartacus. Not mop-upx or xdewey.' });
  assert.deepEqual(scan(dir), ['skills/x/SKILL.md\tunshipped-skill\tspartacus']);
});

test('a missing path is fine once ASSUMPTIONS.md describes it', () => {
  const before = fixture({ 'skills/x/SKILL.md': 'Run scripts/ws-lock.sh first.' });
  assert.deepEqual(scan(before), ['skills/x/SKILL.md\tuncontracted-path\tscripts/ws-lock.sh']);
  const after = fixture({ 'skills/x/SKILL.md': 'Run scripts/ws-lock.sh first.', 'ASSUMPTIONS.md': '`scripts/ws-lock.sh`: takes a repo lock.' });
  assert.deepEqual(scan(after), []);
});
