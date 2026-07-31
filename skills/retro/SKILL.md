---
name: retro
description: Session retrospective — retrospects the CURRENT session (what was attempted, what went wrong, what generalizes) through multi-persona review (Dorothy/Quine/Eiko/Occam), then writes an entry to your retro log. SKIPPABLE for small, low-complexity, low-risk sessions — skipping is a legitimate outcome, not a failure. The retro-of-retros corpus review lives in retro-consolidation.
---

# retro

**(Session Retrospective)**

Use this skill to run a structured, multi-persona retrospective review of the **current session** — what was attempted, what went wrong, and what generalizes — and to write the result as a new entry in the retro corpus.

## Purpose

Orchestrate a retrospective review where multiple agent personas analyze the same session evidence from different angles, cross-reference findings, and produce a ranked list of actionable improvements. This is a **producer** for the retro corpus, not a reader of it: the output is a written entry under your retro log that a later `retro-consolidation` pass will review alongside every other session's entry. Individual sessions become systemic insights only once enough of them have been captured and cross-referenced — this skill's job is to capture this one well.

## Skippable — this is a legitimate outcome

Not every session earns a retro. For a small doc change, a low-complexity fix,
or a low-risk session with no surprises, **skip the retro and say so** — do not
force a synthesis where there is no signal, and do not treat skipping as a
failure to be apologized for. Run the retro when the session had friction,
rework, a surprising failure, a near-miss, or a decision worth generalizing.
A skipped session writes nothing to the corpus (see "Producer output" below) —
there is no obligation to manufacture an entry just to have one.

## Retrospective skeleton

This skill is a retro: it walks the shared **read -> compare -> propose -> route**
skeleton described below.
It is an *agent-driven* consumer — its three pieces are procedures you perform,
not a JS engine:

| Phase | Piece | Where |
|---|---|---|
| read | **LOADER** — gather evidence from the current session (transcript/journal of what was attempted) and ground it against real artifacts | Phase 1 / 1b |
| compare | **ANALYZER** — multi-persona review + cross-reference synthesis + applicability check | Phases 2-4 + 4.5 |
| propose / route | **ROUTER / gate** — the Phase 5 2×2 matrix on lock state and autonomy, plus writing the session's own entry to the corpus | Phase 5 |

**Never auto-commit.** This skill already
enforces that boundary structurally via the daily write lock (Phase 0) and the
autonomy check (Phase 0.5) — Cells B, C, and D route findings to GitHub issues
or skill-change proposals instead of applying skill edits without a
human decision, and only Cell A (lock held + interactive human) applies changes,
and only after explicit user confirmation. The skeleton is deliberately generic;
the lock, autonomy matrix, and routing destinations below are unchanged by this
wiring.

## Workflow

### Phase 0: Acquire or Degrade

Before reading any retro data or planning any work, acquire the daily retro
write lock. This prevents two concurrent retro sessions from stomping on
each other's branches and working trees in `$WORKSPACE` — see
the tracking epic for this gate.

Run:

```bash
scripts/retro-lock.sh acquire
```

**If exit code is 0** (`acquired` or `stole-stale`): you hold the lock for
the rest of the session. Proceed to Phase 1. Before exit (on any path —
normal completion, user abort, error), release the lock:

```bash
scripts/retro-lock.sh release
```

You may want to register a shell `trap` so the lock is released even if the
session ends abnormally. TTL-based recovery (120 min default) will reclaim
orphaned locks, but explicit release is tidier and avoids the next retro
seeing a dangling owner.

**If exit code is 1** (`held-by:` + owner JSON): another retro session is
already running in this workspace. You **must not** write to `.claude/`,
`AGENTS.md`, or any skill files — that is the whole point of the lock.
Degrade to the **soft path** and proceed with a read-only review:

1. Run Phases 1–4 normally. Read retros, synthesize findings, rank impact.
2. **Replace Phase 5 with soft-path routing.** Instead of asking the user
   to apply changes, file each actionable finding as a skill-change proposal.
   Use batch mode:
   - Pick a human-readable `session_context` that identifies this retro,
     e.g. `"Retro 2026-04-14 QueuePool arc (degraded)"`.
   - Set `source: retro-degraded` on every proposal.
   - One file per finding. Slug-dedup handles repeats across sessions.
