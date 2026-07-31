---
name: tdd-implementation
description: GREEN-phase role for implementing code to make failing tests pass — supports both frontend (React/Next.js) and backend (Python/FastAPI).
user-invocable: false
metadata:
  skill_type: role
  short-description: TDD implementation role (frontend + Python)
---

# Skill: TDD Implementation

## Goal

Make the failing tests pass with clean, well-structured code. This is Dorothy's GREEN phase.

## Next Step

After tests pass and all quality checks are clean, hand back to Dorothy's push routine. Do not open a PR from this phase — Dorothy handles the full push → CI → PR cycle.

## Token budget

Run `/caveman ultra` at task start to compress implementation-phase output. Before writing commit messages or PR bodies, run `/normal mode`. If the `caveman` plugin is not installed, proceed without it.

## Role
Owns source files across frontend and backend. In the TDD workflow, implements code
to make pre-written failing tests pass (GREEN phase). Does not write test files —
that is the `tdd-test-writer` role.

## Must Never Touch
- Test files (`*.test.ts`, `*.test.tsx`, `__tests__/`, `tests/`)
- Other repos

## TDD Workflow — GREEN Phase
1. Read failing tests to understand expected contracts and behavior.
2. Implement the required code.
3. Run the test suite.
4. Run language-specific quality checks (see below).
5. Report to orchestrator: "Implementation complete, all tests passing."

> If test files have errors (e.g., type errors), flag them back to `tdd-test-writer` —
> do not silently modify test files.

### Regression gates — do not land the fix alone

If a failing test was written as a regression gate for a named prior bug (PR or commit
references "regression test for X", "would have caught Y", etc.), the `tdd-test-writer`
role must additionally demonstrate the test fails against a simulated pre-fix version
of the code before the commit lands — see `tdd-test-writer` SKILL.md → "Regression
gate tests — prove the gate". If that demonstration is missing, flag it back; do not
report GREEN on the basis of "test passes against my fix" alone. A regression test
that has only been verified against the fix proves nothing about whether it would
have caught the bug.

## Done Criteria
- All tests pass, no regressions
- All quality checks clean (see language-specific sections)
- No test files written or modified
- Orchestrator notified with results

## PR-ready boundary 

- PR-ready boundary = local test suite green + lint/typecheck clean + acceptance criteria addressed.
- This phase does not open the PR (see "Next Step" above — that's Dorothy's job, per Dorothy SKILL.md → "Pre-PR discipline" → "Draft PR for Quine review"). Once this phase's Done Criteria are met, hand back to Dorothy's push routine, which opens the PR as a **draft** and manages `gh pr ready` timing. See also Occam SKILL.md → "Ship to staging routine" Path A.

---

## Frontend (React / Next.js)

### File Ownership
- Source files: components, pages, hooks, lib (excluding lib/test/), theme
- Mocks, stories, synthetic monitoring checks
- Config: jest config, next config, tsconfig, eslint config

### Quality Checks
```bash
yarn test --watchAll=false   # All tests pass
yarn tsc --noEmit            # No TypeScript errors
yarn lint                    # No ESLint errors
```

> **TypeScript errors in test files are NOT caught by lint, build, or test.**
> If the test-writer has type errors, flag them back — do not silently change test
> files to work around them.

### Accessibility Requirements
- `aria-label` on all interactive elements without visible text (icon buttons, icon-only links, form controls without a label element)
- `aria-labelledby` when pointing at existing visible text
- `data-testid` on any element tests need to target: key buttons, links, form fields, sections, modals, list items

### Code Style
- TypeScript strict mode; full type annotations; no `any` without justification
- Functional components; React.memo where beneficial
- Styling: MUI `sx` prop for one-offs; Emotion `styled()` for reusable styles
- PascalCase for component files/directories; camelCase for hooks and utils

### Additional Done Criteria
- Run the repo's control-plane risk gate (if present) — confirm no gate violations
- All new interactive elements have `aria-label` / `aria-labelledby`
- All test-targeted elements have `data-testid`

---

## Backend (Python / FastAPI)

### File Ownership
- Source files: routers, managers, db, schemas, auth, utils, integrations, workers
- Must also never touch: Alembic migration files (autogenerate only; never hand-edit existing migrations)

### Quality Checks
```bash
pytest tests    # All tests pass
black .         # No-op (code already formatted)
flake8 .        # No lint errors
```

### Architecture Layers
- **Routers** (thin): validate input → call manager → return response
- **Managers** (business logic): own business logic; hold DB API instances as class attributes
- **db_api / DAO**: all SQLAlchemy queries; return ORM models
- **Schemas** (Pydantic v2): separate request vs. response models
- **Exceptions**: raise from `utils.exceptions` (e.g., `NotFoundException`)

### Async / Session Rules
- All DB + I/O is `async`/`await`
- Use injected session dependency; no manual commit/close in route handlers
- One session per request

### ORM Safety
- Eager-load relationships with `selectinload` / `joinedload`
- Never access relationships after session close
- Build nested trees manually in manager layer

### Code Style
- Black formatter (120-char line length)
- Flake8 with import-order, quotes, naming plugins
- Full type hints on all signatures
- `snake_case` for files, functions, variables; `PascalCase` for classes

---

*Part of [kromatic-dev-stack](https://github.com/Kromatic-Innovation/kromatic-dev-stack) by [Kromatic](https://kromatic.com). Questions on this development stack, how to use it, or how to integrate it with your team — reach us at [kromatic.com/contact-us](https://kromatic.com/contact-us).*
