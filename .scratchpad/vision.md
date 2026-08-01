# Vision

Product direction and principles. For the visual/interaction layer — palette,
themes, navigation, copy — see [ui-ux.md](ui-ux.md).

## Core aspiration

Feel like "chatting with a brilliant native speaker who instantly turns each
explanation into the perfect flashcard, then reminds you just before you forget."

Language learners bounce between two tools — an LLM for nuanced explanations and
a flashcard app for spaced repetition. That context-switch kills flow and hurts
retention. Amgi is ONE place to ask, understand, and remember.

## Design principles

- **Stay in flow** — UI never drags attention away from the word
- **Depth on demand** — enough detail by default; drill deeper only when curious
- **Progress is visible** — streaks and review counts are always one glance away
- **Start narrow, expand later** — Korean↔English first, architecture must welcome more languages
- **Own your learning** — honest data policies, no dark patterns, easy export

## Audience

**Not limited to beginners** — amended 2026-07-31, and the distinction is the
point. The earlier wording was "not beginners", which was overreach: the goal is
to **meet the learner wherever they are**, beginner through advanced, not to
exclude the low end.

What survives unchanged is the *content* rule that line was written to justify.
The core user (a Korean speaker studying English, or an English speaker studying
Korean) already has years of schooling in the language, so the value is in words
where a one-word translation is insufficient — nuance, register, and familiar
words carrying an unfamiliar second meaning. Don't build greetings-and-numbers
filler.

**Don't cite "not beginners" to argue a feature should skip the basics.** For a
beginner, grammar feedback is the *valuable* half, not the commodity half.

**Prefer adaptivity that is emergent, not configured.** No level setting, no
placement test, no per-level content — those are the wide-scope version of this
and they are not what's wanted. Where a feature can read the level off the
user's own input, it should: writing review does exactly this, since a submitted
passage reveals control of morphology, register awareness and sentence-length
ceiling all at once. One prompt line ("pitch it to the level the writing
demonstrates") replaces an entire levelling system. See the writing-review
entry in [status.md](status.md).

This shapes packs: they are **domains being unlocked**, never "starter" decks.
Curated from real sources, editorially controlled, not AI-generated.

**Amended 2026-07-24 — scripts are the exception.** The kana packs are
explicitly for beginners, which the rule above would have forbidden. The line
that actually holds: Amgi doesn't teach you vocabulary you should already have,
but a *writing system* is a prerequisite, not vocabulary — an adult who reads
Chinese fluently still can't read かな, and no amount of nuance helps until they
can. Expect the same call for hangul and 注音 if those decks ever want it.
Everything else about packs is unchanged: still curated, still not
AI-generated, still never a "starter vocabulary" deck.

## The four skills

_Added 2026-07-31._ The direction the app is growing toward is **the four skills
mastery needs — reading, writing, speaking, listening** — with **vocabulary
acquisition as the base underneath all four**. That is the frame for judging
whether a feature belongs, not a roadmap promising all four.

The useful thing this exposed: the app is not starting from zero on production.
`backToFront` review already asks you to produce the study language, and its
i18n key is literally `promptProduce`. So there is a ladder, with rungs already
built:

| | comprehension | production |
|---|---|---|
| **word** | Learn, `frontToBack` | `backToFront` ✅ |
| **sentence** | — | **writing review** |
| **realtime** | — | conversation practice (backlog) |
| **extended input** | reading / listening — nothing | — |

Writing review is therefore the next rung on an existing ladder, not a new axis
— a much smaller bet than "add a skill to the app." The frame also makes the
reading/listening gap legible: those need *long input with comprehension
checking*, which shares almost nothing with what's built, so they are their own
bet and shouldn't be scoped into the output work.

## Long-term vision

Multi-media prompts (image/audio → card), social layer (shared decks,
challenges), AI pronunciation feedback, cross-language bridge explanations.