3. Tell the user up-front that the retro is running in degraded mode, name
   the session that holds the lock (from the owner JSON), and explain that
   findings will land in your followups location
   for the lock-holder (or the next retro) to action. Do not present a
   "Synthesis: Top N Actions" list as if the user should act on it — in
   degraded mode the actions route to the followups file, not the user.

Degraded-mode retros **never**:
- Write to `.claude/skills/`, `AGENTS.md`, or any workspace
  policy file.
- Open PRs that modify skill files.
- Create new branches in `$WORKSPACE` intended to land skill changes.

They **may** still:
- Open GitHub issues capturing findings (issues are metadata, not
  workspace state).
- Write raw retro-entry files under your retro log — that
  directory is append-only and outside the lock's scope.

### Phase 0.5: Autonomy Check

Before Phase 1, determine whether a human is available to confirm
actions. This is independent of lock state — autonomy changes what
Phase 5 is allowed to do:

- **Autonomous** if any of the following is true:
  - `<BUILD_CONTAINER>=1` in the environment (container session — no human at
    this terminal)
  - `CLAUDE_AUTONOMOUS=1` in the environment
  - The session was invoked via `/loop`, cron, or a scheduled trigger
    without an attached operator
  - You have no way to call `AskUserQuestion` and get a real answer
- **Interactive** otherwise (a human is watching and can approve).

Record which mode you're in. Phase 5 branches on both the lock state
(from Phase 0) and this autonomy signal — see the matrix below. The
default bias is conservative: **if in doubt, treat the session as
autonomous** and route findings to durable surfaces (GitHub issues,
raw retro entries, soft-path proposals) instead of applying changes
silently.

### Phase 1: Load Data

1. Gather evidence from the **current session**: what was attempted, the
   sequence of tool calls and decisions, what failed or required rework, what
   the user pushed back on or corrected, and where the outcome diverged from
   the initial plan. The source is the session's own transcript/journal —
   not the historical corpus.
2. Optionally check for historical consolidation artifacts (read-only archive)
   for context on recurring themes already tracked:
   ```
   $WORKSPACE/.tmp/consolidations/retrospectives/review-*.json
   ```
3. Display a summary: what was attempted, repo(s)/feature-ref touched,
   duration/complexity signal, and whether anything looks retro-worthy at all
   (see "Skippable" above — if nothing does, say so now and stop here).

