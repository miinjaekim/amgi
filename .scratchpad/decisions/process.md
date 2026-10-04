# Decisions: Process

How the backlog and these notes are run. Newest first. Indexed from
[status.md](../status.md).

## Three Munli follow-ups leave High; the backlog is the user's list (2026-09-22)

**Removed from High on the user's call, with the reason that they were never
asked for**: *Writing findings you can return to*, *Route a writing finding into
a practice tool*, and *A second tense set, and whether tense choice belongs in
settings*. All three were written into the backlog as follow-ups that building
Munli turned up, not as work anybody requested. *Irregular French verbs* stays,
because it is the one piece of that set the user did ask for.

**The rule this sets is about where backlog items come from.** The header of
[backlog.md](../backlog.md) already says priority mirrors the user's Google Tasks
list — so a thing the model notices while building is a **note**, not an open
High item. Writing it up as one quietly reverses who sets the agenda, and High
in particular reads as a commitment: "all of High is Munli" was true of the file
and never true of anyone's intent.

**What was in them, so the removal loses nothing.** Writing findings: store
`FindingKind` counts or per-review history, needing a Firestore collection and a
security rule — console state, which is why it was never a finishing touch on
PR #136. Routing a finding into a tool: a `grammar` finding could open a verb's
conjugation table, blocked on classification being reliable enough that a wrong
route is rare. A second tense set: passé composé is auxiliary + participle, so
it is the first tense needing a different *shape* than the ending tables.
**None is a decision against doing them** — they are unasked-for, not rejected,
and any of them can be raised by the user if the app makes a case for it.

Play took the vacated top of High the same day, which is the other half of the
same call. It has since moved to Parked — see the item in
[backlog.md](../backlog.md), and the hold entry in [releases.md](releases.md).

## Seven backlog items close, and one of them closes a reopen path (2026-09-08)

A cleanup pass on the user's call rather than a build pass. Six items were
cancelled and one was finished; what follows is the part that would otherwise be
lost, since none of these leaves a commit behind.

**A speaker has read the Kikuyu Basics list, and it stands as written.** The
first native check on pack *content* at volume, and the item that asked for it
is closed rather than cancelled. It settles the two questions the draft was
holding open — the `guka`/`wagui` conflict, and whether kinship is inherently
possessed — as written, and it covers the verb section, which was where a check
was worth the most: seven of ten were Dahl's Law applied to sourced stems rather
than attested infinitives. **The per-entry tiers stay** (16 corroborated twice,
36 on one source, 7 derived); they are now the record of where each entry came
from rather than the only assurance behind it.

⚠️ **This does not clear the respelling table.** The known-unchecked list in
[lessons.md](../lessons.md) — `th` [ð] read as *thin*, `g` [ɣ] and `b` [β]
respelled as stops, doubled vowels split into separate syllables, unmarked
stress, the `ĩ`/`e` and `ũ`/`o` merges — is a claim about the *table*, and a
speaker reading 59 entries checks only the rows those entries exercise. The
2026-08-31 cancellation of the respelling item stands for the rest.
Three documents said the check was outstanding and all three are corrected: the
draft header, the pointer in [README.md](../README.md), and — the one that mattered
— **`docs/testflight-beta-info.md`, where it was tester-facing copy in both
locales** saying the Kikuyu meanings may be wrong.

**The word learning surface is cancelled: review is the first encounter.** The
user's call and their reason — a word can be learned while reviewing it. The
item's premise is unchanged and was never a bug: a new card is due in *both*
directions at once (`isDue` returns both when neither is tracked, `sm2.ts:23`),
so saved goes straight to graded. That is the loop working rather than a gap to
fill, and the cheap thing this avoids is exactly what the item warned about —
a presentation step that starts writing scheduling becomes an `sm2.ts` change.

**`pitchAccent` is not backfilled.** The item was written as "or decide not to"
and this is that decision. The existing `cards_japanese` deck keeps showing bare
furigana, and **it does not self-heal** — nothing re-runs the lookup on a saved
card. Accepted because the fallback is silent and correct, the deck is small,
and the alternative is a one-off script writing to production data to improve a
display detail. The lookup being a local table made this cheap in *cost*; it
never made it cheap in *risk*, which is the half that decided it.

