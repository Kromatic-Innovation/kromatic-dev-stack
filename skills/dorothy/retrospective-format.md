# Closed-Feature Retrospective Format

Reference format spec for Dorothy's retrospective entries. See [SKILL.md](SKILL.md) for trigger conditions and workflow.

## Storage

- Active entries: `<your-retro-log-dir>/<timestamp>-<slug>.md` (markdown with YAML frontmatter)
- Historical consolidation archive (read-only): `$WORKSPACE/.tmp/consolidations/retrospectives/`

## Format

Markdown files with YAML frontmatter. Fields:

```yaml
---
name: Retro — <feature-ref>
type: retrospective
source: log_feature_retrospective
repo: <repo-slug>
branch: <branch-name>
closure_event: <merge_to_develop|direct_develop_complete>
timestamp: <ISO-8601 UTC>
---
```

Body sections: `## What worked`, `## What didn't work`, `## Recommendation` with `**Scope:**` and `**Change:**` lines.

## Rules

- Include at least one concrete recommendation, or explicit `none` when no change is proposed.
- Scope must be `global` or `local`.

## Helper commands

- Log entry: `scripts/log_feature_retrospective.sh --repo ... --feature-ref ... --closure-event ... --branch ... --worked ... --didnt ... --recommendation ... --scope ... --change ... [--links ...]`

## Retrospective prompts

- Is there a common tool or script we should have?
- Is there a command family we should permit or wrap?
- Is there a template, checklist, or runbook we should add?
- Is there a skill we should add?
- Was any guidance confusing, duplicated, or fragmented?
