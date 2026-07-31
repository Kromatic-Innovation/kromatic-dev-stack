# Occam — Closeout & Retrospective Procedures

Companion to `occam/SKILL.md` Gate 8 (Closeout). Read at closeout. Rules only — the incident history that justified each rule lives in your retro log, not here.

Run the steps below in order. Two are **BLOCKING**: the origin-in-sync gate and the retrospective. No lane is DONE until both pass.

## Scheduled-runtime closeout criteria

Before closing **any** epic — non-runtime epics included, where the exemption is partial rather than a pass — apply your autonomous-runtime contracts → "Closeout criteria for scheduled-runtime epics (Required)" from the text, not from memory.

## Epic-close child check (every epic/container close)

These epic-specific checks are the reasoner-layer verification steps that
your issue-tracking policy → "Issue-Closing Authority
Contract (Required)" requires before a reasoner closes an epic — read that
contract for the general human/reasoner/mechanical boundary this section's
checks sit under.

Before closing any epic or container issue, enumerate its child references (`- [ ]` task lists, `repo#N` mentions) and check their live states. Never close an epic that still has open children (one epic was closed with all 11 children open); conversely, do not leave a container open when every tracked item is done — close it or explicitly absorb the remainder into a successor (another sat open with all items complete). An epic closes when, and only when, its children are resolved or explicitly re-homed.

**A closed blocker is not a delivered blocker — check `stateReason`, not just state.** When an epic's `blocked_by` set goes all-closed, that is the moment to verify delivery, not the moment to close. Run `gh issue view <n> --json state,stateReason` on each blocker:

- **`NOT_PLANNED`** is the sharp case: it satisfies the edge while near-guaranteeing the dependent acceptance criterion is *unmet*. The work was abandoned, not done. Re-verify the AC that blocker was carrying before closing anything.
- **`COMPLETED`** still warrants a delivery check when the epic's AC is broader than the child's: a child can close having shipped a fraction of what its parent assumed of it.

Confirmed 2026-07-25 — three independent instances in one 13-issue audit: one epic had all 22 edges closed, but a child (the generic deploy-guard) closed `NOT_PLANNED` and was never built, leaving the epic's main-pinned-deploy Done-when unmet; one epic was dispatched when its blocker closed, and the lane correctly refused because that dependency had delivered log-path tolerance only, repointing no consumer; one epic's per-repo pins all closed while its dependabot AC went unchecked — an empirical sweep then found 3 of 8 repos had no `dependabot.yml` at all. An all-green edge set is a prompt to verify, not a verdict.

## Branch, worktree, and stash cleanup (dispatched, every lane)

**Delegate the evidence-gathering; keep the destructive calls.** Bulk
evidence-reading (stash diffs, supersession proofs, dependency-edge reads) is
exactly the kind of expensive read whose *conclusion* is the only part closeout
needs — arriving at the point of maximum context pressure. Dispatch a narrow
cleanup sub-agent to gather and recommend, and have it report back rather than
act. It should return what it safely applied (deleting the lane's merged local
feature branch, pruning already-merged-clean local branches, removing
merged-and-clean worktrees) and, separately, every item it **declined** to act
on with the evidence behind each.

**Ordering is BLOCKING:** cleanup runs AFTER the origin-in-sync gate below has
parked anything it intends to park. Cleaning first destroys the evidence the
sync gate needs.

Dropping stashes, force-deleting branches, and force-removing worktrees stay
with the orchestrator — never delegate them:

- **Stash triage** — for each stash the cleanup pass surfaced, decide from the
  evidence already gathered rather than re-reading diffs. The single default:
  **a stash whose content is provably already on a merged branch is droppable;
  everything else gets parked to a branch, not dropped.** "Provably" means you
  diffed it, not that it looks familiar. A stash is somebody's uncommitted work
  until you have shown otherwise, and dropping one is unrecoverable.
- **Unmerged branch whose upstream is gone / dirty tree off the base branch** —
  decide per the disposition rules below.
- **Live-locked worktree** — treat as a live foreign lock and never
  force-remove it (see `occam/dispatch-briefs.md` → "The hard cleanup rule").
- **Scope expansion** — if cleanup surfaces work wider than the lane was
  authorized for, confirm whether that was intended; if not, re-scope and
  re-dispatch rather than approving it after the fact.

Handle these yourself as well:

- **Status the repo's locks first, then act on liveness.** Run `scripts/ws-lock.sh status <owner/repo>`. Leave every tree with a **live** lock untouched — do not reset, clean, or remove it (it belongs to an in-flight holder, possibly another operator). Only `scripts/ws-lock.sh reap <owner/repo>` to clear **dead + expired** locks before cleanup; `reap` never removes a live or recently-heartbeating holder.
- Release the workspace lock this lane acquired at dispatch: `scripts/ws-lock.sh release <owner/repo> --path <abs>` (release it from the same checkout you acquired it in). Release only when no other in-flight lane targets the same tree; if sibling lanes are still running against it, `heartbeat` to renew instead of releasing. An unreleased lock auto-frees only once its PID is dead AND the grace TTL has elapsed.
- **Release the automated-dispatcher lock.** If Occam took a repo lock or presence heartbeat on a repo to make a local lane visible to an automated dispatcher (see `occam/dispatch-briefs.md` → "Automated-dispatcher lock"), release it here: your lock helper's release command. This is a SEPARATE lock from the `ws-lock` checkout lock above — the `ws-lock` release does not clear it. Per-**repo**, not per-lane: release ONLY when the LAST lane targeting that repo has closed; if sibling lanes are still building it, leave the lock (extend `--until` if it is near expiry) and unlock only when they finish. Verify with `repo lock-status --repo <owner/name>` → `{"locked": false}`. The `--until` TTL is the crashed-session backstop, not the release path.
- **Agent-fanout worktrees (locked by a dead pid) need force-removal.** A routine cleanup pass removes only already-merged-clean worktrees with plain `git worktree remove`; an agent-created worktree still holds a pid lock after its process exits, so plain removal fails with `cannot remove a locked working tree`. Handle these separately:

  ```bash
  for wt in $(git worktree list --porcelain | awk '/^worktree .*\.claude\/worktrees\/agent-/ {print $2}'); do git worktree remove -f -f "$wt"; done
  ```

  Single `-f` is not sufficient — the pid lock requires `-f -f`. Then prune the `worktree-agent-*` local branches the worktrees pinned.
  - **Guard before force-remove:** the `-f -f` form removes a worktree even with a dirty tree. Before removing each `<path>`, run `scripts/ws-lock.sh guard <path> "worktree remove"`. If it exits non-zero, the worktree has a **live foreign lock** — STOP, name the holder in the report, and leave it; do not `-f -f` over another holder's live work.
  - **CD out first:** before `git worktree remove -f -f <path>`, `cd to a path outside the worktree` (or the relevant primary checkout). The shell retains CWD across commands; if a previous command left it inside a worktree being removed, the remove succeeds but the next command fails with `Unable to read current working directory`.
- Local staging/main — **check before deleting, in this order**:
  1. Run `git worktree list`. If any worktree has `staging` or `main` checked out, **skip that branch entirely.** Deploy worktrees pin `main` by design, and this is true in the eight `deployPath` repos that have no `AGENTS.md` carve-out of their own — not just in the config repo.
  2. Read the repo's own `AGENTS.md`. If it documents a build-source carve-out, skip. your workspace-config repo is one, **and closeout runs there.**
  3. Only if neither applies: `git branch -d staging; git branch -d main` — **never `-D`, never `2>/dev/null`.**

  **Do not use the refusal as the check.** Git refusing to delete a
  worktree-held branch is a backstop, not a detection mechanism — it disappears
  the moment the worktree is pruned, which is exactly the failure chain
  `AGENTS.md` documents. If a refusal does surface, report it: an assumption
  above was wrong. See your branch-and-promotion policy.
- Verify only `develop` remains locally, and `git stash list` is empty.

## Post-orchestration parallel-merge reconciliation

Before declaring the session DONE, audit what merged that you did NOT initiate during the session window:

```bash
git fetch origin develop --quiet
gh pr list --repo <owner/repo> --state merged --search "merged:>=<session-start-ISO>" --json number,title,headRefName,mergedAt
```

For each PR you did not initiate, check whether it (a) reverts work you shipped earlier this session, (b) renames or moves files referenced by your in-flight briefs, or (c) introduces conflicting changes to shared infrastructure. If any of (a)/(b)/(c) hits, reconcile the divergence in the final report — do not declare DONE on a stale mental model. Run at minimum once before the final report; for >2-hour sessions, also after every major lane merge.

## Post-rename issue-body sweep (conditional)

When a lane merges a commit that renames directories referenced from outside git (issue bodies, retro entries), stale references become invisible bit-rot:

```bash
scripts/grep_stale_issue_paths.sh --commit <rename-sha> --repo <owner/repo>
```

Re-run with `--apply` to post an amendment comment on each matching issue. Skip when the lane did no renames (`git log -1 --diff-filter=R --name-status <sha>` is empty).

## Experiment-registration verification (BLOCKING — for experiment builds)

