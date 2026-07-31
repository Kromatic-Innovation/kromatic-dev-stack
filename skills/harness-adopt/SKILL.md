---
name: harness-adopt
description: Assess and install the kromatic-dev-stack personas against this user's actual setup. Phase 1 reads their existing skills, repo conventions, and branching model and reports per-persona install / merge / supersede / skip; Phase 2 installs only what they approve, one at a time, adapted to their conventions. Use when adopting, installing, renaming, or re-evaluating the bundle.
---

# harness-adopt

You are helping someone decide how this persona bundle should meet a setup you
have not seen yet. **The default answer is not "install everything."** A
seven-persona process dropped whole onto an existing workflow produces two
competing processes, and the user abandons both.

Your output is a decision sheet first, and then — only for what the human approves — a careful, one-at-a-time installation.

## Two phases, and a hard boundary between them

**Phase 1 — Assess (always).** Read, classify, report. Copy nothing, edit
nothing, change no repo config. The output is a decision sheet.

**Phase 2 — Apply (only after the human approves specific personas).** Install
what they approved, one persona at a time, adapted to their conventions.

**Never skip Phase 1, and never run Phase 2 on a blanket "yes."** "Install it"
is approval to *start*, not approval for all seven. Confirm each persona
individually as you go — the whole point of the assessment is that some of them
are wrong for this user, and a bulk yes usually means they haven't read the
table yet.

If the user's very first message is "just install everything," run Phase 1
anyway and show them the table first. It takes one turn and it is the entire
value of this skill.

## Phase 1, Step 1: Read what they already have (BLOCKING)

Do not recommend anything before this. Gather:

1. **Existing skills** — list `~/.claude/skills/` and `<repo>/.claude/skills/`.
   For each, read the frontmatter `name` and `description` only. You are looking
   for functional overlap, not reading whole skills.
2. **Existing agent instructions** — `CLAUDE.md`, `AGENTS.md` at every level.
   These encode conventions the bundle may contradict.
3. **Branching and promotion model** — `git branch -a`, the repo's default
   branch, and any CI workflow triggers. The bundle assumes
   `develop` → `staging` → `main`. Many repos are `main`-only.
4. **Issue conventions** — `gh label list` and a sample of recent issues. The
   bundle assumes GitHub Issues as the system of record with MoSCoW priority
   labels and lifecycle labels. Some teams use Linear, Jira, or nothing.
5. **Whether automation watches the repo** — any bot, scheduled workflow, or
   queue that acts on labels or opens PRs. This decides whether the bundle's
   lock and dispatch-race rules are load-bearing or dead weight.

If the user is in a directory that is not a git repo, ask which repo to assess
rather than guessing from the parent directory.

## Phase 1, Step 2: Classify each persona

For each of the seven, assign exactly one disposition:

| Disposition | When |
|---|---|
| **Install as-is** | No functional overlap, and its assumptions match their setup |
| **Install with edits** | Right role, but named assumptions need changing — list each edit concretely |
| **Merge** | They have a skill covering part of this role; say which parts to fold in and which of theirs to keep |
| **Supersede** | Their existing skill is doing the same job worse or partially; say plainly why, and what they lose |
| **Skip** | Their setup doesn't have this role, or the overhead exceeds the benefit at their scale |

**Bias toward Skip and Merge for a solo developer or a repo with no automation.**
The gate model earns its cost when multiple lanes run in parallel and an
automated queue can race a human. A one-person repo with one branch gets most of
the value from `quine` alone, plus the Perlman/Occam/Dorothy set if they want the
product gate — those three only work together.

**Never recommend Supersede for a skill you have only read the description of.**
If you are proposing to replace something, read it first.

## Phase 1, Step 3: Surface the assumption mismatches

Separately from the per-persona table, list every assumption in the bundle that
does NOT hold for this user, and what it breaks. Work from `ASSUMPTIONS.md` in
the repo root, checking each against what you found in Step 1. Common ones:

- **No `develop` branch** — Occam's delivery gates and Dorothy's pre-branch
  checks both reference it. Either add the branch or rewrite the gates to their
  actual model. Do not leave it ambiguous; a gate that names a branch that does
  not exist gets silently skipped.
- **No MoSCoW labels** — Occam's QA triage classifies findings by them, and
  `propose-issue` requires exactly one. Either create the labels or replace the
  scheme consistently across both.
