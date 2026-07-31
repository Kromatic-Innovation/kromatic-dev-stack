---
name: propose-issue
description: Canonical body structure and quality gate for filing a GitHub issue an agent can build from cold. Use whenever a persona files work to the backlog rather than doing it now.
---

# propose-issue

The contract for filing work that survives the session that thought of it.

Every persona in this bundle defers work: Perlman files vision epics, Occam files
deferred QA findings, Quine files follow-ups. All of them file through this
shape. An issue is not a note to yourself — it is a brief for an agent with no
memory of this conversation.

## The governing standard

**Write for a cold reader with no session context.** The issue will very likely
be picked up by an agent (or a person) who has never seen the discussion that
produced it. If understanding the issue requires anything that is not in the
issue, it is not fileable yet.

This single rule generates most of the gates below. "See the discussion above,"
"as we said," "the usual pattern here," and links to ephemeral context are all
failures of it.

## Body structure

```markdown
## Problem

What is wrong or missing, and what it costs. Concrete and observable — name the
symptom a reader could go verify, not the abstraction. If the problem was found
by a specific failure, describe the failure.

## Why it matters

Who is affected and what changes for them once this lands. An issue that cannot
answer this is a preference, not a problem — reconsider filing it.

## Plan

The rough shape of the work: which area or repo it touches, the sequence if
sequence matters, known unknowns. NOT file paths, function names, or technical
design — that boundary belongs to the architect at decomposition time, not to
the persona filing the issue.

## Acceptance criteria

- [ ] Observable, checkable statements — a reader can tell whether each is met
- [ ] Every criterion is satisfiable inside the named repo
- [ ] Includes the verification step, not just the change

## Out of scope

What this issue explicitly does NOT cover, especially the adjacent work a
reasonable implementer would otherwise pull in. This is the scope fence —
without it, thin slices grow.

## Context

Where this came from, and any prior art or related issues. Enough for a cold
reader to orient; no links to anything unrecoverable.
```

## Buildability gate

Before labelling an issue ready for an autonomous queue, all three must hold.
If any fails, the issue is still fileable — it just is not agent-buildable, and
should be labelled for a human instead.

1. **Settings** — the success state is *code in that repo*, not a change made in
   somebody's web console. "Enable the feature flag in the vendor dashboard" is
   not buildable; "add the flag to the config module and cover it" is.
2. **Permissions** — every mutation the work requires is inside the scopes the
   agent's credentials actually hold. Check before filing, not at 3am when the
   lane fails.
3. **Authority** — every acceptance criterion is satisfiable inside that one
   repo. An AC that depends on another repo's merge belongs in that repo's
   issue, with a dependency edge between them.

The cost of skipping this: an unattended queue picks the issue up, burns a build
slot, and fails at the last step. Worse, it fails *silently* overnight and is
not discovered until morning.

## Drift gates

Refuse to file, and fix the shape first, when:

- **The issue carries `epic`.** Epics are umbrella issues, not buildable diffs.
  Split into child issues and label the children, not the parent. Never mark an
  epic ready.
- **The acceptance criteria span more than one repo.** Split per repo and link
  with dependency edges.
- **The body names file paths and function signatures.** That is a plan, not an
  issue — you have pre-empted the architecture review. Raise the altitude.
- **The issue is one session's worth of work times three.** Thin-slice it. One
  issue should be roughly one session.
- **The "Problem" section describes a solution.** "Add a caching layer" is not a
  problem. "The dashboard takes 8s to load because it refetches on every keystroke"
  is. File the problem; let the implementer find the fix.

## Labels

Apply exactly one priority label (MoSCoW: `moscow:must` / `should` / `could` /
`wont`, defaulting to `moscow:should`) and exactly one type label (`bug` /
`feature` / `chore` / `epic`).

Only apply labels that exist in your canonical registry. A new label is
**propose-before-use**: add it to the registry in the same PR that first uses
it, and meet the distinct-reader standard — a new label needs a reader who will
act on it differently from every existing label. Otherwise you are creating
vocabulary nobody reads.

## Filing mechanics

**Never pass a multi-line body as an inline shell heredoc.** It is the single
most reliable way to file an issue whose body is empty, truncated, or — worst —
left over from a previous invocation.

Write the body to a temp file and pass it by path. Two failure modes to defeat,
both observed in practice:

- **A stale temp file.** A write that silently fails leaves the previous run's
  body in place, and the create call cheerfully files it. Reserve a *unique*
  path per invocation.
- **An empty temp file.** Creating the file first and then writing to it can
  fail if your tooling refuses to overwrite an existing file it has not read —
  leaving a 0-byte body that files successfully. Reserve the path *without*
  creating the file.

After creating, **verify server-side** that the body that landed matches the
body you sent, and repair if it does not. A create call returning success is
not evidence the body arrived.

## Next step

Filing is not delegation. If the work is urgent, say so to the human in the
same turn you file it — an issue filed silently is an issue nobody scheduled.

---

*Part of [kromatic-dev-stack](https://github.com/Kromatic-Innovation/kromatic-dev-stack) by [Kromatic](https://kromatic.com). Questions on this development stack, how to use it, or how to integrate it with your team — reach us at [kromatic.com/contact-us](https://kromatic.com/contact-us).*
