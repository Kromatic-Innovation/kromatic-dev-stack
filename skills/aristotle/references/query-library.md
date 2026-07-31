# Query Library (BigQuery)

Use placeholders:
- `@project_id` (default `<your-analytics-project>`)
- `@window_start`
- `@window_end`

Use reporting views only unless user explicitly requests raw verification.

## 1) Domain conversion (default KPI window)

```sql
SELECT
  MIN(event_date) AS window_start,
  MAX(event_date) AS window_end,
  SUM(visitor_users) AS visitor_users,
  SUM(soft_lead_users) AS soft_lead_users,
  SUM(hard_lead_users) AS hard_lead_users,
  SUM(any_lead_users) AS any_lead_users,
  SAFE_DIVIDE(SUM(soft_lead_users), NULLIF(SUM(visitor_users), 0)) AS soft_lead_conversion_rate,
  SAFE_DIVIDE(SUM(hard_lead_users), NULLIF(SUM(visitor_users), 0)) AS hard_lead_conversion_rate,
  SAFE_DIVIDE(SUM(any_lead_users), NULLIF(SUM(visitor_users), 0)) AS any_lead_conversion_rate
FROM `@project_id.<your_reporting_dataset>.v_domain_conversion_daily`
WHERE event_date BETWEEN @window_start AND @window_end;
```

## 2) Surface comparison (`tools` vs `blog`)

```sql
SELECT
  surface,
  MIN(event_date) AS window_start,
  MAX(event_date) AS window_end,
  SUM(visitor_users) AS visitor_users,
  SUM(soft_lead_users) AS soft_lead_users,
  SUM(hard_lead_users) AS hard_lead_users,
  SUM(any_lead_users) AS any_lead_users,
  SAFE_DIVIDE(SUM(any_lead_users), NULLIF(SUM(visitor_users), 0)) AS any_lead_conversion_rate
FROM `@project_id.<your_reporting_dataset>.v_route_conversion_daily`
WHERE event_date BETWEEN @window_start AND @window_end
  AND surface IN ('tools', 'blog')
GROUP BY surface
ORDER BY surface;
```

## 3) Repo-level conversion summary

```sql
SELECT
  surface,
  repo_group,
  repo_name,
  repo_path,
  MIN(event_date) AS window_start,
  MAX(event_date) AS window_end,
  SUM(visitor_users) AS visitor_users,
  SUM(soft_lead_users) AS soft_lead_users,
  SUM(hard_lead_users) AS hard_lead_users,
  SUM(any_lead_users) AS any_lead_users,
  SAFE_DIVIDE(SUM(any_lead_users), NULLIF(SUM(visitor_users), 0)) AS any_lead_conversion_rate
FROM `@project_id.<your_reporting_dataset>.v_route_conversion_daily`
WHERE event_date BETWEEN @window_start AND @window_end
GROUP BY surface, repo_group, repo_name, repo_path
ORDER BY visitor_users DESC;
```

## 4) Bayesian prioritization counts (14d default)

Run this query, then compute Bayesian fields using `bayesian-prioritization.md`.

```sql
WITH repo_rollup AS (
  SELECT
    surface,
    repo_group,
    repo_name,
    repo_path,
    SUM(visitor_users) AS visitor_users_14d,
    SUM(any_lead_users) AS any_lead_users_14d
  FROM `@project_id.<your_reporting_dataset>.v_route_conversion_daily`
  WHERE event_date BETWEEN @window_start AND @window_end
    AND surface IN ('tools', 'blog')
  GROUP BY surface, repo_group, repo_name, repo_path
),
surface_baseline AS (
  SELECT
    surface,
    SUM(visitor_users_14d) AS baseline_visitor_users_14d,
    SUM(any_lead_users_14d) AS baseline_any_lead_users_14d
  FROM repo_rollup
  GROUP BY surface
)
SELECT
  r.surface,
  r.repo_group,
  r.repo_name,
  r.repo_path,
  r.visitor_users_14d,
  r.any_lead_users_14d,
  b.baseline_visitor_users_14d,
  b.baseline_any_lead_users_14d
FROM repo_rollup r
JOIN surface_baseline b USING (surface)
ORDER BY r.visitor_users_14d DESC;
```

## 5) Ownership map inspection

