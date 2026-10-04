# Decisions: Munli

The second mode: its shell, conjugation practice, writing review as a tool, English articles. 2026-09-21 on. Newest first. Indexed from
[status.md](../status.md).

## Verbs are one topic again, and Amgi has a door into it (2026-10-04)

**The user's call, after trying the first cut of adding a verb** (PR #182),
which put an Add field on Topics → Irregular verbs only.

⚠️ **This reverses "verbs are two rows, not one" in the 2026-09-22 entry
"Enrolment is pairs, and Verbs is content first".** That split was argued from
shape: one page holding a handful of patterns and a long list of verbs wanted
two layouts, and it buried the irregulars at the bottom. What changed is that
a learner can now add a verb, and they do not know which kind it is before
adding it. Two rows made them pick a row first.

- **One Verbs row on Topics, and inside it a row per pattern and per verb**,
  the way Packs lists packs: name, a preview (the pattern's verbs, or the
  start of an irregular verb's présent), how many tenses are saved, and a bar.
  Regular and irregular are two headed groups on one list.
- ⚠️ **Tables are one tap in, not on the list.** The first rework kept every
  table on the page behind a Regular / Irregular switch and two filters, and
  the user's words on opening it were "very overwhelmed" and "way too
  cluttered". **This also reverses "the Verbs page opens on tables" of
  2026-09-22.** That call was made against a page of checkboxes; a row is
  neither a checkbox nor a table. The filters are gone with it: a row's page
  shows every tense, with a save pill each.
- **One Add a verb button, above both groups**, drawn as Packs draws "Make a
  pack". The verb is filed by what it is, and the line under the button links
  to where it went.
- **Saved still shelves by kind.** It lists what you have, and the two kinds
  are still two kinds of thing to learn.

**Add to Munli, from Amgi.** On the Learn result for a French verb and on a
saved French verb card. Separate from saving the card: keeping a word and
practising its conjugation are two choices.

- **From Amgi, a new irregular verb is saved in the présent with it.** On the
  Verbs page the tense pills are under the new table; from Amgi they are a mode
  away, and a verb nothing asks is not what the button said. This is the one
  place adding and enrolling happen together.
- **The forms are fetched when the button is pressed**, not on every French
  lookup, which would slow every lookup for a button most never use.
- **"Add to Munli", not "Practise its conjugation".** For a regular verb
  nothing new is practised: it joins the verbs its group is asked through.

## English articles: a box on every slot, and the rule is what's scheduled (2026-09-28)

**The user's four calls**, which settle the question the 2026-09-24 backlog
item left open (what a question looks like):

- **Articles before prepositions**, as separate tools. An article has a closed
  answer set (`a`/`an`, `the`, nothing), and a preposition's is open-ended.
- **A box on every slot, including slots where the answer is no article**,
  typed as `-`. For a Korean speaker the hard part is noticing that an article
  belongs there at all. A cloze that only blanks real articles never asks that.
- **Only contexts that force one answer.** Where a slot has several right
  answers (*I saw a/the dog*), the slot is left out rather than given an
  accepted set that somebody would have to judge.
- **The usage rule is scheduled, not the sentence**, the same move as
  conjugation's rule-not-verb (2026-09-22). Sentences are vehicles.

⚠️ **Two of those collide, and the draft's first call is how.** "Every slot"
and "only forcing" meet in *There's a cat in **the** box*: `a` is forced and
`the box` is not. The proposal is to print non-forcing slots filled in. That
shows the learner where a slot is, and it's the price of keeping the `new`
rule at all.

⚠️ **Rendering found a leak before any code did.** The capital after a
sentence-opening box gives the answer away (*[ ] Water is…* against *[ ] cat
is…*), so the renderer lowercases that word unless it's a proper noun. This is
the "render the pack before you believe the list" rule in
`docs/packs/README.md` paying for itself again.

**A general subject only forces no-article when the predicate is about the
whole kind.** *Dogs are very smart* also reads as *The dogs are very smart*;
*Gold is heavier than iron* doesn't. Five sentences were swapped on that test.
The content is in `docs/packs/english-articles-draft.md`, which has six open
calls for the user.

## Munli's practice sets are per language unless marked general (2026-09-25)

**The user's rule:** a Munli topic shows only for languages it was made for,
unless it is explicitly generalizable. Before this, Mandarin got French's
Regular verbs and Irregular verbs rows on Topics, a Conjugation row on Practice,
and "French is the only one so far" in the empty states. Showing a topic
everywhere and apologising for it where it's empty made French's data look like
Munli's own structure. `munliTopics(language)` in `conjugation.ts` is now the
list. Verb topics come from a conjugation spec, and each one shows only when
the spec has subjects of that kind. A general topic would go in unconditionally.
Writing is the one surface that works in any language, so the empty state
points to it.

## A right answer says so, and then gets out of the way (2026-09-22)

**Two refinements after the user practised with the revisions**, into the same
branch.

⚠️ **Getting everything right looked exactly like getting no feedback.** A
checked round only ever *corrected*, so a perfect table came back with nothing
said — and the honest reading of silence is "none of it landed". The lesson
generalises past this screen: **an interface that only speaks up when something
is wrong has not said nothing, it has said something wrong.** A box now carries
`✓` or `✗`, and a round closes with "All correct." or "5 of 6 right" either way.

⚠️ **The glyph carries as much as the colour**, deliberately. Amgi ships eight
palettes and a palette can put `highlight` and `error` close together — Forest
has them *identical* — so a right/wrong distinction drawn in colour alone is one
theme away from being no distinction. The pairing itself is `review.tsx`'s
(`typedVerdictOk` highlight, `typedVerdictMiss` red), so the two surfaces agree
about which colour means which; Munli uses `C.error` rather than that screen's
literal red because the mode's palette carries one.

⚠️ **A right answer in one-box mode advances with no pause at all**, and the
800ms flash that shipped first is the more interesting half of this entry. It
was there to keep the auto-advance from reading as the answer being ignored —
*"I can't imagine any reason a user might want to stay on that question longer
if they already have answered correctly"* — and trying it produced the opposite
finding: *"the fact that the screen changed without any blockers lets me know
that I was correct in a way that I personally think is satisfying."*

**The screen changing is the feedback.** A confirmation held in front of
somebody who already knows they were right is a blocker wearing feedback's
clothes, and the instinct to soften an instant transition with a beat of
reassurance is worth distrusting. ⚠️ **It is not the opposite of the finding
above it** — the table's silence said nothing where something was owed; the
flash said something where the transition had already said it. What decides is
whether the learner is waiting on the screen to tell them something they do not
already know.

Only a wrong answer blocks, because only a wrong answer has something to show:
the form you did not produce. A whole table blocks too — there is a score to
read.

**What removing it deleted is the reason it was complicated**: no timer, no
ref, no cleanup on Stop or on a tab press, and no second piece of state that had
to be kept out of step with `checked` to stop the input being disabled between
two questions meant to run together.

## What the first Munli pass got wrong, from using it (2026-09-22)

**Four corrections from the user's review of PRs #145–#150**, landed as #151 on
top of the stack rather than folded back into it, on the user's call: the six
PRs stay as they were reviewed.

⚠️ **A question is one form again, and the whole table is a switch.** *"I don't
like being forced to always fill the whole table for every verb."* The mistake
was treating the paradigm as a better *packaging* of the same exercise when it
is a **different** one — it asks how much of a table you can produce in one go.
That is worth offering and wrong to impose, so it is a switch on the start
screen. **The box grain is untouched**, which is what keeps the original
complaint answered; only the packaging changed, and `countQuestions` returns the
same number either way. The vehicle is now drawn per question, so six boxes of
`-er · présent` arrive on six different verbs.

⚠️ **The keyboard covered the lower inputs**, which is the kind of thing only a
device shows. The fix is `automaticallyAdjustKeyboardInsets` on the session
ScrollView: a `KeyboardAvoidingView` only shrinks its container without
scrolling the caret into view, and the 2026-09 note in `review.tsx` records that
inside a screen padded for the floating tab bar it also gets the overlap wrong
by ~90pt. `WritingReviewPanel` had already solved it this way.

⚠️ **Pressing a tab returns to that tab's home.** Being three screens deep with
only a back chevron out is a stack pretending to be a tab. `tabPress` fires
whether or not the screen is focused, which is what a router hook cannot see —
the route never changes. **Web needed nothing**: its nav renders plain
`<a href>`, so the same click is a document navigation. Worth remembering as a
difference in the navigator rather than in the intent.

**Saved became an inventory** — *"verbs as tiles like items in an inventory …
grammar tools used for challenges in communication"*. Kind → item → detail,
which is the split Topics already makes, so the catalogue and the inventory
describe one set the same way. ⚠️ **Removing moved from the pill to a button**:
on Topics a pill both shows and toggles enrolment, and here a chip chooses what
you are *reading*, so one tap cannot mean two things on two screens.

## ⚠️ Two of those four turned out to be content (2026-09-22)

**The reusable finding from this round.** "Explain what the tense is for" and
"show a worked example" both read as UI work and are neither: each is a claim
about French, and `docs/packs/README.md` governs — the model is not a source.
Both were drafted and cited before a line of copy was written.

- **Tense notes**: `docs/packs/french-tense-notes-draft.md`, against the
  **Office québécois de la langue française** and **Larousse** — a government
  language authority and a dictionary house, independent of each other. The
  examples are those sources' own, quoted. The futur is the weak one and the
  draft says so: its core use is tier A, its other two rest on one source.
- **Worked example**: `docs/packs/writing-worked-example-draft.md`. The sentence
  is Larousse's own example under `marché`; the Korean gloss is tier B.

⚠️ **The worked example is per study language, and nine of ten have none.**
Writing works in every language, so an example needs a sourced sentence in each.
The panel renders nothing without one — a French example in front of a learner
of Japanese is worse than the space it fills, and an invented Japanese one is
worse still. **This is the shape to copy for any future "just add a nice
example" request.**

## The irregular verbs are sourced, and three is the whole list (2026-09-22)

**The job `FRENCH_IRREGULARS = []` was waiting for**, and it was never a code
problem: `ConjugationVerb.group` dispatches rules and deliberately has no
`irregular` member, so a stored paradigm sits *beside* the generator rather than
as a fourth branch inside it. The engine did not change to take the data.

**Two independent published references, tier A on all 54 forms** — Larousse and
Bescherelle, agreeing character for character with accents included, which is
[docs/packs/README.md](../../docs/packs/README.md)'s top rank. Wiktionnaire was a
third spelling check.

⚠️ **The licence finding is that there is nothing to license.** 54 verb forms
are facts about French and carry no authorship; what a conjugation publisher
holds rights in is prose, layout, and the selection and arrangement of a
9,000-verb compilation, and none of that is taken. **Wiktionnaire is CC BY-SA,
which is why it is a check and not the source** — taking a table from it would
attach a share-alike obligation to this repo for facts that carry none. That
distinction is the reusable part of this entry.

⚠️ **Three verbs, and the fourth is deliberately absent.** `faire` is the
obvious candidate and "the next most useful irregular" is a *frequency claim*,
which nothing in this repo is behind — the same discipline that keeps
`FRENCH_GROUPS` described as **common** rather than ranked. The ranked-list job
is still open and is a different one.

⚠️ **They are not in the default practice set.** `defaultEnrolment` still enrols
the five patterns in the présent, so these arrive through Topics → Irregular
verbs like anything else a learner takes on. Putting `être` and `avoir` in the
default is defensible and is a call nobody has made.

**The tests pin the forms, not just the behaviour**, because the two fail
differently: a wrong rule is wrong for its whole group at once and the existing
tables catch it, while a wrong form is wrong alone and nothing else in the suite
would notice. `subjectsOfKind(spec, 'verb')` was asserted empty with the note
*"the split has to survive that"* — it did. PR #150.

## Munli's titles come from one place, and so does its gutter (2026-09-22)

**Noticed by the user**: Writing's title is smaller than the rest. It was —
`fontSize: 18` in a monospace face nothing else in the mode set — but the real
finding is that **none of Munli's five tabs used the answer Amgi already had**.
`PageHeader` exports `PAGE_TITLE_SIZE = 21` with `color: C.highlight`, and its
comment records that these drifted once before; Munli's tabs each rolled their
own `fontSize: 22, color: C.text`.

**Two arrangements, and the split is `cards.tsx`'s.** A tab whose title is plain
takes the component (Saved, Topics). A tab whose header carries something else
— a back chevron on Practice and on the Topics detail, `ProgressHeader` above
Munli's Progress — keeps its own header and imports the constants. `cards.tsx`
has done exactly this since 2026-09-04.

⚠️ **The help props became optional**, which they were not. Practice, Saved and
Topics have nothing non-obvious to say, and inventing help copy to satisfy a
required prop would produce the one thing the component's own comment rejects: a
"?" that restates the page's name.

⚠️ **`SCREEN_GUTTER` is new, and it is what stopped this being titles only.**
The header sits at 20 and Munli's screens sat at 16, so a title taken from the
component would have hung four pixels outside the list under it — the very drift
the size constant exists to stop. Munli's screens now share the constant.
**Amgi's four still hardcode theirs**, because that backlog item is blocked on a
real question — `review.tsx` is not uniformly 20 — and answering it was not part
of this.

**On web it was a colour, not a size.** Every Munli `h1` was already `text-2xl`;
Amgi's are `--color-highlight` and Munli's were `--color-text`. ⚠️ **The face
comes off the path rather than a prop**: Munli is monospaced throughout and Amgi
is not, and `getNavItemsForMode` already derives the mode from the pathname for
the stated reason that a caller then cannot render one mode's chrome around
another mode's page. Munli's home keeps its `text-3xl` — it is a landing hero,
not a page title. PR #149.

## Web gets a help sheet, and Writing is what needed one (2026-09-22)

**Asked for by the user**: the Writing tab drops you into a panel with no
guidance, and the thing worth saying is that **the passage can be as broken as
it comes out, and a word you cannot reach can go in in your own language**.

⚠️ **The claim is about the route, not encouragement.** `/api/writing` carries a
"WORDS THEY DID NOT HAVE" section telling the model to find exactly two marks —
a native-language word mid-sentence, and talking around a word — and to return
each as a `gap` card, ranked high. The help says what the tool already does;
that is the difference between guidance and a slogan.

**Behind a "?", not on the page.** `PageHeader`'s own comment is the argument
and it is unchanged: *"Pull, not push — the answer is there when you wonder and
invisible when you don't … Explaining rather than demonstrating is fine here,
and only here: the user asked."*

⚠️ **Web had no help sheet at all**, so the choice was the component or inline
copy, and it is the component — Munli's other tabs want one, and a second
platform explaining the same screen in its own words is how the two drift. Web's
`PageHeader` is native's, down to the copy keys. **Its help props are optional**,
which native's are not yet: a page with nothing non-obvious to say should render
its title alone rather than a "?" that restates its name.

**It closes half of the titles item as a side effect.** Adopting `PageHeader` on
native takes Writing's title with it — `fontSize: 18` in a monospace face
nothing else in the mode sets, which is the thing the user actually noticed. The
other four tabs follow in their own change. PR #148.

## Tables becomes Saved, and takes the management half (2026-09-22)

**Asked for and shaped by the user**: *"a management surface to see what
patterns or concepts I have saved to practice"*. The page already called itself
*"Munli's answer to Amgi's Cards"* and was only ever half of one — **Cards
genuinely edits and deletes**, and this read a flat list of `-er · présent` rows
while saving and unsaving lived on Topics.

**One row per subject, tenses as pills.** A pattern (`-er`) or an irregular verb
(`être`) is the row; the tenses saved under it are pills carrying their own due
count; tapping one takes that pair out of practice. ⚠️ **The pill is Topics'
pill** — `setEnrolled` on one subject-and-tense pair — rather than a second
control with the same job. The rule that produced it on Topics ("a control that
cannot state its own answer") is the reason it is right here too.

⚠️ **Grained by pattern, where Practice is grained by tense**, and the two are
deliberately different. One enrolment answers two questions: *what have I taken
on* and *what should I sit down to*. `listSavedSubjects` is
`listPracticeSections` transposed, and both are built on `listPracticeTables`,
so a due count cannot come out different on two tabs.

**Named Saved, because it mirrors the Save action that put things there.** The
route is `/munli/saved`; the icon and the slot are unchanged, since it is still
where Cards sits in Amgi's bar. That also retires the known cost recorded on
2026-09-22 under "Munli's bar mirrors Amgi's" — *"`Tables` will not generalise"*
— since Saved says nothing about the shape of what is in it.

⚠️ **The one thing to watch on a device**: Topics' pill *adds* on tap and this
one *removes*, in the same shape and colour. If that turns out to be too easy to
hit, the fix is a confirm or an undo, not a different control. PR #147.

## The practice setup is Review's picker, with the tense as the section (2026-09-22)

**Asked for by the user after using it**: *"splits according to different
sections, and we see how much is due for each section"*. What the setup screen
showed was two rows of chips — tenses, then verb groups — which said what a
session *could* cover and nothing about what was owed.

⚠️ **The tense is the section and the subject is the level under it.** Enrolment
is `subject:tense` pairs, so either could have been the outer axis. The tense
wins on three counts: it is what a learner sits down to practise ("today, the
imparfait"), Progress already groups this way, and it mirrors **pack → subpack**,
which is the surface this is copied from rather than invented beside.

**Two aggregate rows, each for a stated reason.** An **everything** row sits
first at the top level, because the tool practised the whole set before it had
sections and losing that would mean three sessions for three tenses. A
**whole-tense** row sits first inside a section, which is Review's own
reasoning: *"once you have worked through the sections, reviewing them one at a
time is the same material several times over."*

**Over-practice moved to the start screen.** `practiceIncludeNotDue` is about
the session you are about to run, not about which part of the set you are
looking at, and on the list it read as a filter.

⚠️ **The cost, and it is real: a session covers one selection rather than any
combination.** "The présent and the imparfait, but only `-er` and `-re`" was
expressible with chips and is not expressible now. It is accepted because Review
has always worked this way and because a due count per row is worth more than
arbitrary intersections — but it is a narrowing, not a free win, and the device
pass is where it gets confirmed. `buildTables` still takes arrays, so restoring
multi-select is a picker change and not a core one. PR #146.

## A table is six facts, so the box carries the schedule (2026-09-22)

⚠️ **This reverses "the schedule belongs to the table, not the box" in the
same-day entry below**, on the user's call, after using it. What the reversal
turns on is not item count but what one verdict is allowed to speak for.

**The complaint, in the user's words:** *"having one tense of one verb group due
means I'd practice just one verb conjugation … I might be struggling with `ils`
but I randomly got `tu` or `je` and the practice ends."* **It was sharper than it
was put.** `rateTable` applied one box's verdict to the whole table's SM-2
interval, so **answering `tu` correctly scheduled `ils` away with it** — five
boxes pushed out on evidence from one. `pickPerson` biased the next draw toward
a missed box, but only *after* the miss had been paid for, and got exactly one
draw per session. The code half-admitted the grain was wrong: `misses` existed
as a per-box tally precisely because *"one schedule cannot know that your `nous`
specifically is weak"*.

**The call was option (d) of four**: schedule per box, present per table. (a) ask
every box of a due table and (b) ask *n* boxes weighted by the tally both leave
one interval speaking for six facts; (c) is (d) without the paradigm, and reads
as 72 loose items where (d) reads as *"-er · présent — 3 due"*.

⚠️ **The rule it had to be weighed against is `vision.md`'s** — *"Three-sided
hanja cards cost a setting, not a scheduling axis"*, *"Per-level content is
allowed; per-level adaptivity is not"*. **The precedent that wins is Amgi's
own**: a card is scheduled per *direction*, and `helpReviewPoints` says so to
the user. Splitting a table into its boxes is that same move — one item per
fact, not a second scheduler laid over the first, and nothing here adapts to the
learner.

**A round is the unit of a session, and a round is a table.** The due boxes are
asked together as the paradigm, each rating on its own answer, and the vehicle
is drawn once per round rather than once per box — a paradigm of six different
verbs is not a paradigm.

⚠️ **The boxes that are not due are masked until the round is checked**, which
the sketch the user approved did not say. Showing them hands over the answer:
`je parle`, `nous parlons` and `vous parlez` make `tu parles` free. They fill in
on Check, where the paradigm is reference rather than a leak.

⚠️ **Check is held until every due box has something in it.** The escape hatch
for a box you cannot produce is the hint, which already costs — two hints spell
the form and count as a miss — rather than an empty box submitted by accident.

**The reset is a read-side drop, not a migration.** The user's call was a clean
slate over splitting one table's interval into six copies of itself, and
`normalizeProgress` does it on read: a four-segment key with a `misses` map
cannot be a box id, so it is dropped the first time the document is read.
Nothing has to be deleted by hand. `misses` survives as a number on the box, and
is now only ever *reported* — it picks nothing, because a due box is asked
because it is due.

**What it cost.** A migration avoided, but `ConjugationProgressMap` changed
shape, `pickPerson` is gone, and every due count in Munli is now in boxes: the
picker, the setup line, a row on Tables, and the Progress tiles ("forms
started", "forms in all"). PR #145.

## Munli's bar mirrors Amgi's, slot for slot (2026-09-22)

⚠️ **This reverses the "Munli is a `Stack`, not `Tabs`" call in the 2026-09-21
entry below**, after the user used it. Switching modes should change **what the
tabs are**, not **whether there are tabs**: a mode that navigates differently
from the rest of the app reads as *leaving* the app rather than moving inside it.
The original call was argued from "a one-tab bar is furniture", which is true
about one tab and silent about the shell — it let a temporary shortage of tools
decide the navigation model.

The tabs are then chosen by what Amgi's slots *mean* rather than by what happens
to exist:

| Amgi | Munli | The question it answers |
|---|---|---|
| Review | **Practice** | what should I do now |
| Cards | **Tables** | what am I learning |
| Learn | **Writing** | here is some input, tell me about it |
| Packs | **Topics** | what is there, and what do I want |
| Progress | **Progress** | how is it going overall |

Practice is first and therefore the initial route, by the argument that puts
Review first in Amgi — the first tab is the mode's answer to "what is this for",
and for a grammar mode that is *practise*, not *submit something to be
corrected*. Writing takes the middle for the reason Learn does: the centre of a
five-tab bar is where a thumb already is. ⚠️ **Progress is last in both modes and
that is load-bearing** — holding the last tab is how modes are switched, so the
gesture lands on the same tab wherever you are.

**A visible mode button joins the settings gear on every Progress tab**, because
a hold is undiscoverable by feel. `ProgressHeader` is extracted so both modes
render one header rather than two that drift — the `StudyLanguageList`
precedent. The study language stays in it in every mode, because it belongs to
the shell: Munli conjugates whatever deck you are on.

⚠️ **`Tables` will not generalise, and that is a known cost.** It is right for a
conjugation item and wrong the moment a second topic's items are not tables. It
is a label, so it is cheap to change — but the slot is *Cards*, and whatever
replaces the name has to keep meaning "the things you are learning".
**Settled the same day** — it is **Saved**, which says nothing about the shape
of what is in it. See "Tables becomes Saved" above.

## What conjugation schedules is a rule, not a verb (2026-09-22)

⚠️ **Half-superseded the same day — the entry above reverses the table-grain
paragraph below.** What a *subject* is (a rule for regular verbs, a verb for
irregular ones) stands unchanged; what carries a *schedule* is now the box.

**The heart of the design, and the thing the first cut got wrong.** `parler`,
`regarder`, `travailler`, `chercher` and `donner` in the présent were **five
scheduled items testing one fact** — getting `parlons` right says nothing new
once `donnons` is known. Regular verbs are a rule and irregular verbs are not,
so they cannot be the same kind of item.

- **A regular group** (`-er`, `-ir`, …) is one item per tense. A verb from the
  group is the **vehicle** the question is asked through, and it **varies between
  questions**: asking `-er · nous · présent` through `donner` today and
  `chercher` tomorrow tests the ending, where asking it through `parler` every
  time tests `parlons`.
- **An irregular verb** keeps a table per verb, because `aller` teaches you
  nothing about `être`.

⚠️ **`-cer` and `-ger` are their own groups, not a footnote inside `-er`.**
`nous mangeons` is not `mang` + `ons`, so `manger` is a **broken vehicle** for
the plain `-er` rule: a learner producing it from that rule would be marked wrong
for applying it correctly. A test asserts every vehicle is filed under a group
whose rule actually fits it.

**Vocabulary, used throughout.** A **table** is one subject in one tense; its
**boxes** are the forms, one per person; **one question** is one box.

⚠️ **Reversed the same day — see the entry above.** What stood here: the
schedule belongs to the table, not the box, with a per-box miss tally so the
weak box is preferred; the accepted cost was that SM-2 learns "your `-er`
présent is shaky" rather than "your *nous* is shaky". **The cost turned out to
be larger than stated** — one verdict also *moved* the other five boxes — and
the escape hatch written into this paragraph is the one that was taken: ids are
built by `conjugationItemId`, so splitting finer was more ids rather than a new
shape.

**Regular forms are computed; irregular forms are stored.** There is no rule to
generate an irregular from, and `docs/packs/README.md` governs — the model is not
a source — so `FRENCH_IRREGULARS` is empty until that sourcing job is done. The
types hold both; only one has content. The verb list that did ship is described
as *common*, never frequency-ranked, for the same reason.

**Grading is `typedAnswer.ts` unchanged**, which folds apostrophes (so `j'ai`
typed on an iOS keyboard matches) and deliberately does *not* fold diacritics —
for a conjugation table the accent is the content. **Hints cost**: two tiers
derived from the form, with the verdict falling to `hard` then `again`, and a
two-hint answer counts as a miss in the tally or the weak box stops being
offered.

## Practice is a session that ends (2026-09-22)

**The first cut never ended**, and that was a design bug rather than a missing
feature: the draw *silently fell back* to the whole set whenever nothing was due,
so the due count meant nothing once it reached zero and there was no point at
which the learner was finished.

Practice now mirrors Review's three states on one screen — which is also how
`review.tsx` does it, since its start screen is not a separate route but what it
renders before `started` flips:

- **Picker** — rows, one per practice type, due count on the right. Writing is
  not in it: it diagnoses rather than practises, so Practice holds only things
  with a queue and a due count.
- **Setup** — which tenses and groups, plus an explicit switch for including
  tables that are not due yet.
- **Session** — the queue is fixed at Start and owned from then on, so a rating
  written mid-session moves the picker's counts and leaves the questions alone.
  Same rule as `buildReviewQueue`.

⚠️ **One round per table per session** — and since 2026-09-22 a round is every
due box of that table rather than one drawn from it, which is the entry above.
⚠️ **A miss does not rejoin the session in progress.** `rateBox` makes a missed
box due immediately, so it returns in the *next* session — "a session ends when
it said it would", which `sm2.ts` states for cards and which composes here for
free. **`done` and `stopped` stay distinct**, because telling someone who quit at
8 of 30 that they are finished would be untrue. **Over-practice is a switch the
learner flips**, never something the draw does unasked, and the picker row stays
open at zero due because a new account has nothing scheduled.

**The draw is a pure function of a nonce and a progress snapshot.** React
Compiler forbids reading a ref and calling `Math.random()` during render, and an
effect would `setState` synchronously — which the same ruleset flags and the repo
already carries 13 warnings of. Choosing the box and the vehicle at queue-build
time put every draw inside an event handler, which is also what makes the session
deterministic under test.

## Conjugation rides the user-document subscription (2026-09-22)

**Practice writes and three other surfaces read**, so the question is where the
one copy lives. ⚠️ **It is the existing `users/{uid}` `onSnapshot`, not a read of
its own** — the same subscription already carries the hanja partition and the
language list, with a comment on it reading *"A language added on the laptop,
reaching the phone without a restart."* Conjugation lives on that document, so it
rides it and a session on the laptop reaches the phone without a relaunch.

⚠️ **This was got wrong once on the way, and the lesson is worth more than the
fix.** The first version was a one-shot read shared by two screens: it made
Practice and the Progress tab agree on one device and left the cross-device case
untouched. A focus-refetch would have hidden it just as well. **The question to
ask of a stale-data report is not "when should this reload" but "why is there a
second copy"** — which is what the 2026-09-15 streak entry in [progress.md](progress.md)
already concluded.

**What the provider still owns is the pending write**, and it has to: a snapshot
can land between rating a table and that rating reaching the server, at which
point the snapshot is *older* than what is on screen. Ratings are held until a
snapshot carries them back, and local wins for a held item — the pending-review
replay shape. The buffer drops each item as the server confirms it, so it stays a
write buffer rather than growing into a cache.

**Progress is a field on `users/{uid}` rather than a new collection, and that is
operational rather than aesthetic.** This project's Firestore rules live in the
console, so a new collection would deploy and then fail closed in production. The
user document is already owner-writable and a nested map merges key by key under
`setDoc(..., { merge: true })`, so one table writes without clobbering the rest.
The day a language's spec makes this a real fraction of the 1 MB limit is the day
it earns a rule.

## Enrolment is pairs, and Verbs is content first (2026-09-22)

**The practice set is a surface of its own, and a different job from the session
setup screen** — setup chooses what to cover *this session* and resets; the
practice set chooses what exists to be covered, and persists. That is Amgi's
split between enrolling a pack and picking a collection to review, and setup is
**bounded** by it: a tense that is not enrolled cannot be selected. **Progression
lives there**, chosen by the learner — `vision.md` allows per-level content and
refuses the app deciding what you are ready for, and this is the allowed half.

**Topics is a list, one row per grammar topic** — and verbs are **two** rows, not
one. ⚠️ **Regular and irregular verbs are different kinds of thing to learn**: a
group is a rule that one example demonstrates, and an irregular verb is a fact
that no other verb tells you anything about. Browsing them together meant one
page whose halves wanted different shapes — a handful of patterns against what
will be a long list of verbs — and it buried the irregulars, which are the ones a
learner reaches for first, at the bottom of somebody else's page. Both rows go
through one screen keyed on `kind`, because they differ in what they list and not
in how they work; two files would have been two copies of the same Save
semantics.

That the collection is a list at all is the point rather than a limitation: the
plan is one tool at a time with the grouping read off the collection later, and
this is where the collection becomes visible. ⚠️ It needs a nested `Stack` behind the tab, or expo-router
flattens the routes into the Tabs navigator and `FloatingTabBar` draws an icon
per route — `(tabs)/decks` carries the same comment.

**The Verbs page opens on tables, not checkboxes.** ⚠️ **Content first with
saving second — the decks page's shape, not a form.** A checkbox list made the
page something to fill in before it became useful. Now: tense chips across the
top, then a section per group with a **Save** button, chips for the verbs the
pattern is shown through, and the table itself.

**The narrowing is a filter, the Cards idiom rather than a new one** — but
⚠️ **one dropdown per filter, not several groups behind one button.** The Cards
sheet holds three groups together because they narrow *one* list in three ways;
tense and verb group are independent axes, and a single control meant opening
something unlabelled to find out what it filtered. Inline chips were tried first
and are the better control right up until a list can grow — which is why Cards
still draws its filters that way and this does not.

**Multi-select arrived by letting the *shape* of `selected` be the mode** — an
array means several answers — rather than a flag that can fall out of step with
the value beside it. `FilterSheet` and web's `MultiSelect` both work that way, so
the per-section **verb picker is the same control** passed a plain string.

**No counts on the options.** A count here would be the product of the two
selections, which says nothing a learner could act on — and `FilterSheet`'s own
rule is that a count belongs where it informs a choice.

⚠️ **Saving is per tense, not per group, and the first version was wrong about
this.** A single Save button per group could only ever say "all of these" or
"not all of these", so two tenses saved out of three read as **nothing saved** —
which is what the user hit. Enrolment is per subject-and-tense pair, so the
control has to be too: a pill per shown tense, stating its own answer and
toggling exactly its own pair. The lesson generalises — **a control that cannot
express the state of the data behind it will misreport that state**, and the
count in the subtitle did not rescue it, because a button is read before a
caption.

⚠️ **The filter is a *view*; Save is what commits.** Selecting the imparfait
shows it without enrolling it, which is how somebody decides whether to take it
on. Conflating the two would mean narrowing the filter to stop *looking* at
something silently stopped you *practising* it.

⚠️ **The reference shows every tense, enrolled or not.** Enrolment bounds what is
practised and has no business bounding what can be read — seeing what the
imparfait looks like is how someone decides to add it, so gating it behind having
added it is backwards.

**One verb across tenses, never several verbs in one tense** — the user's call,
after a pivot control had been designed. Verbs inside a group conjugate
*identically*, so a column per verb prints one pattern three times; the chips
swap which verb the pattern lands on, which is the part worth seeing.

⚠️ **A per-group Save forced enrolment to stop being a cross product.** A list of
tenses × a list of groups can only say "every saved group in every saved tense",
so saving `-er` while looking at the présent and `-re` while looking at the
imparfait produced **four** tables when two were asked for. Enrolment is now
`${subjectKey}:${tenseId}` entries — the item id without its language, so
**enrolment and scheduling are one shape** rather than two kept in step, and a
learner can practise `-er` in three tenses and `-re` in only the présent.
`setEnrolled` refuses to empty the set, because `normalizeEnrolment` would
silently refill it and an invisible refill is worse than a refused tap.

**`Tables` is the inventory** — every table in the practice set with its state
and the boxes it keeps losing. ⚠️ **It lists what is *not* due as well**, which is
the difference from `dueTables`: that answers "what should I do now" and a
session is built from it, while an inventory that hid what you had learned would
be a strange inventory. **Three states, not two** — "not started" is shown apart
from "due now", or a brand-new practice set looks overdue.

**`buildParadigm` and `ParadigmTable` are shared** so a table shown for reference
cannot disagree with the table practice is graded against; a test asserts the two
match for every tense.

## Munli gets its own themes, and a mode's palette is how you know where you are (2026-09-21)

Munli shipped wearing Amgi's palette, and on a phone that made the two modes
hard to tell apart at a glance — the tabs change, but the tabs are icon-only, so
the first honest signal that you had switched was reading a heading. Munli now
has three themes of its own: **Suisei, Shoko and Godspeed**, default Shoko, with
System reaching for Suisei after dark. Amgi keeps Forest / Sonokai / Paper
unchanged.

**The sets share no ids, on purpose.** A palette offered by both modes would
make the switch something you verify rather than see, and it would make one
mode's stored preference silently valid in the other. `themes.test.ts` asserts
the disjointness rather than trusting it.

**Each mode remembers its own choice**, under its own storage key per platform.
The alternative — one preference, with the picker showing whichever set matches
where you are — was rejected: it would land you on the mode's default on every
switch, throwing away the choice you made last time. The repaint on crossing is
the feature; losing your pick is not.

**The theme follows the route, because the mode does.** Nothing holds "the
current theme": both `ThemeContext`s read the path, pick that mode's set, and
read that mode's key. Two consequences worth keeping:
- The pre-paint script in `app/layout.tsx` had to learn about modes. It reads
  `location.pathname` — available to it for exactly the reason the mode is never
  stored — and picks the key from that. Without it, a cold load of `/munli`
  paints Paper and then snaps to Shoko, which is the flash that script exists to
  prevent, arriving by a new door. Web also moved its apply into a *layout*
  effect for the client-side crossing, same reason.
- **Settings is the one screen outside every mode's tree**, and it holds the
  picker. Native pushes `/settings` from every mode's `ProgressHeader`, so the
  mode travels in the route as `?mode=` and `modeForTheme` consults it *only*
  where the path itself names no mode. Giving Munli its own settings route was
  the alternative; it would have meant a sixth screen inside a five-tab
  navigator, with the floating bar sitting over a screen that is not a tab.

**The palettes are adaptations, not copies.** All three come from Monkeytype,
which is where Sonokai and Paper came from, and each keeps its source `bg`
exactly — that is the colour you actually see. Everything else is rebuilt,
because Monkeytype is a typing test and this is not: its `sub-alt` sits *darker*
than its background while a card here sits above one, and its `main` is an
accent for one line of typed text rather than a colour that has to carry buttons
and links. Shoko's `#81c4dd` reaches 1.33:1 on its own background. So surface /
border / muted are OKLCH steps off `bg` at the distances Forest, Sonokai and
Paper already use, `highlight` keeps its hue at a snapped contrast, and Godspeed's
body text moved from 4.52:1 to 6.06:1 to sit in line with the rest of the app.
Suisei's orange `sub` is the one signature colour left out: as `muted` it would
put orange on every caption and hairline in the mode.

Heat ramps were generated and validated exactly as the Amgi three were — one
hue, monotone lightness, adjacent ΔL ≥ 0.06, faintest studied step ≥ 2.35:1 on
its own background, and `heat[0]` a categorical break at ΔE ≥ 18 from `heat[1]`
under protanopia and deuteranopia.

## Writing came back unchanged, and three things around it had not (2026-09-21)

Restored from `1ebdc9b^` — the removal was one commit, so the panels, `diff.ts`,
both test files and the i18n keys came back as they were, with the original
Korean copy. `/api/writing` and its parser never left. **The behaviour is
unchanged and only the address moved**, which is the whole claim this entry
exists to make precise, because three things around it *had* changed and a
literal restore would have been wrong in each.

**1. The card-offer rule had to be re-derived, not restored.** The 2026-08-08
decision had a card give way to a *pattern* offer unless it was a gap card, and
its reasoning was measured: on a grammar finding the model often emits a card
whose front is a description — `accord du participe passé avec être` is a
heading, not a deck entry. Patterns no longer exist, so nothing is there to give
way to, and the naive `!!finding.card` would put those headings in the deck. So
`offersCard` keeps the measurement and drops the dependency: **a grammar finding
offers only its gap card; every other kind offers as before.** In core rather
than in both panels — a rule written twice is a rule that drifts.

**2. `nativeLanguage` split while writing was away** (2026-09-12), and both
halves are `string`, so a miscategorised one is silent. Chrome takes
`interfaceLanguage`; the model's notes and the card's back slot take
`deckNativeLanguage`. This is exactly the class of bug the split was made to
surface, and a restored file is the one place the compiler cannot help, because
it was written before the split existed.

**3. The mobile panel reserved height for the floating tab bar.** Munli is a
`Stack` and has none, so the reserve is a band of dead space under the last
finding rather than a fix for anything.

**What the placement bought, stated plainly:** the Word/Passage toggle does not
come back, and neither does the entire design that was going to replace it — the
auto-growing Learn field, the one-line/two-line reveal, wrapping-not-characters,
the `keyboardReserve` growth direction, the Enter/Shift+Enter split. A mode with
its own writing surface has nothing to disambiguate. **Amgi's Learn tab was not
touched.**

⚠️ **A backlog item was stale and is corrected rather than closed.**
`/api/writing` was listed as having no `try`/`catch`. It has had one since it was
written, returning 502 for both an unparseable response and a thrown call. The
item was about `/api/explain`, which genuinely still has none, and the pairing
was wrong when it was written.

**What did not ship with it, and why that is not an oversight.** "Findings you
can return to" needs a Firestore collection and a security rule — console state
the repo cannot verify — so it is its own item rather than a finishing touch.
Routing a finding into a practice tool needs a practice tool. Both are in
[backlog.md](../backlog.md) with what the restore established about them.

⚠️ **Nobody has submitted a passage.** The route is unchanged and its parser is
under test, but no model call has been made through the restored UI on either
platform, and the four removal reasons included *"the practice itself was not
good"* — which, where it was about the reviews rather than the surface, this
does not touch at all.

## Munli ships as a route, and web remembers it in a cookie (2026-09-21)

Building the mode switcher settled three things the plan left to the build, and
one of them is a deviation from what the plan said to do.

**The mode is a route on both platforms, and native uses a route *segment*
rather than a group.** `app/munli/` gives native the path `/munli`, which is
exactly web's, so `modeFromPath` is one function with one answer for both. A
route group (`app/(munli)/`) would have been the more idiomatic Expo Router
shape and would have produced no path at all — at which point native would have
needed its own way to say which mode it is in, and the two platforms would drift.

⚠️ **Web remembers the landing mode in a cookie, not localStorage — a deviation,
made for the plan's own reason.** The plan named `localStorage`, and then argued
at length that a stored mode must never reach the pre-paint script because it
would paint the *wrong navigation* for a frame. localStorage cannot avoid that:
it is readable only after hydration, so `/` would render Amgi and then replace
itself. A cookie is readable in `middleware.ts` before the first byte. The
middleware matches `/` and nothing else — a path the user typed, followed or
bookmarked is never rewritten, or a shared link stops meaning one thing.

**Munli is a `Stack`, not `Tabs`, and its nav grows one row per tool.** This is
the plan's "don't design Munli's nav ahead of its tools" taken literally, and it
has one consequence worth stating: **there is no tab bar in Munli to hold**, so
the switching gesture cannot be its only exit. Munli's home carries an explicit
switch button. On web the same gap is filled by the account-menu row, which is
web's *primary* door rather than its fallback — there is no long-press
convention on a desktop sidebar, and a mode nobody can find is a mode nobody
uses.

**`expo-haptics` was considered and not added.** It is bundled in Expo Go, so it
would work while developing and then need the next production build to reach
anyone. The sheet appearing is the confirmation; the buzz would have been a
bonus, and the plan was explicit that the affordance must not depend on it.

**What is not answered:** whether Munli practice feeds the Amgi streak. Nothing
in Munli can be practised yet — writing diagnoses and does not schedule — so the
question arrives with the first practice tool, not with the shell.

## Grammar is one tool at a time, and the grouping comes later (2026-09-21)

**The user's call, made the same day as the Munli entry below and reversing a
second thing in the 2026-09-14 entry — its constraint #2, "levels are the spine."**
There is no ladder. Grammar is built as **individual tools for individual things**
— verb conjugation, prepositions and postpositions, pronouns, articles — one at a
time, each standing alone, and **how they group is read off the collection once
there is one**. _"As I start to build up a collection of these individual things I
can think about how to group them from patterns that might emerge."_

**Why this is not the third flip of one question.** Three shapes have now been
tried on paper and the axis they differ on is where the structure comes from:
errors-as-syllabus (2026-08) put it in the *learner*, and lost its sensor when
writing was removed; the A1 ladder (2026-09-14) put it in an *external
curriculum*, and bought a 200–350-item sourcing job before anything could be used;
this puts it in **what has actually been built**. It is the cheapest of the three
to be wrong about, because being wrong costs one tool rather than a level. And it
is the house pattern rather than a new idea — one study language at a time, a
subpack before a pack, one concept before a level. **Emergence moved from the
learner to the builder**, which is worth stating precisely: the app still does not
decide what a learner is ready for, and there is still no placement test and no
level setting.

⚠️ **The risk is premature abstraction, and it is the only real one.** The moment
tool #2 is fitted into tool #1's shapes, the taxonomy has been built by accident
and nothing was learned. The rule: build the second as if the first did not exist,
extract shared machinery when a third wants it. Two is a coincidence.

**What gets built, in order: the mode switcher, writing, conjugation.**

**Writing comes back un-gated, as a Munli surface.** The 2026-09-14 plan had it
third and gated on the ladder being used, because a finding needed a concept to
point at. With no ladder there is nothing to gate on, and nothing to point at
either — so it returns as **a diagnostic you read**, not a router into practice.
Routing is deferred until there are tools to route into; the first candidate is a
`grammar` finding about a verb form opening that verb's conjugation table, and it is
explicitly not in v1.

⚠️ **The "emergent ordering" half of the 2026-09-14 entry dies here.** Storing
concept ids and counts was what turned a one-shot review into a syllabus — "missed
`la négation` four times" — and it required the closed set of authored concepts
that no longer exists. What can be stored is `FindingKind` counts, four buckets,
honest as history and far too coarse to be a syllabus. **The passage stays
unstored**, which was never in question.

**One thing the Munli placement makes free, and it is a genuine simplification:
the writing input's entire placement design is cancelled.** The auto-growing
field, the one-line/two-line reveal, wrapping-not-character-count, the
`keyboardReserve` growth direction, the Enter/Shift+Enter split and the three
reworded Learn strings — roughly forty lines of scoping from 2026-09-14 — existed
solely because writing had to share Learn's single box without reinstating the
Word/Passage toggle. A mode with its own writing surface has no such problem:
**Amgi's Learn tab is untouched.** The arguments were good and are kept here in
case a passage ever wants to start from Learn again; the work is not scheduled.

**Conjugation is the first tool, and the first-principles calls on it:**

- **One question is one box.** A **table** is one verb in one tense
  (`prendre · présent`); its six **boxes** are the forms, one per person. The app
  names verb, tense and person; the learner types the form. ~5 seconds, and
  `vision.md` already argues that the cost of an exercise sets the bar for what is
  worth practising.
- ⚠️ **The schedule belongs to the table, not the box.** Miss `nous` and the whole
  `prendre · présent` table comes back sooner, and may then ask any of its six
  boxes — with a per-box miss counter inside the item so it prefers the one that
  was missed. The alternative is a schedule per box, where missing `nous` leaves
  `je` untouched.
  **The argument is not volume** (120 tables against 720 boxes; both are ordinary
  deck sizes) but **what counts as one fact**: a regular verb's six forms follow
  one rule, so six schedules are six copies of one fact, while an irregular verb's
  boxes genuinely differ (`prenons` and `prennent` have different stems).
  **Per-table decided, on the user's call** — _"per table seems quite alright for
  now"_ — with per-box closed as the option that splits a regular verb's single
  fact six ways. The accepted cost is that SM-2 learns "your `prendre` présent is
  shaky", not "your *nous* is shaky".
  **Per-verb stays open as a later move, named by the user as one**: regular as a
  table, irregular per box. Most correct, two code paths, and the house pattern of
  deciding by content shape (`isGridDeck`). ⚠️ Build per-table so it stays a branch
  rather than a migration — nothing holding a table's schedule should assume its
  six boxes share one.
  **It is also what keeps the other question shapes cheap** — fill-the-table and
  fill-the-blank-in-a-sentence are then *views of one item* rather than a second
  content model.
- **The content is computed, not authored**, which is what makes conjugation the
  right first tool: a verb list plus rules plus an irregulars table, finite and
  checkable, with no 급수-sized authoring job behind it. ⚠️ `docs/packs/README.md`
  still governs — the model is not a source, and a dataset's licence is checked
  before it is used.
- **The grader already exists and is already right.** `typedAnswer.ts` folds
  apostrophes (iOS keyboards substitute them) and deliberately does **not** fold
  diacritics — its own comment cites `ou`/`où` and `sur`/`sûr`, and
  `préfère`/`prefere` is that case one step further in. Folding accents would
  teach that the accent is optional, which in a conjugation table is the content.
- **French first** — an assumption recorded rather than a decision taken, since
  the tool is language-generic and the dataset is per-language.

**The native language is scoped, not adopted as a rule.** The user raised that a
Korean native and an English native learning French need different things, and
then declined to apply it here: _"for something as simple as verb conjugation, I
don't think we need to take this as a hard rule at least to start out."_ That is
the right cut, and the reason generalises: **the native language matters exactly
where the distance between the two languages is itself the difficulty.** A
conjugation table is a form committed to memory, and `prenons` is hard for the
same reason whoever you are. Articles are the opposite case — Korean has none, so
`a`/`the` for a Korean speaker means learning that a category exists, where a
French speaker learning English already has the category and argues only about
details. Same feature, genuinely different tool. So the principle governs *which
tools get built for whom*, and it arrives with the tool that needs it rather than
as an axis every tool must carry.

**What this cancels outright:** the French A1 level ladder and its référentiel
sourcing gate (the whole 2026-09-14 content plan below), the Practice · Concepts ·
Ask tab sketch from earlier today, and the `concept` abstraction under it. **What
survives from all of it:** authored-or-computed over generated, graded locally,
zero model calls in the daily loop, never pooled with vocabulary review, hints
that cost, and no multiple choice.

## Grammar becomes a mode after all — Munli, and the shell that hosts it (2026-09-21)

**The user's call, and it reverses one half of the 2026-09-14 entry in
[grammar-and-writing.md](grammar-and-writing.md) rather than amending it.** That entry answered "a pack inside Amgi, or its own
app like Hwasul" with **a pack, no mode, no second app**. Grammar now becomes
**Munli, a separate mode inside the same binary**, reached by holding the last
tab the way Instagram switches accounts. ⚠️ **Only the placement reverses.**
Everything that entry argues about grammar *content* — authored not generated,
graded locally, levels as the spine, never pooled with vocabulary review, one
concept at a time — survives intact and still governs.

**Why this is not simply the option that was rejected.** The 2026-09-14 entry
weighed two options and a mode was not one of them; it is a third, and it is
between them on every axis the entry used. A second app was refused for its
*costs* — its own auth, habit, retention, store listing and Beta App Review
cycle, all of which the no-OTA model makes expensive. A mode pays none of those:
one binary, one account, one habit, one review cycle. The pack was chosen for
its *cheapness*, and its cost was the thing it did to grammar — a grammar point
became a subpack row in a vocabulary browser, and a concept's explanation had
nowhere to live. So the argument that sent Hwasul away ("**does it need new
nouns**") was the right test applied to a question with a missing answer: new
nouns do not imply a new binary, they imply a navigation context.

**Three calls the user made, taken as given:**

1. **Own tab set, shared shell.** Munli has its own surfaces, queue, collections
   and progress; the account, study language, interface language, theme and
   streak stay the shell's. A mode that wanted its own account would be an app.
2. **Hold the last tab.** No new slot in an icon-only bar, five tabs stay five,
   tap still opens Progress. ⚠️ **With the user's own caveat: a hold is
   invisible, so more doors are wanted later** — the account menu row is the
   first, and the backlog item rebuilding that popover is where it goes.
3. **French A1 folds into Munli** rather than shipping as a pack beside it.
   ⚠️ **Superseded within the day** — the entry above cancels the A1 ladder
   entirely and starts from individual tools instead. Recorded because it is what
   was decided at the time this entry was written, not because it stands.

**One design call made here, because it decides the build rather than the
product: a mode is a *location*, not a setting.** Native takes a second Expo
Router group, web a `/munli` route prefix. The alternative — a stored mode the
shell reads — fails on web specifically: the pre-paint script in
`apps/web/src/app/layout.tsx` exists because theme and sidebar-collapse are
client-side state that would otherwise paint wrong for a frame, and a stored mode
would put the **wrong navigation** in that same frame. Routes are known to the
server, so there is nothing to pre-paint and the mode is linkable for free.
Storage keeps exactly one job: which mode a cold open lands in.

**"Never pooled" governs the queue, not the chrome.** Constraint #1 below is
about `collections.ts` refusing an everything-collection. It is not an argument
for two streaks, two accounts or two study languages — those are the shell, and
splitting them would give the user two habits to break instead of one. Left
open: whether Munli practice feeds the Amgi streak (recommended yes).

**Other modes are noted, not planned.** Speaking is the obvious third and Hwasul
was its separate-app form; nothing about it is scoped. The only consequence for
this work is **don't hard-code two** — a list of modes, a mode id in storage, one
route group among several. The bar for a third is the bar that got Munli the
second, and modes are not a growth strategy: each is a tab set to maintain and a
place to be lost in.

⚠️ **What this does not change, and it is the load-bearing half.** The four
reasons grammar was removed in 2026-08 (unfocused, poor practice, unused, heavy
and slow) are answered by the *content* design, not by the mode — authored items,
local grading, zero model calls in the daily loop. A mode makes grammar
navigable; it does not make it good. Generated exercises and model-graded free
production stay dead. And the honest caveat below stands word for word:
authored cloze is Paulston's controlled rung, Bunpro is the shipped cautionary
case, and **the user is still not this feature's user** — which is why the
sequencing is still the risk control, now with the switcher first and writing
last.
