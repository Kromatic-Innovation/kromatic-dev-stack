# Assumptions this bundle makes

These skills came out of a working consultancy setup. Where that setup shows
through, it is listed here — check each against yours before installing, or run
`/harness-adopt` to have it checked for you.

None of these are hard requirements. Each is a place to either adapt your setup
or edit the skill.

## Branching and delivery

| Assumption | Where it appears | If it doesn't hold |
|---|---|---|
| A `develop` → `staging` → `main` promotion path | Occam gates, Dorothy's pre-branch checks, closeout | Rewrite the gate sequence to your model. Don't leave a gate naming a branch you don't have — it gets silently skipped |
| Agent PRs target `develop`, never `main` | Occam delivery routine | On a `main`-only repo, the rule becomes "never push direct to the default branch" |
| Squash merges | Sync-before-branching rule | Harmless if you don't squash; the check just always passes |
| CI is required and observable via `gh` | Every merge gate | Adapt to your CI's status API, or make the gates manual checkpoints |

## Issue tracking

| Assumption | Where it appears | If it doesn't hold |
|---|---|---|
| GitHub Issues as the system of record | Occam, propose-issue, Perlman's vision epics | The gate logic survives on any tracker; the `gh` commands do not |
| Exactly one MoSCoW label per issue | Occam QA triage, propose-issue | Substitute your priority scheme consistently in both places |
| Lifecycle labels (`ready`, `building`, …) | Occam Gate 2, dispatch rules | Only load-bearing if automation reads them (see below) |
| Native `blocked_by` dependency edges | Issue-graph gate | GitHub-specific. Prose dependency notes are the fallback — but nothing automated can read them |
| An `epic` label | Perlman's vision epics → Occam decomposition | Any umbrella-issue convention works; keep it consistent across both ends |

## Automation

**The single biggest fork.** Several rules exist only because an autonomous
queue may pick up a labelled issue and race a human-initiated lane.

If nothing automated watches your repo, these are inert — and you should say so
explicitly rather than perform ceremony that protects nothing:

- The repo-lock handshake before dispatch
- "Applying `ready` IS a dispatch"
- Self-dispatched lanes labelled `building`, never `ready`
- The pending-ready deferral ledger
- Provenance-before-correction on unexpected label state

Still valuable without a queue: worktree isolation (protects against *your own*
parallel sessions), and the sync-before-dispatch rules.

## Tooling

| Assumption | Note |
|---|---|
| Claude Code with subagent dispatch | The orchestration model assumes an orchestrator can spawn workers and receive completion reports |
| Git worktrees available | Used to isolate parallel lanes. Serial-in-primary-checkout is the documented fallback |
| `gh` CLI authenticated | Pervasive |
| A bot/App identity distinct from the human | Used for attribution and to keep agent commits from impersonating you. Optional, but recommended before you let anything run unattended |
| Playwright for E2E | Named in the heavy-lane verification path. Substitute your E2E runner |

## Platform

| Assumption | Where it appears | If it doesn't hold |
|---|---|---|
| macOS with `zsh` | Shell-init examples, `launchctl`/plist verification steps, Homebrew paths in the Python-environment rules | The *rules* are portable ("loaded is not running"); the *commands* are not. Substitute your service manager |
| A containerized build environment separate from your workstation | Occam's host-operation detector, Dorothy's environment rules | If agents run directly on your machine, the "this can't touch your workstation" guarantees do not hold — tighten accordingly |
| A secret manager (any) | Dorothy's and Quine's credential rules | The rule is "secrets resolve through a manager, never a literal." Which manager is yours |

## Deliberately unspecified

The skills reference these generically because yours will differ, and you are
expected to supply them:

- A **repo-lock helper** (`scripts/ws-lock.sh` by convention)
- An **issue-creation wrapper** that verifies the created body server-side
- A **comment-posting wrapper** for Quine's findings log (`GH_COMMENT_POST`)
- A **canonical label registry** with a CI check
- A **retro log** location, and — for Retro's panel phase — persona subagents
  registered in your own `.claude/agents/`
- An **experiment-lane registry**, if you run A/B tests
- A **priority/MoSCoW definition doc**, a **branch-and-promotion policy**, and a
  **decision-authority doc** — several skills cite these as canonical; write the
  one-page version rather than leaving the citation dangling
- **Escalation targets** for strategy and governance questions

Each is a few dozen lines. The skills state the contract each must satisfy; they
do not ship implementations, because an implementation that assumes the wrong
filesystem is worse than none.

**Where a skill cites a file you do not have, that is a prompt to write it, not
a bug.** The citation names the contract; supplying the file is how you adopt
the rule into your own conventions.
