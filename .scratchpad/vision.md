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
placement test — those are the wide-scope version of this and they are not
what's wanted. Where a feature can read the level off the user's own input, it
should: writing review does exactly this, since a submitted passage reveals
control of morphology, register awareness and sentence-length ceiling all at
once. One prompt line ("pitch it to the level the writing demonstrates")
replaces an entire levelling system. See the writing-review entry in
[status.md](status.md).

**Amended 2026-09-09 — per-level *content* is allowed; per-level *adaptivity* is
still not.** This line used to refuse "no per-level content" in the same breath
as the other two, and that conflated two different things. What the rule is
actually about is the app deciding what a learner is ready for: **that** stays
refused, because the app has no business levelling the user when their own input
already says. Content organised into levels is a separate question, and the
answer is first-principles rather than a rule: **levels are allowed when they
make content approachable and navigable, and refused when they are structure for
its own sake.** The test is whether the ladder comes from somewhere real — a
published curriculum or exam sequence someone thought about — and whether a
learner can tell from the outside which rung they want. A 급수 ladder for hanja
passes; slicing a vocabulary deck into "level 1–5" to look organised does not.
_Set by the user, with the Hanja packs._

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

## Modes

_Added 2026-09-21, set by the user. The build is in [backlog.md](backlog.md); the
reversal it makes to a decision seven days old is in Decisions in
[status.md](status.md)._

Amgi becomes a **shell that hosts modes**. Amgi is the vocabulary mode, **Munli**
is the grammar mode, and speaking is a candidate third and nothing more than that
today. Switching is Instagram's account switcher — hold the last tab, pick from a
list.

**A mode is the middle rung of a ladder that previously had two**, which is the
whole reason it is worth naming. The 2026-09-14 question was "a pack inside Amgi,
or a second app", and both answers are bad in opposite directions: a pack makes
grammar a row in a vocabulary browser, and a second app buys its own auth, habit,
retention, store listing and Beta App Review cycle — all expensive under the
no-OTA model. A mode is one binary, one account, one habit, one review cycle, and
a navigation context of its own. **The test that sent Hwasul to its own app —
does it need new nouns — is still the right test.** What was wrong was the
assumption that new nouns imply a new binary.

**What a mode may and may not own.** It owns its surfaces, its queue, its
collections and its progress. It does **not** own the account, the study
language, the interface language, the theme or the streak — those are the shell.
A mode that wanted its own account would be an app.

⚠️ **Modes are not free, and they are not a growth strategy.** Each one is a tab
set someone maintains and a place a user can be lost in. The bar for a third is
the bar that got Munli the second: a skill with nouns of its own that the
existing surfaces would distort.

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

**But an empty textbox needs a way out, and that is a hint, not a choice.**
Refusing multiple choice leaves the learner who cannot start with nothing to do
except be wrong, and two of those in a row is where someone closes the app. The
answer that keeps the principle intact is a hint that *costs* — a nudge toward
the shape, then the pattern's name, with the best available verdict falling as
you take them. Retrieval stays the learner's; what changes is how much of the
search space they were handed, and the schedule is told. The design calls are in
[status.md](status.md); it is named here because "no multiple choice" without
"but hints" is a principle with a cliff behind it.

**Not a grammar syllabus either.** "Prefer adaptivity that is emergent, not
configured" applies here with full force: an ordered grammar curriculum is the
configured version of this and is not wanted. The patterns you practise are the
ones your own writing showed you needed, plus the ones you asked about. Your
errors are the syllabus.

**Reversed 2026-09-14 — a levelled grammar syllabus is now the plan.** _Set by
the user; the full call is in Decisions in [status.md](status.md)._ The paragraph
above stands as the record of what was believed and why, but its conclusion no
longer holds, and the reason is mechanical rather than a change of taste:
**errors-as-syllabus lost its sensor.** It required writing review to observe the
errors, and writing review was removed in 2026-08. So the choice is no longer
"emergent or configured" — it is **configured or nothing**, because nothing in
the app can now see what a learner gets wrong.

