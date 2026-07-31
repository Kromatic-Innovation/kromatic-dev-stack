---
name: repo-audit
description: Occam sub-skill — comprehensive single-repo audit producing (a) a decision sheet for a human and (b) an issue graph for implementers with no session memory. Diagnosis only, never fixes. Use when asked to audit, review, or assess the health of a repository.
status: draft
verified: false
---

# repo-audit

**(Occam sub-skill — comprehensive codebase audit)**

Audit one repository. Produce **two artifacts for two different readers**, and **fix nothing**.

| Artifact | Reader | Shape |
|---|---|---|
| **Decision sheet** | A human deciding what to fund | ≤1 screen, read linearly |
| **Finding corpus + issue graph** | An implementer (possibly an autonomous lane) with **no session memory** | Read by lookup; issue-body fidelity |

Write each finding **once**, at issue-body fidelity, in the corpus. The decision sheet *links* into it. (v1 wrote everything twice and the second copy was always the better one — that's the tell.)

---

## Gate 0 — Sync and stamp

Before reading any code: fetch, confirm the branch is not behind, record the exact SHA in the header. **Every finding is valid at that SHA only, and the report must say so.**

If the branch you were pointed at is behind or its remote is gone, **switch refs and say so explicitly** — a substitution is not a confirmation, and the reader needs to know which one happened.

---

## Gate 1 — Evidence rules

- Read the actual code. Never infer quality from README claims or file names.
- Distinguish **evidence** ("this constant appears in 7 call sites") from **judgment** ("this should be configurable").
- Every citation is `file_path:line` **plus the exact text of that line, quoted**.
- Where you are unsure whether something is dead or wrong, say so and name **the check that would settle it**. Do not pad with speculation.
- Record the scope you actually covered vs. skipped, and why. **This list is load-bearing at Gate 4.**

### 1.1 Citation verification is an executed deliverable, not an affordance

> Quoted line text does not make a citation self-checking. It makes it *checkable*. Nothing is checked until something opens the file.

**Before emitting the report**, run an exhaustive sweep over every citation and **paste the output**. The sweep **compares the quoted text against the source line** — an emptiness test is not a comparison, and a script that only tests emptiness reproduces the very affordance this gate exists to kill.

Build `citations.tsv` **mechanically from the emitted report** — one row per citation, `path:line<TAB>the quoted text as the report states it`. Never hand-transcribe the quoted column from the source file: that reads the answer off the thing under test and the check passes trivially.

```bash
# citations.tsv — extracted FROM THE REPORT, not retyped from source
norm() { printf '%s' "$1" | tr -s '[:space:]' ' ' | sed 's/^ //; s/ $//'; }

fail=0
while IFS=$'\t' read -r c quoted; do
  f=${c%:*}; l=${c##*:}          # ##*: — a path may contain a colon; the line number is the last field
  txt=$(sed -n "${l}p" "$f")
  if [ -z "$txt" ]; then
    echo "EMPTY/BAD   $c"; fail=$((fail+1)); continue
  fi
  if [ "$(norm "$txt")" != "$(norm "$quoted")" ]; then
    echo "MISMATCH    $c"
    echo "  report: $quoted"
    echo "  source: $txt"
    fail=$((fail+1))
  fi
done < citations.tsv              # redirect, not a pipe — a pipe subshells the loop and loses $fail

echo "citations: $fail failed"
[ "$fail" -eq 0 ] || exit 1        # non-zero is what makes this a gate rather than a log
```

Only whitespace is normalized. A citation whose quoted text differs from its line in any other way is a **wrong citation**, not a formatting difference. A grep for citations *missing* a line number catches exactly one failure mode and cannot catch a **wrong** number — which is the failure mode that actually occurs, because wrong numbers come from inference and missing ones come from haste.

**Before this check gates anything, seed one known-bad citation and confirm it goes red.** The discriminating seed is a citation pointing at a **wrong but non-empty line of unrelated code** — it must report `MISMATCH`. An empty-line seed proves nothing here: the pre-fix script already caught that one, and it is not the failure that occurs. A check that has never reported a failure is not a check — it is indistinguishable from a check that never ran. (`quine/SKILL.md` §silent-pass, an internal issue; `occam/verify-by-running.md`.)

### 1.2 A batch delta is a halt

Any script reporting `patched N of M` where **N ≠ M** halts the audit. Enumerate the residual and disposition each item individually. A summary count is never a disposition.

---

## Gate 2 — Remedies carry the finding's burden of proof

A recommended fix is a claim.

- **`VERIFIED`** — you **executed** the fix at the audited SHA and observed the outcome. Requires a **failing pre-state you measured**, not one you asserted, plus the post-state and the test-suite result. Paste both.
- **`DIRECTION`** — reasoned but not executed. **Name the check that would settle it.**

`VERIFIED` over a **set** requires one evidence row per member. Otherwise the honest label is **`SPOT-CHECKED (n/N)`** with n and N stated. A set-level verification claim inherits the strength of its weakest unexamined member.

> The two remedies verified this way in the source session were trusted downstream without re-litigation. Several `DIRECTION` items later needed correction — correctly, *because they were tagged*.

---

## Gate 3 — Internal oracle vs external oracle

**This is the gate v1 lacked, and it cost a live production bug.**

Checking code against its own description is an **internal** oracle. Checking it against the world is an **external** oracle. An audit that only runs internal oracles will pass a file whose shipped constants no longer work.

### 3.1 Every finding carries an oracle tag

`internal-consistency` | `external-contract`

**An audit with zero `external-contract` findings must say so explicitly in the summary.** Absence of that declaration is itself a finding.

### 3.2 Boundary-literal census (mandatory)

Enumerate **every literal in the audited code that crosses a third-party boundary** — model IDs, sampling parameters (`temperature`, `top_p`), token limits, endpoint versions, header names, API paths, package versions with known EOL.

Each gets a verdict, backed by **current documentation or a live probe**:

| Verdict | Meaning |
|---|---|
| `still accepted` | Verified against current docs/probe |
| `rejected` | The provider now errors on this |
| `deprecated` | Works, but on a removal path |

**"Should this be configurable?" is a hygiene answer, not a verdict.** The config dimension and the liveness question are different questions about the same literal, and only one of them finds bugs.

### 3.3 Never assert an external fact from memory

Any claim about a third-party API, service, library, or platform must be checked against current documentation. Training knowledge is stale by construction.

**Apply this to values the code already ships, not only to remedies you author.** Auditors instinctively bind epistemic rules to text they *write* and not to text they *read* — that asymmetry is the bug.

### 3.4 Swallowed errors are a must-flag by construction

Any `catch` that converts an external failure into an empty-but-valid return **must** be flagged, and you must trace at least one path where a plausible current-environment failure reaches it. Swallowing is the mechanism that turns a stale constant into a silent-empty-result bug — the two findings are the same finding.

---

## Gate 4 — Absence claims

A finding whose load-bearing claim is **"X does not exist"** must:

1. Name the **namespace** X could occupy (this repo? a sibling? an org-level config? a different branch?)
2. Show the search covered all of it
3. **Intersect the claim against your own Gate-1 scope-gap list. An intersection is a blocker.**

If any part of that namespace is unread, file it at the **lowest severity as an open question**, and it **may not be a `prerequisite-of`** another finding.

> Absence findings are cheap to write and structurally load-bearing, so they attract weight they have not earned. "I didn't find it" and "it isn't there" are the same sentence in a report.

---

## Gate 5 — Surface decisions when the branch appears

**Not at the end.** A decision asked after the analysis is written can only re-label work; it cannot redirect it.

When you hit a fork whose answer changes the work, stop and ask. Every option set ships with two markers:

- **combinable vs. exclusive**
- **"this list may not be exhaustive — a different answer is a valid answer"**

> A multiple-choice surface that renders only exclusive picks systematically discards the human's highest-value move. In the source session the one answer that materially improved the design required the human to *defeat* the agent's either/or framing.

**If the action you are asking approval for is irreversible, every material risk you already know goes in the ask.** Materiality test: would it plausibly change the answer or narrow the scope? You may not dispatch into an exposure you filed a finding about in the same session without naming that finding in the ask. Disclosure after approval is notification, not disclosure.

---

## Dimensions

Run deterministic inventories **directly** — anything `grep`, `wc`, or `git log` answers exactly. Delegate only judgment, and hand the raw output to the judgment lanes rather than asking them to re-derive it.

1. **Requirements & intent** — stated spec vs. reality. Can you state each module's contract in one sentence? If not, that's a finding.
2. **Architecture & modularity** — the *real* import/call graph. Cycles, layering violations, god files (>500 lines or >5 responsibilities), duplication that has already diverged, leaky abstractions.
3. **Dead & vestigial** — unreferenced exports/files/routes/env vars/flags; commented-out blocks; `TODO`/`FIXME` with `git blame` age; manifest deps nothing imports; permanently-on flags. Distinguish truly dead from "reached only via reflection/CLI/cron/tests."
4. **Configuration hygiene** — hardcoded URLs, timeouts, retries, limits, model names, ports, thresholds; magic numbers/strings; environment-specific values in source; **config that exists but is bypassed**. Inventory every env var: where read, where documented, where defaulted, and whether a missing value **fails loudly or silently degrades**.
5. **AI/LLM-specific** — every prompt string (inline vs. externalized, versioned or not); hardcoded model IDs/temperatures/token limits; prompts built by concatenation with unescaped user input; missing output validation; **no token/cost accounting, no timeouts, no fallback**; prompt duplication; **any regression test for prompt behavior at all**. → Feed every literal here into the Gate 3.2 census.
6. **Error handling** — swallowed exceptions; errors logged then execution continues into an invalid state; missing timeouts/retries/backoff; partial-failure behavior and idempotency; silent failures.
7. **Security & secrets** — committed secrets (**check history, not just HEAD**); injection surfaces; AuthZ at one chokepoint vs. scattered; dependency vulnerabilities; unpinned actions/packages; PII or credentials in logs.
8. **Data & state** — schema/code drift; unapplied or unwritten migrations; N+1 queries; missing indexes; shared mutable global state; concurrency hazards.
9. **Tests** — real coverage of critical paths (not the percentage); tests that assert nothing, mock the system under test, or are skipped; **actually wired into CI?**; redundant suite runs on the same SHA in the promotion flow.
10. **Operability** — what gates a merge; can broken code land; **is a declared gate actually enforced** (query the live ruleset, don't trust the config file); logging/metrics/tracing sufficient to debug an incident; clean-clone reproducibility; pinned versions.
11. **Consistency** — multiple styles for one thing; linter/formatter/type-checker configured but unenforced or heavily suppressed; count and categorize type-suppression escapes; churn hotspots from `git log` (where the design is fighting you).

---

## Output

### A. Decision sheet (≤1 screen)

Only three things:
- **Verified bugs** — with the executed evidence
- **Open decisions** — Gate 5 format
- **The do-not-touch list** — what looks wrong and is deliberately correct

Length is a cost **only in this zone**.

### B. Finding corpus

Header: **exact SHA, branch, date**, and if you switched refs, why.

Every finding, one field set, at issue-body fidelity:

`ID | Severity | Category | Oracle (internal-consistency|external-contract) | Location (path:line + quoted text) | Finding | Why it matters | Remedy (VERIFIED w/ evidence | DIRECTION w/ settling check) | Effort (S/M/L) | Related (depends-on / duplicates / prerequisite-of)`

**Test each finding for zero-session-memory survival**: if the issue body needs the report to be intelligible, it is not done. Applying that test *while writing* collapses the two-reader problem into one artifact.

### C. Architecture map

Modules, real dependencies, where layering breaks. Save durable diagrams that are absent from the repo **into the repo**, not just the report.

### D. Inventories — a floor, not a ceiling

Every env var; every boundary literal with its Gate-3.2 verdict; every hardcoded constant worth extracting; every prompt with its location; every dead symbol.

**Every inventory carries a leave-alone column.** An inventory without negative space reads as a worklist and generates one issue per row instead of one per *problem*. The most valuable output of a 13-row swallowed-exception triage was the 11 rows saying *correct, do not touch*.

Preserve any structured artifact the analysis produced **as a table**. Do not compress a classification into prose — the categories *are* the finding.

### E. Top 10 actions

Ordered by (risk × blast radius) ÷ effort.

### F. What I did not examine

Explicit. Cross-referenced against every Gate-4 absence claim.

---

## Severity

About **consequence**, not tidiness. A hardcoded prod URL is High. An inconsistent variable name is Low. **Do not inflate.**

Severity rates the **problem**. The `VERIFIED`/`DIRECTION` tag rates the **remedy**. They are different axes — conflating them lets a plausible-but-wrong fix inherit a P0's credibility.

### Untrusted input: rate by sink trace, never by arrival medium

For any finding involving untrusted input, **set severity by tracing the value forward to its first validation-or-decision point, and record that call chain.** Never from reasoning about the medium the value arrived in.

"It only arrives inside a JSON envelope", "it comes from the calling application, not an end user", "it's just a config field" — these describe the *channel*, not the *sink*. A value's provenance does not bound its blast radius; where it lands does.

> Both audits that produced this skill made this mistake on the same day. One rated a prompt-injection surface Medium because "only a JSON envelope is parsed back" — the envelope was the delivery channel, and injected values reached the decision function with no validation point. The other declined to file an injection surface at all, on the reasoning that the field came from the calling application rather than an end user — without tracing where that field was interpolated.

Workspace principle: `audit-severity-by-sink-trace` (your engineering-principles file).

### Counts require enumeration

**A finding that states a count must attach the full enumeration, or declare itself a spot-check with the bound unknown.** A sampled count and a total are indistinguishable to the reader, and produce fixes that look complete.

This is the same rule as Gate 2's `SPOT-CHECKED (n/N)`, applied to findings rather than remedies — an independent audit retro reached it the same day from the opposite direction (reported 3 unstamped surfaces; exhaustive enumeration found 8).

Workspace principle: `audit-cardinality-requires-enumeration` (your engineering-principles file).

---

## Closeout

Put the full corpus on the Desktop for human review and **open it in your editor**. Save durable artifacts (architecture diagrams the repo lacks) into the repo itself.

Then build the issue graph per `occam/issue-graph-preflight.md` — epic + thin-slice children, one MoSCoW label each, native `blocked_by` edges (not prose), **`ready` applied last**, and only after the Gate-5 disclosure rules are satisfied.

---

## Environment

The shell is **zsh**. Unquoted parameter expansion does **not** word-split — `for n in $list` passes the whole list as one argument. Use explicit arrays or `${=var}`.
