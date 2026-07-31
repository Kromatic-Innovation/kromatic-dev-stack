# Occam — Operator Escalation Packet

Companion to `occam/SKILL.md`. Read this before putting ANY question to the
human — a scope decision, a values call, a mechanism choice, an "is this
right?" checkpoint. Rules and format only — the incident history that
justified this doc lives in your retro log, not here. Filed from
the 2026-07-29 retro: one session put three escalations to the
operator and got the interface wrong in three different ways. This doc is
the fix.

## Scope

This governs the **escalation packet** — the question you put to a human and
the facts you hang it on. It does not govern issue-body authoring generally;
an agent-authored issue body carrying an as-of date on load-bearing external
state is a related but separate rule, tracked at an internal issue. Don't widen this
doc into that one.

## The rule: verify before escalating, not before executing

Every fact that **gates the operator's choice** — an alert ID, a version
number, the current state of the thing you're proposing to change — gets
re-read live, in the current session, before the question reaches the
operator. Not before you execute the operator's decision. Before you ask it.

The failure this prevents: an escalation summarized a dependency
issue from its body — *"alert #9"*, *"patched only in 14.0.0"*, *"a
5-major ESM-breaking jump that would break Sequelize"* — with three argued
options and a recommendation. The operator picked one. Live state, checked
only at execute time: no such alert existed; the real alerts were already
`fixed`; the first patched version was 11.1.1, not 14.0.0; the repo was
already on `^11.1.1`. Nothing was left to dismiss. One live API call before
the question was asked — not before the fix was applied — would have caught
all three misreads.

This is a stricter bar than "verify before you act." You already verify
before executing a decision (`AGENTS.md` → "Verify-before-act"). This rule
moves that same verification one step earlier, to the point where you're
about to spend the operator's attention on a claim, not just your own
compute on an action. A wrong claim that never reaches the operator costs
you a re-check; a wrong claim that reaches the operator costs their
judgment, spent on a premise that wasn't there.

**Mechanically:** for each gating fact, run the live check (`gh api`, `gh
issue view`, `npm view <pkg> versions`, read the actual `package.json` on
`develop`, whatever the fact requires) before drafting the question, not
after the operator answers.

## Per-fact provenance

Once you've verified, the reader still can't tell a live-checked claim from
one you copied out of an issue body — unless you mark it. Every
decision-gating claim in the packet carries an explicit tag:

- **`(verified live, this session)`** — you ran a check this turn and this
  is what it returned.
- **`(from issue body, written <date>)`** — you did not re-check; this is
  what the issue said when it was filed, and it may have drifted.

Formatting convention: put the tag in parentheses immediately after the
claim, same line, so the reader never has to hunt for which is which.

```
- The advisory's first patched version is 11.1.1 (verified live, this
  session via `npm view <pkg> versions`).
- The repo is already on `^11.1.1` (verified live, this session via
  `package.json` on develop).
- The original triage called this a 5-major jump to 14.0.0 (from issue
  body, written 2026-07-14) — superseded by the two lines above.
```

If a claim would be a `(from issue body, written <date>)` tag AND it gates
the operator's choice, that's the signal to go verify it — the tag is meant
to be rare in a finished packet, not a permanent label you leave on stale
facts.

## Plain language

No term that exists only inside your own model of the system. If a word
names something you built or reasoned your way to — an internal component
name, a mechanism you've been calling by shorthand all session — either use
the plain-English description instead, or define the term inline the first
time you use it.

The failure this prevents: *"Does the managed block render by
(i) a config-repo-side generator pushing into each consumer repo, (ii) each
consumer pulling at load time, or (iii) a published package?"* drew back:
*"I don't understand this question. Please explain in more plain english.
What's the block we are talking about here?"* Re-asked with a concrete
rendered example and a trade-off table (below), the same operator answered
immediately and volunteered a requirement unprompted. The information
content was the same; the framing wasn't. Test: could someone who has never
read this session's transcript understand the question on first read? If
the answer relies on a term you coined this session, rewrite it.

## A concrete example per option

Don't describe an option — show what the operator would actually see or
run into. "Pulling at load time" is abstract; "every time this repo starts
up, it fetches the latest block from the config repo over the network before it can
serve a request" is something a person can react to. For a UI change, name
the exact screen and what's different on it. For a process change, walk one
real instance through it end to end. If you can't write a concrete example
for an option, you probably don't understand the option well enough to be
offering it.

## Bounded trade-off table (≤4 rows)

