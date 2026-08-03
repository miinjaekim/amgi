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
| **sentence** | — | **writing review**, grammar patterns (below) |
| **realtime** | — | conversation practice (backlog) |
| **extended input** | reading / listening — nothing | — |

Writing review is therefore the next rung on an existing ladder, not a new axis
— a much smaller bet than "add a skill to the app." The frame also makes the
reading/listening gap legible: those need *long input with comprehension
checking*, which shares almost nothing with what's built, so they are their own
bet and shouldn't be scoped into the output work.

## Grammar: a lookup table and a function are different things

_Added 2026-08-03. The design calls that follow from this are in Decisions in
[status.md](status.md); the build is in [backlog.md](backlog.md)._

Grammar today is one word in the type system — `FindingKind = 'grammar'` — plus
the flashcards a writing finding offers. A pattern like `-다가` becomes an
ordinary card with a gloss on the back, and is then reviewed the way a noun is.
That does not work, and the reason is worth stating precisely, because "grammar
is too big for a flashcard" is the wrong diagnosis and leads to bigger cards.

**Vocabulary is a lookup table. Grammar is a function.**

A flashcard *is* a lookup-table row, which is exactly why it is the right shape
for a word. A grammar point is not a row: it takes a stem, a context and an
intended meaning, and returns a form. You can hold a card reading "`-다가` =
while doing X, then Y" and still be unable to use `-다가`, because knowing the
row does not run the function. Worse, repeating the card teaches the *card* —
recognition of your own prompt, not the pattern.

Three things have to be learned about a grammar point, and a fixed
prompt-answer pair tests none of them:

1. **When to reach for it** — meaning → form. What production needs, and what
   recognition never exercises.
2. **How it attaches** — generative by definition: batchim and vowel harmony in
   Korean, agreement in French, stem class in Swedish. A card shows one
   instance; the rule spans all of them.
3. **Why it and not its neighbour** — 은/는 vs 이/가, imparfait vs passé
   composé. Nearly all real difficulty lives here, and it is invisible on a card
   showing one pattern alone.

So the unit is a **pattern you exercise**, not a card you flip, and every review
is a fresh act of production rather than a replay.

**Not multiple choice**, which is the tempting shortcut and is why this is
written down. Offering candidates does the retrieval for the learner. Selecting
between near-neighbours tests discrimination, which is real, but it is
recognition wearing production's clothes and it does not become fluency. The
learner has to *arrive* at the form.

**Not a grammar syllabus either.** "Prefer adaptivity that is emergent, not
configured" applies here with full force: an ordered grammar curriculum is the
configured version of this and is not wanted. The patterns you practise are the
ones your own writing showed you needed, plus the ones you asked about. Your
errors are the syllabus.

This fills the ladder's **sentence × production** cell properly — writing review
diagnoses at sentence level, and this is the drilling that follows a diagnosis —
and opens **sentence × comprehension**, which is still empty.

## Long-term vision

Multi-media prompts (image/audio → card), social layer (shared decks,
challenges), AI pronunciation feedback, cross-language bridge explanations.