If `$ARGUMENTS` specifies a feature arc or focus (e.g., "QueuePool exhaustion
fix"), scope the review to that part of the session rather than the whole
thing.

### Phase 1b: Ground in Real Artifacts (Required)

A session's self-narrative is a self-report — it says what the agent *thought*
happened. Before running the persona review, ground the highest-signal moments
in **real artifacts from this session**, so the review reasons from evidence
rather than from the agent's own account of itself.

1. Identify the 2–3 moments in the session most likely to generalize (friction,
   rework, a surprising failure, a near-miss, a decision that could have gone
   either way).
2. For each, pull the **actual evidence** — the real diffs, command output,
   error messages, or file states involved — not a paraphrase from memory.
3. Read them against what was intended (the task as given, or the plan stated
   earlier in the session) and note where **real behavior diverged from stated
   intent**. Those divergences are first-class inputs to Phase 3 — attach each
   to the persona best placed to judge it.

Keep this qualitative: no scores, no thresholds, no pass/fail. The output is
"here is where reality diverged from the contract," not a number. If a moment
can't be grounded in a real artifact, say so and fall back to the narrated
account — do **not** fabricate evidence.

**Why this rule exists:** reasoning about a session from its own narration is
an evidence proxy; the actual diffs/output/errors are the direct evidence.
When the direct evidence is on disk, prefer it — the same principle that
killed the branch-tip and aggregate proxies in earlier reasoning loops.

### Phase 2: Pattern Analysis

Present the session's candidate findings from Phase 1/1b. For each:
- Quote the grounding evidence (the diff, output, or error that anchors it — not just the narrated account)
- Show the recommended action, if any generalizes past this one session
- Note whether scope is `global` (workspace-wide), `local` (repo-specific), or purely `session` (worth recording but not actionable beyond this entry)

### Phase 3: Multi-Persona Review

**Dispatch each reviewer as an independent sub-agent. None may see another's
output.** Running all four personas by sequential self-adoption in one context
was the original design and it is wrong: the second adoption has already read
the first's findings, so any apparent agreement is contamination, not
corroboration. Every multi-reviewer panel worth running enforces this isolation
deliberately — reviewers who can see each other's findings converge on the first
one stated, which is the opposite of what a panel is for.

**Reviewer roster and dispatch order** (fixed, for reproducibility):
`dorothy` → `quine` → `eiko` → `occam`. These are the registered agent
stubs at `.claude/agents/<name>.md` — each is dispatchable today via the
`Agent` tool's `subagent_type` parameter, no new machinery required.

For each of the four, in order:

1. **Build the brief.** The sub-agent's prompt must contain **only**:
   - The reviewer's own role-skill contract: the full text of
     `.claude/skills/<name>/SKILL.md`.
   - The **Phase 2 pattern set** (the detected patterns, evidence counts,
     recommended actions, and global/local scope from Phase 2) — verbatim,
     not summarized.
   - The reviewer's focus questions (below).
   - A directive to reply with a **short, structured finding list** (2-3
     items), not prose commentary on the process.

   It must **not** contain: the other three personas' findings, this skill's
   own text beyond what's needed to describe the task, or any framing that
   presupposes what another reviewer will say.

2. **Spawn the sub-agent** via the `Agent` tool with `subagent_type: "<name>"`
   (i.e. `"dorothy"`, `"quine"`, `"eiko"`, `"occam"`).
3. **Wait for it to return** before dispatching the next. Sequential dispatch
   (not parallel) keeps token/cost accounting per-reviewer legible and matches
   the workspace convention (a resume-review panel Stage 5, an OSS-release panel Stage 2).
4. Record the reviewer's findings verbatim for Phase 4. Do not edit or
   summarize them into your own words before aggregation — synthesis happens
   in Phase 4, not here.

#### Dorothy (Developer Perspective)

Focus on:
- What architectural patterns should be codified from these fixes?
- Where did implementation friction come from? (tooling gaps, missing abstractions, unclear contracts)
- What would have made the fixes faster or prevented the need for sequential patches?
- Are there code-level rules or lint checks that would catch these issues earlier?

#### Quine (QA Perspective)

Focus on:
- What test coverage gaps allowed the issue to recur across multiple PRs?
- Were there cumulative breakage patterns (tests passing individually but failing in aggregate)?
- What testing patterns would have caught the systemic issue earlier?
- Are there test health practices that should become standard?

#### Eiko (Design Perspective)

Focus on:
- Were there user-facing failure modes that failed silently? (e.g., SSE streams hanging)
- What UX error feedback patterns should be standardized?
- How should reliability fixes incorporate UX considerations?
- Are there design system components needed for error states?

#### Occam (Process Perspective)

Focus on:
- What governance rules emerged? (e.g., "3+ sequential fixes should trigger architectural review")
- Should any recommendations become workspace policies in AGENTS.md?
- How should the retrospective system itself evolve?
- Are there process templates or checklists that would prevent recurrence?

If any sub-agent dispatch fails or returns no usable findings, note the gap
explicitly in Phase 4 rather than filling it in yourself from the pattern set
— a persona's slot with no independent finding is honestly "no signal from
this lens," not a stand-in written by the orchestrator.

### Phase 4: Cross-Reference Synthesis

After all four independent sub-agent reviews return:

1. **Identify convergence** — where did multiple personas, dispatched
   independently and blind to each other, flag the same underlying issue?
   **This convergence is now independent agreement, not sequential
   contamination** — as of an internal issue, each persona reasoned from the Phase 2
   pattern set alone, with no visibility into the other three personas'
   findings. Read it accordingly: two or more personas converging on the same
   issue from isolated contexts is real corroborating signal and should be
   weighted higher than any single persona's finding. (Before this fix,
   convergence across sequential self-adoptions in one context could not
   support that reading — the second-through-fourth personas had already seen
   prior output, so agreement could just as easily be anchoring as
   independent corroboration.)
