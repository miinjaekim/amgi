# Decisions: Packs

Vocab packs: the sourcing standard, each curated pack, subpacks, user-made packs. Newest first. Indexed from
[status.md](../status.md).

## Users make vocab packs from a goal, and an agent sources them (2026-09-25)

**Goal-based generation (parked 2026-07-24) is replaced, not revived.** It was
parked because it made word lists nobody asked for, and because the model is not
a source. The new shape answers both. Every pack the user has built started with
someone's goal, struggle or situation, so the user states one. An agent then
finds words in sources and cites them, rather than writing a list. The scoped
item is *Users make their own vocab packs* under Bigger bets.

**The user's calls:** vocab before Munli grammar. Set questions rather than a
chat or a single box. Subtopics picked by the user decide the pack's size, one
subpack each. No word-by-word review for now. A *Make a pack* action on Packs.
User packs the user approves can become official. Sharing, profiles and
connecting learners are where this is headed. Cost is set aside for now.

## A tap on a mobile pack saves the word; detail moves to the second tap (2026-09-13)

On mobile, tapping an **unsaved** entry in a pack now saves it where it stands.
Tapping a **saved** one opens `CardDetailModal` as before, and a **long press**
opens either. The unit this adds is the one the screen was missing: sections are
a sitting, the whole deck is a course, and *these eight words* was previously
eight taps, eight modals and eight dismissals — enough friction that saving the
whole section was the easier move, which is how sections nobody wanted ended up
in review.

**Detail was not removed, it was re-ordered.** The second tap is a better moment
for it anyway: by then there is a card to hang depth and examples on, which is
what the modal is for. The modal is still the only card surface here and still
carries edit/archive/delete, so a mis-tap is undone by tapping the word again
and deleting — no separate unsave.

⚠️ **Web deliberately did not move.** One tap opens there, and the hint copy is
now two pairs of keys rather than one: `packTapHint`/`packTapHintCards` for web,
`packTapSaveHint`/`packTapSaveHintCards` for mobile. A pointer is not a finger —
on web the modal is cheap to open and dismiss, and the cost this removes is a
sheet that covers the list you are reading down.

**Two guards came from enrolment's own scars.** A tapped word writes through
`saveFlashcardsBatch` as a one-card batch rather than
`saveFlashcardToFirestore`, so it lands in the section's subpack via
`buildPackCardDraft` exactly as the section button would file it, and counts as
a pack card rather than a lookup. And when `savedTerms` is still null — the
fetch in flight or failed — a tap **refuses and says so** rather than saving,
because reading unknown as "not saved" is precisely what once enrolled all 71
katakana twice. A local `pendingSaves` set ticks the row on tap so a run of
eight does not read as taps being dropped, and is pruned once the listener
confirms, so a later delete cannot leave a row ticked.

## 병과 material is a section of 부대·참모, and its branches keep the 「-과」 (2026-09-09)

**Two calls, one branch. Both are the user's on the first, mine on the second.**

**A subpack, not a fourth pack.** The backlog item asked for a Military
specialties pack and it was built that way first: 66 pairs, eight sections, all
four services' statutory inventories, the 병무청 enlisted specialty list and a
traps section, registered as `military-specialties-ko`/`-en`. The user's call on
seeing it: *"i think it might be a little excessive to make a whole new pack.
maybe it could be better to just add a subpack to the unit and staff pack
relating to branches and specialties with just some of the most common/basic
terms."* Reverted and rebuilt as one 24-pair section of 부대·참모.

**Why that is the better shape, in hindsight.** The branch is the third question
after what unit and what rank, and both of those are already this pack. A fourth
military deck would have split one conversation across two decks and asked a
learner to enrol twice for it. **Subpacks made the smaller shape lose nothing**
— the section is separately enrollable, drillable and reviewable, with its own
progress, so "just the branches" is still a thing a learner can do. That is the
same argument that closed the Review-group item on 2026-09-09, arriving from the
other direction.

**The research survives the cut.** What was dropped is listed with its reasons in
`docs/packs/military-branches-subpack-draft.md`, so an expansion — the Navy and
Air Force inventories are the most defensible one — starts from sourced material
rather than from scratch.