Two things keep this from being a straight contradiction. The 2026-09-09
amendment above already admits a ladder that "comes from somewhere real — a
published curriculum or exam sequence someone thought about", and a CEFR level is
that in the strongest available form. And what stays refused is unchanged: **the
app still does not decide what you are ready for.** A levelled pack is content
you pick from the outside, exactly as a 급수 pack is; there is still no placement
test, no level setting, and no adaptivity reading your level off anything.


⚠️ **CEFR is a can-do scale and does not publish a grammar syllabus.** The ladder
has to come from a per-language reference level description, which exists for
some languages and not others — so "levels" is the right idea while "CEFR" is the
right *name* only where a citable référentiel backs it. For Korean the real
ladder is TOPIK, which is the precedent 급수 already set here.

This fills the ladder's **sentence × production** cell properly — writing review
diagnoses at sentence level, and this is the drilling that follows a diagnosis —
and opens **sentence × comprehension**, which is still empty.

**Reversed again 2026-09-21, and this one is the plan of record.** _Set by the
user; the full call is in Decisions in [status.md](status.md)._ The levelled
syllabus above lasted a week. There is **no ladder**: grammar is built as
individual tools for individual things — verb conjugation, prepositions and
postpositions, pronouns, articles — **one at a time**, each standing on its own,
and how they group is **read off the collection once there is one** rather than
designed before it exists.

**This is the third answer to one question, and the axis is where structure comes
from.** Errors-as-syllabus put it in the *learner* and lost its sensor. A CEFR
ladder put it in an *external curriculum* and bought a 200–350-item sourcing job
before anything was usable. This puts it in **what has been built** — the
cheapest of the three to be wrong about, since being wrong costs one tool instead
of a level. It is also the house pattern rather than a new idea: one study
language at a time, a subpack before a pack, one concept before a level.

⚠️ **Emergence moved from the learner to the builder**, and conflating the two
would undo the rest of this file. The learner still chooses from the outside;
the app still does not decide what they are ready for; there is still no
placement test and no level setting. What is emergent is the *taxonomy*, and its
failure mode is premature abstraction — fit the second tool into the first tool's
shapes and the taxonomy has been built by accident. Build the second as if the
first did not exist; extract shared machinery when a third one wants it.

**The native language decides some tools and not others.** A Korean native and an
English native learning French need different things — but that bites exactly
where **the distance between the two languages is itself the difficulty**. A
conjugation table is a form you commit to memory, and `prenons` is hard for the
same reason whoever you are. Articles are the opposite case: Korean has none, so
`a`/`the` for a Korean speaker means learning that a category exists at all, while
a French speaker learning English already has the category and only argues about
details — same feature, genuinely different tool. The same goes for English
prepositions against Korean postpositions. So the pair arrives **with the tool
that needs it**, not as an axis every tool has to carry.

### A grammar point is not one kind of thing (2026-08-08, after the first trial)

_Written after (1a) was built and tried. The trial is the evidence; the design
calls are in [status.md](status.md)._

The argument above is right about what grammar *is* — a function, not a row —
and then quietly assumes every grammar point is the same kind of function, with
one exercise shape serving all of them. Trying it showed that it isn't. The
tell was a saved French pattern: **`de` → `d'` before a vowel.** The exercise
generator dutifully invented a scene, the learner had no idea what was being
asked, and the verdict felt arbitrary.

The reason is worth stating precisely, because "the generator needs a better
prompt" is the wrong diagnosis and leads to a better prompt for the wrong
exercise.

**Some grammar points are chosen. Others are applied.**

- A **choice** point maps a meaning to a form, and the skill is picking it over
  the alternatives. `-다가`, `-는데`, passé composé against imparfait. Here a
  situation genuinely elicits the pattern, and *not naming it* is exactly right,
  because reaching for it is the whole skill.
- A **form** rule is a mechanical transformation of something you were going to
  write anyway. `de` → `d'`. 을/를 by batchim. French adjective agreement. There
  is no meaning being chosen: the learner does not reach for `d'`, they reach
  for `de` and a rule rewrites it.

For a form rule the situational exercise fails twice over. There is no situation
that elicits it, so the scene is doing no work and the learner is guessing what
is being tested. And hiding the name — the rule that makes the choice exercise
honest — becomes actively harmful, because the name was never the hard part.
Knowing "elision before a vowel" costs nothing; applying it every time is the
skill. **Name a form rule, hide a choice pattern.**

