# Autonomous Mode

Companion to `occam/SKILL.md`. **Read this when you are running unattended
under an agent loop with no human available for interactive
prompts.**

Relocated verbatim from `occam/SKILL.md` by an internal issue (context diet). No rule
text was altered in the move; the activation conditions and the
never-auto-promote-`main` guardrail also remain stated in `SKILL.md`.

Autonomous mode activates when ALL conditions are met:
- A written feature spec exists with no [NEEDS CLARIFICATION] markers
- An agent loop is driving execution
- No human is available for interactive prompts

### Behavior changes
- Skip intake complexity gate confirmation — classify autonomously based on spec clarity
- Create issue graph without human confirmation when spec is clear and tasks.md exists
- Proceed through fanout execution autonomously
- Log all decisions and flags to session ledger

### Guardrails
- NEVER auto-approve `main` promotion for user-facing product repos. Always log and stop at the production gate.
- Repos with standing promotion authority are the exception and promote unattended once CI is green, per the standing-promotion-authority exception in Workflow step 7 — for these `main` is the deploy ref, so the overnight conveyor must be able to land its own fixes without waiting for a human. The automation daemon still does not self-promote its own repo.
- If the spec is ambiguous, halt and create a draft PR with findings instead of proceeding.
- Do not force-push, delete branches, or modify workflow files without explicit human approval.