**Branch names are written 보병과, not 보병.** Two reasons and the second is
mechanical. The statute names them that way, so the form is sourced rather than
invented, and 보병과 can only be the branch where 보병 is also the arm. And the
bare forms are **already cards in this same pack** — 보병, 방공, 수송, 보급,
군사경찰 — so repeating them would put two cards with one front, and two with one
answer, into a single review queue, which `military-packs.test.ts` refuses across
both packs in both directions. The English side follows the same rule (Infantry
**Branch**, Transportation **Corps**), which is also how the US Army writes its
own branch names.
⚠️ **This is the likeliest thing here to be wrong.** 보병과 is the legal
register; a soldier asked their 병과 answers "보병". It is pinned by a test so
that changing it is a decision rather than a drift, and it is the first thing the
draft asks a reviewer.

**The back is the US branch, not the official English.** 법제처's translation of
군인사법 is an official source and unusable as a card back: it renders 병참과 as
"logistics" — a different ROK branch, 군수과 — and 부관과, now 인사과, as
"aide-de-camp", which is a person. So the back is what a US listener says and
the hint carries the official English where they differ. **That gap is the whole
reason the section is worth having**; a bare bilingual chart of branch names is
something a reader could already find.

⚠️ **Every US branch name rests on one source family** (two Wikipedia pages,
which is self-consistency rather than corroboration), so the section is 7 A, 16
B, 1 D. A reviewer with DA PAM 600-3 can lift most of it to A, and that is the
highest-value thing anyone can do to it. **The word list was approved 2026-09-09**
— of the list, not of those two open items.

## The 급수 pack was sourced, not recalled — and how (2026-09-09)

**Approved by the user 2026-09-09.** 300 characters, five subpacks, 8급 through
6급. The item budgeted for sourcing being the hard part and it was, but it came
out better than expected: the 배정한자 is published as an XLS in 어문회's own
learning-materials section, and a transcription of it carries the levels *and*
the 대표훈음 with 훈 and 음 already apart — the shape three-sided cards need.

**Fetched as bytes, not as prose, and that is the transferable part.**
`raw.githubusercontent.com` is blocked from the sandbox, so the CSVs came
through the GitHub *contents* API and were base64-decoded locally. The available
alternative was a fetch-and-summarise tool, which puts a **model** between the
source and the file — and a model transcribing 300 hanja is precisely what
"the model is not a source" forbids. It is not a hypothetical: it is how the
四 compatibility-ideograph rows would have been silently normalised away, or
not, with no way to tell which. **When a pack rule says a model is not a source,
that includes the model inside the fetch tool.**

**Two independent sources on the half that matters.** Unihan's `kHangul`
corroborates all 300 음 with no exceptions, and ko.wikipedia's cumulative counts
(8급 50, 7급 150, 6급 300) match at the three rungs it names — which also
settles the per-level figures the backlog had carried as unverified: 50 / 50 /
50 / 75 / 75 newly assigned.

**The kanji-pack question is answered: neither reads from the other.** 151 of
the 300 overlap, and the two decks deliberately answer different questions —
the kanji pack authored *modern Korean* glosses (女 → 여자, 大 → 크다) where a
hanja deck needs the 대표훈음 (계집 녀, 큰 대). So there is no shared source to
keep in step, and the drift risk the backlog flagged does not exist. The kanji
pack corroborates the character and the English; never the 훈.

**The one row that shipped knowingly wrong is fixed.** 省 is 살필 성 —
*examine* — and Unihan's `kDefinition` has only "province" and "save,
economize". It shipped as "province" with the wrongness flagged rather than an
unsourced "examine" written in, and the call came back *examine* on 2026-09-09.
It is now `examine, inspect`, tier B off Wiktionary's own wording for the xǐng
reading, with CC-CEDICT and Unihan's own `kJapaneseKun` (`KAERIMIRU`, 省みる)
agreeing on the sense Unihan's definition field omits. **The lesson is that
flagging held**: the row was findable, the call was one line, and nothing had to
be re-derived to make it. Its English is the only one in the pack from outside
Unihan, so it has its own table (`OFF_UNIHAN`) rather than a line in
`OVERRIDES`, which is what keeps the tier column honest.

**The ingest script is committed beside the draft** because the draft's tier
column is a claim about provenance, and a description of a method is not
evidence of it — re-running it reproduces all 300 rows exactly.

