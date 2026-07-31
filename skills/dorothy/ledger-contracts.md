# Ledger Contracts

Reference format specs for Dorothy's ledger entries. See [SKILL.md](SKILL.md) for workflow behavior.

## Runtime ledger

- Location: repo `.tmp/ledgers/workflow_runtime.jsonl` (local-only, not git-tracked)
- Helper: `bash scripts/log_workflow_runtime.sh ...` (not manual `>>` appends)
- Format: `jsonl` (one object per line), key order:
  `ts_utc`, `workflow_name`, `scope`, `source_sha`, `start_utc`, `end_utc`, `duration_s`, `conclusion`, `run_url`
- Retention: newest 3 rows per `workflow_name + scope`

## Work session ledger

- Location: `$WORKSPACE/.tmp/ledgers/work_session.jsonl` (local-only, not git-tracked)
- Helper: `bash scripts/log_work_session.sh ...` (not manual `>>` appends)
- Format: `jsonl` (one object per line), key order:
  `ts_utc`, `event`, `issue_ref`, `branch`, `work_type`, `summary`, `status`, `next_step`, `blocked_by`, `links`
- Event values: `start` or `stop`
- Retention: newest 50 rows

### Examples

Start entry:

```json
{"ts_utc":"2026-02-28T15:05:00Z","event":"start","issue_ref":"<owner>/<repo>#1","branch":"dorothy/feature/estimation-parity","work_type":"feature","summary":"Implement parity endpoint contract updates.","status":"in_progress","next_step":"Update schema and tests.","blocked_by":"","links":"https://github.com/<owner>/<repo>/issues/123"}
```

Stop entry:

```json
{"ts_utc":"2026-02-28T16:40:00Z","event":"stop","issue_ref":"<owner>/<repo>#1","branch":"dorothy/feature/estimation-parity","work_type":"feature","summary":"Schema updates done; tests partially updated.","status":"paused","next_step":"Finish MCP parity tests.","blocked_by":"Awaiting API response fixture review.","links":"https://github.com/<owner>/<repo>/issues/123"}
```
