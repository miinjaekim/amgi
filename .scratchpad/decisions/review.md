# Decisions: Review

The review session: typed answers, undo, readings, decks and drill. Newest first. Indexed from
[status.md](../status.md).

## Hard, Good and Easy give different waits, and an exact typed answer is Good (2026-10-09)

**Reverses "a hit is rated `easy`" from the 2026-08-25 call in the typed
responses entry below, and the "Exact is `easy`" line of the 2026-10-07 entry.**
Everything else in both stands: an exact hit is still applied on the spot and
the card is gone, a near match still stops with the ring on `good`, a miss
still stops with it on `again`.

**The intervals.** Until now the three passing buttons gave the same wait (1
day, then 6, then the last wait × ease) and differed only in what they did to
the ease, so they parted ways one review later. The user met this while
scoping review times under the buttons: three buttons, one time. The numbers
are the user's, 2026-10-09:

- **First review of a new card, or the first after an Again:** Hard 1 day,
  Good 2, Easy 4.
- **Every later review**, where W is the last wait: Hard is W × 1.2, Good is
  W × ease, Easy is W × ease × 1.3.
- **Each button gives at least one day more than the one below it.** Anki's
  rule, and what separates the buttons on short waits, where rounding folds
  them together (1 × 1.2 rounds to 1).
- **The fixed 6-day second wait is gone.** The second review follows the rule
  like any other.

Always pressing one button, in days, with the old schedule in brackets: Hard
1, 2, 3, 4, 5 (1, 6, 13, 27, 52). Good 2, 5, 13, 33, 83 (1, 6, 15, 38, 95).
Easy 4, 14, 49, 178, 671 (1, 6, 16, 45, ~130). The tests in `sm2.test.ts`
assert all three.

**Good starts at 2 days, not Anki's 1,** so that it stays close to the old
schedule: starting at 1 halved every wait after it.

**No learning steps in minutes.** The user looked at Anki's and does not want
minute intervals. A missed card stays due now, as before, and a session still
ends when it said it would.

**Unchanged:** Again, and how much each rating moves the ease (Hard −0.14,
Good 0, Easy +0.1, floor 1.3). **No migration:** a card keeps the wait it has,
and only ratings made afterwards are computed differently.

**Why an exact typed answer became Good.** The 08-25 call accepted that `easy`
on every hit ratchets the ease, on the ground that a word typed right on sight
should grow fast, and named a cap in `sm2.ts` as the lever if it ever needed
reining in. With the 1.3 bonus the cost is no longer one review away: a word
typed right five times running would be gone for 671 days without the learner
ever choosing that. So Easy is something only the learner picks (the user,
2026-10-09). The ratchet goes with it, since Good leaves the ease where it is.

**Two readings the rule as written needed, both forced by the sequences:**

- *The one below Hard is the last wait itself.* Hard is at least W + 1, which
  is what makes Hard read 1, 2, 3, 4, 5 and not 1, 1, 1, 1, 1. It is also
  Anki's floor for Hard.
- *The ease multiplied is the one the card arrived with,* not the one this
  rating leaves it with. Easy's second wait is 4 × 2.6 × 1.3 = 14, where 2.6
  is what the first Easy left behind.

**Follows from sharing the function, the user's to overrule:**

- Munli conjugation practice (`rateBox` in `conjugation.ts`) calls
  `getNextReviewData` and changes with it. Munli's own grading, including the
  clean cloze that earns `easy`, was not part of this.
- Web changes on deploy and mobile on the next build, so until then the same
  card rated on each is scheduled differently.
- The first-run card ("it comes back …") reads the same function, so a Good
  there now names a date two days out instead of "tomorrow".

**Chosen in the build, not asked:** a card already one review in under the old
rule (a 1-day wait) gets 3 days on Good where it would have got 6. That is the
6-day wait going, applied to cards in flight; nothing is rewritten.

## Meanings are typed too, and a typed meaning has a near match (2026-10-07)