## Per-level content is allowed; per-level adaptivity is not (2026-09-09)

**Amends [vision.md](../vision.md).** The line "no level setting, no placement test,
no per-level content" now refuses only the first two. Set by the user while
scoping the Hanja packs: *"per-level content is still allowed, but we still want
to apply first principle thinking... we don't create per-level content just for
the sake of it, but rather because we want the content to be approachable and
easily navigable."*

**What the old wording conflated.** Two different things sat in one list. A
level *setting* and a placement test are the app deciding what a learner is
ready for — that is what the rule exists to refuse, and it still refuses it,
because the user's own input already says. Content *organised* into levels is a
navigation question, and it never had the same argument against it. The old
wording only held up because nothing had tested it.

**What replaces it is a test, not a permission.** Levels are allowed where they
make content approachable and navigable, refused where they are structure for
its own sake. Two things to check: does the ladder come from somewhere real — a
published curriculum or exam sequence someone thought about — and can a learner
tell from outside which rung they want. 급수 for hanja passes both. Slicing a
vocabulary deck into "level 1–5" to look organised passes neither.

**Why this was already latent.** The kanji pack chose 학년별한자배당표 over a
JLPT tier for exactly this reason and argued it at length — a real curriculum
with an order someone thought about. That was per-level content shipped in
August under a rule that read as forbidding it, which is a fair sign the rule
was wrong rather than the pack. The **kana exception amended into vision.md
2026-07-24 is untouched** and is a different point: it is about scripts not
being beginner content, not about levels.

**Not affected:** domains-not-starters, and audience-is-not-beginners. A 급수
deck is still a domain — hanja — being unlocked in a sourced order, not a
starter deck.

## No Review group in settings — subpacks answered it instead (2026-09-09)

**Closes "What belongs on the review screen versus in settings"**, removed from
the backlog rather than built. The user's call, on seeing subpacks working:
*"i think we managed to remove the need for a review screen settings by adding
subpacks."*

**What the item was actually stuck on.** The rule it named — *the review screen
holds session properties, settings holds durable preferences* — covered
everything except one axis: a control that is **durable but scoped to review**.
That axis was the only argument for a Review group inside settings, and the
whole item was waiting on it.

**Subpacks removed the pressure by making the scoping structural.** The thing
you would have reached for a persisted setting to do — sit down with part of a
deck rather than all of it — is now a thing you *pick*, in the place you pick
what you are reviewing. A remembered preference would be a worse version of
that: it answers once, invisibly, where the picker answers every session and
shows you the state it is in.

**The rule stands and is now written down**, which was half the item's value:
session properties on the review screen, durable preferences in settings, and
nothing in between needing a third home.

⚠️ **What this does not decide.** Default direction and whether typing starts on
are still session state that resets, and nobody has asked for them to persist.
If someone does, this entry is the thing to reopen — the answer then is a Review
group in settings, and the settings screen's own flat-list problem (noted with
the per-context pronunciation speed item) becomes the same piece of work.

## A pack is reviewable as a whole, and that narrows an older rule (2026-09-09)

**Closes the first of the two calls the subpacks item left open**, answered by
the user directly: *"i still want to be able to review a whole pack; i think
it's relevant when i've already studied all the subsections i wouldn't need to
review the sections separately."*

**It contradicts something written down, which is why it is here.**
`ReviewCollection`'s header says there is *deliberately no "everything"
collection* — a pack and your own words are learned for different reasons, and
katakana arriving mid-way through Japanese vocabulary is worse review than
either done alone. A whole-pack review is that same shape one scope down, so it
needed an argument rather than a shrug.

**The argument is that the rule was never about scope, it was about provenance.**
Two collections are kept apart when they were learned for *different reasons*. A
pack's sections were authored as one deck for one purpose — Greetings and
Numbers are both "the Kikuyu you start with" — so pooling them is not the mixing
the rule rejects. The rule stands unchanged for everything above the pack. What
it gains is a boundary: **a pack is the largest thing that pools.**

**And the user's case is the one the second level would otherwise break.** Once
every section is studied, reviewing them one at a time is six sittings of the
same material — so a design where the only scopes are subpacks would have made
finishing a pack *worse*. The second level is additive: the pack row is first in
its group and stays a real sitting.