**Word of the day's synonym lists: cancelled, and the gloss ceiling moves up a
level.** The divergence is real and stays true —
`word-of-the-day/route.ts:138` asks for "the best English translation" with no
anti-synonym rule, so it produces backs `/api/explain` explicitly forbids
("Never list synonyms with semicolons or slashes"): `gũcoka` as "to return; to
do again; to recover", `délai` as "deadline, time limit, period". Cancelled
because fixing it means picking a ceiling — one gloss or the two a card back
already allows — and that question belongs to the core lookup, not to one route.
It now lives entirely in **Bigger bets** as "Should `/api/explain` allow two
glosses?"; when that moves, this route is a single prompt line behind it.

**The pack roadmap closes; packs get scoped one at a time.** TOEFL, and the
Swedish / French / Traditional Chinese gaps, stop being tracked as a list to
work down. **The MOS pack is unaffected** and is now the only pack tracked at
all. Nothing about the standard changed, and none of the principles the item
carried are lost with it: audience-is-not-beginners and domains-not-starters
are in [vision.md](../vision.md), with the kana exception amended there
2026-07-24; sourcing, tiers, citations and render-it-before-you-believe-it are
in `docs/packs/README.md`. What the item actually held beyond those was a
queue, and a queue nobody has asked to work down is not a plan.

**The shared term cache is cancelled — and it takes the local-model reopen
condition with it.** This is the consequence worth writing down. The
2026-08-08 decision closed on-device inference with a *specific* reopen
condition: "when the term cache is live and has a measured hit rate, *and*
there is an eval set to score a candidate on". The first half is now
unreachable, so **on-device is closed rather than waiting** — reopening it
means re-arguing the cache first, from `docs/local-model.md` §8, which remains
accurate as analysis and is no longer a plan.

**Precompute depth and examples falls with it**, and always would have: the
item said it was best done *after* the cache "which is where the results would
live". ~600 model calls with no store behind them is a one-off spend that
expires when the deck changes.

**What the file looked like after this pass.** High held one item (per-context
pronunciation speed); Medium held seven; the rest was Bigger bets, Parked,
Housekeeping and one clarification. Both sections have moved on since — High
was refilled on 2026-09-12 and that item went to Medium — so read
[backlog.md](../backlog.md) for the shape rather than this sentence. Two long meta-notes were compressed rather than kept —
why build-checking is not tracked, and what left the High section — since both
were already recorded here in full.

## Checking a build is not tracked work (2026-09-04)

The ranked list of what a release has never been exercised on — eight items on
1.5.0, some of them carried since 1.3.0 — is **off [backlog.md](../backlog.md)**.
It had become the oldest open work in the project by outliving four releases,
which is the tell: nothing on it was ever going to be worked through as a
sitting.

**Why.** Every item on it is reached by using the app — playing a clip at Slow,
reviewing on a phone, typing an answer, opening the packs list. A user of the
app finds them; a list of them only accumulates. Two releases' worth of asking
testers to go and check (1.3.0 and 1.4.0's What to Test) returned nothing
either, and 1.5.0's copy deliberately stopped asking. Keeping a queue nobody
works and nobody reports against costs the file's credibility: a backlog whose
oldest section never moves reads as a backlog nobody trusts.

**What was kept, and where.** The facts outlive the tracking, so none of them
were deleted:
- **What has never run on a binary** — pronunciation audio, CSV/Anki export,
  sharing, offline review across a force-kill, the review reminder, account
  deletion against production — stays in the ⚠️ under Builds above, which is now
  the single home for it. Android is still separately unexercised beyond sign-in.
- **The Slow speed's fallback** (server-side rates behind an unchanged UI) is in
  its own Decisions entry, 2026-09-01, where the ear test was deferred on
  purpose. That was the only item with a decision hanging on it and it needs no
  backlog line to survive.
- **The Kikuyu speaker check** stayed *as work*, moved to Medium in the backlog.
  It is the one thing on the old list that using the app cannot surface: no
  amount of review tells you whether a sourced Kikuyu stem is an attested
  infinitive.
- **Deleting `writing.ts`/`grammar.ts`** was never a check — it moved to
  Housekeeping, where the rest of the dead-code cleanup already sits.

The backlog section that held all this is now **Cutting a build**: the pre-flight
order, the What to Test rule, and the `--non-interactive` warning — the things
you need at the moment you cut one.
