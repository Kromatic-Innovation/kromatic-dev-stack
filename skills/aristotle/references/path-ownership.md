# Path Ownership Contract

## Source Of Truth
Use `<your_reporting_dataset>.dim_route_owner` for route-to-repo attribution.

## Matching Logic
- `match_type = exact`: route must equal `path_pattern`
- `match_type = prefix`: route must start with `path_pattern`
- Lower `priority` wins when multiple rows match.
- For equal priority, prefer the longer `path_pattern`.

## Portfolio Defaults (Current Site Setup)
- `/tools/*` should map via `dim_route_owner`.
- `/blog/*` defaults to your marketing-site repo.
- Unknown tool paths should be labeled `unknown-tools-repo` until mapped.


## Portability Rule
This skill is portfolio-level. For another site:
1. update `dim_route_owner` for that domain's paths and repos
2. keep `/blog/*` default or override as needed
3. keep fallback `unknown-tools-repo` for unmapped tool routes
4. keep metric and Bayesian contracts unchanged unless explicitly versioned