**Mechanically it is one asymmetry**, `cardInCollection`: a subpack takes only
its own cards, a pack takes its own *and* every subpack's. Cards saved before
subpacks carry a bare pack id and land in the pack with no subpack, which is why
the migration could ship after the feature rather than inside it.

**One knock-on:** a pack with a single subpack holding all of it renders flat,
because "the whole pack" and "the one section" would be the same sitting offered
twice.

## The Kikuyu pack, and a syllable Hangul could write all along (2026-08-31)

59 entries, the fifth registry key, and the first pack built under the sourcing
standard one entry down. Shipped **without a speaker having read the list** —
knowingly, with the tier on every entry so what is unverified stays visible: 16
corroborated twice, 36 on a single source, 7 derived from a sourced stem plus a
sourced rule. Two entries with no source at all were cut, which is what tier C
is for.

**The finding worth keeping is a correction to a reasonable-sounding read.** The
respelling stranded a consonant before `w`: `mwarĩ` split `m.wa.rĩ` and rendered
`m-wa-re`, and the Hangul path fell through to `withOnset(jamo, '으')` and
**invented a syllable** — 므와레, three for a two-syllable word. The natural
reading of that is that Hangul cannot hold a `Cw` in one syllable and a
transliteration is a lossy reading aid anyway. **Both halves are wrong, and the
check took one line:** Korean writes 뫄, 뭬, 콰, 퀘, 과 and 화, the last two among
the commonest syllables in the language, and the `w`-series nuclei were already
in `KIKUYU_NUCLEUS`. Only the onset list was missing them. **And the English path
had the identical fault**, where no Hangul constraint applies at all.

**The distinction is worth holding onto, because the principle it was confused
with is correct.** A respelling *is* a reading aid and is allowed to lose things
— `ĩ`/`e` and `ũ`/`o` merge onto one letter, stress is unmarked, `th` cannot say
*the* rather than *thin*. Those are losses of information, argued and accepted.
A syllable the word does not have is not a lossy approximation of anything.

**Why deriving this fix did not violate the lesson about deriving respellings.**
It is not a phonological claim: Kikuyu orthography already marks the split,
writing the vowel when the nasal is its own syllable (`mũndũ`, `mũrata`) and
omitting it when `w` is a glide (`mwana`, `mwarĩ`). Reading `mw` as one onset
reads the spelling as written. It is also what the module's own docstring means
by syllables being open CV — a bare `m` with no vowel was never a syllable the
file claimed existed. An internal-consistency argument, not a chart. Three stale
docstring examples were fixed alongside it: they still showed the
*pre-correction* `rũciũ` → `roo-chee-oo`/`루치우` and `mũgũnda` → 무군다, handing
a reader the two errors #105 fixed.

**The fix reaches every existing Kikuyu card**, not only the pack — 11 of the
pack's 59 entries were affected, including the words for "hello" and "one".

**Kikuyu could not have had a different kind of pack.** The Spanish pack's
beginner exception was argued as a deliberate departure; here there is no pool
of learners further along to write a domain deck for. And because the language
has no synthesised voice, **the respelling on the card is the only pronunciation
aid this deck has** — which is why building it started by rendering every entry
rather than by reading the list, and why a test now asserts that no entry
renders a vowelless syllable.

## Vocab packs are sourced, and the model is not a source (2026-08-31)

_The user's call, made while the Kikuyu draft was being written._ The standard
itself is `docs/packs/README.md`, next to the drafts it governs; this is why.

**The Spanish pack was authored from the model's own knowledge and it mostly
worked** — the vocabulary was never in doubt, and review caught the two things
that were wrong (a gloss that interpreted, an article in two places). Kikuyu is
the case that breaks that method, and the repo had already measured why: noun
class 3 of 8 (2026-08-22), tone self-consistent on 2 of 19
(`docs/pronunciation-research.md`), and a respelling table wrong three times.
**Same source, three failures, all caught by a speaker and none by review.**

So the rule is one line — **the model is not a source, and asking it to check
itself is not corroboration.** Self-consistency was measured as no evidence of
correctness on Japanese pitch accent (18 of 27 stable, 6 correct), which is the
finding that generalises: a second pass over a generated list launders the first
one rather than testing it.

