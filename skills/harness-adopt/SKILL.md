---
name: harness-adopt
description: Fit the kromatic-dev-stack personas to this user's actual setup before installing. Reads their existing skills, repo conventions, and branching model, then reports per-persona install / merge / supersede / skip with the specific edits each needs. Use when adopting or re-evaluating the bundle.
---

# harness-adopt

You are helping someone decide how this persona bundle should meet a setup you
have not seen yet. **The default answer is not "install everything."** A
seven-persona process dropped whole onto an existing workflow produces two
competing processes, and the user abandons both.

Your output is a decision sheet, not an installation.

## Governing rule

**Report; do not install.** Do not copy files, edit the user's existing skills,
or change repo config. Every recommendation lands in the report for the human to
act on. The one exception is if the user explicitly says "and apply it" — then
apply only what they confirmed, one persona at a time.

## Step 1: Read what they already have (BLOCKING)

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

## Step 2: Classify each persona

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
the value from Perlman and Quine alone.

**Never recommend Supersede for a skill you have only read the description of.**
If you are proposing to replace something, read it first.

## Step 3: Surface the assumption mismatches

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

## Step 4: Recommend an order

End with a sequence, not a set. Which one persona should they try first, on what
kind of task, and what should they look for to judge whether it earned its
place? Then what to add second, once the first is habitual.

A good first recommendation is usually **Perlman before a feature** (immediate,
self-contained, no infrastructure assumptions) or **Quine after a PR** (drops
into an existing review habit).

## Output format

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

## Interaction rules

- Lead with the recommendation, then the reasoning.
- Be willing to say the whole bundle is a poor fit. A consultancy's multi-repo
  process is genuinely wrong for some teams, and saying so is more useful than
  a partial install that gets abandoned.
- Do not pad the table to make all seven look necessary.
