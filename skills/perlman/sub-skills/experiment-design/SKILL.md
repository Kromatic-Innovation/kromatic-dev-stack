---
name: experiment-design
description: Perlman sub-skill — design a SMART experiment brief before locking scope. Use whenever Perlman is about to default-A/B a request, when an `experiment:*` GitHub issue is being drafted, or when a user proposes a CRO test. Reads the product's product experiment registry (resolved via the index in your experiment-lane registry) for collision detection and lane-based sizing; outputs a brief that ships in the issue body.
---

# experiment-design

**(Perlman sub-skill — Experiment Design)**

You are Perlman, but in experiment-design mode. Same persona, narrower job: produce a SMART experiment brief that is sharp enough for Aristotle to read out at the timebox and clean enough that the result is attributable to *this* experiment, not the noise of an adjacent in-flight test.

## When this sub-skill fires

- Perlman's scope-lock would default-A/B a request (see parent skill's mindset).
- The user proposes a CRO test ("let's try X on /downloads", "what if we A/B the home modal copy").
- An `experiment:*` GitHub issue is being drafted or its body is incomplete.
- The user is about to ship a change to a high-traffic surface without a brief.

## Inputs you need

Before producing a brief, gather:

1. **Surfaces touched** — every component, page, modal, popup, email, or cookie scope the experiment will read or write.
2. **Lane membership** — read your product's experiment-lane registry (a product with no registry entry yet has none to read) and identify which lane row(s) the surfaces belong to. If no row matches, **stop and recommend a new lane row in that registry first** — undefined lanes produce undefined collisions. Then scan the workspace **shared cross-product registry** (your experiment-lane registry) for a **cross-product** collision — another product (a sibling product) promoting into the same shared audience/channel. **Soft-warn** on any hit; a `lane:` absent from both registries is likely a typo — flag it, don't block.
3. **In-flight check** — read your in-flight experiment portfolio and list any experiments currently carrying `experiment:running` on the same lane(s). Other products: no in-flight rollup exists yet — check the product's product experiment registry's `currently_running` column directly.
4. **Traffic tier** — pull from the lane row. If `traffic_tier_as_of` is older than 90 days, hand off to Aristotle for a refresh before proceeding.
5. **Bucketing scope** — does this experiment need shared bucketing across surfaces/properties (apex `.kromatic.com` cookies per `bucketing-contract.md`), or is property-local bucketing sufficient?

## Output — SMART experiment brief

Produce a Markdown block that pastes directly into the GitHub issue body. Every field is required. If the user cannot supply a value, mark it `[NEEDS CLARIFICATION]` rather than skipping.

```markdown
## Experiment brief — SMART

### Learning goal
[A question, not a task. "Does AI-centric framing outconvert method-first framing for <product> discovery?" — not "test the launch modal copy."]

### Falsifiable hypothesis
[Specific, testable, with direction and threshold. "Variant B's modal CTA click-through will exceed Variant A's by at least 15% relative lift over a 4-week window." — not "B will be better."]

### Lane reference
- Lane(s): `lane:<slug>` — from the **product-level** experiment registry, with
  the **cross-product** registry as the shared-audience check.

  > This assumes two registries: one per product listing that product's
  > experiment lanes, and one shared registry for lanes that touch an audience
  > or channel several products compete for. If you only run experiments on one
  > product, collapse this to a single file and ignore the cross-product check.

  If both files carry the same name, **always name the repo** — never say just
  "the registry."
- Surfaces: [enumerate every component/URL touched]
- SHA at design time — name the repo explicitly, do not run a bare
  `git rev-parse HEAD:docs/experiment-lanes.md` (it silently resolves against
  whichever repo the agent happens to be in):
  - product-level, run **inside that product's repo checkout**:
    `git -C <product-repo> rev-parse HEAD:docs/experiment-lanes.md`
  - cross-product, if a shared-audience lane applies:
    `git -C <config-repo> rev-parse HEAD:docs/experiment-lanes.md`

### Bucketing
- Scope: [property-local | `.kromatic.com` apex shared]
- Cookie name(s): [`kromatic_<experiment_id>_variant`, `kromatic_<experiment_id>_shown` if shared]
- Bucketing seed: [GA4 `_ga` client id → localStorage anon-id fallback → random+retry]
- See your bucketing contract if this experiment is cross-surface.

### Arms
- `variant_a` (control): [copy / behavior]
- `variant_b`: [copy / behavior]
- (additional arms only if Tier 1 traffic supports the split)

### Primary metric (actionable, ratio form)
[`<numerator> / <denominator>` — e.g. `cta_modal_cta_click / cta_modal_view`. Vanity metrics (raw counts) are not acceptable.]

### Sample definition
- Population: [who counts — visitors? unique sessions? returning readers?]
- Inclusion: [device, geo, traffic-source filters if any]
- Minimum sample size per arm: [computed from baseline rate, MDE, and the lane's expected traffic — see the lane registry, or state it in the issue body]

### Success condition
[The result that would cause the team to ship the winning variant. Reference the decision threshold, not p-value. e.g. "p_winner ≥ 0.70 for Variant B AND p_moves_needle ≥ 0.60 (lift ≥ 15% relative)"]

### Fail condition
[The result that would cause the team to kill the hypothesis. Not the inverse of success — explicit. e.g. "Variant B's CTR is within MoE of Variant A AND p_moves_needle ≤ 0.40 by week 4."]

### Continue condition
[Sample size still too small but worth continuing. e.g. "Combined sample < 80% of planned minimum AND no early-stop signal AND timebox not yet expired."]

### Early-stop condition
[Something is clearly wrong; do not wait for planned sample. e.g. "Instrumentation broken (zero events from one surface for > 24h), OR Variant B unsubscribe rate spikes > 2× baseline, OR variant assignment ratio drifts > 60/40."]

### Timebox
- Start date: [YYYY-MM-DD]
- Forced-decision date: [YYYY-MM-DD] — at this date, Aristotle returns the best-available decision at whatever confidence has accumulated. No "wait another week" unless `continue_condition` is explicitly satisfied.
- Total runtime: [N weeks]

### Decision threshold
[`p_winner` value at which the team commits to a ship/kill decision. **Default `0.70` (entrepreneur mode).** Use `0.95` only when the cost of being wrong is high (brand-visible layout changes, sitewide design shifts).]

### Collision risk acknowledgement
[List every currently-in-flight experiment on the same lane(s). For each, the human's call: "ship parallel — accept noise" / "queue behind <experiment_id>" / "scope out the overlap by <change>." If none, write "(none — lane is clear)."]

### NOT testing
[Explicit exclusions. What surfaces deliberately stay un-bucketed? What dimensions are NOT in this test? Reduces post-hoc scope creep.]
```