**Three of the draft's own guesses were caught by the sources on the first
pass** — `mĩrongo ĩĩrĩ` for `mĩrongo ĩrĩ`, bare `igana`/`ngiri` where the
numeral is part of the word, and `mũrũ wa maitũ` for `mũrũ wa nyina`. That is
the standard paying for itself before it was finished being written.

**Tiers rather than a bibliography.** A/B/C/D per entry as table columns, because
a paragraph of sources at the bottom lets a reviewer trust the whole list
equally — and the point is the opposite, that they can see which rows are
load-bearing guesses without reading all of it. The Kikuyu draft is 15/33/3/8,
and stating that in its first paragraph is more useful than any of the entries.

**Sources are ranked, because the bottom of the range is contaminated rather
than merely thin.** lughayangu returned `Nakupenda` as Kikuyu — that is Swahili,
and it is the same confusion `STUDY_LANGUAGE_CONFIGS` already refuses a Swahili
TTS voice over. It also drops the diacritics, which on a language whose `ĩ`/`ũ`
distinguish words means it corroborates the word and not the spelling. So
**orthography is part of the citation**, and a source that loses it is cited for
less than it appears to give.

**Conflicts are recorded, not resolved quietly** — `guka` against `wagui` for
grandfather stays visible in the draft, because a draft that picks one silently
has spent the reviewer's only chance to catch it.

**And render the list before believing it.** Not a sourcing rule, but it belongs
in the same standard because it is the same mistake in a different place: a word
list is not what the learner sees. Running the Kikuyu entries through
`kikuyuToEnglish` and `kikuyuToHangul` found a syllabifier bug in ten minutes —
in the word for "hello" — that no amount of rereading the table would have
surfaced.

## The Spanish pack: an article is a field, and a gloss is not an explanation (2026-08-31)

The app's first elementary deck, 153 entries in five sections, and a second
deliberate exception to the "audience is not beginners" rule after the everyday
English pack — a bigger one, since that pack's learners had school English to
filter against and a Spanish learner starting at `hola` has nothing. The
argument is in `spanishBasics.ts`; the list and its review are in
`docs/packs/spanish-basics-pack-draft.md`. What follows is only what a source
diff would not explain.

**`PackEntry` gained a `gender` field** — _the user's call, 2026-08-31._ Pack
cards were the only path that could not carry an article: `/api/explain` returns
`el`/`la` for a looked-up Spanish noun and three surfaces render it as a badge,
while `buildPackCardDraft` wrote nothing, so the same word saved two ways
produced two cards that disagreed about how much they knew. Three lines, and it
reaches the typed grader as well — `acceptedAnswers` takes the article the
learner learned the noun with. The registry had simply never had a Latin-script
pack to expose the gap.

**The article then had to come *out* of the study text, and that is the trap.**
The list was first authored `study: 'la carta'` *with* `gender: 'la'` beside it,
which is the obvious-looking shape and is wrong twice: `acceptedAnswers` emits
`la la carta`, and a pack card and a looked-up card hold different strings for
one word — the exact divergence the field was added to close. 41 entries were
rewritten to the bare noun. **A test caught it, not a reread**, which is the
argument for the round-trip assertion that now sits in
`spanish-pack.test.ts`: build the draft, read it back through the grader, and
assert on what a learner could actually type.

**A gloss translates; a `context` explains.** `el menú del día` was authored as
"the set lunch" and the user pushed back — it means the menu of the day, and the
fixed price and four courses are an institution. The rule that came out of it,
and that the pack now follows: **where the Spanish has a plain reading that is
also correct, the back uses it and the hint carries the institution.** Three more
entries had the same defect (`primer plato`, `segundo plato`, `ración`), so the
class was fixed rather than the instance. `briefDefinition` is where an
institution belongs — it is also what steers every later depth call, so nothing
is lost by moving it there.

**One principled exception, found by an existing guard.** `tapas` was glossed
"tapas" and 타파스: English borrowed the word unchanged and Korean transliterated
it, so both backs said the front back to the learner. `pack-cards.test.ts`
already refused a back equal to its front, which is how it surfaced. **Where no
translation exists, a definition is the only honest back** — "a small plate of
food" — and that does not reopen the rule above, because there is no plain
reading to prefer.

