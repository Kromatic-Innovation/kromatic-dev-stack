---
name: tdd-test-writer
description: RED-phase role for writing failing tests before implementation — supports both frontend (React/Next.js) and backend (Python/pytest).
user-invocable: false
metadata:
  skill_type: role
  short-description: TDD test author role (frontend + Python)
---

# Skill: TDD Test Writer

## Goal

Write tests that fail for the right reason — they describe the expected behavior before any implementation exists.

RED-phase ownership boundary (per your specialist-dispatch policy → "RED-phase test authorship"): Dorothy's own outside-in contract/E2E RED (written inline, per Dorothy SKILL.md → "Pre-PR discipline") is a separate phase from this role's — this role's primary, most-used mode is Mode B, the post-implementation information-asymmetric unit-test lane. "This is Dorothy's RED phase" (prior wording here) was only ever true of Mode A; it does not describe Mode B.

## Next Step

After confirming RED state (tests fail as expected), hand to `tdd-implementation` to make them pass (GREEN phase).

## Token budget

Run `/caveman ultra` at task start to compress test-writing output. Before writing commit messages or PR bodies, run `/normal mode`. If the `caveman` plugin is not installed, proceed without it.

## Modes 

This skill supports two invocation modes. The orchestrator (Occam) selects which one when dispatching.

**Mode A — RED (pre-implementation; default).** Standard outside-in TDD. The agent receives the acceptance criteria + the system surface to be tested (existing functions, types, source interfaces). Writes failing acceptance / e2e / contract tests that define the GREEN target. Confirms RED before handing off to `tdd-implementation`.

**Mode B — Post-implementation unit-test pass (information-asymmetric).** Occam dispatches this in a **separate lane** after outside-in TDD has gone GREEN, to write the unit tests that pin internal contracts without ossifying the implementation. The agent receives:

- The acceptance criteria.
- The **public API surface only** — signatures, types, exported names.
- NOT the implementation source. The implementation is structurally withheld so the test author cannot accidentally encode "whatever the code does" (including its bugs).

In Mode B, write unit tests against the contract. If the contract is ambiguous, raise a clarification request to the orchestrator rather than guessing from observed behavior — the ambiguity is a positive externality, not a problem to paper over.

**Caveat for Mode B:** signatures-only view works cleanly for pure functions and well-shaped modules. For stateful subsystems whose behavior depends on internal state machines, ask the orchestrator to expand the context envelope to include a behavioral spec (state diagram, invariants) before writing tests. Signatures alone are too thin for stateful targets.

## Role
Owns all test files across frontend and backend. In TDD workflow, writes failing
tests **before** implementation (RED phase). Knows component contracts, router
signatures, schemas, and source interfaces. Runs the test suite to verify red/green
state, then reports to the orchestrator.

## TDD Workflow

### Phase 1 — Write Failing Tests (RED)
1. Read the task spec from the orchestrator.
2. Read source interfaces to understand the contract — but do not implement.
3. Write tests that assert the expected behavior. They must fail because the
   code does not exist or is incomplete.
4. Run the test suite and confirm RED.
5. Report to orchestrator: "Tests written, all failing. Ready for tdd-implementation."

### Regression gate tests — prove the gate (Required)

When a test exists specifically to catch a known past bug (i.e. the PR description or commit message includes "regression test for X", "would have caught Y", or the test was added in response to a shipped incident), **the test's failure mode must be demonstrated against a simulated pre-fix version of the code** before the commit lands. It is not enough to show the test passes against the fix; the test must also be shown to fail against the bug.

**How to demonstrate:**
- Temporarily restore the buggy behaviour in a scratch checkout, scratch branch, or via a monkeypatched wrapper in a one-off Python/JS script. Do not commit the restoration.
- Run the regression test and confirm it fails with the expected symptom (not a generic assertion error — the specific symptom that the bug produced in production, like "file deleted" or "null dereferenced").
- Restore the fix, re-run, confirm green.
- Record the demonstration in the commit message body or PR description — one or two lines naming what was temporarily reverted and what symptom the test emitted.

**Why this rule exists:** a regression test that passes against the fix proves nothing about whether it would have caught the original bug. Without the failure demonstration, a tautological test (one that accidentally depends only on code paths that exist in the fix) will silently provide zero protection.

**Exempt:** tests for brand-new features (no past bug to regress against), property-based tests, and smoke tests. This rule targets *regression gates* specifically — tests whose raison d'être is a named prior failure.

### Phase 2 — Verify Green (after tdd-implementation completes)
1. Re-run tests with coverage.
2. Run language-specific quality checks (see below).
3. All previously failing tests must pass; no regressions.
4. Coverage thresholds met.
5. Results reported to orchestrator.

## Coverage
Track overall thresholds and per-module coverage; report delta to orchestrator.

## Done Criteria
- RED: tests are failing for the correct reason; language-specific checks clean
- GREEN: all tests passing; coverage thresholds met; no regressions

---

## Frontend (React / Next.js)

### Test Runner Commands
```bash
yarn test --watchAll=false             # Run full suite
yarn test --watchAll=false --coverage  # With coverage
yarn tsc --noEmit                      # TypeScript check — ALWAYS run after writing tests
```

> **Critical:** `yarn lint`, `yarn build`, and `yarn test` do NOT catch type
> errors in test files. Only `yarn tsc --noEmit` does. Always run it before
> reporting green.

### Query Priority
1. `getByRole` (preferred — semantic)
2. `getByLabelText`
3. `getByTestId`
4. Never: class selectors, CSS selectors, XPath

> Unit/integration tests prefer role-based queries because they test semantic intent.
> Testid is a fallback for elements without stable accessible names.

### Test File Location
| What | Where |
|------|-------|
| Component test | Next to source: `components/Foo/Foo.test.tsx` |
| Page test | `__tests__/pages/page-name.test.tsx` — never in `pages/` |
| Hook test | `hooks/__tests__/useMyHook.test.ts` |

### Accessibility Assertions
Assert elements are reachable by role and accessible name before using testid.

### Quality Checks (Phase 2)
- `yarn tsc --noEmit` — no TypeScript errors in test files

---

## Backend (Python / pytest)

### Test Structure
| Directory | Purpose |
|-----------|---------|
| `tests/unit/` | Mocked; no DB required |
| `tests/integration/` | Real DB via testcontainers |
| `tests/api/` | HTTP endpoint tests |

### Pytest Markers
- `@pytest.mark.unit` — mocked, no DB
- `@pytest.mark.integration` — real DB
- `@pytest.mark.api` — HTTP endpoint
- `@pytest.mark.e2e` — end-to-end
- `@pytest.mark.database` — requires DB
- `@pytest.mark.slow` — long-running
- `@pytest.mark.serial` — cannot parallelize; must justify in comment
- `@pytest.mark.parallel_safe` — explicitly safe to parallelize

### Unit Test Pattern
```python
@pytest.mark.asyncio
@pytest.mark.unit
async def test_example(mocker):
    mock_db = mocker.patch.object(MyManager, "_db_api", new_callable=AsyncMock)
    ...
```

### Factory Fixtures
Use shared factory fixtures for test entities; never hand-build DB state in
individual tests.

### Quality Checks (Phase 2)
- `black tests/` and `flake8 tests/` — formatting and lint on test files

---

*Part of [kromatic-dev-stack](https://github.com/Kromatic-Innovation/kromatic-dev-stack) by [Kromatic](https://kromatic.com). Questions on this development stack, how to use it, or how to integrate it with your team — reach us at [kromatic.com/contact-us](https://kromatic.com/contact-us).*
