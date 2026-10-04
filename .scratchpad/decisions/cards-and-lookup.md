# Decisions: Cards and lookup

Card fields, glosses, part of speech, spellcheck, saving, My Cards, export. Newest first. Indexed from
[status.md](../status.md).

## French verbs are tagged with their group, and only their group (2026-09-23)

**The backlog item asked for four facts, and one shipped.** They were the
conjugation group, pronominal, the auxiliary (être/avoir) and transitivity. The
user cut it to the group: *"i don't think i actually know what the other pieces
of information are, so i think we should hold off on adding them."* A tag the
reader can't interpret is noise on the card, however correct it is. **Held
off, not rejected**, so if they come back, here is what was already worked out:
pronominal can be derived from a `se`/`s'` prefix with no model call. Auxiliary
and transitivity depend on the *sense* (`sortir` takes être going out and
avoir taking something out), so they would have to be written per card, not
looked up per verb. And four badges next to the part of speech was already
judged too many for a card front.

**How the group is decided.** The model gives the four classes a textbook
uses (`er` / `ir` / `re` / irregular), and `normalizeVerbGroup` settles the
rest: Munli's own verbs (its three irregulars and every group's vehicles) take
Munli's answer, `-cer`/`-ger` are split out by spelling, and a regular group
that contradicts the ending is dropped. So a card and the Verbs surface
cannot disagree about a verb they both know.

**It lives inside the part-of-speech badge** ("-ir verb" in place of "Verb"),
not as a badge of its own. The group already says the word is a verb, so one
badge carries both facts, and every place that shows part of speech shows the
group with no per-site change.

## My Cards opens on "All", reversing #80 (2026-09-23)

**The card list opens on every card, not only the ones you made** — the user's
call. `DEFAULT_DECK_FILTER` in `collections.ts` went from `'mine'` to `'all'`;
web and mobile both read it, and a selection pointing at a deck that no longer
exists falls back to the same constant, so nothing else moved.

**What it reverses**, kept so the next reader does not flip it back: #80
(2026-08-04) chose `'mine'` because the page is called My Cards, so it should
open showing what it is named, and a mixed list was a view nobody had asked for.
The reply is that an enrolled pack card *is* one of your cards — you chose to
study it — and opening on a narrowed list hid most of an account's library
behind a chip.

⚠️ **Grid decks are still left out of "All"** (`isGridDeck`), so kana does not
swamp the opening view. The kanji pack is a `list`, though, so any account that
enrolled it now sees 240 kanji on first open. That is the Medium item "Watch
the kanji deck on the 'All' chip", which this makes more pressing.

## The gloss ceiling is one rule, and the semicolon knows about disambiguation (2026-09-08)

**Closes "Should `/api/explain` allow two glosses?"** — the only item that was
in Bigger bets, answered by the user directly rather than derived: *"so this
semicolon thing is now only applied for the word of the day? can we have it
also for the explain."* Yes. The entry below had left the two routes differing
on purpose; that difference lasted about an hour.

**Seventeen hand-written copies became one import.** `/api/explain` stated the
rule sixteen times as a bullet plus once as a fragment on the native back, in
four cosmetic wordings, covering eighteen templates (nine languages ×
context/no-context; Kikuyu and Swahili share one rules constant across both of
theirs). It now reads `GLOSS_RULE` from `apps/web/src/lib/glossRule.ts`, and so
does `/api/word-of-the-day`. This is `characterBreakdownInstruction`'s argument
applied to the thing that had already drifted: the day's word stated **no rule
at all**, which is how it shipped "deadline, time limit, period".

**The ceiling had to be restated as a total.** "Never a third" has a loophole —
the model reads it as *never a third within one sense* and nests the marks.
Measured on the lookup: 시원하다 came back "cool, refreshing; relieved, satisfied"
and 微妙 "subtle, delicate; questionable, iffy", four glosses each, both obeying
the rule as written. The sentence now names the whole field and forbids using
both marks at once.