**Two authored back columns can disagree with each other, and nothing catches
it.** This is the first pack where both `English` and `Korean` are live, since a
Spanish deck puts neither in the study slot. They were written independently and
drifted: the Korean side already said 첫 번째 요리 while the English said "the
starter". Worth knowing before the next two-back pack — and the reason
`spanish-pack.test.ts` asserts no two entries share a back **in either
language**, since two cards with one back cannot be reviewed in the
back→study direction at all.

**Phrases are entries, under one rule.** A question is authored complete and
with its punctuation (`¿dónde está el baño?`); a frame the learner finishes is
authored bare (`me llamo`). Never a half-sentence. `foldText` folds away neither
the `¿` nor the accents — deliberately, and Kikuyu's `ĩ`/`ũ` is why — so a bare
`cómo te llamas` would teach the learner to write Spanish wrong to save them one
tap on the rating row. It would also have the pronounce button read a fragment
aloud on a pack that declares `pronounceable`.

**European Spanish is load-bearing here in a way it has not been yet.** The
2026-08-21 decision named the variety; ordering food and asking directions are
the first content where it changes the words rather than the accent. `caña`,
`zumo`, `patata`, `billete`, `todo recto`, `servicios`, `planta baja` — and
`coger`, which is ordinary in Spain and vulgar across much of Latin America. It
is in the deck because the deck is European Spanish, and its `context` says so
rather than leaving a learner to find out.

## Three packs authored; one of them sets a rule aside on purpose (2026-08-24)

Everyday English (149), English Idioms (100) and Kanji 教育漢字 1–2 (240).
**Word lists approved 2026-08-24**, the gate every pack goes through. Drafts, now
the record rather than the request: `docs/packs/{daily-life,idioms,kanji}-pack-draft.md`.

Content-only and registry-driven — no pack id is hardcoded anywhere in `apps/`,
so both platforms picked all three up with no change. That also sets when each
audience sees them: **web at deploy, mobile at the next build**, since mobile
ships by build and there is no OTA. Nothing here needs a native module, so the
packs ride whatever build comes next rather than earning one.

Four calls worth keeping:

**"Audience is not beginners" has one recorded exception, and it is the
daily-life pack.** Asked for that way, so it is a deliberate exception rather
than a change of principle — a future pack citing it as precedent is citing an
exception. What keeps it from being a bad deck is a second filter, **concrete
over frequent**: a beginner list fails by filling with the two hundred words a
Korean learner already met in middle school and feeling comprehensive while
teaching nothing, so the entries are elementary in register and *specific* in
reference — `faucet`, `drawer`, `leftovers`, `errand` — and bare high-frequency
function words are left out.

**The kanji pack is the JLPT gap, answered with the school list.** 学年別漢字
配当表 grades 1–2 rather than N5: N5 is an exam's slice of the same material and
stops part-way, where the school list is an order someone thought about and
reaches the point where kanji compound (電車, 教室, 何曜日). N5 is a subset, so
an exam-ladder pack later is a re-sectioning, not a re-authoring. A test checks
the 240 character-for-character against the official lists — across eleven themed
sections nothing else could.

**It is the first pack whose back is not a gloss, and therefore the first
single-glyph pack that is a list.** A kanji's meaning alone does not answer the
card — 生 means "life" and says nothing about 学生 or 生きる — so the back is
`meaning — kun / ON`, kun in hiragana with okurigana in parentheses, on in
katakana, script alone distinguishing them. That does not fit the 4.5rem tile
that makes 71 kana scannable, hence `layout: 'list'`. **The cost is live and
named in the draft:** `isGridDeck` exempts grid decks from the "All" chip on the
card list and list decks are not exempt, so 240 kanji cards will sit alongside
the user's own words there. If that turns out wrong the fix is a per-pack flag,
not a layout change — the layout is keyed on content shape for a reason.

**The idioms prediction in the backlog held.** An idiom's back is a usage note,
so the Korean back is the nearest Korean 관용구 landing on the same *occasion*
(설상가상, 전화위복, 식은 죽 먹기) and every entry additionally carries an
`idiom — …` context hint — the TOPIK convention, so one grep finds every
figurative entry in the app. The hint and the back do different jobs (what it
means vs. when you would say it), and the failure mode is the hint decaying into
the gloss: a test enforces the prefix *and* a minimum length, and caught four
real ones on the first run.