**Reverses the direction rule of the 2026-08-24 entry below.** That one typed
only gloss→word, on the ground that a back may hold two glosses where a word is
one string, so the expected answer is ambiguous in a direction the word never
is. The user met the result as a bug ("Debug typing answers": with typing on,
half a mixed session still flipped), learned it was by design, and decided to
type the meaning as well. The ambiguity the old rule avoided is real; this
answers it with a middle outcome instead of by not asking.

**Three outcomes for a typed meaning**, all the user's call, 2026-10-07:

- **Exact is `easy`, applied and gone**, as a typed word is. Exact is the back
  the learner is shown, as stored, under `sameFoldedText`.
- **Near stops and asks, with the ring on `good`.** Near is right only under
  three local rules: either gloss when the back holds two (the gloss rule's
  comma or semicolon), a leading `to`/`a`/`an`/`the` ignored on either side,
  and the card's other back accepted (English beside Korean, when a card has
  both). Nothing is applied: the grader bent a rule to accept the answer, so
  the learner says whether "mood" for "atmosphere, mood" was knowing the word.
- **Anything else is a miss, exactly as for a word**: "Not quite", what was
  typed beside the back, ring on `again`, all four ratings live. The user
  considered dropping the negative feedback in this direction, since a
  differently worded right answer is common here, and kept it: that answer is
  one tap to override, which is no reason to stop saying a wrong one is wrong.

**Still no model and still no edit distance.** The leniency is three rules a
learner could recite, which is what keeps a miss legible; the 08-24 reasoning
for a local grader stands unchanged. The typed word is still all or nothing.

**Unchanged:** gloss→word typing, Hanja untyped in both directions, and one
"Type your answers" toggle. `promptsForTyping` lost its direction parameter,
`gradeTypedAnswer` gained the direction and the native language, and
`TypedAnswerGrade` gained `outcome`; callers apply only `exact`.

**Chosen in the build, not asked — the user's to overrule:**

- Both glosses typed in the other order ("mood, atmosphere") or around the
  other mark are **near**, not a miss. The rule as stated covers one gloss of
  two; calling two right glosses "Not quite" for their order would be the
  grader being wrong on screen.
- A near match reads **"Correct"** with what was typed beside it, unstruck.
  No new string: the placeholder reuses "Type it in {language}" with the
  back's language.
- Which back is exact: the one on screen. A Korean native on a Japanese deck
  is exact on the Korean back and near on the English one, and the reverse for
  an English native.

## The brief definition shows after the reveal, never on the prompt (2026-10-04)

Review showed the gloss and, behind *Show details*, the long definition. The
one-sentence `briefDefinition` every looked-up card carries was not on the
screen at all. It now sits under the answer, in both directions, on web and
mobile.

**Answer side only** — _the user's call._ On the front of a recall-the-meaning
card it is the answer. On a produce-the-word prompt it would help tell two
similar glosses apart, but a pack hint can name the word outright (`conduct`:
"to carry out, as in conduct a survey"), so showing it there needs a
contains-the-word guard. That option was offered and not taken.

**Pack cards are not an exception** — _the user's call._ On a pack card the
field holds the pack's sense hint (`context`), written in English whatever the
deck's native language, and prefixed `idiom — …` or `vulgar — …` where that
applies. It is shown the same way: it is the sense the pack means, which is
what a learner checking an answer wants. Most pack cards have no hint and show
nothing.

## Readings reach mobile review, and no setting comes with them (2026-09-08)

`getReading` renders Kikuyu respelling, Japanese furigana + pitch accent and
Chinese pinyin. Web's review screen called it on both faces; **mobile's called
it nowhere** — mobile used it only on Learn and in `CardDetailModal`. So a
Kikuyu learner reviewing on a phone read bare orthography, which for Kikuyu is
the whole point of the aid, and Japanese and Traditional Chinese lost their
readings on that screen too. A parity bug, not a missing feature.

**No setting shipped with it, and that is the decision.** The ask arrived as
"let users *see* Kikuyu pronunciation during review", which reads as a request
for a toggle — but nothing was gated: the render was simply absent. A toggle
would have been a switch for a feature that did not exist on that screen yet.
A reading is an aid rather than a spoiler, and web has shown them
unconditionally since they existed without anyone asking for a switch. Shipping
the parity with no control is the cheap experiment that finds out; an actual
complaint reopens it. The homes-for-controls question the item was really about
stays in [backlog.md](../backlog.md), unanswered on purpose.

