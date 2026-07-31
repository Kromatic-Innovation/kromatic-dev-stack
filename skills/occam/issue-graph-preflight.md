# Occam — Issue-Graph & Plan-Time Pre-Flight Checks

Companion to `occam/SKILL.md` Gate 2. Read before drafting the issue graph and before locking any plan. Rules only — the incident history that justified each rule lives in your retro log, not here.

## Issue graph

- One parent epic in the primary repo. Thin-slice child issues per repo / work lane, ideally one session per issue.
- Each created or triaged issue carries exactly one MoSCoW label (`moscow:must|should|could|wont`) — see your MoSCoW definitions for definitions and sequencing. Default ordinary implementation slices to `moscow:should` unless urgency or scope clearly justifies another label.
- **Ready-by-default, ready-label-last** (canonical policy — `propose-issue/SKILL.md` references this section):

  > **Ready-by-default, ready-label-last.** The `ready` label (canonical build-trigger; see your label-schema doc) is the DEFAULT intent for every new issue: file each issue as if it will be autonomously built — give it exactly one `moscow:*` label and tie it to an existing or new epic (unless it is a genuine one-off). But apply the `ready` label ONLY once the issue is fully assembled: requirements settled, native `blocked_by` edges linked, and its epic filed. Do not flip `ready` mid-assembly. In a planning session, build the entire issue graph first, then turn `ready` on for the issues that are actually complete.
  >
  > Withhold `ready` (and confirm with the human) when an issue is genuinely unclear, or is a placeholder to deal with later.
  >
  > **Blocked is NOT a reason to withhold `ready`.** `ready` answers "is this buildable as written?", not "can it start right now?" — those are different questions and the dependency edge answers the second one. A `ready` issue with an open `blocked_by` edge is held out of the build pool until the blocker closes, then **auto-releases** into it. So mark blocked-but-buildable work `ready` and let the edge hold it. Withholding the label instead buys nothing and costs a dispatch: when the blocker closes, nothing releases, and the issue sits invisible until a human notices and relabels it. (This restates SKILL.md → Gate 2, which is canonical; see also your queue's dependency semantics.)
  >
  > The one thing that genuinely never gets `ready` is work that is **not autonomously buildable at all** — operator/live-store actions requiring credentials, a browser, or a private local knowledge store (the operator-action class). Those are not "blocked"; they are out of the autonomous build path entirely. Assign them to the human, and give them the exact commands or UI steps to run.
  >
  > This is what lets the queue build without the human specifying readiness each time: the default is ready; the discipline is to withhold it only for the unclear, the placeholder, and the not-autonomously-buildable.

  Apply the label ergonomically at the moment the issue is complete. For a
  **new** issue, pass it on the `gh issue create` call itself (`gh issue create
  --label ready …`, or `<your-issue-wrapper> … --labels ready`) once assembly
  finishes. For an **existing** issue — flipping it to `ready` after refinement,
  or the sweep below — do **not** use a bare `gh issue edit --add-label ready`:
  route it through **`scripts/gh-issue-ready.sh --repo <owner/repo> --issue <n>
  --buildable-settings TEXT --buildable-perms TEXT --buildable-authority TEXT`**
  (the three buildability affirmations are required, an internal issue — or `--operator`
  in their place when the work is not agent-buildable)
 . That wrapper takes the repo lock on the repo FIRST and applies
  `ready` in the same call, so there is no window in which the issue is
  dispatchable but the repo is unlocked (the an internal issue race: `ready` applied,
  dispatcher builds it while you keep reasoning). It also strips any conflicting
  lifecycle label in the same write, so the issue can never briefly carry two
  (`~staged`+`~planning`, `building`+`~planning`). Its success output names the
  lock TTL and the release step — release at closeout. Do **not**
  rely on
  the target repo's own gather/labeling automation to add it on a later tick:
  until that tick fires, a freshly-labeled issue is invisible to feature-build
  selection even though it is clearly meant to build — a silent, timing-dependent
  gap.
  - **Safety net, not a substitute.** The planning-cycle "unplanned MUST"
    completeness check (see "Completeness" below) does catch a missing
    `ready` on the *next* cycle, but that is the backstop — turning `ready` on
    the moment an issue is complete is what closes the gap between when an issue
    is assembled and when the next planning cycle runs.
- **Native `blocked_by` edges are mandatory whenever a filed issue has a known
  dependency relationship** — both of these cases, not only the second:
  - **Epic → children.** When filing an epic with child issues, set the epic
    `blocked_by` each child (at filing time, or as each child is added). The
    epic isn't buildable until its children land; the native edge is what makes
    that legible to automation and the GitHub UI instead of only to a reader.
  - **Sequenced work.** When a plan sequences work (issue B can't start until
    issue A lands), set B `blocked_by` A.

  These MUST be **native** GitHub `blocked_by` edges, not just a
  `## Dependencies` prose note — an automated dependency gatherer reads the
  native relation as its authoritative topological constraint and is blind to
  prose. The prose note stays (it explains the WHY); the native edge
  is what sequences the build.
- Wire them ergonomically at creation with `your issue-creation wrapper --blocked-by
  "REPO#N,…"`, or retrofit an existing issue with `gh-issue-blocked-by.sh
  --repo … --issue N --blocked-by "REPO#N,…"` (both set and then verify the
  edge). The underlying native-API shape those wrappers drive — reach for it
  directly when scripting or setting an edge by hand (verified 2026-07-10):

  ```bash
  # The blocker's numeric database id (NOT the issue number):
  BLOCKER_ID=$(gh api repos/<owner>/<repo>/issues/<M> --jq .id)

  # Set issue N as blocked_by the issue with that database id:
  gh api --method POST repos/<owner>/<repo>/issues/<N>/dependencies/blocked_by \
    -F issue_id=$BLOCKER_ID

  # Verify:
  gh api repos/<owner>/<repo>/issues/<N>/dependencies/blocked_by
  ```

  Use `-F` (typed, so `issue_id` is sent as an integer), not `-f` (string) —
  the API rejects a string `issue_id`, and the value is the blocker's database
  `id`, not its issue number.
- If requirements are unclear, draft the issue graph, request human confirmation, then create issues.
- Worker lanes are blocked until their assigned issue exists and dependencies are unblocked.

## Completeness — all open issues evaluated

A plan is not complete until every open issue in the repo being planned has an explicit disposition — none silently skipped. This section is the **canonical, single-source definition** other skills reference rather than restate; see the "Single-sourced elsewhere" note below.

- **Default planning target:** `ready` (or a native `blocked_by` gate en route to it). Every open issue is expected to reach this state unless it carries one of the exceptions below.
- **Closed set of allowed exception labels** — an issue with one of these is legitimately out of the "must reach `ready`" flow, not a completeness gap:
  - `~unprioritized` — captured idea / raw intake, not yet triaged
  - `~planning` — being refined, not yet ready
  - `~operator` — fully specified, unblocked, deliberately awaiting a human operator (your label-schema doc); not buildable by an autonomous lane
  - `moscow:wont` — explicitly excluded from scope
  - `wontfix` — will not be worked on (terminal)
  - `epic` — umbrella tracking issue, not itself buildable
> **`blocked` is deliberately NOT in that exception set.** A blocked issue is still expected to reach `ready` — the edge holds it out of the pool, the label declares it buildable, and it auto-releases on unblock (see "Ready-by-default, ready-label-last" above). Treating `blocked` as an exception is what lets a `moscow:must` sit unbuildable behind a blocker that closed weeks ago. The genuinely-exempt case is the operator/live-store issue, which is not blocked but **not autonomously buildable**; give it `~operator` — or `~planning` if it is still being refined — and **assign it to the human**.

- **Canonical definition — "an unplanned MUST":** an open issue carrying `moscow:must` that lacks both `ready` and every label in the exception set above. This is the single highest-severity completeness gap: committed-priority work with no build path and no legitimate excuse. If you run a daily planning-queue check, surface this as an urgent action item there against this same definition rather than redefining it.
- **Evaluated-issues table (required in every planning report):** the report Occam/Perlman produce for a planning cycle MUST include a full table listing every open issue considered — not just the ones acted on. Columns: `Issue | Title | MoSCoW | queue state | Disposition | Notes`. "Disposition" is one of: ready-to-build, planned-this-cycle, exception (name the label), unplanned MUST (flagged), park, transfer. Every open issue appears exactly once; an issue absent from the table is itself a completeness bug.

**Single-sourced elsewhere:** `perlman/sub-skills/repo-planning-cycle/SKILL.md` links to this section rather than repeating its prose (Phase 2 issue-graph output). Do not fork this definition — edit here and let the reference stand.

## Experiment issue gate (warn-with-override)

Issues that propose, run, or analyze an experiment carry `experiment:running|concluded` (canonical; see your label-schema doc) and SHOULD carry `lane:<slug>` from the effort's product's product experiment registry — resolve its path from the index in your experiment-lane registry (a product with no registry entry yet is out of scope for this check); a **cross-product** effort SHOULD also map to a shared-audience lane in the shared cross-product registry your experiment-lane registry. The body SHOULD include the Perlman experiment-design SMART brief: learning goal, falsifiable hypothesis, lane reference (with `experiment-lanes.md` SHA), bucketing scope, arms, primary metric, sample definition, success/fail/continue/early-stop conditions, timebox, decision threshold, collision-risk acknowledgement, NOT-testing exclusions.

**Detection — experiment BUILDS, not just experiment ISSUES.** This gate also fires on a *code* signal, independent of the issue's label, because experiment work is routinely filed as a plain `type:feature` build (e.g. "register the `summary_present` axis"). Treat a lane as an experiment build — inheriting every requirement above — when its diff touches `template_ab.py` / `ABTestDefinition` / `register_test` / an experiment-registry / bucketing or segment-split code; adds or flips an experiment axis flag (`<EXPERIMENT_FLAG>=*`, variate-content, an A/B cookie or Fly secret); adds a `docs/experiments/*.md` design doc; or carries A/B / variant / arm in its title. Such a lane MUST be paired with an `experiment:*` tracking issue + Project due date + lane-registry update; Occam closeout verifies this (see `closeout.md` → "Experiment-registration verification"). A build issue closing via `closes #N` does not register an experiment.

Missing fields **warn** in the dispatch brief; they do **not** hard-block — the brief is a forcing function for clarity, not a bureaucratic gate, and the human may override on judgment. Full schema: your issue-routing doc §"Experiment-specific labels". In-flight registry: refresh it from its generator; other products resolve their own product experiment registry (if any) via the index in your experiment-lane registry.

## Project board membership (immediately after issue create)

Add each new issue to its project board at creation time, in the same turn that
creates it — not as a follow-up sweep. An issue that exists but is on no board is
invisible to every planning view that reads the board rather than the repo, which
is how committed work goes missing between planning cycles.

If a board write fails on permissions, do not fail the orchestration over it:
surface it to the human and continue.

## Already-implemented pre-flight (run at INTAKE, before drafting the graph)

For every issue in the requested set, before classifying complexity or drafting the graph:

```bash
git log --all --oneline --grep="closes #N" --grep="#N" | head -5   # substitute each issue number
```

If matching commits exist, downgrade that issue to a "verify and close if done" lane rather than full implementation instructions. This is a soft signal — still verify by reading the code, but the brief should say "verify and close if done," not "implement from scratch." Running this at intake right-sizes the issue graph itself instead of discovering completed work per-lane after the queue is built.

## Cross-repo, authority, and conflict pre-flight checks (added 2026-07-22)

Added after a bounded review of 14 kickback instances (a bounded sample of kickbacks): roughly 8/14 (57%) were spec-review-discoverable at authoring/planning time — a cheap static check, not a stronger model, would have caught them before a dispatch cycle was burned discovering them. Run these three checks before setting `ready`:

- **Cross-repo-scope detector.** Grep the drafted issue's body/ACs for another repo's name or path (e.g. `.claude/skills/`, a config repo, a sibling repo slug) that this issue's own target repo cannot satisfy — **this includes the issue's primary deliverable being a brand-new repository that doesn't exist yet**, not only references to an existing sibling repo. If found, split at authoring time into the target-repo issue + a sibling issue in the referenced (or newly created) repo, wired `blocked_by` the target-repo issue — do not file the combined issue and let a feature-build dispatch discover the split itself. (Caught, after the fact, in identical shape half a dozen times — including the new-repo variant, where the deliverable was a repository that did not exist yet.)
- **Authority-grant detector.** If the issue's intent is to grant a component new autonomous/mechanical authority (keywords: "authority", "autonomous", "auto-*", "unilaterally", "the daemon/planner/reasoner should decide/close/split without asking") — cross-check your decision-authority doc (ownership table) and §4 (enforcement) before drafting ACs, and state explicitly in the issue body which layer (Occam vs. Dorothy vs. mechanical) executes it. Do not leave the authority-layer question for the implementer to discover mid-build. (Caught, after the fact, three times.)
- **Concurrent-batch scope-conflict check.** Before finalizing a batch of issues in one planning session, grep each issue's named files/modules against every other issue in the same batch. Two issues that touch the same rendering path or state machine in the same cycle should be sequenced (`blocked_by`) or merged, not filed as independent parallel work. (Caught, after the fact.)
- **Host/live-machine operation detector.** your build container runs in an isolated Linux container with only a fresh clone of the target repo — no your checkout root, no `~/Library/LaunchAgents`, no `launchctl`, no GUI, no access to the operator's actual Mac. If an issue's ACs require live-machine operations (editing `.zshrc`/shell-init, moving directories on the local filesystem, `launchctl bootout`/`bootstrap`, editing `~/Library/LaunchAgents/*.plist`, anything under your checkout root or `~/Library` as a literal path, a GUI/browser action, org-level GitHub App installation) — split those into a human-run checklist (not `ready`, not autonomously buildable, ever) and, if there's a genuine repo-side code/config slice, a separate issue `blocked_by` the human checklist with a backward-compatible default so it's safe to land before the human step runs. Do not file the combined issue and let dispatch discover the mismatch. (Caught, after the fact: multiple internal issues's Phase 2 cutover, an internal issue's GitHub App registration.)
- **Governance/SSOT-file protection detector.** If an issue's ACs amend a file that documents its own human-review protocol (grep the target file for "propose-before-use", "SSOT", "canonical", "normative") — e.g. a label-taxonomy source of truth, a decision-authority doc itself, an approved-registry file — flag it explicitly for human/Occam disposition before drafting ACs, rather than let an implementer discover that an autonomous merge would bypass the very review gate the file establishes. Autonomous build + auto-merge is not compatible with a file whose own header requires pre-merge human review. (Caught, after the fact: an internal issue.)
- **Content/dependency locality check.** When a plan assumes runtime content, data, or a specific execution model that a grep shows lives in a DIFFERENT repo than the one being planned (not just a code dependency — actual content files, a different subagent/instrument model, a different runtime the target repo doesn't have), verify the assumed content/model actually exists in-repo before locking the plan, the same way `git check-ignore` and schema-attribute checks already verify shippability — don't assume parity with a similarly-named mechanism elsewhere. (Caught after the fact: a plan assumed two similarly-named execution models were interchangeable, and that content living in one repo existed in another; neither was true.)

These six checks address the large majority of the reviewed sample (roughly 20/20 across the two review rounds: a bounded sample of kickbacks and a bounded sample of kickbacks). The remainder were genuine architecture forks needing a human design call, runtime/telemetry failures, or drift between authoring and dispatch pickup (code changed while the issue sat in `ready`) — not fixable by a spec-review check; see `occam/dispatch-briefs.md` → "Dispatch-pickup revalidation" for the check that catches the drift case. Genuine architecture-fork ambiguity (the genuine design-call kind) is not a gap to close — correctly kicking those back is the system working as intended.

## Release-before-deploy ordering for fleet libraries

A lane that fixes a fleet LIBRARY (a repo publishing an npm/PyPI package other
Internal Platform repos consume — see `consumedBy` in
your repo registry) is not done at "merged and promoted to main."
The dispatch model's default sequence — land the fix, promote to main, report
fixed-and-deployed — silently skips the two steps that actually make the fix
reach a consumer:

1. Land + promote the library fix to main.
2. **Publish it** (npm/PyPI, tag-gated — the repo's `publishingScheme`).
3. **Bump each consumer's dependency range** to admit the newly published
   version.
4. Deploy the consumer.

Steps 2–3 are exactly what the naive model omits, and omitting them produces
a confidently-wrong "fixed and deployed" report: CI on the library goes
green, the library promotes, and the lane closes out — while every consumer
keeps running the old pinned version, invisible to any deploy check (this is
the exact failure mode an internal issue was filed to close: a consumer repo pinned
`<library>@^0.5.0` while `0.6.2` sat published and unconsumed).

**Rule:** when a lane fixes a repo that has registry `consumedBy` consumers,
the consumer version-bump work MUST be filed/queued as part of the SAME work
order — or wired as an explicit `blocked_by` from the consumer-bump issue to
the library-release issue — never left implicit. Do not let "the library
shipped" stand in for "the fleet is fixed." Check `consumedBy` on the
target repo's registry entry at planning time, the same pre-flight moment the
other checks in this doc run, and route accordingly:

- No `consumedBy` entries → ordinary library fix, no extra sequencing needed.
- One or more `consumedBy` entries → file (or confirm existing) consumer
  version-bump issues in the SAME planning pass, `blocked_by` the library's
  publish step, before setting `ready` on the library fix.
## Provenance-before-correction — read the timeline before adding `ready` (added later)

The unblocked-work sweep hunts for issues that are open, correct, and unblocked but carry no lifecycle label, and marks them `ready`. That is right for genuinely-unqueued work and wrong for **human-held** work — an issue a human deliberately parked (a deferral recorded in a comment, a manually-removed `kicked-back`, an explicit "not now"). At the label level the two look identical, so the sweep re-readies the parked one; the queue dispatches it, Dorothy correctly refusess (the human decision stands), and a dispatch is burned. (Observed in practice: a deferral recorded only in a comment was swept to `ready` the next day.)

**The rule:** before adding `ready` to an unlabelled-but-seemingly-buildable issue, read its timeline for a human's recorded decision — a deferral, a manually-cleared label, an explicit hold. This extends the existing provenance rule "don't *remove* a human's label" to "don't *add* one over a human's recorded decision." When the sweep does mark an issue `ready`, apply it through **`scripts/gh-issue-ready.sh --repo <owner/repo> --issue <n>`** — it takes the repo lock atomically with the label and strips any stacked lifecycle sibling, rather than a bare `gh issue edit --add-label ready`. It also requires the three buildability affirmations `--buildable-settings` / `--buildable-perms` / `--buildable-authority`, each a recorded string; pass **`--operator`** in their place to apply `~operator` instead when the work is not agent-buildable. If a human deferred it, apply **`~operator`** (fully specified, unblocked, awaiting a human — your label-schema doc) instead of `ready`: that makes the deferral visible at the label level, keeps it out of the build pool permanently (not retried like `kicked-back`), and surfaces it in `/good-morning`'s human action queue. `~operator` is the label that makes human-held work legible so the sweep skips it next time rather than re-discovering and re-readying it.

Every issue you move to `~operator` must state either an interactive-session prompt (if an agent can assist) or step-by-step commands/UI (if it is human-only) — the same "give it the exact commands or UI steps to run" discipline the Ready-by-default policy above requires for not-autonomously-buildable work.

## Plan-time verification checks

Run the checks relevant to the plan **before** locking it in. Plan-time catches cost nothing; implementation-time catches force a mid-lane reversal.

- **Plan-pattern cross-check:** when a plan references a pattern that must round-trip through a downstream consumer — filename format, regex, ID shape, path template, schema key — grep the consumer and verify the pattern matches before the plan is locked.
- **CLI-subcommand extension:** when a plan names an external command invocation (`<your-cli> <subcommand> <arg>`, `gh pr merge --squash`), grep the target repo's CLI/argparse source for the exact subcommand — verifying the binary exists is not enough. If the plan offers an "or the equivalent CLI" fallback, verify that form too.
- **Schema-attribute verification:** when an issue body or brief references specific schema attributes — ORM field names, column names, dataclass fields, audit-log keys, enum values — open the model/schema file and grep the exact names before publishing. A 30-second `grep -n "class <Model>" <file>` catches drift that otherwise forces every lane to course-correct.
- **Locked-decision file-shippability:** for any "extend / commit / add a field to file X" decision, run `git check-ignore X` before locking — a `.gitignore`d file cannot be a committed deliverable.
- **Engine-runtime budget:** for any sub-skill or check that shells an engine inside a timeout budget (e.g. a `/good-morning` 60s kill), measure that engine's wall-clock in pre-flight — an engine slower than the budget makes the consumer unbuildable as specified.

## Domain pre-flight checks

Apply extra domain pre-flight scrutiny before locking a plan whenever the lane reaches past the repo's own source — an external data source or API, infrastructure, a third-party dependency's version ladder, or a cron / async pipeline — **or** whenever a brief asserts a cause for a failure that nobody has confirmed by observation (an E2E failure called a security bug; a detector or query reporting "0 results" called clean).

These are classification rules with branches — apply them from the text, not from memory. **The catalogue is broader than its subject headings suggest, so when in doubt, open it.**

## Read-only coordination-root exemption

Fires on inspection-only status/reporting against a coordination root, and on prompts asking for `per repo` / `each repo` / `all repos`. Canonical, including what it does **not** cover: your issue-tracking policy → "Read-Only Status Sweep Exemption (Required)". Read it before skipping the graph.