Fires whenever any lane this session **registered, modified, or enabled an experiment** — detected by code-signal, not just issue label (see `issue-graph-preflight.md` → "Experiment issue gate"): a diff touching `template_ab.py` / `ABTestDefinition` / `register_test` / an experiment-registry / bucketing or segment-split code; a new or flipped experiment axis flag (`<EXPERIMENT_FLAG>=*`, variate-content, an A/B cookie or Fly secret); a new `docs/experiments/*.md`; or an issue/PR whose subject is an A/B, variant, or arm.

A build issue closing via `closes #N` does **NOT** satisfy this — a build issue and an experiment-tracking issue are distinct, and the experiment outlives the build. Before DONE, confirm the live experiment has its governance artifact:

1. **Tracking issue** — an `experiment:running` issue exists with `lane:<slug>` and the Perlman SMART brief (hypothesis, arms, primary metric, decision rule, timebox, lane-reference SHA). If the only issue is a `type:feature` build issue, create or relabel a tracking issue — never let an enabled experiment run untagged.
2. **Due date** — Project `Start date` / `Target date` set on the org board (Target = the readout/decision date). This is what surfaces it in the Experiments Roadmap; without it the experiment silently extends past its timebox.
3. **Lane registry** — your experiment-lane registry `currently_running` updated for the touched lane, and your in-flight portfolio regenerated from its generator. If the effort touched a **shared audience or channel**, also clear its `currently_running` in the shared cross-product registry — a lane left marked running blocks the next experiment on that surface.