2. **Rank by impact** — which changes would prevent the most future rework?
3. **Produce a top 3 actionable changes** list:
   - For each: what to change, where (file path or policy), who benefits, and expected impact
4. **Flag divergence** — where did personas disagree? These are decision points for the human.

### Phase 4.5: Verify Applicability (Required)

Before presenting the top-N list to the user, **every action that proposes editing a specific file must be verified against the current state of that file**. Retrospective recommendations have a natural latency — an earlier session in the same day (or a parallel lane) may have already applied the same change. Surfacing already-applied items as "pending" wastes the user's attention and produces phantom work.

**For each action in the top-N list that names a concrete file path:**

1. Read the target file (or grep for the key phrase, symbol, or rule the recommendation would introduce).
2. Classify the action as one of:
   - **Missing** — the recommended change is not present; keep on the list.
   - **Already applied** — the change (or an equivalent) is already in the file. Move to a separate "Already applied" subsection with a file:line pointer as evidence.
   - **Partially applied** — some sub-bullets are present, others are not. Split: keep only the missing sub-bullets on the active list.
3. If an action targets a policy location that does not yet exist (e.g., "add a new section to file X"), verify file X exists and grep for any near-neighbor wording that would make the proposed section redundant.

**Output format change:** the Phase 4 synthesis section must now include two lists:

```
### Synthesis: Top N Actions (Missing)
1. [Action] — [Where] — [Impact]
...

### Already Applied (verified)
- [Action description] — [file:line evidence]
...
```

If all recommended actions turn out to be already applied, say so explicitly — the retro review still has value as a confirmation loop, and "nothing to do, all three recommendations were already landed" is a perfectly good Phase 5 outcome.

**Why this rule exists:** verified 2026-04-10 during the first end-to-end retro run. The synthesis presented three recommended skill edits as pending. After human approval to apply all three, the agent checked the files and found that 2 of 3 were already applied earlier the same day by closeout flows from other retros (occam step-7 origin-in-sync gate, TDD regression-gate prove-it rule in both `tdd-test-writer` and `tdd-implementation`). Only the container venv hygiene subsection was genuinely new work. Without a verification step, the agent would have wasted a PR round-trip on redundant edits and eroded the human's trust in the synthesis output. 

### Phase 4.6: Propose engineering principles

A retro's whole point is that individual entries become **systemic** insight.
When Phase 4 synthesis surfaces a rule that **generalizes past the repo it was
learned in** — the qualification test — propose it to the scoped principles
registry (your engineering-principles file) rather than letting it age out as
one more incident note. This is the harvest feed `engineering-flow.md` §8
specifies (Gate 8 retro → principles harvest).

- **Test each candidate:** does it generalize past its origin repo? The
  provenance (PR/incident numbers) belongs in the record's `learned:` field, not
  in the rule. If it does not generalize, it is a repo-specific finding — file
  it as an issue (Phase 5 routing), not a principle.
- **Propose with `scope: repo:<name>` by default** — a new principle starts
  narrow; a human/Occam widens it (`repo:` → `family:` → `global`) later as an
  attribute edit, never a file move:

  ```bash
  node "scripts/propose-principle.mjs" \
    --id <kebab-slug> --repo <repo-shortname> --consumer <product|architecture|implementation|test|delivery> \
    --rule "The generalized imperative (no double-quotes)." \
    --learned "<incident/PR refs; source file:line>"
  ```

  Add `--dry-run` to preview. The proposal is validated (schema + duplicate id)
  and refused if malformed. Once merged, the `principles` payload of the
  AGENTS.md sync renders it into every repo whose scope it matches.

### Phase 5: Offer Next Steps

Phase 5 is a 2×2 matrix on lock state (from Phase 0) and autonomy
(from Phase 0.5). In all four quadrants, Phases 1–4 run unchanged —
Phase 5 only governs **what happens to the findings** afterward.

**Repo routing (required before filing any issue):** retro findings often
span multiple repos — do not default to filing everything in the config repo. Before
creating a GitHub issue for a finding, resolve the target repo:

1. Check the finding for **repo-specific signals**: file paths (e.g.
   `tests/test_actionable_errors.py` → a product repo), PR/issue cross-references
   (e.g. `an internal issue`), or explicit repo mentions in the evidence.
2. If the finding targets code, tests, or config in a specific repo, file
   the issue **in that repo** (e.g. `<owner>/<repo>`).
3. If the finding targets workspace-level governance, skills, or
   orchestration policy (files under `.claude/skills/`,
   `AGENTS.md`, `docs/`), file in your workspace-config repo.
4. If ambiguous, file in the repo whose codebase the fix would touch.
   When a finding spans multiple repos, file one issue per repo with
   cross-references.

This prevents the failure mode from the 2026-04-16 retro where a
a product repo-specific test finding was filed in the config repo because the
retro ran from the config-repo workspace. See an internal issue.

**Cell A — Lock acquired + interactive human:**

Normal, present-day retro flow. Ask the user:
1. Should we draft the recommended policy/template/checklist changes?
2. Confirm the session entry (below) before it's written — anything to add
   or cut?

After the user confirms, apply the approved changes directly (you hold
the write lock), then write the session's retro entry (see "Producer
output" below). Then release the lock:

```bash
scripts/retro-lock.sh release
```

**Cell B — Lock acquired + autonomous (no human):**

You hold the lock, but you must **not** apply skill edits on your own
authority — skill changes deserve a human decision. Instead:

1. For each Missing action from Phase 4, open a GitHub issue in the
   **target repo** (see repo-routing rule above) with:
   - Title: `[retro] <one-line summary of the finding>`
   - Body: the synthesis evidence, the proposed change, the affected
     file path, and an explicit **Decision needed** section listing
     the open questions for the human.
   - Labels: `retro`, `awaiting-human-decision`
2. Write the session's retro entry to your retro log (see
   "Producer output" below), summarizing what you found, which issues
   you filed, and why no changes were applied in this session.
3. Release the lock so the next session (possibly with a human) can
   pick up the filed issues and apply changes.

Do **not** file a skill-change proposal in this cell — you have the
lock, so write access is not the constraint; the missing thing is a
human decision, which an issue captures better than a soft-path
proposal.

**Cell C — Lock held by another session + interactive human:**

Degraded mode, human present. Do not apply changes in this workspace
(the other session may be editing the same files). Instead:

1. Explain to the user that a parallel retro session holds the lock
   (name the session from the owner JSON in Phase 0) and that findings
   will route through the soft path.
2. Ask the user which of the Phase 4 Missing actions they endorse
   filing as proposals. Skip the ones they reject.
3. For each endorsed finding, call your skill-change proposal process
   with a shared `session_context` (e.g. `"Retro 2026-04-14 QueuePool
   arc (degraded)"`) and `source: retro-degraded` in batch mode.
4. Write the session's retro entry to your retro log (see
   "Producer output" below) — writing raw entries is outside the lock's
   scope even in degraded mode.
5. Report back: list the proposal file paths and the session_context
   that groups them. The lock-holder (or the next drain run) picks
   them up.

No lock release call — degraded sessions never acquired it.

**Cell D — Lock held by another session + autonomous (no human):**

Strictest cell. No human to confirm, no lock to write with. For each
Missing action from Phase 4:

1. File a skill-change proposal with shared `session_context`
   and `source: retro-degraded`, same as Cell C but without the human
   triage step — you file *every* actionable finding.
2. Additionally, for any finding where the synthesis raised a question
   the human must answer (e.g. "should this rule apply to skill X too?",
   "is this policy too strict?"), open a GitHub issue in the **target
   repo** (see repo-routing rule above) with labels `retro` and
   `awaiting-human-decision`, and reference the proposal slug in the
   issue body so the reviewer can cross-check.
3. Write the session's retro entry to your retro log (see
   "Producer output" below), noting that this was a Cell-D run
   (autonomous + degraded), which proposals were filed, and which
   issues were opened.

No lock release call.

## Producer output: write the session entry