This is a refinement of the three things listed above rather than a correction
to them. The second, "how it attaches — generative by definition", *is* the form
rule, and it was named there from the start; what was missing was any exercise
that tests it directly rather than incidentally. One target had one format, and
the other two were left to be hit by accident.

**The cost of an exercise sets the bar for what is worth practising.** This is
the second thing the trial made obvious, and it dissolves a question that had
looked like a matter of taste. Part of why `d'` felt absurd to save was that the
only thing on offer was a forty-second production turn, which is wildly
disproportionate to a contraction. At five seconds it is simply fine to have.
So "does this deserve to be practised" is partly answered by "practised *how*",
and a taxonomy of worthy grammar points is not needed to answer it.

**None of this reopens the curated pack.** Textbooks supply two separable
things: exercise *formats* — transformation drills, gap fills, contrast pairs,
guided production — and an ordered *curriculum*. The formats are what was
missing here. The curriculum is the configured levelling this document argues
against twice, and adopting the first does not smuggle in the second. Errors are
still the syllabus; what changes is only the shape of the exercise an error
earns you.

### The bigger miss: production is the last rung, not the first

_Added after reading the research — `docs/grammar-research.md`, which is the
thing to read before changing any of this. The choice/form argument above
survives; its conclusion does not, and this is why._

The section above concluded that the two kinds of grammar point want two
different exercises. That is true and too small. The research points at a
different axis, and it is the one that explains the failed trial:

**Practice runs controlled → meaningful → free, and the first cut opened at
free.** This is the oldest finding in the area and one of the least contested.
[Paulston's sequence](https://www.researchgate.net/publication/229564020_Structural_Pattern_Drills_A_Classification)
puts it in those three words; DeKeyser and Suzuki's skill acquisition theory
supplies the mechanism — declarative knowledge proceduralizes, then automatizes,
and each stage is practised differently. A learner handed free production on
first contact is being asked to run a skill they have not yet built.

Every complaint from the trial follows from that one mistake. A situation is the
*least* constrained prompt that exists, so of course it was ambiguous. Free text
has unbounded correct answers, so of course grading varied. And when there is
only one exercise, everything has to be squeezed into it, so of course it was
unclear what counted as a pattern.

**The rung below free production is a cloze**, and this is the part that reads
as a concession but is not. A sentence with the pattern blanked, which you type
into. The learner still *produces* the form — nothing is offered to pick from —
but the sentence constrains what is being asked, which is exactly the constraint
free production lacks.

**Cloze does not violate "no multiple choice", and the distinction is the whole
reason this is allowed.** That principle exists because offering candidates does
the retrieval for the learner. A cloze offers nothing; it is *cued recall*, and
cued recall is [measurably better for long-term retention than
recognition](https://www.tofugu.com/reviews/bunpro/). The learner still has to
arrive at the form. What changes is how much of the search space the sentence
has already fenced off — which is the same trade the hint tiers already make
deliberately.

**But cloze cannot be the terminal state**, and this is where the earlier
argument still bites. [Swain](https://files.eric.ed.gov/fulltext/EJ1095572.pdf)
is clear that production forces syntactic processing that comprehension and
gap-filling do not, and the cautionary case is a real product: Bunpro is a
Japanese grammar SRS built entirely on cloze, and its own community's most
frequent question is *how do I practise speaking*. Knowing a pattern and using
one are different skills. Stopping at cloze buys a learner who is excellent at
grammar exercises, which is precisely the thing the research is weakest at
showing transfers.

So the shape is: **cloze until it sticks, then free production** — and the
choice/form distinction is demoted to deciding *whether a pattern ever
graduates*. A form rule has no meaning to choose, so free production has nothing
to add and it can live at cloze forever. A choice pattern has to graduate, or
Amgi has bought Bunpro's ceiling along with its format.

One consequence worth stating because it is easy to lose: **the learner's stage
is already tracked.** SM-2 counts consecutive successes, so which rung a pattern
is on is a *derived* property, not a stored one — and a lapse demotes it back to
controlled practice for free, which is exactly what the sequence prescribes.

## Long-term vision

Multi-media prompts (image/audio → card), social layer (shared decks,
challenges), AI pronunciation feedback, cross-language bridge explanations.
