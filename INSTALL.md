# Installing

The short version is in the [README](README.md): clone, then paste the prompt to your coding agent and let `harness-adopt` walk you through it. This document is the detail behind that.

## The guided install (recommended)

```bash
git clone https://github.com/Kromatic-Innovation/kromatic-dev-stack.git
```

Then give your agent:

> Read the repo at `<path-to-clone>` — start with `README.md` and `ASSUMPTIONS.md`, then the skills under `skills/`. Then invoke the `harness-adopt` skill in that repo and follow it: assess my existing setup against this bundle, tell me per role whether to install, merge, supersede, or skip, and flag every assumption that doesn't match how my team works. Then install the ones I approve, one at a time, adapting each to my conventions. Ask me before each install; don't copy anything I haven't agreed to.

`harness-adopt` runs in two phases.

**Phase 1 — Assess.** Reads your existing skills, your `CLAUDE.md` / `AGENTS.md`, your branching model, your label vocabulary, and whether anything automated watches your repositories. Reports per role: install as-is, install with edits, merge with something you already have, supersede it, or skip.

**Phase 2 — Apply.** Installs only what you approved, one role per confirmation, rewriting each to match your conventions rather than dropping ours on top of yours. It finishes by checking that every reference between installed personas resolves.

It is biased toward recommending *fewer* installs than more. A solo developer on a single-branch repository does not need all seven, and it will say so.

## Manual install

These are [Claude Code skills](https://docs.claude.com/en/docs/claude-code/skills) — folders of markdown. Copy the ones you want:

```bash
cp -R kromatic-dev-stack/skills/<name> ~/.claude/skills/
```

For a single project rather than globally, copy into `<your-repo>/.claude/skills/` instead.

Then invoke a persona by name — `/perlman`, `/occam`, `/dorothy` — or let your agent route to them.

## What to install first

Don't install all seven on day one — that's seven unfamiliar processes at once. But "start with one" isn't right either, because the roles are not equally independent.

**The reviewers stand alone.** `/quine`, `/zaha`, `/eiko`, and `/aristotle` attach to work that already exists — a diff, a pull request, a shipped change. Each produces a complete result by itself and hands its findings to you if no orchestrator is installed. **Any one of these is a safe first install.**

**The build loop is a set.** `/perlman` ends by design with "scope is locked, handing off to Occam." Occam never implements anything itself — it dispatches Dorothy. Dorothy comes back to Occam after opening a pull request. Install **Perlman, Occam, and Dorothy together**, or the chain stops at a persona that isn't there — and it stops *silently*, because a handoff to a missing skill just doesn't happen.

A reasonable sequence: one reviewer first, then the build loop as a unit once the gate model feels familiar, then the rest as you need them.

## Two skills need infrastructure you supply

Everything here runs on its own except these, which depend on things a bundle of markdown cannot ship:

- **`/quine`** — its findings log posts a review record to the pull request, which needs a comment-posting script of your own (set `GH_COMMENT_POST`; see `skills/quine/SKILL.md`). Without it the review still runs and prints its findings; only the durable record on the PR is lost.
- **`/retro`** — its multi-reviewer phase dispatches to personas registered as subagents in your own `.claude/agents/`, and it writes entries to a retro log location you choose. Without those, run it single-threaded and file the output wherever you keep decisions.

Neither fails silently. Both say what is missing.

## Assumptions to check

The skills carry conventions you may not share — a `develop` → `staging` → `main` promotion path, MoSCoW priority labels, GitHub Issues as the system of record, and a few platform assumptions. Every one of them is listed in **[ASSUMPTIONS.md](ASSUMPTIONS.md)** with what breaks if it doesn't hold and what to change instead.

The single biggest fork is whether anything automated watches your repositories. If nothing does, a whole family of rules — repository locking, handoff races, the "ready label is a dispatch" rule — is inert, and following it teaches ceremony that protects nothing. `harness-adopt` checks this and strips those rules on install.

## Renaming the personas

The names are a convention. If you'd rather have `/pm` and `/architect`, or your own scheme, rename them — but each rename touches three things plus references:

1. the skill folder name
2. the `name:` field in the skill's frontmatter
3. every reference to it in the other installed personas (Occam alone names all six others)

Do all of them in one pass and check for stragglers afterward. A half-renamed persona produces a handoff that silently goes nowhere. `harness-adopt` handles this if you ask it to rename at install time.

---

For questions on this development stack, how to use it, or how to integrate it with your team, reach Kromatic at [kromatic.com/contact-us](https://kromatic.com/contact-us).