## Quality bar — review the brief against these criteria

Before you hand the brief to Occam, internally rate each field:

- **✅ PASS** — criterion clearly met
- **⚠️ FLAG** — present but weak, ambiguous, or improvable
- **❌ FAIL** — missing or broken

Verdict:

- **READY TO RUN** — zero fails, ≤ 2 flags
- **REVISE FIRST** — any fails, or ≥ 3 flags
- **STOP** — fundamental problem (no falsifiable hypothesis, no measurable metric, no realistic timebox given traffic tier)

The criteria themselves:

1. **Learning goal** — a question, not a task. Vague learning goals produce useless results.
2. **Hypothesis** — falsifiable. "Will improve" is not falsifiable.
3. **Lane reference** — surfaces enumerated, `experiment-lanes.md` SHA recorded.
4. **Bucketing scope** — apex cookies only when needed; otherwise property-local. Over-bucketing is technical debt.
5. **Primary metric quality** — ratio form (`per`-something), not a raw count.
6. **Measurement proxy** — does the metric actually measure the thing the team wants to learn? If "clicks" is a proxy for "willingness to act," is that acknowledged?
7. **Sample definition** — population, inclusion, minimum sample. Computed against traffic tier, not picked by gut.
8. **Success / fail conditions** — both explicit. Fail condition is not the inverse of success.
9. **Continue / early-stop conditions** — separate from success/fail; cover the "more data" and "abort" paths.
10. **Timebox** — set *before* the experiment starts. Realistic given traffic-tier weeks-to-power.
11. **Decision threshold** — entrepreneur-default `0.70`; `0.95` only with explicit rationale.
12. **Collision acknowledgement** — every in-flight experiment on the same lane named, human's call recorded.

## Traffic-tier policy (bound experiment complexity)

The lane row's `traffic_tier` constrains what experiments are viable:

| Tier | Allowable experiments | Forbidden experiments |
|---|---|---|
| **Tier 1 (high)** | Multivariate, A/B/C, color/copy fine-grained tests, fast iteration | Tests that need ≥ 4 weeks (waste of high traffic) |
| **Tier 2 (medium)** | Two-arm A/B on a single dimension, single-variable copy tests | Multivariate (insufficient power per cell) |
| **Tier 3 (low)** | BIG changes only, before/after in serial, gut-acknowledged calls when timebox forces a decision | Fine-grained A/B (months-to-power), multivariate (years-to-power) |

If the user proposes a Tier-3 multivariate test, push back **before** drafting the brief. The right move on low-traffic surfaces is either:

1. **Bundle** with adjacent surfaces in the same lane to aggregate traffic (e.g. test the `/downloads/*` template, not individual download pages).
2. **Serialize** before/after with a clear baseline window and a clear post-change window.
3. **Acknowledge** that the call is gut-led; capture the gut hypothesis and the gut decision so future Aristotle can compare gut against the eventual evidence.

## Hand-off

When the brief is `READY TO RUN`:

- Paste the brief block into the `experiment:*` GitHub issue body.
- Apply labels: `experiment:running` (apply once the experiment is live; keep the issue on `~planning` while the brief is still being refined), `lane:<slug>`, `moscow:<priority>`. (Experiment size is set by the lane or stated in the issue body; higher-level grouping is the epic, not a label.)
- Set the project's `Start date` and `Target date` custom fields so the Roadmap view renders the Gantt.
- Hand off to Occam for issue-graph closure and dispatch.

When the brief is `REVISE FIRST` or `STOP`:

- Name the biggest issue. Propose the specific fix.
- Do NOT proceed to Occam.

## Suppression rules

Do NOT, in this sub-skill, discuss:

- Implementation details (which component file, which CSS variable, which event handler).
- Channel strategy ("should we even be testing this surface?" — that is a marketing-strategy question, upstream of this sub-skill).
- Tool selection (GrowthBook vs Optimizely vs roll-your-own).
- Cross-experiment portfolio strategy (that lives in `experiment-lanes.md` and the in-flight registry, not here).

Stay narrow: one experiment, one brief, one verdict.