⚠️ **Reveal-gated on both directions, which is web's placement and not the
obvious one.** The pronounce button on this screen rides the study side
wherever it lands — visible immediately on `frontToBack`, at the reveal on
`backToFront` — so the consistent-looking choice would have been to show the
reading early on `frontToBack` too, and it would not have spoiled anything. It
is gated anyway because the alternative puts the badge *above* the divider on
one draw and *below* the answer on the other with no shared moment of
appearance; a learner would find it in a different place depending on the
direction they drew. Web already resolved this the same way by bundling the
reading into a chip row that only exists after the answer.

Styled as the bordered pill Learn and `CardDetailModal` already put a reading
in, so the same string looks the same on all three mobile surfaces. Derived
from `card` rather than `shownCard`: enrichment writes depth and examples,
never `furigana` or `pitchAccent`, so the reading cannot change mid-card — the
same reason the pronounce button reads `card.furigana`.

**The drill screen is not affected and is not a gap.** It works on `PackEntry`,
which carries no `furigana`/`pinyin`/`kikuyu` fields for `getReading` to read,
and web has no drill to be out of parity with.

## The typed card hides its action row while the keyboard is up (2026-08-29)

A multi-line typed prompt was drawn across the input and the buttons under it:
the front of a typed card is the *gloss*, and a gloss is routinely a phrase —
three lines at the card's 32pt display size. Fixed in
`apps/mobile/app/(tabs)/review.tsx` by taking the bottom action row off screen
for exactly that state, with the keyboard's own return key as the submit path:

```jsx
const typedKeyboardUp = typingThisCard && !revealed && keyboardHeight > 0;
```

**The call worth keeping is *fewer things on screen, not tighter ones*.** Both
tightening levers were already spent and both are recorded as dead ends: trimming
padding bought ~36pt, resolved a one-line prompt and left the layout exactly as
rigid — the same bug came back with a longer gloss — and `adjustsFontSizeToFit`
with `minimumFontScale={0.6}` shrank text to illegible on a device, far past the
floor it was given. The typed branch has **no scroll and no shrink by design**:
the `ScrollView` that used to be there is what carried the word off the top when
the field took focus, and `cardWrapSnug` is `flex: 0`. So the row's ~88pt of
fixed height was the only slack left on the screen, and it is the one element
that had somewhere to go.

**Neither control is lost.** Tapping the card puts the keyboard away and the row
comes back — the same tap-to-dismiss gesture the decision below installs, which
is why the two changes are worth reading together. `onSubmitEditing` blurring is
what returns the row for the reveal.

Verified on a device 2026-08-29 against a three-line gloss. Mobile ships by
build, so it is not in a tester's hands until the next one.

**If a longer prompt ever overruns this too**, the shape to reach for is the
prompt in its own bounded, shrinkable area with the field *outside* it, so the
gloss scrolls within its own box and focus cannot scroll the word away. The trap
to design around is that a `ScrollView` with no flex and no height collapses to
zero in a column — the bounding has to be explicit.

## The card's dismiss target is a Pressable only when a keyboard can be up (2026-08-29)

The details panel would not scroll on the mobile review card. Fixed by making
the wrapper's *component type* conditional, in `apps/mobile/app/(tabs)/review.tsx`:

```jsx
const canRaiseKeyboard = (typingThisCard && !revealed) || editing;
const DismissArea = canRaiseKeyboard ? Pressable : View;
```

**What made this safe rather than a trade between scrolling and keyboard
dismissal:** the two branches that can raise a keyboard — the typed field before
the reveal, and the edit form — are *exactly* the two that render no
`ScrollView`; the `ScrollView` only renders in the `else`. The features never
coexist, so tap-to-dismiss keeps full coverage everywhere a keyboard can appear
while the scrolling card loses its ancestor press handler entirely. That
mutual exclusivity is the load-bearing fact — **if a future change puts a text
input in the same branch as the scroll, this fix stops being free** and the
`StyleSheet.absoluteFill` layer from [lessons.md](../lessons.md) is the fallback.

