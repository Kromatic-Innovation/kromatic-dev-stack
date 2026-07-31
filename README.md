# kromatic-dev-stack

**The delivery workflow [Kromatic](https://kromatic.com) uses to ship client software with Claude Code** — seven agent personas with human gates between them.

Most agent setups are one very capable assistant with a long prompt. This is a different bet: **separate personas that hand off through explicit gates, and refuse to do each other's jobs.** The product strategist may not choose a database. The developer may not decide what to build. The QA reviewer reports findings but does not decide which get fixed. Those refusals are the point — they're what stop an agent from confidently building the wrong thing well.

This is not a demo. It's the working process, redacted of our internal infrastructure.

## The flow

```
  Perlman → Occam → Zaha → Eiko → Dorothy → Quine → Occam → ship → Aristotle
   (what)   (lanes) (arch) (design)  (build)   (QA)  (triage)        (measure)
      ↑                                                                  ↓
      └────────────  human gates at scope + merge; results feed back  ─────┘
```

| Persona | Role | Named for |
|---|---|---|
| **Perlman** | Product Manager — challenges the request, cuts an MVP slice, locks scope | Radia Perlman, who invented the protocol that stops a distributed system looping forever |
| **Occam** | Orchestrator — decomposes into lanes, dispatches workers, holds every gate | William of Ockham |
| **Zaha** | Architect — structural boundaries before the build, root-cause review after | Zaha Hadid, first woman to win the Pritzker |
| **Eiko** | Designer — design intent for user-facing work | Eiko Ishioka, Oscar-winning visual designer |
| **Dorothy** | Developer — owns implement → test → PR → green | Dorothy Vaughan, who led NASA's West Area Computing unit and taught herself FORTRAN |
| **Quine** | QA — test quality and convention audit after CI is green | W.V.O. Quine (a quine is also a self-reproducing program) |
| **Aristotle** | Analyst — defines the metric before an experiment ships, reads out the result | Aristotle |

## The ideas worth stealing

Even if you never install this, five rules in here have earned their place by catching real failures:

1. **Fetch before you analyze.** A stale checkout doesn't make an agent cautious — it makes it confidently wrong. Every planning gate starts with `git fetch` and a not-behind check. We have watched a full issue graph get built on a dependency version that had not existed on origin for hours.
2. **Verify by running, not by testing.** "Tests pass" is not evidence a behavior works. A change with a behavioral surface never goes CI-green → merge with *zero* observation of the real flow.
3. **Applying a "ready" label is a dispatch.** If an automated queue watches your labels, labelling an issue hands it off as surely as spawning an agent does — and the queue does not wait for your conversation to end.
4. **The reviewer reports; the orchestrator disposes.** QA ranks findings by blast radius. Someone else decides what blocks merge. Collapsing those two roles is how review becomes either rubber-stamping or bikeshedding.
5. **File the vision, don't discuss it away.** Everything the product pass surfaces that isn't in the MVP slice gets filed as an epic *before* scope locks. An un-filed idea dies with the session.

## Install

These are [Claude Code skills](https://docs.claude.com/en/docs/claude-code/skills). Copy the ones you want into your skills directory:

```bash
git clone https://github.com/Kromatic-Innovation/kromatic-dev-stack.git
cp -R kromatic-dev-stack/skills/* ~/.claude/skills/
```

For a single project instead of globally, copy into `<your-repo>/.claude/skills/`.

Then invoke a persona by name — `/perlman`, `/occam`, `/dorothy` — or let Claude route to them.

**Start with one.** Copying all seven on day one means seven unfamiliar processes at once. `/perlman` before your next feature, or `/occam` on your next multi-repo change, will tell you more in an hour than a full install will in a week.

### Two skills need infrastructure you supply

Everything here runs standalone except these, which depend on things a bundle cannot ship:

- **`/quine`** — its findings log posts a review record to the PR, which needs a comment-posting wrapper of your own (`GH_COMMENT_POST`, see `quine/SKILL.md`). Without it the review still runs and prints findings to stdout; only the durable PR record is lost.
- **`/retro`** — its multi-reviewer phase dispatches to persona subagents registered in your own `.claude/agents/`, and it writes entries to a retro log location you choose. Without those, run it single-threaded and file the output wherever you keep decisions.

Neither degrades silently: both say what is missing.

### Fit it to your setup first (recommended)

These skills assume conventions you may not share — a `develop` → `staging` → `main` promotion path, MoSCoW labels, GitHub Issues as the system of record. Before installing, run the adoption pass:

```
/harness-adopt
```

It reads your existing skills and repo conventions and reports, per persona: **install as-is**, **merge with** something you already have, **supersede** it, or **skip**. It also flags every assumption in the bundle that doesn't match your setup, so you adapt deliberately instead of discovering the mismatch mid-lane.

If you'd rather do it by hand, the assumptions worth checking are listed in [`ASSUMPTIONS.md`](ASSUMPTIONS.md).

## What is deliberately not here

This bundle ships the *delivery* half of our workflow. Left out on purpose:

- **Strategy and governance personas.** Where a gate says to escalate a strategic question ("is this venture's premise still true?") or a governance one ("this rule needs changing everywhere"), route it to your own equivalent or to a human. Don't invent a persona to absorb the escalation.
- **Our automation substrate.** We run an autonomous build queue that picks up labelled issues overnight. The skills describe the *contract* with such a queue — repo locks, lifecycle labels, dispatch races — generically, so the rules survive whether you run one or not.
- **Deploy topology, org rulesets, and credential wiring.** Yours will differ, and ours is not interesting.

### Optional companions

- **[`ideate-core`](https://www.npmjs.com/package/ideate-core)** — our ideation engine on npm. Perlman's Imagine step can call it to generate and stress-test a pool of candidate visions across temperature briefs, instead of anchoring on the first framing. `npm install ideate-core`.
- **`kromatic.com/mcp`** — our hosted MCP server, if you want the personas to reach our published lean-startup material directly.

## Why we published it

We're a product and engineering consultancy. This is how we actually work with clients, so it's the most honest thing we can show you about what working with us is like. If the gate model is useful to you, take it — that's the whole intent. If you'd rather we ran it with you, [that's what we do](https://kromatic.com).

Issues and PRs welcome, particularly "this rule didn't survive contact with my setup" reports — those are the most useful thing you can send us.

## Questions

**For questions on this development stack, how to use it, or how to integrate it with your team, reach us at [kromatic.com/contact-us](https://kromatic.com/contact-us).**

We're happy to talk through adoption whether or not you're a client — including telling you which parts of this you should skip.

## License

MIT. See [LICENSE](LICENSE).