```sql
SELECT
  match_type,
  path_pattern,
  surface,
  repo_group,
  repo_name,
  repo_path,
  active,
  priority,
  updated_at
FROM `@project_id.<your_reporting_dataset>.dim_route_owner`
ORDER BY active DESC, priority ASC, path_pattern;
```

## 6) AB latest

```sql
SELECT
  run_date,
  window_start_date,
  window_end_date,
  experiment_name,
  experiment_variant,
  surface,
  page_path,
  resource_id,
  exposures_users,
  primary_conversions_users,
  conversion_rate,
  control_conversion_rate,
  absolute_uplift,
  relative_uplift,
  meets_min_sample,
  recommendation_ready
FROM `@project_id.<your_reporting_dataset>.ab_results_latest`
ORDER BY experiment_name, experiment_variant;
```

If AB query returns zero rows, report explicit no-data status and avoid winner claims.

## 7) Top queries by impressions/clicks

```sql
SELECT
  query,
  SUM(impressions) AS impressions,
  SUM(clicks) AS clicks,
  SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS ctr,
  SAFE_DIVIDE(SUM(sum_position), SUM(impressions)) AS avg_position
FROM `@project_id.searchconsole.searchdata_site_impression`
WHERE data_date BETWEEN @window_start AND @window_end
  AND NOT is_anonymized_query
GROUP BY query
ORDER BY impressions DESC
LIMIT @top_n;
```

## 8) Pages with high impressions but low CTR

Pages getting eyeballs but not clicks — title/meta optimization candidates.
Joined with `dim_route_owner` for attribution.

```sql
WITH page_metrics AS (
  SELECT
    url,
    SUM(impressions) AS impressions,
    SUM(clicks) AS clicks,
    SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS ctr,
    SAFE_DIVIDE(SUM(sum_position), SUM(impressions)) AS avg_position
  FROM `@project_id.searchconsole.searchdata_url_impression`
  WHERE data_date BETWEEN @window_start AND @window_end
  GROUP BY url
  HAVING impressions >= @min_impressions
)
SELECT
  p.url,
  p.impressions,
  p.clicks,
  p.ctr,
  p.avg_position,
  o.surface,
  o.repo_group,
  o.repo_name,
  o.repo_path
FROM page_metrics p
LEFT JOIN `@project_id.<your_reporting_dataset>.dim_route_owner` o
  ON REGEXP_EXTRACT(p.url, r'https?://[^/]+(/.*)') LIKE o.path_pattern
  AND o.active = TRUE
WHERE p.ctr < @ctr_threshold
ORDER BY p.impressions DESC
LIMIT @top_n;
```

## 9) Striking distance queries (position 4–20)

Quick-win ranking opportunities: queries already on page 1–2 with meaningful impressions.

```sql
SELECT
  query,
  SUM(impressions) AS impressions,
  SUM(clicks) AS clicks,
  SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS ctr,
  SAFE_DIVIDE(SUM(sum_position), SUM(impressions)) AS avg_position
FROM `@project_id.searchconsole.searchdata_site_impression`
WHERE data_date BETWEEN @window_start AND @window_end
  AND NOT is_anonymized_query
GROUP BY query
HAVING avg_position BETWEEN 4 AND 20
  AND impressions >= @min_impressions
ORDER BY impressions DESC
LIMIT @top_n;
```

## 10) Position trend / content decay

Queries losing average position over two consecutive windows of equal length.
Set `@window_start` / `@window_end` for the current window; the prior window is
auto-computed as the same number of days immediately preceding `@window_start`.

