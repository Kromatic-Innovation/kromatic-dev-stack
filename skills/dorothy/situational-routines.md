# Dorothy — Situational Routines

Companion to `dorothy/SKILL.md`. Each routine applies only in its trigger context (removing shared code, triaging a reported bug, finding docs-only debris, verifying a UI lane, planning a release, batching same-type PRs, dispatching background work, finding stashes at closeout). Rules only — incident history lives in your retro log.

## Shared code removal audit

Before removing, renaming, or significantly refactoring any shared fixture, helper, hook, mixin, or utility:

1. Search for all dependents: `grep -rn "<symbol_name>" --include="*.py" .` (or the language equivalent).
2. List every file that imports, calls, or references the target.
3. Verify each dependent has been updated (or has a plan to be) in this same PR/batch.
4. If dependents span multiple PRs or repos, coordinate removal order with Occam before proceeding.
5. Never remove shared code in a PR that does not also update all in-repo dependents.

Removing shared fixtures without checking dependents causes cascading test failures that take multiple fix cycles.

## Bug triage routine (before touching code)

When a user reports a bug tied to a specific URL or interaction, run this before editing anything — it prevents the "fixed the wrong component" failure mode.

1. **Resolve URL → route → component tree.** Find the route definition, then the rendered component; walk the tree far enough to identify *every* component that could own the interactive element the user describes — including conditional embeds (`{stage === "X" && <OtherPage />}`), portals, and wrapper layouts.
2. **Grep for the interactive element inside only that subtree.** Don't grep repo-wide and assume the first hit is right. If the element appears in multiple files, narrow to those actually reachable from the user's URL.
3. **Trace the full request path before shipping any fix.** Frontend handler → API payload → backend parser → DB write. A fix that patches only one layer without verifying the others can leave the observable behavior unchanged.
4. **Verify the traced component is actually mounted.** Log or breakpoint the component you're about to edit and confirm its code runs when the user performs the action. If you cannot confirm this, do not ship a fix — you are probably tracing the wrong file.
5. **If a second fix attempt fails on the same reported bug, stop patching.** Re-run steps 1-4 from scratch instead of adding more code to the path you already suspect. Three-plus sequential fix PRs on one symptom signals the suspected component is wrong, not that the fix is wrong.

## Docs-only cleanup flow (when discovered unexpectedly)

When preflight finds docs/process-only dirty files:

1. If currently on a non-`develop` branch and `develop` exists: stash current WIP, switch to `develop`.
2. Apply only docs/process changes.
3. Commit and push docs/process changes as a separate commit.
4. If you switched branches: switch back to the original branch, restore the stash.

## Browser verification (UI/frontend lanes)

- Run the dev server and exercise the feature in a real browser before declaring local verification complete. Type checks and unit tests verify code correctness, not feature correctness.
- **Touch-UX verification:** for any lane whose acceptance criteria mention mobile, touch, or tap interaction, browser verification must use Playwright `.tap()` under DevTools touch emulation (or a real mobile device profile via `browser.newContext({ hasTouch: true, isMobile: true })`), **not** `.click()`. Chromium's `:focus-visible` heuristic and input-modality tracking distinguish keyboard/mouse focus from touch focus; `.click()` and synthetic `dispatchEvent` register as mouse activations, so any code path that branches on `:focus-visible` or input modality (e.g. show-on-keyboard-focus-only handlers) passes under `.click()` while failing on real touch. Write the step as `await page.tap(selector)` against a touch-enabled context and explicitly assert the touch-specific behavior (tap toggles the tooltip, tap-elsewhere dismisses, no focus/click race). Reporting "touch verified" with `.click()` is a false positive — claim only the input modality actually exercised.

## Release planning routine

- Prefer thin vertical slices over horizontal subsystem staging.
- Every planned release must be functional for at least one real actor.
- Do not plan or ship half-built platform code that lacks a complete end-to-end user path.
- Use end-state epics as stable parent containers, then assign child issues to concrete release slices.
- Frame release slices as JTBD for the primary actor they serve.
- Every release issue should include explicit acceptance criteria for:
  - actor-complete end-to-end behavior
  - unit coverage for new domain logic
  - integration coverage for persistence and service boundaries
  - contract coverage for API and MCP surfaces where applicable
  - E2E coverage for the actor-visible flow
  - Playwright coverage when the release includes a browser-mediated human workflow
- Prefer growing a working capability across releases over laying incomplete subsystem foundations for a later release.
- If a proposed release does not leave the product usable for a real actor, narrow the slice or defer the work.

## CI cost discipline (when planning a batch of same-type work)

Fires when you are about to open more than one PR for work of the same kind, or
when deciding whether a change needs the full staging cycle.

- Local testing (your build container or native) is the primary gate. GitHub CI is a secondary failsafe that provides Seer review and Playwright e2e — it is not the inner development loop.
- When sweeping multiple issues of the same type (backend infra, test cleanup), work them on local branches, validate locally, and consolidate into 1-2 PRs per logical batch. Do not create one PR per issue when fewer PRs would cover the same ground.
- Reserve the full PR → develop → staging → Playwright cycle for user-facing behavior changes (UI, API contracts). Backend infrastructure changes with no user-facing impact need only a consolidated PR through develop CI.
- Every push, PR, and retry triggers billable GHA minutes. Minimize CI runs by validating locally first and consolidating pushes.

## Background-work wake-ups (when dispatching a subagent or background job)

Fires whenever you dispatch an Agent-tool subagent or a `run_in_background` Bash
job, and whenever you are tempted to schedule a check on work already running.

- **No backup `ScheduleWakeup` for harness-tracked background work (enforced default, not advice).** Subagents (Agent tool) and `run_in_background` Bash already re-invoke you via a completion `<task-notification>` when they finish — that IS your wake-up. Do NOT ALSO set a `ScheduleWakeup` as a "backup check" on that same job. A backup wakeup that a completion notification makes redundant fires anyway on a stale prompt describing state you already handled, burning a full turn re-deriving "that's already done" (and stale-state prompts occasionally trigger incorrect re-work). With N concurrent background jobs each notifying separately, backup wakeups multiply the waste. Reserve `ScheduleWakeup` **strictly for EXTERNAL, untracked state** — CI runs, remote queues, deploys, third-party jobs the harness does not track — and set a **long fallback interval**, never a short poll. If you catch yourself pairing a background dispatch with a wakeup "just in case", delete the wakeup: the notification is the mechanism. (Refs an internal issue.)

## Stale-stash audit (when `git stash list` is non-empty at closeout)

Fires at the pre-handoff cleanup in `SKILL.md` → "Next Step", and only when
`git stash list` returns entries.

- **Audit and triage stale stashes.** Run `git stash list`. Treat every stash as prior-agent debris unless you created it this session. — every entry is from a prior agent session. Triage each per the single default: a stash whose content is provably already on a merged branch is droppable; everything else gets parked to a branch, not dropped. "Provably" means you diffed it. Do not leave stashes behind across session boundaries.