`Pressable` and `View` are module-level references, so the ternary changes
identity only when the branch does — it does not remount the card each render.

**Two corrections to what was written down before.** The recorded symptom was
"works once and then gets stuck"; on the device it was **not scrolling at all,
not even intermittently**, which is the opposite of the intermittent shape
`lessons.md` gives for responder competition. The fix was tried first anyway —
cheap, and unlike `pointerEvents="box-none"` it actually removes the suspect
instead of leaving it in the negotiation — and it worked, so the diagnosis was
right and only the reported *shape* was off. And the backlog's narrowing
question ("within one card, or first card only?") turned out not to be the one
that mattered: `resetCardState()` already clears `showDetails` per card, so the
state-not-resetting branch was dead from the start.

The one thing that was checked from source and did pay: the height chain is
bounded end to end — `root` → `sessionFlex` → `dismissArea` → `cardWrap` →
`cardScroll`, every one `flex: 1` — which ruled out the usual "unbounded
ScrollView has nothing to scroll" cause before any code was written.

## Undo a rating: scheduling is reversed, the streak is not (2026-08-25)

A misclicked rating after a flip had no way out — the manage panel can edit or
archive a card but not reschedule it, so a stray `easy` on a mature card pushed
it weeks out with nothing to be done. Review now carries an undo. Four calls:

**One step, not a stack.** Undo restores the last rating and then clears itself;
rating the next card replaces it. This exists for the misclick you notice
immediately, and walking backwards through a session is a different feature with
a different failure mode. The snapshot is one slot of state (`UndoableRating` on
both platforms), so the stack version is a small change if it is ever wanted.

**The day rollup is reversed; the streak is not.** `negateDelta` walks the
day's counters back — `increment()` takes a negative as happily as a positive.
`advanceStreak` has no inverse: it cannot know whether the rating being undone
was the one that started today. And a review genuinely happened, so correcting
which button it landed on is no reason to put a streak at risk. **The cost is
that `reviewedToday` reads one high per undo for the rest of the day**, which is
the deliberate trade rather than a bug to fix later.

**It works from the completion screen too.** The last card of a session is
exactly where a misclick had no recourse — answering it ends the session. Undo
there reopens the card, flipped, and finishing again returns to the summary.

**Mobile sends an inverse rating rather than un-queueing the original**, which
by then may already have reached Firestore. `collapsePendingReviews` keeps the
last entry per card and direction, so the inverse supersedes the rating whether
it flushed or not, and an undo made underground survives the app being killed
exactly as the rating did.

Two shared helpers came out of it and are worth knowing about.
`trackingFor(card, direction)` is now what *both* rate paths read from — web
read the pre-bidirectional legacy fields here and mobile did not, so the same
untouched legacy card started from a different ease on each platform.
`legacyNextReview` is the deprecated top-level field, derived from both
directions; web used to assign it the rated direction's date.

## Typed responses: a local grader, and the rating row is the override (2026-08-24)

⚠️ **The direction rule here was reversed on 2026-10-07**: meanings are typed
too. See the entry of that date above; everything else in this one stands.

Review can now ask the learner to **produce** the word instead of flipping to
it. Four calls, all made with the user, and the backlog item's four open
questions map onto them one for one.

**Grading is local, and strict.** Fold case, Unicode composition, whitespace and
typographic marks, then compare — spacing-insensitively, because Korean word
spacing varies legitimately between writers. No model call: review happens on a
commute, so a grader that needs a signal stops working exactly where the feature
is used, and it would cost a round trip per card and reintroduce the grading
variance the cloze design deliberately removed. **No "close enough" tier
either** — an edit-distance band needs a threshold per writing system, since one
character of a two-character Korean word is a different word where one character
of `anniversaire` is a slip of the thumb.

