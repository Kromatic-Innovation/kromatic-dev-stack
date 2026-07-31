// findings-log.test.mjs — hermetic tests for the Quine findings-log formatter
// and parser (an internal issue). Pure; no network, no gh.
//
// Run: node --test findings-log.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FINDINGS_MARKER,
  formatFindingsBlock,
  parseFindingsBlock,
  hasFindingsBlock,
  locationCell,
} from "./findings-log.mjs";

const SAMPLE = [
  { severity: "must", file: "src/auth/session.ts", line: 88, desc: "token refresh races on concurrent calls" },
  { severity: "should", file: "src/api/client.ts", line: 12, desc: "retry cap hardcoded, ignores config" },
  { severity: "could", file: "src/util/fmt.ts", line: 40, desc: "dead branch" },
  { severity: "could", file: "tests/api.test.ts", desc: "no coverage for 401 path" },
];

test("block carries the stable sentinel marker", () => {
  assert.ok(formatFindingsBlock(SAMPLE).startsWith(FINDINGS_MARKER));
  assert.ok(hasFindingsBlock(formatFindingsBlock(SAMPLE)));
});

test("zero-findings case is an explicit, non-silent record", () => {
  const block = formatFindingsBlock([]);
  assert.ok(block.includes(FINDINGS_MARKER));
  assert.match(block, /quine: 0 findings/);
  // No finding rows.
  assert.equal(block.split("\n").filter((l) => l.trim().startsWith("- ")).length, 0);
});

test("header pluralizes correctly (1 finding vs N findings)", () => {
  assert.match(formatFindingsBlock([SAMPLE[0]]), /quine: 1 finding\b/);
  assert.match(formatFindingsBlock(SAMPLE), /quine: 4 findings\b/);
});

test("one line per finding — terse, no prose padding", () => {
  const rows = formatFindingsBlock(SAMPLE).split("\n").filter((l) => l.trim().startsWith("- "));
  assert.equal(rows.length, 4);
  // Each row is a single physical line (no embedded newline / paragraph).
  rows.forEach((r) => assert.equal(r.includes("\n"), false));
});

test("locationCell renders file:line when known, bare file otherwise", () => {
  assert.equal(locationCell({ file: "a.ts", line: 5 }), "a.ts:5");
  assert.equal(locationCell({ file: "a.ts" }), "a.ts");
  assert.equal(locationCell({ file: "a.ts", line: null }), "a.ts");
});

test("round-trips: parse(format(x)) recovers severity, file, line, desc", () => {
  const parsed = parseFindingsBlock(formatFindingsBlock(SAMPLE));
  assert.equal(parsed.count, 4);
  assert.deepEqual(parsed.findings[0], {
    severity: "must",
    file: "src/auth/session.ts",
    line: 88,
    desc: "token refresh races on concurrent calls",
  });
  assert.deepEqual(parsed.findings[3], {
    severity: "could",
    file: "tests/api.test.ts",
    line: null,
    desc: "no coverage for 401 path",
  });
});

test("parse tolerates the aligned/padded columns (trims cells)", () => {
  const parsed = parseFindingsBlock(formatFindingsBlock(SAMPLE));
  parsed.findings.forEach((f) => {
    assert.equal(f.file, f.file.trim());
    assert.ok(SEVERITIES_OK(f.severity));
    assert.equal(f.desc, f.desc.trim());
  });
});
function SEVERITIES_OK(s) {
  return ["must", "should", "could"].includes(s);
}

test("parse returns null when the marker is absent", () => {
  assert.equal(parseFindingsBlock("just a normal PR comment"), null);
  assert.equal(hasFindingsBlock("no marker here"), false);
});

test("zero-findings block round-trips to an empty finding set", () => {
  const parsed = parseFindingsBlock(formatFindingsBlock([]));
  assert.equal(parsed.count, 0);
  assert.deepEqual(parsed.findings, []);
});

test("unknown severity normalizes to could; a piped desc does not break parse", () => {
  const block = formatFindingsBlock([
    { severity: "CRITICAL", file: "x.ts", line: 1, desc: "a | b weirdness" },
  ]);
  const parsed = parseFindingsBlock(block);
  assert.equal(parsed.findings[0].severity, "could");
  assert.equal(parsed.findings[0].file, "x.ts");
  assert.equal(parsed.findings[0].line, 1);
  assert.equal(parsed.findings[0].desc, "a b weirdness");
});