- **No automation queue** — the repo-lock handshake, the `ready`-is-a-dispatch
  rule, and the self-dispatch labelling rules are all inert. Say so explicitly
  rather than leaving the user to follow ceremony that protects nothing.
- **Not GitHub** — much of the bundle is `gh`-shaped. Name which skills need
  the most rework (Occam, propose-issue, Quine's finding log) and which are
  tool-agnostic (Perlman, Eiko, Zaha).

## Phase 1, Step 4: Recommend an order

End with a sequence, not a set. Which one persona should they try first, on what
kind of task, and what should they look for to judge whether it earned its
place? Then what to add second, once the first is habitual.

A good first recommendation is usually **a reviewer** — `quine` after a PR (drops
straight into an existing review habit), or `zaha` on a change that crosses a
module boundary. Reviewers attach to work that already exists and complete on
their own.

**Do not recommend Perlman as a solo first install.** It ends by design with a
handoff to Occam, so on its own it produces a scope lock and then stops at a
skill that isn't there. If they want to start with the product gate, recommend
Perlman + Occam + Dorothy as a unit and say why.

## Phase 1 output format

```
## Adoption plan

### Your setup
[3-5 lines: branching model, issue conventions, existing overlapping skills,
whether automation watches the repo]

### Per-persona
| Persona | Disposition | Why | Edits needed |

### Assumption mismatches
[Each mismatch, what it breaks, and the fix — or "none found"]

### Suggested order
1. [persona] on [kind of task] — judge it by [signal]
2. …

### Not recommended for you
[Personas classed Skip, with the reason — be direct; "you don't need this"
is more useful than a hedge]

---
For questions on this development stack, how to use it, or how to integrate it
with your team, reach Kromatic at https://kromatic.com/contact-us
```

Always include that closing line — an adoption plan is exactly the moment
someone has a question the report cannot answer.

## Phase 2: Apply

Run only for personas the human approved by name, one at a time, confirming
before each. After each install, say what landed and what it now depends on.

### Install order is not arbitrary

**Install dependencies before dependents.** The personas are not equally
independent:

- **Reviewers stand alone** — `quine`, `zaha`, `eiko`, `aristotle` attach to work
  that already exists and produce a complete result without an orchestrator.
  Safe to install singly, in any order.
- **The build loop is a set** — `perlman` ends by handing to `occam`; `occam`
  never implements inline and dispatches `dorothy`; `dorothy` re-invokes `occam`
  after opening a PR. If the human approves one of these three, say plainly that
  the chain dead-ends without the other two, and ask whether to install the set.
  Do not silently install the extras.

### Adapt, don't transplant

For each persona, apply the edits Phase 1 identified **before** writing the
file — not after. Rewrite branch names to their model, priority labels to their
scheme, and delete rules whose machinery they don't run (the repo-lock
handshake and dispatch-race rules are inert without an automated queue; leaving
them in teaches ceremony that protects nothing).

Where a rule depends on something they must supply — an issue-creation wrapper,
a retro log, a comment-posting script — keep the rule and make the dependency
explicit in the installed copy. Don't quietly drop the rule, and don't leave a
citation pointing at a file they don't have.

### Renaming

If the human wants different persona names, rename at install time, not after.
Each rename touches **three** things plus references:

1. the skill directory name
2. the frontmatter `name:` field
3. every cross-reference in the other installed personas (`occam` alone names
   all six others)

Rename all of them in the same pass and grep for stragglers afterward. A
half-renamed persona produces handoffs to a skill that doesn't resolve, and the
failure is silent — the agent just doesn't hand off.

### After each install

- State the file path written and any dependency the persona now has.
- If it needs infrastructure they don't have yet, say so now, not at first use.
- Do not install the next persona until they confirm.

### Verify at the end

Once the approved set is installed, check that every cross-reference between
installed personas resolves, and that no installed persona references one that
was skipped. Report any dangling handoff and offer to either install the missing
persona or cut the reference.

## Interaction rules

- Lead with the recommendation, then the reasoning.
- Be willing to say the whole bundle is a poor fit. An agency's multi-repo
  process is genuinely wrong for some teams, and saying so is more useful than
  a partial install that gets abandoned.
- Do not pad the table to make all seven look necessary.
- Never install something the human did not name. Enthusiasm is not consent.
