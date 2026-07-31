// log-findings-bin.test.mjs — bin-level tests for the Quine findings poster
// (an internal issue). Hermetic: a FAKE `gh` on PATH stands in for GitHub, so no network
// and no real PR. Proves the two contract behaviours that matter most:
//   1. the findings block is ALWAYS emitted to stdout (never lost), and
//   2. a posting failure DEGRADES LOUDLY — exit 0, loud WARN — never fail-closed
//      (AC7), while `--strict` opts into a non-zero exit.
//
// Run: node --test log-findings-bin.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FINDINGS_MARKER } from "./findings-log.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BIN = join(__dirname, "..", "bin", "log-findings.mjs");

// Build a PATH whose first `gh` is a stub with the given exit behaviour.
function fakeGhPath(mode) {
  const dir = mkdtempSync(join(tmpdir(), "quine-fakegh-"));
  const script =
    mode === "fail"
      ? "#!/usr/bin/env bash\necho 'fake gh: boom' >&2\nexit 1\n"
      : "#!/usr/bin/env bash\nexit 0\n";
  const p = join(dir, "gh");
  writeFileSync(p, script);
  chmodSync(p, 0o755);
  return dir;
}

function runBin(extraArgs, { ghMode, findings }) {
  const pathDir = fakeGhPath(ghMode);
  return spawnSync(process.execPath, [BIN, "--repo", "o/r", "--pr", "1", ...extraArgs], {
    input: JSON.stringify(findings),
    encoding: "utf8",
    env: { ...process.env, PATH: `${pathDir}:${process.env.PATH}` },
  });
}

const ONE = [{ severity: "must", file: "a.ts", line: 8, desc: "races" }];

test("always emits the findings block to stdout, even when posting fails", () => {
  const r = runBin([], { ghMode: "fail", findings: ONE });
  assert.ok(r.stdout.includes(FINDINGS_MARKER), "marker present on stdout");
  assert.match(r.stdout, /quine: 1 finding\b/);
  assert.match(r.stdout, /- must\s+\| a\.ts:8\s+\| races/);
});

test("posting failure degrades loudly (exit 0, loud WARN) — never fail-closed", () => {
  const r = runBin([], { ghMode: "fail", findings: ONE });
  assert.equal(r.status, 0, "default is degrade-not-fail");
  assert.match(r.stderr, /WARN could not post/);
});

test("--strict makes a posting failure a non-zero exit", () => {
  const r = runBin(["--strict"], { ghMode: "fail", findings: ONE });
  assert.notEqual(r.status, 0);
});

test("zero findings still emits the explicit record to stdout", () => {
  const r = runBin([], { ghMode: "fail", findings: [] });
  assert.match(r.stdout, /quine: 0 findings/);
});

test("missing --repo/--pr is a usage error (exit 2)", () => {
  const r = spawnSync(process.execPath, [BIN], { input: "[]", encoding: "utf8" });
  assert.equal(r.status, 2);
});

test("invalid findings JSON is a caller error (exit 2), not a silent degrade", () => {
  const pathDir = fakeGhPath("ok");
  const r = spawnSync(process.execPath, [BIN, "--repo", "o/r", "--pr", "1"], {
    input: "not json",
    encoding: "utf8",
    env: { ...process.env, PATH: `${pathDir}:${process.env.PATH}` },
  });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /invalid findings input/);
});