**A hit is rated `easy` and gone; only a miss stops to ask** — _the user's
call, 2026-08-25, reversing the first cut below._ The asymmetry is the whole
design: producing the word from memory and spelling it correctly is not a
judgement the learner can improve on, so asking them to rate it is asking a
question with one honest answer. A miss is the opposite — the grader may simply
not know the spelling was also right — so it reveals both strings and keeps the
full rating row. **`sm2.ts` is untouched either way**: `getNextReviewData`
already took all four responses.

**The rating row on a miss is what makes strictness honest.** All four buttons
live, with the expected answer beside what was typed, so a learner whose answer
was right in a way the card could not know corrects it with the tap they were
already making. This is the removed cloze override's argument — *they are not
appealing a judgement, they are reading two strings* — and it costs no extra
control, because the buttons were already there.

**⚠️ What the first cut argued, and why it lost.** It capped a hit at `good` and
made the learner rate every card, reasoning that a cloze was a rung a learner
climbed where a due vocabulary word typed correctly is merely the card working
as designed — so emitting `easy` every time ratchets ease across the whole deck.
**That effect is real and it is unbounded**: `getNextReviewData` applies
`ease + 0.1` at quality 5 with no ceiling, so a reliably-typed card's interval
multiplier climbs without limit. Accepted deliberately — a word typed correctly
on sight is a word whose interval *should* be growing fast. If it ever needs
reining in, the lever is a cap in `sm2.ts`, not a downgrade of the verdict.

**⚠️ Accents are matched strictly, which contradicts how the backlog item was
written.** That item named accents alongside spacing and articles as a case
where exact matching is too harsh. The codebase disagrees and wins:
`STUDY_LANGUAGE_CONFIGS` refuses a Swahili TTS voice for Kikuyu precisely
because `ĩ`/`ũ` are the two vowels that distinguish words, and French `ou`/`où`
and `sur`/`sûr` are different words. Folding them together would teach that the
distinction does not matter — worse than a false miss the learner corrects in
one tap. **Articles are handled, and only the card's own:** `gender` holds
French `le`/`la` and Swedish `en`/`ett` in a field of its own, so `le délai` is
accepted for a card whose study side is the bare `délai`. There is no
per-language article list to keep in step with the registry.

**Readings are not accepted.** Typing `かんじ` for 漢字 answers a different
question than the card asked, and a kana or kanji pack exists to teach the
script. Left to the learner to claim on the rating row rather than granted
silently.

**Typing is a session property, and only `backToFront`.** A toggle on the start
screen beside the direction filter — the same axis, *how* the session asks
rather than what it asks about — and not persisted, for the reason the direction
filter is not: a one-off drill should not quietly become how you review from
then on. Only the produce-the-word direction is typed, so a `both` session is
mixed on screen. Typing the *gloss* is the weak half: a back is allowed up to
two translations where the study side is one word, so the expected answer is
genuinely ambiguous in a direction the target never is.

**Every typed card can still be flipped instead** — _the user's call, added to
the design._ One control under the input reveals the answer exactly as typing-off
would, and grades nothing, because nothing was asserted. That matters beyond
convenience: on a phone, typing Korean or Japanese means switching IME every
card, and a learner without one to hand must not be stuck.

**Where the grader came from.** `foldText` and the spacing-insensitive compare
were the cloze grader's, in `grammar.ts` — the module the Queued list is about to
delete. They moved to `packages/core/src/typedAnswer.ts` and `grammar.ts` now
imports them back, so the deployed `/api/grammar/exercise` route is unaffected
and the rules outlive the deletion. **The typographic folding is measured, not
anticipated:** asked for a French elision cloze the model returned `d'` with a
curly apostrophe, and phone keyboards substitute the same character in the other
direction — so an answer typed on iOS and a card written by the model can
disagree on a character neither party chose.

**⚠️ The mobile typed card took three tries, and the first two were fixed by
reasoning rather than looking.** Worth reading before touching that layout, in
`lessons.md` too. What was actually wrong: **the card wrapped a ScrollView, and
focusing the field made it auto-scroll the word off the top** — the learner was
asked to translate a word they could no longer see. Neither of the first two
attempts touched that. Pinning the input to the bottom block made it worse (it
stole height from an already-collapsing `flex: 1` card); blaming
`KeyboardAvoidingView` was closer but still wrong about which part.

