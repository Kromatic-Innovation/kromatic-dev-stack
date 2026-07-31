# Experiment Bayesian Decision Templates

SQL templates and decision logic for the `experiment-design` decision contract
declared in [`../SKILL.md`](../SKILL.md) §"Experiment Decision Contract."

These compute three Bayesian outputs from per-arm conversion counts:

- `p_winner` — posterior probability the leading variant beats control.
- `p_moves_needle` — posterior probability the lift is ≥ the experiment's MDE.
- `expected_value` — point-estimate lift × traffic-in-window.

Inputs are the same per-arm `views`, `conversions`, and window dates that
`ab_results_latest` already exposes. The new outputs are derivations of those
counts, not new measurements.

## Conjugate prior

We use a Beta(α=1, β=1) (uniform) prior on each arm's conversion rate, unless
the experiment's SMART brief declares a stronger prior. With Bernoulli
conversion counts, the posterior is `Beta(α + conversions, β + views − conversions)`
— closed-form, no MCMC required.

For the lift posterior (`p_b - p_a`), we use Monte-Carlo: draw ~50k samples
from each arm's posterior Beta, subtract, take the empirical CDF. 50k is enough
for stable `p_winner` to two decimals.

A pure-SQL approximation that avoids the Monte-Carlo step is in §"Closed-form
approximation" below — use it when you only need `p_winner` to ±0.02 and want
to keep the readout in BigQuery without a sidecar.

## Query template 1 — pull the experiment's per-arm counts

```sql
-- Project: <your-analytics-project>
-- Run window: matches the experiment's start_date / forced_decision_date from
-- the SMART brief; default last 28 days if unspecified.
SELECT
  experiment_name,
  experiment_variant,
  COUNTIF(event_name = 'cta_modal_view')     AS views,
  COUNTIF(event_name = 'cta_modal_cta_click') AS conversions,
  MIN(event_date) AS window_start,
  MAX(event_date) AS window_end
FROM `<your-analytics-project>.<your_reporting_dataset>.ab_results_latest`
WHERE experiment_name = @experiment_name
  AND event_date BETWEEN @window_start AND @window_end
GROUP BY experiment_name, experiment_variant
ORDER BY experiment_variant;
```