**The semicolon is branch-aware, and that came from the user asking whether the
ambiguity checker was relevant.** It is, decisively. A no-context lookup can
answer `ambiguous: true` with `meanings`; the chip the learner taps comes back
as the `context` of a second lookup (`page.tsx:200` → `handleDisambiguate`). So
the same mark means different things on the two sides:

- **Context template** — the sense is already pinned, so a semicolon does not
  say the word has two senses, it says the prompt ignored the one it was given.
  Comma only. Measured 0 semicolons in 8 pinned re-lookups.
- **No-context template** — a semicolon competes with `meanings`. Two senses far
  enough apart to need one are two chips, not one back. What is left for it is
  the band the ambiguity bar deliberately excludes ("closely related variants of
  the same concept"): 迷う's "get lost" and "be undecided", one idea applied to a
  place and to a decision.

**The disambiguation flow absorbed the offenders, at no extra friction.** Every
word that had produced a four-gloss back — 微妙, 시원하다, 답답하다, 거리, 迷う —
routes to chips instead. And the **chip rate did not move**: 13/30 under the old
strict-single rule, 13/30 under the new one, so the clause redirects which words
disambiguate without sending more of them there. That was the risk worth
measuring, since a chip is an extra tap before a card.

**Known leak, not fixed:** 1 in 28 still breaks the ceiling — Swedish `orka` as
"to have the energy/strength; to cope", which manages a slash *and* a semicolon.
It is left as measured rather than chased with a fourth wording pass.

## The word of the day gets a gloss ceiling of its own (2026-09-08)

**This reverses the cancellation three entries down, on the user's call the same
day.** That entry read the divergence as a question the core lookup had to
answer first — one gloss or two — and parked it behind "Should `/api/explain`
allow two glosses?". The user answered it directly for this surface: *"i don't
like how i find it oftentimes produces translations with many synonyms. i would
rather it translates with one or two only when it's necessary like how we have
our learn search work."* A ceiling nobody had to derive is not a bigger bet, so
the route stopped waiting on one.

**The ceiling is one gloss, a second only when one would mislead** — the card
back's rule, not `/api/explain`'s strict single. A word of the day *is* a card
back, since saving it is what the card is made from, and forcing one gloss onto
a term no single word covers makes the card wrong rather than clean. The prompt
also names the failure it is correcting, because the model's default reading of
"the best translation" was a list: `"deadline"` is a gloss, `"deadline, time
limit, period"` is a list.

**The rule counts glosses; it does not legislate punctuation** — corrected the
same day, again on the user's call: *"i think using a semicolon can still be
alright though (?) i can imagine scenarios where it's necessary."* The first
pass banned the semicolon outright, copying `/api/explain`'s "never list
synonyms with semicolons or slashes", and that was the wrong lever twice. The
reported failure is a **count**, and a ban on the mark is only a proxy for it —
one the model satisfies while still answering "to return, to do again, to
recover". And it forbade the mark carrying the most information: a comma joins
near-synonyms inside one sense, a semicolon separates two senses. 迷う is "to get
lost; to be undecided", and comma-joining those reads as one idea — the exact
misleading back the second gloss exists to prevent. So the rule now sets the
count (never a third) and lets the punctuation *say which kind of pair it is*.

**The slash stayed banned, and that clause is not the same kind of rule.**
Dropping the punctuation sentence dropped the slash with it, and one word in 24
came back as `orka` "to have the energy/strength". A slash is not a sense
distinction, it is a comma the model declined to commit to, so it is named
explicitly. With it back, `orka` returns as "to have the energy, strength".

**Measured twice, 24 words across six languages each.** Before the punctuation
correction and after: zero three-item lists both times, so relaxing the
semicolon did not reopen the failure. What changed is that the semicolons which
appear are genuine sense splits — 거리 "street; distance", 驕傲 "proud; arrogant",
마감 "deadline; closing" — while near-synonyms take the comma (ambiance
"atmosphere, mood"). **A two-sense back is still a weaker card than a one-sense
back**, since it asks two questions at once; it is accepted here because the
alternative is a back that silently hides a meaning, and `briefDefinition` sits
directly beneath it to disambiguate.

**`/api/explain` did not move, and the Bigger bets item stays open.** The user
named Learn's lookup as the thing that already behaves, so changing it would
have been changing the one surface that wasn't reported. The two rules now
differ on purpose — strict single on the lookup, one-or-two on the day's word —
and that difference is the open question, not a drift to reconcile.

**Nothing repairs a document already written.** The word for a (date, language
pair) is generated once and read back by everyone after, so every day already
stored keeps the gloss it was given; the fix reaches tomorrow's word, and
today's only if its document is deleted. Same shape as the `pitchAccent`
decision above — this route has never repaired a stored document on read, and
the CDN TTL was already shortened so a deletion takes effect the same day.

## The save button is one live control, and web moved too (2026-09-08)

Mobile's signed-out save button was painted `saveBtnDisabled` while its
`onPress` ran `handleSignIn` — reported as "looks like it isn't clickable",
and it was clickable the whole time. Fixed by **deleting `saveBtnDisabled`**
rather than by dimming it less: signed out, this is the primary action on the
screen, because it is how an account gets created. The style had no other user,
so the question was whether it should exist, not what shade it should be.

**Web changed too, and it is the half of this that wasn't in the report.** The
backlog described web as a filled primary button plus a separate underlined
sign-in link, and treated that as the better shape to copy. Web was actually
running `disabled={!user}` on the save button, so signed out it was *genuinely*
inert and the small underlined link was the only live control. That is honest —
it never painted one control two ways — but it makes the primary action the
least prominent thing in the group and leaves a dead button sitting on top of
it. Copying it onto mobile would have converged the platforms on the weaker
shape.

So both platforms now render **one control that is always live**, with the
label carrying the state: "Save as flashcard" signed in, "Sign in to save
flashcards." signed out. Web's `disabled={!user}`, its `disabled:` utilities,
and its separate link are gone; the click handler returns early into
`handleSignIn` when there is no user.

⚠️ **The disabled paint was unreadable, not merely dim.** `saveBtnText` is
`C.bg` on `C.border`, which is `#173F35` on `#2D6355` (~1.6:1) on forest and
`#2C2E34` on `#414550` (~1.4:1) on Sonokai — both far under any threshold, so
even a genuinely-disabled button could not have kept that pairing. Deleting the
style resolved the contrast question rather than answering it; if a disabled
save state is ever needed, it needs a new colour pair, not this one.

**The two platforms still differ in fill, and that is pre-existing.** Mobile
fills with `C.highlight`; web fills with `--color-muted` and goes to highlight
on hover. This change aligned the *shape* — one control, one meaning, label
switches — and deliberately did not repaint web's button, which would have
changed the signed-in state nobody complained about. Web's generate button on
`page.tsx` keeps its `disabled:` utilities: it really does disable while a
lookup is in flight.

## Part of speech is stored as a code and rendered in the reader's language (2026-08-11)

**This reverses the backlog item's own decision**, which had the badge reading
English on every card — `noun`, `verb` — reasoning that `formality` already
renders `Standard` in English beside it, so an English part of speech needed no
i18n keys and no closed vocabulary to coerce the model onto. The user asked for
the native language instead.

The reversal was cheap because the alternative it rejected was the wrong one.
"Localized" did not mean *generating* a label per language, which is what the
original call was pricing — it meant storing a **code** and looking the label up
at render. So the closed vocabulary the item wanted to avoid turned out to be
the thing that made this easy: 15 codes in `PART_OF_SPEECH_CODES`, one
`partOfSpeechLabel(nativeLanguage, card)`, and switching native language
re-labels every existing card with no migration — the back-slot problem met
again and solved outright rather than duplicated.

What the item got right and is unchanged: the field sits beside `formality` and
`gender` on `TermCore`, the work is mostly the twelve prompt templates, and
scope is new lookups only — no backfill of old or pack cards. Two corrections to
its touch-point list: `ReviewDetailsPanel` deliberately gets **no** badge (the
review card above it now shows one on the same screen), and the word of the day
also carries the field, which the item didn't mention.

The shape, the language-generic code list, why the Japanese i/na split is out,
and the one-day lag on the word of the day are all in
[data-model.md](../data-model.md).

## The spellcheck correction rides the lookup, and is written to refuse (2026-08-10)

The backlog item left one question open: where the correction comes from.
**It rides `/api/explain`**, as a `corrected` field on the no-context prompts —
one round trip, and the model that already knows this language pair does the
judging. A separate check would have been a second call *before* the first, and
a second prompt to keep in step with twelve existing ones. This is the
reuse-the-endpoint rule applied to a route that already had the context.

Three things fell out of that choice and are worth keeping:

- **The prompts echo back the term they were given** (`"term": "${term}"` is
  interpolated into all twelve), so a corrected answer arrives describing one
  word and labelled with another. `applySpellingCorrection` moves the corrected
  spelling onto `term` and strips `corrected` — which is a fact about the
  lookup, not the term, and would otherwise be spread onto a saved card. Both
  clients call it; neither may skip it.
- **The override is a request, not a filter.** "Search instead for what you
  typed" sends `exact: true`, which drops the rule from the prompt entirely.
  Asked again without it, the model explains what was typed. Filtering the
  answer client-side would have left the model still deciding.
- **Only the no-context prompts carry the rule.** A context lookup is a
  *re*-lookup of a term this route already returned — disambiguation, or "not
  what you meant?" — so the spelling question was settled a call ago. Both Learn
  screens carry the correction across those calls themselves, or the banner
  would vanish on disambiguating and take the way back with it.

The rule is written to **refuse**, because a learner typing a word they don't
know well is exactly who a correction overrules wrongly: rare, archaic,
dialectal, slang, proper-noun and validly inflected spellings are all named as
*not* misspellings, and so is any case where two corrections are equally likely.

⚠️ **It names slips per writing system, not per letter.** The first cut said
"transposed, doubled, dropped or wrong letter" and silently missed the commonest
Korean error: 마지하다 for 맞이하다 — the word spelled the way it *sounds* once
받침 and 연음 apply, with no letter out of place. The model answered "to meet"
with no correction offered, which is the exact failure the item existed to fix.
Anything added here later should be probed against a Hangul phonetic misspelling
before it is believed. The refusal set that must stay clean: `lagom`,
`dépaysement`, `積ん読`, `눈치`, `撒嬌`, `rizz`, `Gyeongju`, `serendipity`,
`맞이했습니다`, `먹었어요`, `하염없다`, `食べられなかった`, `s'agissait`.

Bulk import passes `exact` too. It has nowhere to show a correction and saves
what comes back, so a silent one would be a card the learner never agreed to.

## Export stays as it is — own cards only (2026-08-04)

Cancelled for the plainest reason: **nobody has asked.** It was noticed in PR #51
and written down, never requested. That a CSV/Anki dump omits pack cards is
consistent with what `/cards` means, and neither of the sketched fixes (an export
on the deck page, an "include pack cards" toggle) has a user behind it.

Consequence to know about, since it lands without anyone choosing it: **export
follows the visible filter**, so an export taken on the default view now includes
pack cards. The old item kept the two apart precisely so that wouldn't happen
silently — that caution is now spent deliberately rather than by accident. If the
wider dump is ever wrong, the axis is already there to narrow it. _Shipped in #80
(08-04), which also dropped the Anki export's own archived skip: with the filter
in charge, a second one would hand you an empty file from the Archived tab._