What it is now, before the reveal: **no scroll container** — there is nothing to
scroll, so there is nothing to scroll away — a card sized to its two children
rather than stretched, a flexible spacer under it so the buttons stay at the
bottom and the *spacer* is what the keyboard eats, and **the keyboard's measured
height reserved rather than `KeyboardAvoidingView`'s inferred one**. That last
one matters: KAV derives the overlap from its own frame, and on a screen that
already pads for the floating tab bar it under-lifted by ~90pt, cutting 확인 in
half. `keyboardWillShow` hands over the real number. Tapping the card dismisses
the keyboard, the way Learn's does, and it has to be the card rather than the
spacer because the spacer is nearly nothing when the keyboard is up.

**The typed card's padding is load-bearing, not decoration.** With the keyboard
up the fixed content ran ~22pt over the screen, and since nothing there scrolls
or shrinks the overflow was drawn *over* the card. `cardWrapSnug` and
`cardHeaderSnug` give back ~36pt that was holding nothing.

**⚠️ The remaining slack is ~20pt, and anything added to that screen spends it.**
This is not theoretical — the offline/pending banner did exactly that the first
time it appeared during a typed session, pushing the card down until 확인 was
drawn across its border again. Which is why the running session shows that state
as `sessionSyncSuffix`, a suffix on the progress line that already exists,
rather than the bordered block: the other five render sites keep the block,
because the picker, the start screens and the end screens all have room and are
where someone actually looks. **Before adding any chrome to a running session,
check it with the keyboard up.** The next lever, if one is needed, is dropping
the ⋯ row before the reveal — worth ~32pt.

Web keeps its input in the card and keeps its direction prompt: there is room,
and the prompt is filling an otherwise empty answer area rather than restating
the label above it.

**The mobile card no longer spells out the question** — _the user's call, same
pass._ "이것을 영어로 어떻게 말하나요?" was the third statement of the same
thing: the direction label sits right above the card, and the front text's own
language settles it. Worth knowing that removing it **saved no vertical space**
— the header row it lived in stays for the ⋯ options button, which is taller
than the text was. It went for redundancy, and the scrolling was fixed by the
move above.

**Unverified, and both are device-shaped.** The keyboard-avoidance on the review
session has been watched working; what has not is what a Korean or Japanese IME
does to `autoCorrect={false}` and `autoCapitalize="none"`. In `backlog.md` under
what to watch for.

## Decks, drill and review shape (2026-07-25 → 2026-07-26)

- **Drilling lives on Decks, not in Review.** A deck-scoped Review either respects
  due dates (4 of 71 kana, can't drill) or ignores them (two loops behind one tab
  with no way to tell which you'll get). Drill is a closed set, repeatable, not
  due-gated; Review is what the scheduler says. *Amended by PR #51:* Review
  composes collections rather than filtering a pool, so "which cards" is a choice
  made before starting. The load-bearing half stands — the two loops stay distinct.
- **Drill writes no SM-2 state.** Practice and scheduling stay separate, so
  grinding the kana chart five times can't wreck intervals. If drill ever feels
  like it "doesn't count", the fix is progress shown in the deck, not writes to the
  scheduler.
- **No "All cards" row on Decks.** It's a nav entry pointing at a nav entry, and a
  naming fix isn't worth a fake row. The one thing it would buy — drill my whole
  collection ignoring due dates — is a button on Cards if anyone ever asks.
- **Decks is a nav item on both platforms** (reversing the 2026-07-25 "route, not
  a tab"). The original trigger was pack *coverage*; what actually justified it was
  the **model** changing — a pack became a collection you review, a peer of Cards,
  and a peer doesn't live behind a link on Learn. The empty-for-four-languages
  objection was answered rather than outgrown: a *conditional* nav item reflows the
  bar on every language switch, worse than a quiet empty state that explains what a
  pack is. Nav reads Learn / Review / Cards / **Packs** — "Packs" rather than
  "Decks" so the two entries don't ask to be compared as Anki-style decks.
