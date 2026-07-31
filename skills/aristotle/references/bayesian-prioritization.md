# Bayesian Prioritization

## Model
For each repo/route group in window:
- observed visitors: `n = visitor_users`
- observed any-lead users: `y = any_lead_users`
- prior: `Beta(alpha0=1, beta0=999)`
- posterior: `Beta(alpha_post, beta_post)` where:
  - `alpha_post = alpha0 + y`
  - `beta_post = beta0 + n - y`

## Posterior Outputs
- `posterior_mean = alpha_post / (alpha_post + beta_post)`
- posterior variance:
  - `var = (alpha_post * beta_post) / (((alpha_post + beta_post)^2) * (alpha_post + beta_post + 1))`
- 90% credible interval (normal approximation):
  - `sd = sqrt(var)`
  - `ci_low = max(0, posterior_mean - 1.645 * sd)`
  - `ci_high = min(1, posterior_mean + 1.645 * sd)`

## Baseline
- Compare each entity to its surface baseline (`tools` or `blog`) over same window.
- Compute baseline posterior with same prior and formulas.

## Underperformance Probability
- minimum practical gap: `delta = 0.0005` (0.05 pp)
- define:
  - `mu_diff = posterior_mean_entity - posterior_mean_baseline`
  - `var_diff = var_entity + var_baseline`
  - `sd_diff = sqrt(var_diff)`
- compute:
  - if `sd_diff > 0`: `p_underperform = P(diff <= -delta)` using normal CDF
  - else: `p_underperform = 1` when `mu_diff <= -delta`, else `0`

## Expected Lost Leads (Primary Ranking Metric)
- `expected_lost_leads_14d = max(0, (posterior_mean_baseline - posterior_mean_entity) * visitor_users_14d)`

## Priority Bands
- `critical`: `expected_lost_leads_14d >= 10` and `p_underperform >= 0.90` and `visitor_users_14d >= 200`
- `high`: `expected_lost_leads_14d >= 5` and `p_underperform >= 0.80` and `visitor_users_14d >= 100`
- `medium`: `expected_lost_leads_14d >= 2` and `p_underperform >= 0.70` and `visitor_users_14d >= 50`
- `observe`: all others
- override with `insufficient_data` if denominator `< 30`

## Tie-Break Order
1. higher `expected_lost_leads_14d`
2. higher `p_underperform`
3. higher `visitor_users_14d`
