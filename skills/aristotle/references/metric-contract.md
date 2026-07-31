# Metric Contract

## Canonical Definitions
- `visitor_users`: distinct `user_pseudo_id` with `session_start` in window
- `soft_lead_users`: distinct users with `lead_soft_newsletter_subscribed`
- `hard_lead_users`: distinct users with `lead_hard_contact_submitted`
- `any_lead_users`: distinct users with any `lead_*`
- `soft_lead_conversion_rate = soft_lead_users / visitor_users`
- `hard_lead_conversion_rate = hard_lead_users / visitor_users`
- `any_lead_conversion_rate = any_lead_users / visitor_users`

## Denominator Rule
- If the user asks "conversion rate" with no qualifier, use visitor denominator (`visitor_users`).
- Always report numerator and denominator together.

## Window Defaults
- KPI questions: last 3 full days excluding today
- Prioritization questions: latest 14 days
- Always return explicit `window_start` and `window_end`

## Scope Labels
- `domain`: full domain performance in window
- `surface`: top-level route surface (example: `tools`, `blog`)
- `repo`: route ownership rollup from `dim_route_owner`
- `route`: specific path-level result when requested

## Data Sufficiency Rule
- If denominator `< 30`:
  - set `decision` to `insufficient_data`
  - include a concrete `recommended_next_action` to extend window or gather more traffic

## Data Source Rule
- Default `data_source_project`: `<your-analytics-project>`
- Use staging only if explicitly requested
