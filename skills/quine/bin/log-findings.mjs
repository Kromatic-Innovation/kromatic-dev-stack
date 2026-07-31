#!/usr/bin/env node
// log-findings.mjs — persist a Quine review's findings to its PR.
//
// REQUIRES a comment-posting wrapper that this bundle does NOT ship: a script
// taking `--repo OWNER/REPO --number N --body-file PATH` and posting an issue
// comment. Supply your own and point at it with the GH_COMMENT_POST env var;
// it defaults to <repo-root>/scripts/gh-comment-post.sh. Yours should verify
// server-side that the body it sent is the body that landed — a create call
// returning success is not evidence the body arrived.
//
// Without it the script still runs: posting fails, a loud WARN goes to stderr,
// and the findings block is echoed to stdout so it is never lost (see below).
//
// Reads findings JSON (stdin, or --findings-file PATH) and UPSERTS a single
// terse comment on the PR, behind the stable FINDINGS_MARKER sentinel:
//   - no existing marker comment  -> CREATE via the wrapper, and
//   - an existing marker comment   -> UPDATE it in place (PATCH) so re-runs never
//     append a second comment.
//
// Findings JSON shape (either form):
//   [ { "severity": "must", "file": "src/x.ts", "line": 88, "desc": "..." }, ... ]
//   { "findings": [ ... ] }
// `line` is optional (recorded where known). An empty array is valid and posts
// the explicit `quine: 0 findings` record — coverage is only auditable if the
// no-findings case is recorded too.
//
// DEGRADE LOUDLY, NEVER FAIL CLOSED: a posting failure prints a loud WARN
// to stderr and echoes the block to stdout so it is never lost, then exits 0 —
// logging findings must not fail the review or block the PR. Pass --strict to
// exit non-zero on a posting failure instead (for CI wiring that wants to know).
//
// Usage:
//   echo '[{"severity":"must","file":"a.ts","line":8,"desc":"races"}]' \
//     | node .claude/skills/quine/bin/log-findings.mjs --repo OWNER/REPO --pr 123
//   node .claude/skills/quine/bin/log-findings.mjs --repo O/R --pr 12 --findings-file f.json

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FINDINGS_MARKER,
  formatFindingsBlock,
  hasFindingsBlock,
} from "../lib/findings-log.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
// REQUIRED, no default. A computed default is unsafe here: under the documented
// install (~/.claude/skills/) a <skill>/../../.. walk resolves to $HOME, so a
// default would execute an arbitrary script at a predictable home-directory path
// the reader never created. Absent config must fail loudly, not guess.
const COMMENT_SAFE = process.env.GH_COMMENT_POST;

function parseArgs(argv) {
  const args = { repo: null, pr: null, findingsFile: null, strict: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--repo") args.repo = argv[++i];
    else if (a === "--pr" || a === "--number") args.pr = argv[++i];
    else if (a === "--findings-file") args.findingsFile = argv[++i];
    else if (a === "--strict") args.strict = true;
    else if (a === "-h" || a === "--help") args.help = true;
  }
  return args;
}

function readFindings(args) {
  const raw = args.findingsFile
    ? readFileSync(args.findingsFile, "utf8")
    : readFileSync(0, "utf8"); // stdin
  const text = raw.trim();
  if (!text) return [];
  const parsed = JSON.parse(text);
  const list = Array.isArray(parsed) ? parsed : parsed.findings;
  if (!Array.isArray(list)) {
    throw new Error("findings JSON must be an array or { findings: [...] }");
  }
  return list;
}

function gh(argv) {
  return execFileSync("gh", argv, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

// Find an existing Quine findings comment on the PR (by the stable marker).
function findExistingComment(repo, pr) {
  const out = gh([
    "api",
    "--paginate",
    `/repos/${repo}/issues/${pr}/comments`,
    "--jq",
    ".[] | {id, body}",
  ]);
  for (const line of out.split("\n")) {
    const s = line.trim();
    if (!s) continue;
    let c;
    try {
      c = JSON.parse(s);
    } catch {
      continue;
    }
    if (hasFindingsBlock(c.body)) return c.id;
  }
  return null;
}

function updateComment(repo, id, bodyFile) {
  // PATCH the existing comment in place (no wrapper covers update; gh api uses
  // the same resolved token). --input reads the JSON payload from a file.
  const payloadFile = join(mkdtempSync(join(tmpdir(), "quine-find-")), "payload.json");
  writeFileSync(payloadFile, JSON.stringify({ body: readFileSync(bodyFile, "utf8") }));
  gh([
    "api",
    "-X",
    "PATCH",
    `/repos/${repo}/issues/comments/${id}`,
    "--input",
    payloadFile,
  ]);
}

function createComment(repo, pr, bodyFile) {
  if (!COMMENT_SAFE) {
    throw new Error(
      "GH_COMMENT_POST is not set. This bundle does not ship a comment-posting " +
        "wrapper. Point GH_COMMENT_POST at a script accepting " +
        "--repo OWNER/REPO --number N --body-file PATH.",
    );
  }
  // Create via your wrapper: bot-token-first auth + server-side verify.
  execFileSync("bash", [COMMENT_SAFE, "--repo", repo, "--number", String(pr), "--body-file", bodyFile], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.repo || !args.pr) {
    process.stderr.write(
      "usage: log-findings.mjs --repo OWNER/REPO --pr N [--findings-file F] [--strict]\n",
    );
    process.exitCode = args.help ? 0 : 2;
    return;
  }

  let block;
  try {
    block = formatFindingsBlock(readFindings(args));
  } catch (err) {
    // Bad input is a caller bug, not a transient post failure — fail on it.
    process.stderr.write(`log-findings: invalid findings input — ${err.message}\n`);
    process.exitCode = 2;
    return;
  }

  // The block is always emitted to stdout, so the record survives even if the
  // GitHub post degrades.
  process.stdout.write(block + "\n");

  const bodyFile = join(mkdtempSync(join(tmpdir(), "quine-find-")), "body.md");
  writeFileSync(bodyFile, block + "\n");

  try {
    const existing = findExistingComment(args.repo, args.pr);
    if (existing) {
      updateComment(args.repo, existing, bodyFile);
      process.stderr.write(`log-findings: updated existing Quine comment ${existing} on ${args.repo}#${args.pr}\n`);
    } else {
      createComment(args.repo, args.pr, bodyFile);
      process.stderr.write(`log-findings: posted Quine findings to ${args.repo}#${args.pr}\n`);
    }
  } catch (err) {
    // DEGRADE LOUDLY — never fail the review over a posting hiccup.
    const detail = (err.stderr || err.message || String(err)).toString().trim();
    process.stderr.write(
      `log-findings: WARN could not post Quine findings to ${args.repo}#${args.pr} — ${detail}\n` +
        `             The findings block was written to stdout above and is NOT lost. ` +
        `Marker: ${FINDINGS_MARKER}\n`,
    );
    if (args.strict) process.exitCode = 1;
  }
}

main();