If `ab_results_latest` does not yet carry the experiment (e.g. the data
pipeline hasn't picked it up), fall back to `v_route_conversion_daily` filtered
by surface and union by variant — but only when the user explicitly asks for
raw verification (see SKILL.md §"Data Policy").

## Query template 2 — Bayesian fields via Monte-Carlo (sidecar)

This is the canonical computation. Run after Template 1 returns per-arm
counts. Pseudo-code (Python, BigQuery ML, or whatever sidecar Aristotle has):

```python
import numpy as np
from scipy import stats

def experiment_decision(views_a, conv_a, views_b, conv_b,
                        mde_relative=0.15,
                        decision_threshold=0.70):
    # Beta(1,1) prior + observed counts
    a_alpha, a_beta = 1 + conv_a, 1 + (views_a - conv_a)
    b_alpha, b_beta = 1 + conv_b, 1 + (views_b - conv_b)

    # Sample posterior conversion rates
    rng = np.random.default_rng(seed=42)
    samples_a = stats.beta.rvs(a_alpha, a_beta, size=50_000, random_state=rng)
    samples_b = stats.beta.rvs(b_alpha, b_beta, size=50_000, random_state=rng)

    # Lift in absolute and relative terms
    lift_abs = samples_b - samples_a
    lift_rel = lift_abs / samples_a  # may produce inf when samples_a≈0; clip

    p_winner = float((samples_b > samples_a).mean())
    p_moves_needle = float((lift_rel >= mde_relative).mean())

    # Point-estimate lift × traffic
    point_lift_abs = (conv_b / views_b) - (conv_a / views_a) if views_a and views_b else 0.0
    expected_value = point_lift_abs * (views_a + views_b)

    return {
        "p_winner": round(p_winner, 3),
        "p_moves_needle": round(p_moves_needle, 3),
        "expected_value": round(expected_value, 2),
        "point_estimate_lift_abs": round(point_lift_abs, 4),
        "decision_threshold": decision_threshold,
        "mde_relative": mde_relative,
    }
```

## Query template 3 — closed-form `p_winner` approximation (pure SQL)

When the sidecar isn't available or the readout needs to stay in a single
BigQuery query, use the normal-approximation closed form. Accurate to ±0.02
for `p_winner` when both arms have ≥ 200 conversions.

```sql
WITH arms AS (
  SELECT
    experiment_name,
    experiment_variant,
    SAFE_DIVIDE(conversions, views) AS rate,
    SAFE_DIVIDE(conversions * (views - conversions), POW(views, 3)) AS var
  FROM (
    SELECT experiment_name, experiment_variant, views, conversions
    FROM `<your-analytics-project>.<your_reporting_dataset>.ab_results_latest`
    WHERE experiment_name = @experiment_name
  )
),
pivoted AS (
  SELECT
    experiment_name,
    MAX(IF(experiment_variant = 'variant_a', rate, NULL)) AS rate_a,
    MAX(IF(experiment_variant = 'variant_a', var,  NULL)) AS var_a,
    MAX(IF(experiment_variant = 'variant_b', rate, NULL)) AS rate_b,
    MAX(IF(experiment_variant = 'variant_b', var,  NULL)) AS var_b
  FROM arms
  GROUP BY experiment_name
)
SELECT
  experiment_name,
  rate_a,
  rate_b,
  rate_b - rate_a AS lift_abs,
  SAFE_DIVIDE(rate_b - rate_a, rate_a) AS lift_rel,
  -- Normal-approximation p_winner: P(B > A) where (B - A) ~ Normal(rate_b - rate_a, var_a + var_b)
  -- = Φ((rate_b - rate_a) / sqrt(var_a + var_b))
  -- Φ approximated by ML.PROBIT-inverse or the logistic CDF; here use the logistic
  -- (sigmoid) which differs from Φ by < 0.02 in the relevant range.
  ROUND(
    SAFE_DIVIDE(1, 1 + EXP(-1.7 * SAFE_DIVIDE(rate_b - rate_a, SQRT(var_a + var_b)))),
    3
  ) AS p_winner_approx
FROM pivoted;
```

The `1.7` constant aligns the logistic CDF to the standard normal within ~0.005
across the body of the distribution. For tails (|z| > 2.5) use the sidecar.

## Decision mapping

After computing `p_winner`, `p_moves_needle`, `expected_value`, apply the
decision table from `../SKILL.md` §"Decision policy":

```python
def decide(result, brief):
    p_w = result["p_winner"]
    p_m = result["p_moves_needle"]
    threshold = brief["decision_threshold"]    # default 0.70
    timebox_expired = brief["forced_decision_date"] <= today
    early_stop = check_early_stop(brief)        # instrumentation broken, guardrail breach, assignment drift

    if early_stop:
        return ("early_stop", "guardrail or instrumentation failure")
    if p_m <= 0.40:
        return ("kill", f"lift not meaningful (p_moves_needle={p_m})")
    if p_w >= threshold and p_m >= 0.60:
        return ("ship_winner", f"variant_b at p_winner={p_w}")
    if timebox_expired:
        # Entrepreneur mode: force the call rather than extend silently
        winner = "variant_b" if p_w >= 0.5 else "variant_a"
        return ("force_decision",
                f"ship {winner} at p_winner={max(p_w, 1-p_w)} confidence — timebox expired")
    if brief["continue_condition_holds"]:
        return ("continue", "sample below plan, no early-stop, timebox not expired")
    return ("force_decision", "default to control — no signal, timebox approaches")
```

## Worked example

Suppose `a product repo_2e_launch_valueprop` reads out at hard-launch with:

- Arm A (control, method-first): 12,400 views, 893 conversions (7.20%)
- Arm B (AI-native): 12,150 views, 1,021 conversions (8.40%)
- MDE from brief: 15% relative lift
- Decision threshold from brief: 0.70

Compute (sidecar):

- `p_winner = 0.987` — Arm B almost certainly beats Arm A.
- `p_moves_needle = 0.62` — moderate evidence the lift hits the 15% bar (point-estimate is 16.7% relative).
- `expected_value = 24550 × 0.012 ≈ 295` additional conversions on the next equivalent window.

Decision: `ship_winner` — `p_winner ≥ 0.70` AND `p_moves_needle ≥ 0.60`. Flip to
Arm B; campaign continues per the workstream's kill-criteria.

## Backfill order

1. Wire Template 1 into Aristotle's `experiment-design` query library (existing
   `query-library.md` gets a cross-reference here).
2. Stand up the sidecar (Template 2) — a Python notebook or Cloud Function
   that takes a JSON of per-arm counts and returns the decision object.
3. Ship Template 3 as the SQL fallback for one-off readouts.