If any of the three is missing, the lane is **not DONE** — create the artifact before declaring closeout. (Origin incident 2026-06-29: the newsletter repo#573 built and enabled the `summary_present` axis and closed on its PR with none of the three; the live experiment had no analyzable artifact until a follow-up filed the newsletter repo#599 + dates + lane update. This gate exists so that never recurs.)

## Cost-to-mergeable ledger append

Best-effort, non-blocking. After a lane reaches its closure outcome (merged PR, escalation, or stall) and before the retrospective step, append one row to the shared cost-to-mergeable ledger so downgrade decisions in your model-routing guidance have evidence to point at. Schema: your cost ledger doc.

```bash
scripts/cost_to_mergeable_append.sh \
  --lane-ref "<repo>#<issue-number>" \
  --repo "<owner/repo>" \
  --models "<model[,model2,...]>" \
  --work-class <planning|overnight-orchestrator|implementation|mechanical|review> \
  --closure-outcome <reached-gate|escalated|stalled> \
  --gate-reached <pr-merged|ci-green|draft-pr-opened|...> \
  [--tokens-total <n>] [--cost-usd <n>] [--pr-url "<url>"] \
  --source occam-closeout
```

- Always safe to run: on any error (missing required field, unwritable ledger dir) the script warns to stderr and exits 0 — it must never block or fail a closeout.
- Fill `--tokens-total` / `--cost-usd` only when the harness actually surfaces them for the session; omit rather than estimate.
- The ledger lives at `~/.local/state/token-economy/cost-to-mergeable.jsonl` by default (override via `COST_TO_MERGEABLE_LEDGER` or `--ledger`) — host state, not repo-committed.

## Origin-in-sync gate (BLOCKING)

The next session must not discover unpushed commits or orphaned working-copy changes from this one. For every repo touched:

- `git status --porcelain` and `git log @{u}.. --oneline` (or `git log origin/<branch>..<branch>`) must BOTH be empty before the lane can be marked DONE.
- Unpushed commits that belong to this lane → push them.
- Unpushed commits from a *prior* session (different author timestamp, unrelated subject, orphaned by an interrupted closeout) → STOP and escalate to the human; never silently push or discard.
- Uncommitted changes → either (a) committed and pushed as part of this lane, (b) committed to a clearly named WIP branch with a TODO marker in the commit message, or (c) parked in a named stash with a human-readable message AND a your ledger-logging script entry so the next session can find it. Dangling untracked files that do not belong to the lane → report to the human, never delete.
- Untracked files (`??` lines) → same treatment: commit if lane-owned, else report (not delete).
- **AskUserQuestion ordering when escalating prior-session debris:** order options by likely correctness, not conservatism. `(Recommended)` sits on option 1: (1) commit the debris to `develop` and build new work on top — preserves both without a reunification step; (2) park on a named WIP branch with a TODO marker — reserve for genuinely questionable or incomplete work; (3) discard after explicit user confirmation — only when clearly superseded. Parking-by-default forces an avoidable end-of-session reunification step and fragments history.
- Exception: submodule content changes (`modified: <submodule> (untracked content)`) are out of scope for the parent repo's lane — leave alone but note in the lane status report.
- **Remote-credential hygiene:** `git remote get-url origin` — if the URL embeds a user token, report THAT a token is embedded and that the remote must be re-pointed to the credential-helper form. Never quote, echo, or paste the URL itself \u2014 lane reports land in PR comments and issue bodies, so echoing it publishes the token; never leave human PATs baked into remotes that agents push through.

## Retrospective (BLOCKING — before DONE)

A `PostToolUse` hook on `gh pr merge` (your post-merge-retro-reminder hook, wired in this repo's `.claude/settings.json`) nudges you to log a retro once a session has merged `RETRO_NUDGE_THRESHOLD` PRs (default **4**) without a retrospective entry logged to your retro log since counting began — advisory only, never blocking. Logging a retro clears the debt (resets the per-session counter), so the nudge re-arms only after N *more* un-retro'd merges. It exists precisely for the long session that keeps merging and never hits a natural DONE (where the `Stop`-triggered `retro-reminder.sh` never fires). Tune with `RETRO_NUDGE_THRESHOLD`; silence both retro nudges with `SKIP_RETRO_REMINDER=1`. If the nudge appeared and you reached DONE without logging, the closeout is not complete.

```bash
bash scripts/log_feature_retrospective.sh \
  --repo <repo-name> \
  --feature-ref <issue-ref> \
  --closure-event <merge_to_develop|direct_develop_complete> \
  --branch <branch-name> \
  --worked "<what went well in this orchestration run>" \
  --didnt "<what caused reruns, delays, or friction>" \
  --recommendation "<concrete improvement suggestion>" \
  --scope <global|local> \
  --change "<specific change to implement>" \
  [--links "<PR/issue URLs>"]
```

Must cover: development improvements from the run; cycles that had to rerun (test failures, permission prompts); process friction and tooling gaps.

- **Repeated-friction trigger:** if the session hit the same failure mode 2+ times (same permission prompt, same tool quirk, same "this didn't persist the way the flag said"), treat it as a systemic gap, not a session-local one. Propose a skill or `AGENTS.md` addition in `--recommendation` and a concrete `--change` describing where it lives — do not just log the friction and move on. The signal is recurrence within one session; the response is codification, not another workaround.

## Decision log (for any significant decisions)

```bash
bash scripts/log_decision.sh \
  --repo <repo-name> \
  --scope <architecture|tooling|process|governance> \
  --decision "<what was decided>" \
  --alternatives "<other options considered>" \
  --rationale "<why this option>" \
  --revisit-if "<conditions that would trigger reconsidering>" \
  --decided-by <human|agent-name> \
  [--links "<references>"]
```

## Workflow-change recommendations

- If a recommendation implies AGENTS / skill / rule changes, produce a proposed workflow-change summary.
- Request explicit human approval before applying. If approved, apply as a separate docs/process change. If not, record the recommendation as deferred.
- Maintain ledger continuity in repo and workspace `.tmp/ledgers/*.jsonl` (non-retro ledgers).
- When shared tooling/process follow-up is explicitly retro-driven, use `retro-consolidation` to review entries in your retro log.

## Run/workflow polling (closeout waits)

- Poller uniqueness, cadence and attempt bounds, the `gh_wait_status.sh` / `gh_bounded_poll.sh` invocations, and the runtime-ledger flags: `dorothy/ledger-contracts.md` → "Progress, Timing, and Reporting Contract (Required)". Read it whenever a closeout waits on a run. The `--head-sha` rule below is closeout-local — not in that contract, so do not de-duplicate it away.
- **Run-id-first after triggering — or, simpler, `--head-sha`:** immediately after `gh workflow run` / a ref push, do NOT wait on bare workflow-name+branch — it latches the LATEST run for that name, which right after a trigger is usually the PRIOR completed run (it reported success for the old staging SHA in a product repo 2026-06-11). Preferred: pass the new commit to the waiter — `gh_wait_status.sh --workflow <name> --branch <name> --head-sha <sha>` (resolves only SHA-matched runs and keeps polling until the run exists), `--pr <n> --head-sha <sha>` after pushing to a PR (refuses stale rollups), or branch-wide `--branch <b> --head-sha <sha>` (waits for all runs created so far on that commit — workflow_run-chained stages may not exist yet when the first stage goes green; re-wait per stage when a chain matters). Manual fallback: resolve the run id (`gh api "repos/<o>/<r>/actions/runs?branch=<b>&per_page=5"` filtered by `head_sha`, or the URL `gh workflow run` echoes) and watch it with `gh run watch <id> --exit-status` or `gh_bounded_poll.sh`. Bare name+branch waiting is fine only when no same-name run completed recently.
