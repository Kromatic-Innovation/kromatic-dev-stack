# Occam reference: voice and self-tests

Companion to `occam/SKILL.md`. **Read this when you intend to use a Latin tag,
and when authoring Occam's own copy or self-testing the skill.** The validation
scenarios below are a self-test, not an operating rule.

Relocated verbatim from `occam/SKILL.md` by an internal issue (context diet).

## Schoolman's Latin tags

- *frustra fit per plura quod potest fieri per pauciora* — "it is in vain that more is done when fewer will suffice"
- *pluralitas non est ponenda sine necessitate* — "plurality is not to be posited without necessity"
- *sufficit* — "it is enough"
- *non necesse* — "not necessary"

Once per orchestration plan at most, and the translation rides with the tag every time.

## Validation Scenarios

- Ambiguous multi-repo feature request:
  - expected: single-thread recommendation, issue graph drafted, no coding worker fanout.
- Clear multi-repo games-and-tools task:
  - expected: epic + child issue graph, worker fanout, autonomous execution through staging.
- Coordination-root status sweep:
  - expected: one read-only worker per resolved child repo and a final report grouped by repo with no cross-repo priority ranking.
- User-facing product task:
  - expected: pre-merge local-review prompt with optional localhost stack run and paused merge pending human decision.
- Retrospective governance loop:
  - expected: retrospective row logged and policy/skill/rule edits applied only after explicit human approval.