```sql
WITH window_days AS (
  SELECT DATE_DIFF(@window_end, @window_start, DAY) + 1 AS days
),
current_window AS (
  SELECT
    query,
    SUM(impressions) AS impressions,
    SUM(clicks) AS clicks,
    SAFE_DIVIDE(SUM(sum_position), SUM(impressions)) AS avg_position
  FROM `@project_id.searchconsole.searchdata_site_impression`
  WHERE data_date BETWEEN @window_start AND @window_end
    AND NOT is_anonymized_query
  GROUP BY query
),
prior_window AS (
  SELECT
    query,
    SUM(impressions) AS impressions,
    SUM(clicks) AS clicks,
    SAFE_DIVIDE(SUM(sum_position), SUM(impressions)) AS avg_position
  FROM `@project_id.searchconsole.searchdata_site_impression`
  CROSS JOIN window_days wd
  WHERE data_date BETWEEN DATE_SUB(@window_start, INTERVAL wd.days DAY)
                       AND DATE_SUB(@window_start, INTERVAL 1 DAY)
    AND NOT is_anonymized_query
  GROUP BY query
)
SELECT
  c.query,
  p.avg_position AS prior_avg_position,
  c.avg_position AS current_avg_position,
  c.avg_position - p.avg_position AS position_change,
  p.impressions AS prior_impressions,
  c.impressions AS current_impressions,
  p.clicks AS prior_clicks,
  c.clicks AS current_clicks
FROM current_window c
JOIN prior_window p USING (query)
WHERE c.avg_position > p.avg_position
  AND p.impressions >= @min_impressions
ORDER BY position_change DESC
LIMIT @top_n;
```

## 11) GSC + GA4 joined: search queries to landing page conversions

Join GSC page-level data with `v_route_conversion_daily` to show which search
queries drive actual conversions.

```sql
WITH gsc_pages AS (
  SELECT
    url,
    SUM(impressions) AS impressions,
    SUM(clicks) AS clicks,
    SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS ctr,
    SAFE_DIVIDE(SUM(sum_position), SUM(impressions)) AS avg_position
  FROM `@project_id.searchconsole.searchdata_url_impression`
  WHERE data_date BETWEEN @window_start AND @window_end
  GROUP BY url
),
ga4_conversions AS (
  SELECT
    page_path,
    SUM(visitor_users) AS visitor_users,
    SUM(soft_lead_users) AS soft_lead_users,
    SUM(hard_lead_users) AS hard_lead_users,
    SUM(any_lead_users) AS any_lead_users,
    SAFE_DIVIDE(SUM(any_lead_users), SUM(visitor_users)) AS any_lead_conversion_rate
  FROM `@project_id.<your_reporting_dataset>.v_route_conversion_daily`
  WHERE event_date BETWEEN @window_start AND @window_end
  GROUP BY page_path
)
SELECT
  g.url,
  g.impressions AS page_impressions,
  g.clicks AS page_clicks,
  g.ctr AS page_ctr,
  g.avg_position AS page_avg_position,
  c.visitor_users,
  c.any_lead_users,
  c.any_lead_conversion_rate
FROM gsc_pages g
JOIN ga4_conversions c
  ON REGEXP_EXTRACT(g.url, r'https?://[^/]+(/.*)') = c.page_path
WHERE g.clicks >= @min_clicks
ORDER BY c.any_lead_users DESC, g.clicks DESC
LIMIT @top_n;
```

For query-level attribution, join `searchdata_url_impression` (which has both `url`
and `query` columns) directly with GA4 conversions:

```sql
WITH gsc_query_page AS (
  SELECT
    query,
    url,
    SUM(impressions) AS impressions,
    SUM(clicks) AS clicks,
    SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS ctr,
    SAFE_DIVIDE(SUM(sum_position), SUM(impressions)) AS avg_position
  FROM `@project_id.searchconsole.searchdata_url_impression`
  WHERE data_date BETWEEN @window_start AND @window_end
    AND query IS NOT NULL
    AND query != ''
  GROUP BY query, url
),
ga4_conversions AS (
  SELECT
    page_path,
    SUM(visitor_users) AS visitor_users,
    SUM(any_lead_users) AS any_lead_users,
    SAFE_DIVIDE(SUM(any_lead_users), SUM(visitor_users)) AS any_lead_conversion_rate
  FROM `@project_id.<your_reporting_dataset>.v_route_conversion_daily`
  WHERE event_date BETWEEN @window_start AND @window_end
  GROUP BY page_path
)
SELECT
  g.query,
  g.url,
  g.impressions,
  g.clicks,
  g.ctr,
  g.avg_position,
  c.visitor_users,
  c.any_lead_users,
  c.any_lead_conversion_rate
FROM gsc_query_page g
JOIN ga4_conversions c
  ON REGEXP_EXTRACT(g.url, r'https?://[^/]+(/.*)') = c.page_path
WHERE g.clicks >= @min_clicks
ORDER BY c.any_lead_users DESC, g.clicks DESC
LIMIT @top_n;
```
