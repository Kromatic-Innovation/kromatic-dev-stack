// findings-log.mjs — format + parse Quine's review findings as a terse,
// machine-readable PR-comment block (an internal issue).
//
// WHY: Quine's findings today reach the world only INDIRECTLY — as follow-up
// issues filed and fix commits pushed. That records what got ACTED ON, not what
// Quine looked at and found (a `wont`-triaged or false-positive finding leaves
// no trace), so review coverage is unauditable and the reviewer-comparison
// unique-catch comparison has no Quine half to compare. This module makes every
// Quine review persist its findings to the PR in a deliberately terse "caveman"
// register — one line per finding, no prose padding — behind a stable sentinel
// so a retrospective can extract findings per PR with NO LLM, and re-runs UPDATE
// the one comment instead of appending a second.
//
// Pure — no I/O. The bin (bin/log-findings.mjs) does the upsert; tests hit these
// functions directly.

// Stable sentinel marker. The parser finds the block by this exact line, and the
// bin upserts the comment carrying it (update, never duplicate). Bump the version
// suffix only on a breaking format change so old parsers fail loud, not silent.
export const FINDINGS_MARKER = "<!-- quine-findings v1 -->";

// Severity vocabulary (MoSCoW register, per the example below). Recorded for
// filtering the retrospective — NOT a gate (all defects are fixed
// regardless, so severity only tiers the analysis).
export const SEVERITIES = ["must", "should", "could"];
const SEVERITY_WIDTH = 6; // widest label ("should")

function normSeverity(sev) {
  const s = String(sev ?? "").trim().toLowerCase();
  return SEVERITIES.includes(s) ? s : "could";
}

// One-line, single-space cell; a `|` in a description would break the columnar
// parse, so collapse it (descriptions are terse prose, never intentionally piped).
function cell(value) {
  return String(value ?? "").replace(/[|\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

/** file[:line] location cell. `line` optional (line where known). */
export function locationCell(finding) {
  const file = cell(finding.file);
  const line = finding.line;
  const hasLine = line !== undefined && line !== null && String(line).trim() !== "";
  return hasLine ? `${file}:${String(line).trim()}` : file;
}

/**
 * Render the terse findings block, including the zero-findings case — an
 * explicit `quine: 0 findings` record is what makes coverage auditable, so it is
 * never silent.
 *
 * @param {Array<{severity:string,file:string,line?:number|string,desc:string}>} findings
 * @returns {string}
 */
export function formatFindingsBlock(findings = []) {
  const list = Array.isArray(findings) ? findings : [];
  const header = `quine: ${list.length} finding${list.length === 1 ? "" : "s"}`;
  if (list.length === 0) {
    return `${FINDINGS_MARKER}\n${header}`;
  }
  const rows = list.map((f) => ({
    sev: normSeverity(f.severity),
    loc: locationCell(f),
    desc: cell(f.desc),
  }));
  // Pad the location column to align the description column — still one line per
  // finding, still terse; alignment just aids the human skim. Parsing trims.
  const locWidth = Math.max(...rows.map((r) => r.loc.length));
  const lines = rows.map(
    (r) => `- ${r.sev.padEnd(SEVERITY_WIDTH)} | ${r.loc.padEnd(locWidth)} | ${r.desc}`,
  );
  return `${FINDINGS_MARKER}\n${header}\n${lines.join("\n")}`;
}

/** True when `text` contains a Quine findings block (by the stable marker). */
export function hasFindingsBlock(text) {
  return typeof text === "string" && text.includes(FINDINGS_MARKER);
}

/**
 * Parse a findings block back into structured findings — the machine-readable
 * round-trip the retrospective relies on (no LLM needed). Returns null when
 * the marker is absent.
 *
 * @param {string} text
 * @returns {null | { count:number, findings:Array<{severity:string,file:string,line:number|null,desc:string}> }}
 */
export function parseFindingsBlock(text) {
  if (!hasFindingsBlock(text)) return null;
  const lines = String(text).split("\n").map((l) => l.trim());
  const header = lines.find((l) => /^quine:\s*\d+\s+finding/.test(l));
  const count = header ? Number(header.match(/^quine:\s*(\d+)/)[1]) : 0;
  const findings = [];
  for (const l of lines) {
    if (!l.startsWith("- ")) continue;
    const parts = l.slice(2).split("|").map((p) => p.trim());
    if (parts.length < 3) continue;
    const [severity, loc, ...rest] = parts;
    const desc = rest.join(" | ").trim(); // re-join in case desc had a stray pipe
    const m = loc.match(/^(.*?):(\d+)$/);
    findings.push({
      severity: normSeverity(severity),
      file: m ? m[1] : loc,
      line: m ? Number(m[2]) : null,
      desc,
    });
  }
  return { count, findings };
}
