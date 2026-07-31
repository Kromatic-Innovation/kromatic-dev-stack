# Occam — Session-Continuity Gate

Companion to `occam/SKILL.md` Gate 0. Read at intake, and again whenever context balloons mid-orchestration. Rules and templates only — the incident history that justified this gate lives in your retro log, not here.

**Re-read the guard set at every checkpoint.** A guard that lands mid-session (a new `scripts/gh-*-ready.sh` check, a new hook, a new policy line) only binds the session it was written for if that session actually re-reads it. A guard existing is not the same as a guard being applied — the 12-minute miss in the 2026-07-29 retro was a guard that landed before the session ended but was never re-read by it. At every point this file is consulted (intake, context-balloon re-check, and immediately before acting on any of the three outcomes below), re-check for guards that landed since the session started, not just the guard set as of intake.

## What this gate is for

Some planning sessions burn a lot of context debating things it doesn't make sense to keep building in-session — restarting would be cheaper. This gate makes that call **Occam's**, not an extra human turn asking for a restart prompt. The decision is advisory: Occam states the recommendation and hands over the prompt(s); the human executes the restart or compaction. Occam does not self-terminate and does not auto-compact.

## Decision inputs

Weigh all three; none is individually decisive:

- **Model vs task fit** — check the session model against your model-routing guidance for interactive orchestration. If a lighter/interactive-tier model is driving an extended, constant/always-on orchestration session that should be Opus/Sonnet-grade (e.g. a fast interactive-tier model held open for a long multi-repo sequencing run), flag the mismatch and recommend a model reset alongside whichever continuity outcome applies — the concern is burn rate under sustained use, not a capability ceiling (Fable is frontier-tier for one-off synthesis; it is frontier-tier for one-off synthesis).
- **Context used** — roughly how much of the window is consumed.
- **Context relevance** — whether what's consumed is durable orchestration state (decisions, plan, issue graph, lane status) or spent debate/dead-ends that won't inform the build going forward.

## Heuristic bands (judgement guides, not hard cutoffs)

- **Low context used, any relevance** — continue. Not worth interrupting for a little context.
- **High context used, mostly relevant** (durable plan/decision/lane state) — continue. A lot of *relevant* context isn't itself a reason to restart.
- **High context used, mostly irrelevant** (extended debate, abandoned approaches, dead-ends) — compact-and-continue: the relevant fraction is worth preserving, the rest isn't worth carrying forward turn-by-turn.
- **Very high context used and mostly irrelevant, OR a model mismatch on top of either context condition** — new-session: cheaper to restart clean (with the right model) than to keep paying the tax on every subsequent turn.

These are bands to reason from, not thresholds to compute against — a session at moderate usage with a clear model mismatch can outweigh a session at high usage that's all relevant signal.

## Outcome definitions and templates

### Prompt-file convention

Any generated prompt below is written to a `.md` file on the Desktop via the Write tool, and the chat response references the file path rather than inlining the full prompt text (pasting from chat sometimes mangles linebreaks; copying from an on-disk `.md` avoids that).

- Compaction prompt → `<scratch-dir>/<slug>-compaction-prompt.md`
- Continuation prompt → `<scratch-dir>/<slug>-continuation-prompt.md`
- Restart prompt → `<scratch-dir>/<slug>-restart-prompt.md`

`<slug>` is a short kebab-case identifier for the session/task (branch name, issue number, or a 2-4-word summary). The continue outcome produces no prompt and needs no file; compact-and-continue produces both the compaction and continuation files; new-session produces the restart file only.

### Continue

No prompt. State the one-line rationale, re-read the guard set for anything landed since intake, and proceed.

> *Example rationale:* "Context is mostly the issue graph and lane status we need going forward — continue."

### Compact-and-continue

Two prompts, kept explicit and separate — do not conflate them into one blob. Write each to its own file (`<scratch-dir>/<slug>-compaction-prompt.md` and `<scratch-dir>/<slug>-continuation-prompt.md`) and reference both paths in chat rather than inlining the full prompt bodies:

**(a) Compaction prompt — strictly WHAT TO REMEMBER.** Durable facts/decisions/state only. No goals, no next actions.

```
Compaction prompt:
Preserve only the following before compacting:
- Decisions made: <list, one line each>
- Current state: <issue graph / lane status / branch-PR mapping>
- Constraints discovered: <anything that changes how future turns should proceed>
Discard: <debate threads, abandoned approaches, dead-ends — name them so they don't get re-summarized>
```

**(b) Continuation prompt — the GOALS/next actions.** What happens after compaction, addressed to the still-running (now-compacted) session.

```
Continuation prompt:
Goal: <the orchestration's current objective, unchanged>
Next actions: <the next 1-3 concrete steps, referencing the preserved state above>
```

Re-read the guard set before resuming Next actions — a guard that landed during the debate that just got compacted away still binds the resumed session.

### New session

One self-contained restart prompt — goal plus a pointer to context, not a context dump. Write it to `<scratch-dir>/<slug>-restart-prompt.md` and reference the path in chat rather than inlining the full prompt body. If a model mismatch was detected, name the replacement model explicitly.

```
Restart prompt:
Start a new session[, under <model>]. Goal: <the orchestration's objective>.
Context pointer: <issue #, PR #, branch name, or a short paragraph of durable state — not the debate that got us here>.
Next action: <the first concrete step in the new session>.
Re-read the guard set before the first concrete step — the old session's guard-set snapshot does not carry over.
```

## Worked examples

**Continue.** A multi-repo fanout is 40% into its context window; everything consumed so far is issue-graph decisions, dispatch briefs, and lane status Occam needs for the rest of the run. *Rationale:* "Context used is moderate and entirely relevant — continue."

**Compact-and-continue.** An interactive planning session under Opus has been going back and forth for an hour on whether to use approach A or B for a schema migration; the debate consumed most of the window before landing on B. The remaining lanes just need to execute against the now-settled decision.
- *Rationale:* "High context, but half of it is a settled-then-abandoned debate — compact the decision, drop the back-and-forth."
- Compaction prompt: "Preserve: decided on approach B for the schema migration (reason: X); lane graph for the open issues unchanged. Discard: the approach-A exploration and the three intermediate proposals that were rejected."
- Continuation prompt: "Goal: execute the migration per approach B. Next actions: dispatch lane for the first issue, then the second once it merges."

**New session (with model mismatch).** A planning session is running under Fable (a lightweight interactive model) and has drifted into deep multi-repo orchestration reasoning — sequencing five lanes across three repos — held open long enough that the constant/always-on burn rate outweighs Fable's per-task cost advantage, and context is past 80% with much of it exploratory dead-ends.
- *Rationale:* "Model mismatch (Fable held open for Opus/Sonnet-grade orchestration burns cost it wasn't priced for) plus high irrelevant context — restart clean under the right model."
- Restart prompt: "Start a new session under Opus. Goal: sequence the five-lane rollout across repos A/B/C per the config repo#NNN. Context pointer: issue #NNN and its linked child issues carry the current plan; PR #MMM is lane A's in-flight branch. Next action: verify lane A's PR status, then resume dispatch for lane B."