Options go in a table, not a paragraph of prose alternatives. Cap it at
four rows — if you have a fifth option, it's probably a variant of one of
the first four, or it's not a real contender and shouldn't be listed. Every
row needs at least an operator-visible-effect column; add columns for
whatever actually differs (cost, reversibility, who has to act again
later).

```
| Option | What the operator sees | Trade-off |
|---|---|---|
| A: config-repo-side generator pushes on every merge | Block updates within minutes of the config repo change, no action needed in the consumer repo | Consumer repos can't opt out of a given update |
| B: consumer pulls at container start | Block only updates on next deploy/restart | A consumer can go stale between restarts; needs a "how stale" answer |
| C: published package, manual bump | Nothing changes until someone bumps the version | Most control, most manual toil — someone has to remember |
```

This is the same shape as the trade-off table that got a decisive answer in
the an internal issue retro, reduced to the pattern.

## Escalate the outcome, not the mechanism

The operator owns the **outcome** — what they experience, what trade-off
they're willing to live with. They do not, by default, own the
**mechanism** — how you get there. If your draft question asks "should I
build it via approach X or approach Y," stop and ask which of two things is
actually true:

1. **The mechanisms are interchangeable from the operator's seat** — they
   produce the same operator-visible effect, different engineering cost.
   Then you pick the mechanism yourself and escalate the outcome question
   instead ("do you want updates to land automatically, or only when you
   choose to deploy?").
2. **The mechanism choice really does reach the operator** — because it
   changes something they'll experience (staleness window, who has to act
   to get an update, failure mode when it breaks). Then say so plainly in
   the question itself, so the operator knows why you're asking them
   something that sounds technical: *"This changes how fresh the content
   ever is for you, which is why it's your call, not mine."*

Never send a bare mechanism question with no stated reason it needs a human
— that's the shape that produced the "I don't understand this question"
failure above. If you can't articulate in one sentence why the mechanism
has to reach the operator, it doesn't; pick it yourself.

## Classify before recommending

Before drafting the packet, classify the question itself:

- **Technical, and you have evidence** — a recommendation is appropriate
  and useful. State it, state the evidence, let the operator override.
- **Values, objective, or preference — and you have no evidence for the
  right answer** — present the options with **no pre-filled default.** A
  default anchors the reader even when it's presented as "just a
  suggestion," and an anchored reader is more likely to accept it than to
  independently derive their own answer.

The failure this prevents: a "default objective function" was
offered on a question with no technical evidence behind either answer, to
save the operator time. The operator's actual preference (awareness first)
was materially different from the default (conversion first) — the default
had already done the anchoring the values question wasn't supposed to
allow. If you're not sure which bucket a question falls in, treat it as a
values question — the cost of an unnecessary open question is a few extra
words from the operator; the cost of a wrong default is a decision that
looks agreed but wasn't actually theirs.

## Durable preference: ask inline and simply

**The operator cannot act on a delivered document.** A question that
arrives as a written artifact to go read on their own time — a file on
disk, a long doc, a report to review later — does not get answered; a
question asked directly, inline, in plain language, gets answered
immediately and decisively. This has now been reported twice in the same
arc (an internal issue retro; an earlier session already said as much when asked to
read a delivered document instead of being asked directly), which makes it
a standing preference, not a one-off to rediscover each time context
resets.

Recorded canonically in your engineering-principles file (id:
`operator-questions-inline-not-delivered`, scope `global`, consumer
`product`) so it renders into every repo's `AGENTS.md` via the managed-block
sync instead of living only in this doc. This doc is the
operational detail — the trade-off table, the provenance tags, the
verify-before-escalating rule — that principle entry is the one-line
durable fact a future session sees even if it never opens this file.

**Exception:** the compaction/continuation/restart prompts in
`occam/session-continuity.md` are deliberately written to a file on the
Desktop — but those aren't a question put to the operator for a decision,
they're a prompt for the operator to hand back into a future session
verbatim. Don't read that exception as license to deliver an escalation
question as a document; the two are different artifacts with different
readers.

## Packet checklist

Before sending, the packet has:

1. Every gating fact re-read live this session, each tagged `(verified
   live, this session)` or `(from issue body, written <date>)`.
2. No undefined agent-only jargon.
3. A concrete example per option — what the operator sees, not what the
   system does internally.
4. A trade-off table, ≤4 rows, not prose alternatives.
5. A question about the outcome, not the mechanism — or a one-sentence
   reason the mechanism itself has to reach them.
6. A recommendation ONLY if the question is technical and you have
   evidence; no pre-filled default on a values/preference question.
7. Delivered inline, in the conversation, in plain language — not as a
   document to go read.
