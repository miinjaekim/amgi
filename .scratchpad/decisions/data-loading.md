# Decisions: Data loading

Subscriptions, the launch cache, fallbacks, and why there is no local model. Newest first. Indexed from
[status.md](../status.md).

## ID tokens are verified without `firebase-admin/auth` (2026-10-05)

**What.** `verifyRequestUid` no longer calls `getAuth().verifyIdToken()`. It
calls `verifyIdToken` in `apps/web/src/lib/idToken.ts`, which checks the token
with `jose` against Google's published keys: RS256, issued by
`https://securetoken.google.com/<project>`, audience the project ID, not
expired, with a subject. Those are the checks the Admin SDK made. Revocation is
not checked, and was not before. `jose` is now a direct dependency of the web
app; it was already installed, as a dependency of `firebase-admin`.

**Why.** Importing `firebase-admin/auth` breaks every route that shares
`firebaseAdmin.ts` — the mechanism is in [lessons.md](../lessons.md) under
Firestore. It has now done so twice (PR #55, PR #175), and the second time it
was live for a day because the only visible symptom was the word of the day
missing.

**What was not chosen.**
- *Import it lazily, inside `verifyRequestUid`.* That brings the word of the
  day and pronunciation back and leaves user-made packs answering 401 to
  everyone, quietly, wherever the runtime still cannot load it.
- *Change the runtime* — a newer Node, or `--experimental-require-module`. That
  is Vercel project state rather than code, it could not be checked from here,
  and it leaves the app one settings change away from the same outage.

**⚠️ Not confirmed:** that this is what production was doing. Vercel's logs and
its protected preview URLs were out of reach. What is established is that the
production build, run locally with `require(esm)` switched off, returns the
live site's status codes route for route, and returns the right ones after this
change. A real Google-signed token has not been through the new verifier
either; the tests sign with their own key. Making a pack on web while signed in
is the check for both.

## Launch paints from the device, behind a splash that lets go (2026-09-22)

_⚠️ **Written up after the fact, from the shipped code and the backlog item it
replaced** — not by the session that built it (PR #152). It is here because
moving that item to Queued would otherwise have deleted the only prose record
of why launch works this way; where this entry is thinner than the code, the
comments in `UserContext.tsx` and `LaunchSplash.tsx` are the source._

**The ask**: every open *"takes longer than I feel it should"*, and the user
wanted it to feel professional — the logo up while it loads, the way Instagram
does.

**What was actually slow.** `onAuthStateChanged` awaited
`getUserPreferencesFromServer` *before* reading the interface language, study
language, language list and streak the device already held. So every open sat
on skeletons — and on **English labels**, since the interface language was not
known yet — for a full round trip. ⚠️ **And that read was a bare
`getDocFromServer` with no timeout**, where everything else in the app gives up
at `REQUEST_TIMEOUT_MS`, so a weak signal held launch for as long as Firestore
kept retrying.

**The call: cache first, server second.** Paint from AsyncStorage, clear
`authLoading`, reconcile with the server in the background. Every existing rule
— only the server may say "unset", adoption, migration, streak merge — is
unchanged; **only the order moved**.

⚠️ **"Warm" is keyed on the interface language**, and that is the load-bearing
choice. It is the answer first run exists to get: without it the setup modal
decides, and **the modal must not open on a cached guess**. A device without one
waits for the server exactly as before, so first run on a new phone is
untouched.

⚠️ **A reconcile in flight can outlive the account it was for.** An auth
generation counter is bumped on every auth change, so an answer that arrives
after a sign-out is dropped rather than painted — otherwise a slow round trip
could put someone else's preferences on screen.

⚠️ **The accepted cost**: a deck switched in the moment before the reconcile
lands is overwritten by the server's answer. One round trip, capped by the new
timeout, and the switch is written to the server too, so the next snapshot
agrees with it.

**The splash is held from the first line of JS**, at module scope rather than
in a component — by the time anything mounts, iOS may already have taken the
native splash down onto a blank frame. Its colours are **brand, not theme**,
because no theme is known that early, and its geometry is matched to the native
image so the hand-off is invisible. ⚠️ **It is capped**, on the reasoning that
*"a branded pause is only professional while it is short"*: it lets go long
before `REQUEST_TIMEOUT_MS` and leaves the skeletons to cover the rest.

**Two smaller calls rode along**: Review is gated on `authLoading` (it is the
landing tab, and it used to flash "Sign in to review" in English on a cold
open), and `expo-updates` no longer checks on launch, since nothing ships OTA.

**Rejected**: moving to `@react-native-firebase` for a persistent Firestore
cache — a large migration for most of what cache-first already gets.

⚠️ **Not judged yet, and it is the one item here that a build is *required*
for.** The complaint was about a felt delay on TestFlight, so the acceptance
test is a stopwatch on a real build before and after; the splash cannot be seen
in Expo Go at all.

⚠️ **It is also what made PR #153 necessary.** Painting before the server
answers is correct, and it exposed a plausible fallback in Munli that had been
hidden behind `authLoading` — see the entry above.

## A plausible fallback is worse than no fallback (2026-09-22)

**Found merging the Munli stack against the launch work**, and the general
lesson is worth more than the fix.

`normalizeEnrolment` returns the **default practice set** when it is handed no
enrolment. That is right for a new account and wrong for an account whose
snapshot is still in flight — and the two are indistinguishable from inside the
function. An empty progress map behaves the same way: it reads as *everything
due*. So Munli could paint five patterns nobody saved, every box of them owed,
and the picture was **plausible enough that a learner had no way to disbelieve
it**.

⚠️ **On the two surfaces that write, it stopped being cosmetic.**
`setEnrolled` takes the enrolment it is handed, so a save pill on Topics or
Remove on Saved, tapped inside that window, would write *default plus that
change* over the real saved set. Data loss, from a control that looked ready.

⚠️ **The window was always there; the launch work only made it visible.**
`authLoading` used to cover it. The 2026-09-22 cache-first launch clears
`authLoading` before the Firestore snapshot lands — correctly, that is the whole
point of it — so the app now paints straight through. **Neither change was
wrong. The bug was in what the two of them together made observable**, which is
the kind of defect no single PR's review can catch.

**Fixed in two layers, and the order matters.** The providers now return
`enrolment: undefined` while the snapshot is in flight, so a screen that forgets
to check `loading` renders *nothing* rather than something false — that is the
difference between a rule and a discipline. The five Munli surfaces then say
they are waiting. `loading` had been on both providers since PR #143 and was
consumed by nothing.

**The rule to carry forward: a fallback that cannot be told apart from a real
answer is a bug waiting for a slow connection.** `undefined` is a better
default than a reasonable guess wherever a caller might write through it. PR
#153.

## Mobile's card surfaces subscribe too — the gate was opened by a test, not a build (2026-08-22)

Step (2), the same day as step (1). The gate was "step (1) has been on a build
for a release"; what actually opened it was the user reviewing on the laptop and
watching the phone's streak move in Expo Go. **That is weaker evidence than the
gate asked for, and it was taken deliberately** — it settles the question the
gate existed to settle (does `onSnapshot` deliver on React Native, through a
memory-only cache, in this app) and settles nothing about collections. What
follows is what had to be handled *because* the test could not cover it.

**An empty snapshot from the cache is dropped, not delivered.** This is the
listener form of the trap `fetchUserFlashcardsFromServer` was written to dodge:
the cache is memory-only, so before the server answers it holds nothing, and
Firestore reports nothing as an ordinary empty result rather than an error.
Delivered as-is it is indistinguishable from "this account has no cards" — it
would blank the list on every cold start and overwrite the offline snapshot with
nothing. **The streak listener never met this**, because a missing document is
simply ignored there; a collection cannot do that, since empty is a legitimate
answer. So the clean laptop-to-phone test could never have caught it.

**Storing the snapshot is on a slower clock than showing it.** Every rating in a
session comes back as its own snapshot, so writing the offline copy on each
would re-serialise the whole collection once per card, where the fetch-per-focus
it replaced wrote once a visit. It is debounced 5s and flushed when the language
or account changes. Coalescing is safe here in a way it would not be for a
rating: this is a *cache*, unsent ratings live in their own queue and are
replayed over whatever is stored, so a dropped write costs a slightly older
starting point on the next cold offline launch and nothing else. The debounce
lives in the effect, not the module — module-scope state does not survive Fast
Refresh, which is the bug that killed this screen's first freshness attempt.

**Review needed no mid-session guard, and that is a property of the screen.**
The focus reload had to be suppressed mid-session because it reset the pick and
would rebuild the queue under someone eight cards into thirty. A listener does
not, because **`cards` is not what a session runs on**: the queue is built from
it on the Start tap and owns its copy from then on. A snapshot landing mid-review
moves the picker's due counts and leaves the cards in front of the learner alone.
`sessionRunningRef` and `reloadToken` are gone with the reload they protected.

**The one thing a listener does not give back is a deadline.** Offline with a
cold cache it says nothing at all — no data, no error, and the empty cached
snapshot is dropped by the guard above — so the screen would spin forever on a
language this device has never loaded. `withTimeout`'s 10s is now applied by the
load effect itself. This is the newest machinery in the change and the first
thing to check on a device.

Also: `sessionRatings` is cleared per language change and *not* per snapshot.
Every snapshot has the unsent queue replayed over it, so keeping them loses
nothing, and `applyPendingReviews` assigns rather than increments — but clearing
them on a snapshot that raced a rating would drag an answered card back into the
counts. The `onChanged`/`loadCards` calls that told screens to go and look again
are gone, as are `fetchAllUserFlashcards` and `fetchUserFlashcards`, which have
no callers left. `fetchUserFlashcardsFromServer` stays: warming a language nobody
is looking at has no listener to ride on.

**Progress is deliberately not subscribed**, on either platform. It is a
historical rollup whose only moving row is today's, it re-reads on focus, and the
review tab is one tap away. Subscribing it would add a listener for a number that
cannot change while you are looking at it.

## Mobile subscribes for display only, and a ref is what serialises its writes (2026-08-22)

Step (1) of the mobile half, done the day web shipped. The scope was set in
advance — subscribe to `users/{uid}` for **display**, leave the offline write
path alone — and it held. What is worth keeping is *how* a listener is prevented
from quietly becoming a second writer, since the obvious wiring does become one.

**Merge, never assign.** The snapshot handler runs `mergeStreakState` against
what the device holds, which is the same reconcile the launch path already ran.
Assigning the server's copy would discard a session reviewed underground the
instant a snapshot landed. This is the whole reason the listener is safe next to
an offline-first write path rather than in competition with it.

**The AsyncStorage cache is refreshed only when nothing is unsent.** While
`dirty`, that copy belongs to `recordReview` and its retry, and a listener
writing over it would race `markStreakSynced`. Clean, the write is the one the
next launch would have done anyway — worth doing early because `refreshReminders`
plans from the cached `lastReviewDate`, so a laptop review now also stops the
phone nagging about work already done. That second-order effect was the argument
for writing the cache at all; display alone would have left the badge and the
notification disagreeing.

**Streak fields only, though the listener carries the whole document.** The
languages are in there too, and `nativeLanguage` going momentarily null is
exactly what the first-run modal watches for — a snapshot racing the setup flow
would pop it over someone mid-answer. Languages are read at launch and changed
on one device at a time; the streak is the field that genuinely moves elsewhere.

**The streak became one value behind a ref, and that fixed a real bug on the
way.** Four `useState`s could not be merged atomically, and the merge would have
had to read a render-old closure. Moving to one `StreakState` plus a ref means
`recordReview` computes from the ref, not from React state — and consecutive
ratings now compose instead of both starting from the value the last render
happened to see, where the second write silently replaced the first. **That is
web's local-counter bug in its single-device form**, and it was sitting in the
mobile write path unnoticed while the item said mobile did not have that problem.
The item was right that mobile's *cross-device* story was already reconciled; it
was wrong that nothing local could disagree. A transaction still is not the
answer here — it fails offline — and a ref costs nothing.

`recordReview` now calls core's `advanceStreak`, the same pure rule web runs
inside its transaction, rather than its own copy of the arithmetic. Verified
equivalent field by field before swapping, including the new-day restart of
`reviewedToday`; `reviewedToday` is now *derived* for display rather than stored
as zero, so the value the streak is computed from stays honest.

One thing deliberately not done: the in-memory copy stays `dirty` for the rest
of a session once this device records a review — only the cached copy is
cleared, by `markStreakSynced`, and only when it still says what was sent. So
later snapshots merge by date and then by highest rather than taking the server
outright. Left as it is because highest never loses a review and a genuinely
newer day still wins outright; clearing it in state would mean duplicating
`markStreakSynced`'s "only if it still says what was sent" guard.

Unverified on a device: this typechecks, bundles and rides on core logic with
252 passing tests, but **the listener itself has not been watched on a phone**.
Mobile has no test harness, so the wiring is argued rather than exercised — and
that is precisely why step (2) is gated on this having been in a build for a
release. See [backlog.md](../backlog.md).

## Web subscribes; the archived bug was never real (2026-08-22)

Four calls out of the data-freshness item, two of which **retract things this
scratchpad asserted**.

**Subscribe, not invalidate.** The item posed it as an open question —
TanStack Query/SWR against `onSnapshot` — and framed listeners as the risky
option whose "read billing should be measured rather than assumed". That has it
backwards, and the measurement is the wrong way round. Firestore bills a
listener for the documents in its *first* snapshot and thereafter only for
documents that actually change, so an idle listener costs nothing, where the
code it replaced re-read the whole collection on every mount of three separate
list surfaces. **A listener is cheaper than what was already there.** The
deciding argument is not cost though: web already initialises
`persistentLocalCache` with `persistentMultipleTabManager` and then reads past
it with one-shot `getDocs`. A query cache on top would have been a *third*
cache — Query → Firestore local → server — each with its own idea of the truth,
which is the disease rather than the cure. Firestore is a sync engine; the
invalidation problem it would have managed is one it does not have.

**The `archived` "query bug" does not exist.** The item called it "one genuine
query bug" and prescribed a backfill. It was reasoned from code and never
checked against data. Checked 2026-08-22 with a read-only audit over all seven
collections: **1,316 cards, zero missing the field.** Nor can one be created —
`buildFlashcardDoc` is the single card constructor on each platform and both
hardcode `archived: false`, and every write path (`addDoc` for saves,
`batch.set` for pack imports) goes through it. The reasoning about `!=` was
correct in the abstract and simply had no instances. **No backfill was run and
none is needed.** Left as it is rather than "fixed defensively", because a
migration over 1,316 documents to repair nothing is a real risk taken against
an imagined one.

**Deck counts show every card; archived filters belong to review and Cards.**
This was posed as "which number is true when two surfaces legitimately count
differently". Decided: browsing a deck is asking how big it is, so decks counts
everything; review and Cards are working surfaces where archiving means
something. **The code already did exactly this** — no change was made, and the
backlog's framing of it as a discrepancy was wrong.

**The streak needed a transaction, not just a listener.** Worth separating,
because subscribing looked sufficient and is not. A listener fixes *displaying*
a stale value; it does nothing about two writers computing from the same
starting value. Two tabs both loading `reviewedToday: 0` and reviewing 10 and 1
times stored `1` — and this needs no second device, only the multi-tab setup
web already enables. So `recordReview` keeps no local copy at all now:
`recordReviewStreak` re-reads inside a transaction, and the subscription brings
the answer back. This is the pattern `recordProgress` has used since the
dashboard shipped, sitting directly above the streak write that did not.

**Mobile stays as it is,** and its reasons are in [backlog.md](../backlog.md).
The short version: mobile's streak is already offline-first and reconciled
rather than divergent, and the transaction that fixes web *fails offline*,
which is the bug mobile's cache exists to prevent. Same symptom name, opposite
correct answer.

## No local model yet — and the first step isn't a model (2026-08-08)

The spike ran and produced what it was supposed to: a written answer, not a
feature. **`docs/local-model.md` is that answer** and is the thing to read
before this reopens. The backlog item is closed rather than deferred; the two
pieces worth doing were scoped out of it into Medium.

Why closed:

- **The hot path is one route.** Only `/api/explain`'s core arm is worth
  replacing, and 293 pack entries already bypass it — now many more, with #81.
  Depth, examples and writing review carry the actual differentiation and are
  exactly what small models fail.
- **The size band that fits a 4 GB phone is the band that fails the quality
  bar.** RAM binds before disk (~1.5 GB of weights on beta devices). Ambiguity
  judgment, Korean register and Traditional Chinese script fidelity all sit
  below that line — and a 简体字 leak is invisible to anyone who can't read the
  difference, which is the worst kind of failure to ship.
- **Latency was never the win people assume.** ~60–100 tokens of JSON on-device
  is 2–5 s, the same band as a Flash round trip. A *cache hit* is two orders of
  magnitude faster. Cost isn't a problem at a single-digit beta either.
- **Expo Go can't load a native inference module**, so the whole app would run
  without the dev loop the no-OTA shipping model is built around — and web can't
  follow at all, which forks the mobile↔web parity reached in July.

**One correction worth keeping**, because it was assumed the other way for
months: **weights are data, not code.** `expo-file-system` is already a
dependency, so model files download at runtime like any other asset. Only the
*runtime* is a native module — one build gets it in and models are swappable
after. The no-OTA constraint is real but narrower than the backlog claimed.

**Reopen condition, and it is specific: an eval harness first.** `npm test` is
unit tests; nothing measures model output, so no candidate can be judged today
and any comparison would be vibes. Reopen when the term cache is live and has a
measured hit rate, *and* there is an eval set to score a candidate on — at which
point the question is answerable instead of speculative. Apple Foundation Models
is the one path that dodges the size problem entirely (zero download, guided
generation would kill the JSON-parsing fragility), and is worth re-checking when
the floor is no longer iOS 26 / iPhone 15 Pro.