Regardless of which Phase 5 cell ran, the session retro's terminal step is
writing an entry to your retro log — this skill is a **producer**
for the corpus, not just a reader of it. Write a hand-written markdown file
with YAML frontmatter matching the corpus convention so `retro-consolidation`
can parse it later alongside every other session's entry. The entry should
capture: what was attempted, the grounded findings from Phase 1b, the
per-persona findings from Phase 3, the synthesis from Phase 4, and what (if
anything) was routed where in Phase 5.

**Every finding written to the corpus entry must be typed `prose | wrapper |
gate`**, per the inspectability test in your completion-and-retro policy
("Retro Finding Classification" — apply that test here, it is not redefined
in this skill). Do not write an untyped finding.

Hand-written markdown is the only mechanism today that can satisfy this: the
per-finding `type` field, and the guard-class `identified-at`/`landed-at`
timestamp pair below, have no equivalent in your ledger-logging script
— that script writes one fixed-shape entry (`worked`/`didnt`/`recommendation`)
with a document-level `type: retrospective` key that is a naming collision with
the per-finding `type` this section requires, not a match. Do not use
`log_feature_retrospective.sh` to satisfy the typed-finding requirement.

**Guard-class findings (`gate` or `wrapper`) carry extra obligations before
they're filed:**

1. Record `identified-at` in the corpus entry now, at the moment the finding
   is first surfaced by this session. Leave `landed-at` unset — it gets
   filled in later, when the guard actually merges (see
   your completion-and-retro policy → "Retro Entry Format — Time-to-Guard").
2. Run the preempt check before filing: is this defect **active** (recurred,
   or could immediately recur, in this or the most recent session) **and**
   **recurring** (a prior retro entry or prior issue already covers the same
   failure mode)? If both hold, do not leave the finding for the next
   planning pass — apply two separate, sequential label steps to its
   tracking issue immediately, per your completion-and-retro policy →
   "Preempt Signal for Active, Recurring Defects": `ready` via
   `scripts/gh-issue-ready.sh --repo <owner/repo> --issue <n>` — which also
   requires `--buildable-settings` / `--buildable-perms` / `--buildable-authority`
  , or `--operator` in their place — then
   `moscow:must` via `gh issue edit <n> -R <owner/repo> --add-label
   moscow:must` as a separate step (orchestrator/Occam role only — an
   implementer lane reports the finding upward instead, per
   your label-governance-gate hook). This is the existing
   lifecycle run early, not a separate mechanism.

If Phase 1 concluded the session should be **skipped** (see "Skippable"
above), do not write a full entry — a skipped session is not corpus evidence
of anything. It is fine to not write anything at all in that case.

## Output Format

```
## Session Retrospective: [Session Topic / Feature Arc]

### Session Summary
- Repo(s): [list]
- What was attempted: [1-2 lines]
- Grounded moments reviewed: N
- Patterns detected: N

### Dorothy (Developer)
[2-3 key findings with evidence references]

### Quine (QA)
[2-3 key findings with evidence references]

### Eiko (Design)
[2-3 key findings with evidence references]

### Occam (Process)
[2-3 key findings with evidence references]

### Synthesis: Top N Actions (Missing — verified against current files)
1. [Action] — [Where] — [Impact] — type: prose|wrapper|gate
   (guard-class only: identified-at: [timestamp], landed-at: TBD)
2. [Action] — [Where] — [Impact] — type: prose|wrapper|gate
   (guard-class only: identified-at: [timestamp], landed-at: TBD)
...

### Already Applied (verified)
- [Action description] — [file:line evidence]
...

### Divergence Points
[Where personas disagreed — needs human decision]
```

## Interaction Rules

- Present findings, not process descriptions. Lead with insights.
- Quote specific ledger entries as evidence (by repo + feature-ref).
- Each persona section should be 2-3 focused findings, not exhaustive lists.
- The synthesis must produce concrete file paths or policy locations, not abstract advice.
- One question at a time to the user in Phase 5.

---

*Part of [kromatic-dev-stack](https://github.com/Kromatic-Innovation/kromatic-dev-stack) by [Kromatic](https://kromatic.com). Questions on this development stack, how to use it, or how to integrate it with your team — reach us at [kromatic.com/contact-us](https://kromatic.com/contact-us).*