## A pack may be authored as pairs, and register twice (2026-08-08)

The military packs are the first content where **both sides are terms a
professional has to produce**, not a study side and a gloss. So the source in
`packages/core/src/military.ts` is `BilingualSection[]` with neither side
privileged, and `derivePack` reads it once per direction.

- **No new pack shape was needed**, which was the bet the draft made and it held.
  `buildPackCardDraft` already writes the study side last, so it wins over
  whichever authored side lands in the same slot. Only the *opposite* side is
  authored: a Korean back on a Korean deck could never be read, and its only
  effect would be to look authored.
- **Four ids, not two.** `getCollectionId` returns `card.packId` unqualified, so
  two directions sharing an id collapse cards saved from the Korean deck and the
  English deck into one collection on `/cards`. Producing `battalion` from 대대
  is not the same skill as the reverse and drilling both is the premise, so the
  id carries the direction (`-ko` / `-en`) and the display name does not.
- **The name has to be direction-neutral on both sides.** "Military English" is
  wrong for the English native studying Korean; 군사용어 is what the field calls
  the material anyway. A test pins this, because it is the kind of thing a later
  rename undoes without noticing.
- **The split is by register, not difficulty** — neither pack is the beginner
  one. 부대·참모 is a unit and a combined staff, where the failure mode is
  stumbling. 안보·정세 is a briefing and a press statement, where it is saying
  "joint" for 연합 in front of people who will quote it. They are also **not a
  sequence**: a 통역병 in a line unit wants one first, a 통역장교 headed for
  public affairs the other, and the deck page cannot say "either, depending" —
  so the order in `VOCAB_PACKS` is not a recommendation and says so in a comment.
- **No term appears twice and no two terms share a back, across both packs and in
  both directions.** Same constraint that forced the 초래하다/야기하다 splits on
  TOPIK, now enforced across two packs rather than within one — which is why
  three traps (취역식/임관식, the 전역 homograph, 제병협동) sit in 안보·정세
  despite belonging to 부대·참모's traps section by nature.
- **Hints stay out of the drafts' own numbering.** Five `context` strings pointed
  at draft sections ("see §10"). A hint survives onto the card as
  `briefDefinition` and is read by the depth and examples calls, so a pointer to
  a document neither the learner nor the model can see is worse than useless.
  They state the point directly now, in the drafts too, so what a reviewer reads
  is what ships.

## Learn-flow `packId` stamping and daily draw: both dropped (2026-08-02)

Removed, not deferred — the pack unification answered both.

- *Stamping `packId` on Learn saves* existed because one word saved two ways
  landed in two places. Decks no longer route to Learn, so there is one path.
  What remains is typing a pack word in by hand, which is a person deliberately
  looking something up — that card genuinely is their own. Reopen only if a second
  surface starts saving pack words without a `packId`.
- *Daily draw* was one of four ways to make a 160-word pack learnable. Section
  enrolment solved it more simply — six sittings of 20–40, no scheduling state, and
  the user picks when to sit down rather than the app rationing. Reopen only if
  sections land too much at once in practice.

## Packs: one kind, not two (2026-08-02)

The `lookup`/`cards` split was a cheap way to ship a word list without authoring
backs, and it was cheap in the wrong place: a `lookup` pack couldn't be
bulk-saved, drilled or reviewed, so the packs with the most words had the least
machinery. Rejected alternatives: *batch-generate backs at enrol time* (a long
spinner on the tap, and it generates the curated half of the content, against
[vision.md](../vision.md)); *migrate pack by pack* (two live code paths
indefinitely).

**The tension worth remembering:** both packs' headers argue these are words
where one gloss is *not enough* (여건, 취지, `outstanding`). Still true. The
resolution is that **the back is a seed, not a finished card** — it makes the word
savable and reviewable at all, and depth is generated on demand afterwards.
Before, that generation was mandatory and came *before* the card existed. If a
future change makes on-demand depth hard to reach, this justification goes with
it and gloss-only cards become a real regression.

Sections are **semantic, not uniform slices** — "Familiar words, second meanings"
is a theme a learner can hold, "words 31–60" isn't. Costs evenness (sections run
20–45); accepted. `layout` replaced `kind` for grid-vs-list, keyed on the content's
shape, so a future single-character pack inherits the grid without being asked.
