# Decisions: Pronunciation

Audio, playback speed, the pronunciation aid, pitch accent. Newest first. Indexed from
[status.md](../status.md).

## Jyutping: the model answers and a dictionary overrules it (2026-10-04)

Cantonese needed a reading, the user chose **Jyutping with tone numbers**, and
the open question was the one pitch accent raised: can the model fill it, or
does it ship from a dictionary on the route.

**Both, with the dictionary having the last word.** Measured on 144 terms, three
runs each at `/api/explain`'s temperature and in its prompt shape:

| | right on all three runs |
|---|---|
| Gemini alone, against rime-cantonese ∪ CC-Canto | **121 / 143** |
| …on words built from multi-reading characters | **22 / 30** |
| Gemini alone, against CC-Canto only | 116 / 140 |
| the same answers after the lookup, against CC-Canto only | **135 / 140** |

That is a different result from pitch accent's 6/27 and it earns a different
design. There the model is not asked at all. Here it is asked, because it is
right most of the time and it knows something the table does not: **which sense
the learner meant**. 行 is haang4, hang4 or hong4, and only the lookup that
produced the card knows which. So `lookupJyutping(term, modelReading)` takes the
table's reading when there is one, keeps the model's **only if it is among the
several the table lists**, and falls through to the model when the table has no
entry (3 of the 144, and any phrase).

The misses are why it cannot be left alone: 長大 as `coeng4`, 傳記 as `cyun4`,
重量 as `zung6`, Yale's `yu` for `jyu`. **7 of the 22 were the same wrong answer
on every run**, so the earlier warning holds here too: agreement between runs is
not evidence.

**The dictionary is rime-cantonese, on the user's call**: CC BY 4.0, 128,818
surfaces, 2.9 MB trimmed, maintained (2026.08.10). The licence and the size were
theirs to accept. The credit renders with the Cantonese pronunciation note, as
kanjium's does with the Japanese one. CC-Canto was the independent reference
rather than the source (8.8 MB, last released 2017); words.hk is non-commercial.

The full breakdown, the alternatives and the rebuild command are in
`apps/web/src/data/README.md`.

## Pronunciation speed splits by content, not by surface (2026-09-23)

**Two speeds, one for words and one for sentences**, the user's pick of the
two axes the backlog offered. Doing both would have been a 2×2: four controls
for something a user sets once. The reason content wins is that it holds on
every screen: a single word at normal pace is easy to catch, and a sentence is
where a learner loses the thread. Splitting by surface would give the same
example sentence two speeds depending on where it was heard.

A call site passes `kind="sentence"` (examples, Writing's native version) or
gets `term`. The rate is still applied at playback, so there's no
re-synthesis and no cache churn. The key that predates the split is now the
word speed, and it seeds the sentence speed on first read
(`resolvePronunciationSpeeds`), which is then written back so the two are
independent from then on.

## The hanja button says the 음, and refuses to say anything else (2026-09-09)

Hanja shipped without audio earlier the same day, and the reason expired within
hours: the voice was settled (`ko-KR`, with `ko-KR-Neural2-C` for single
characters) and the *text* was not, because the answer worth hearing is the 음
and the 음 had no field until three-sided cards landed. It has one now.

**Measured before deciding.** 水 handed to a Korean voice does return audio —
6720 bytes, against 6336 for 수, both well clear of the silence floor. So the
argument for speaking the 음 is not that the glyph fails; it is that **nothing
in the response says what it read**, and a deck whose whole subject is a
character's reading cannot rest on a guess about one. The 음 is a string the
card already holds.

**Enforced in the component, not by convention.** `PronounceButton` renders
nothing on Hanja unless it is given the 음. A surface that forgets to pass it
loses a button instead of gaining a mispronunciation, and example sentences and
translations on this deck therefore have no button at all — which is right,
since neither is a hanja reading.

`getSpokenText` took the 음 as a third argument beside `furigana` rather than
growing a second function: both answer the same question — the reading that
resolves a glyph — and they never appear on one card, so the precedence between
them only had to be defined, not negotiated.

Every utterance on this deck is one syllable, which is exactly what
`ttsShortVoiceName` exists for: Chirp 3: HD intermittently returns silence on a
lone character where Neural2 returned it 0/91 times.

## Pronunciation speed is a playback rate, not a synthesis rate (2026-09-01)

The speed dial is built. The question it turns on is whether choosing a speed
regenerates audio, and the answer is **no** — nothing about the server changed.

**Why not.** `SPEAKING_RATE = 0.85` in `apps/web/src/app/api/pronounce/route.ts`
is baked into the cache path
(`pronunciation/{lang}/{voice}-r{rate}/{hash}.mp3`). Making the rate a request
parameter means a fresh Google TTS call *and* a permanent stored object per rate
per term — an unbounded multiple of both the bill and the bucket, for a
preference most users set once and never touch. Stretching at playback keeps
**one cached file per term at any speed**, and changing speed costs no round
trip at all. Web uses `HTMLAudioElement.playbackRate` with `preservesPitch`;
mobile uses `expo-audio`'s `setPlaybackRate(rate, 'high')` with
`shouldCorrectPitch`. Both are pitch-corrected on purpose: a slowed clip that
also drops in pitch stops sounding like a careful speaker and starts sounding
like the wrong voice.

**Three named chips, not a slider.** Slow (0.7×) / Normal (1.0×) / Fast (1.2×),
defined once in `packages/core/src/tts.ts`. This settles the asymmetry the plan
flagged — mobile has a settings tab with room for a slider, web has a narrow
dropdown with none — because **both surfaces already speak in chip rows** for
theme and language, so the same control fits each without either growing. It
also keeps the fallback cheap: a fixed set maps onto server-side rates (three
objects per term, still bounded) without the UI changing at all.

`normal` is **1.0, not natural speech** — a multiplier on a clip already
synthesized at 0.85. That is what keeps every existing user at the pace they
have always heard, and it is asserted in a test rather than left to a comment.

**One control covers everything.** `PronounceButton` is the single component
behind the term, the translation and the example sentences, so a second setting
would have had nothing to name.

**Device-local**, following theme's precedent (`localStorage` / `AsyncStorage`),
not a `users/{uid}` field. Study and native language are on the account because
they must follow the user everywhere; a playback rate is a property of the
speakers you happen to be listening through.

⚠️ **The ear test was deferred, deliberately.** Time-stretching is not the same
as synthesizing slowly, and 0.85 was chosen in the first place because learners
need to hear individual sounds. Nobody has yet heard a pitch-corrected 0.7× on
the generative voice. If it reads as an artifact, the fallback above is a small
change behind an unchanged UI.

## Both remaining pronunciation items are cancelled (2026-08-31)

The user's call, and it clears High. Two items left [backlog.md](../backlog.md);
neither was closed by being finished, so the reasoning matters more than usual.

**"Check the rest of the Kikuyu respelling against a speaker" — not needed.**
The three errors that were found are fixed and each carries a regression test.
What remained was a ranked list of *suspicions* with no speaker available to
check them against, and a section held open for a check nobody can currently
perform is not a plan. The item's real content was a lesson rather than a task,
so it moved to [lessons.md](../lessons.md) rather than closing silently — including
the known-unchecked list, so a speaker turning up later has something to work
from. The pack item that replaced it in High is where this comes back: a Kikuyu
pack is the first thing that would put the unchecked half of that table in front
of a learner at volume.

**The languages still open for the text-based pronunciation aid — deferred
until a user asks.** Not cancelled on doubt: the design question is settled,
Japanese and Kikuyu shipped, and the measurement behind the rest does not go
stale. `docs/pronunciation-research.md` holds the per-language numbers, two
working rule engines (Korean 표준 발음법 at 37/40, Spanish/Swahili stress at
16/16 and 9/9) and the finding that Swedish must not ship off the model. That is
precisely the argument for closing it: **it is cheap to reopen and costs nothing
to leave closed.** Japanese and Kikuyu were built because those two languages
had a gap someone had named; nobody has named one for the others. Reopen on a
user request rather than on a tidiness impulse, and read the research doc first
instead of re-probing — the probes were the expensive part.

## The pronunciation aid is a transliteration, and pitch accent rides along (2026-08-30)

**A correction to the entry below, made after it was built.** The aid asked for
was the term **respelled in the script the learner already reads** — 寿司 as
`sushi` to an English native, `스시` to a Korean one — not a linguistic
notation. Pitch accent is a real aid and the measurement behind it stands, but
it answers a question a learner further along asks. Both now share one badge,
reading first: `す＼し · sushi`.

**The transliteration needs no model, no dictionary and no stored field**, which
is the opposite trade from `pitchAccent` one section down. Accent is a lexical
fact you cannot read off the spelling, so it has to be looked up. A
transliteration *is* readable off the spelling, so asking a model for one would
add error for nothing. Kana → Hepburn scored **10/10** first try; kana → Hangul
scored 7/10 and reached 10/10 once the rule it was missing went in. Because it
derives rather than stores, **it needs no backfill and works on every card
already saved**, including the Japanese cards that will never carry a
`pitchAccent`.

**It is the first field keyed on `nativeLanguage` rather than on the word.**
Every other card field is a fact about the term; this one is a fact about who is
looking at it, which is why it cannot be stored and why `getReading` now takes
both languages. That also gives **Kikuyu a badge it never had** — it has neither
furigana nor pinyin, and its spelling hides real sounds (`c` is /ʃ~tʃ/, never
/k/), so the respelling is the entire aid for the one language with no TTS voice.

**Three rules carry the Hangul, and each was a bug before it was a rule.**
Long vowels are not written, so `とうきょう` is 도쿄 — the miss a letter-for-letter
mapping makes most visibly, and the one that took the Japanese score from 7/10 to
10/10. か/た rows are plain word-initially and aspirated inside, so 京都 is 교토
off the same kana. And ん/っ are 받침, so `さっぽろ` is three Korean syllables to
four Japanese morae. For Kikuyu the equivalents are the `y` glide (`gĩkũyũ` is
기쿠유, not 기쿠우) and prenasalization hanging off the previous syllable
(`mũgũnda` is 무군다; word-initially it opens a 으, so `ndoto` is 은도토 and not
느도토).

**A known loss, recorded so it stays a choice.** The English respelling maps both
`i` and `ĩ` to `ee` and both `u` and `ũ` to `oo` — collapsing the seven-vowel
distinction that the Kikuyu registry entry, its prompt branch and its
`pronunciationNote` all exist to protect. English has no unambiguous respelling
for /ɪ/ and /ʊ/ that a reader will not misread, and the alternative is a
notation to be taught, which is what this feature exists to avoid. **The note is
now the only place that distinction is stated**, so it must not be trimmed.

**The Kikuyu respelling shipped wrong and was fixed the next day, off one
word.** It merged known-faulty on the user's call; a reader then reported that
`cũcũ` "grandmother" came out `choo-choo` where it should sound like *shosho*.
That single four-letter word falsified two independent assumptions, and the
second was the expensive one:

1. **`c` is [ʃ], not [tʃ]** — the letter this table uses most.
2. **`ũ` is the close-mid [o]**, not a lax `u`: *shosho*, not *shoosho*. The
   tilde marks vowel **height**, not laxness, so `ũ` had been respelled a full
   step too high everywhere it appeared.

3. **`ĩ` is [e] and respells `e`, not `ay`** — `gĩkũyũ` is *ge-ko-yo*. Reported
   by someone familiar with the language, after a first attempt had shipped
   `ay` and a second had held `ĩ` at `ee` for want of a source.

**(3) is the entry worth keeping.** The phoneme was already right: published
sources give the seven vowels as i [i], ĩ [e], e [ɛ], a [a], o [ɔ], ũ [o], u [u],
and that is what was implemented. It was still *written* wrong, because English
`ay` is the diphthong /eɪ/ where [e] is a pure vowel. **A phoneme inventory
settles what a sound is and says nothing about how to spell it for a reader** —
and this table has now been corrected twice by someone who can hear the language
after being derived confidently from a chart. `choo-choo` was the sound being
wrong; `gay-ko-yo` was the sound being right and the spelling wrong. The second
is the harder failure to catch, because everything upstream of it checks out.

What remains merged is `ĩ`/`e` on `e` and `ũ`/`o` on `o` — the [e]/[ɛ] and
[o]/[ɔ] pairs. That one **is** a limit of English respelling, and the tell is
that it is symmetric front and back rather than landing on whichever vowel had
been reasoned about most recently.

**The lesson is about the shape of the evidence, not the vowels.** The first
version's own header comment listed six candidate causes and ranked `c` first —
and `c` was indeed wrong, so the ranking looked vindicated. But the vowel error
was the larger one and sat at number five, filed as a known-and-accepted loss
rather than a bug. A self-audit reproduced its own blind spot; **one reported
word from someone who can hear the language did what the ranked list could
not.** For the five languages still open, that argues for a native check before
merge over a longer list of suspicions.

**The collapse the first version apologised for is now fully gone**: `ĩ`/`i`
and `ũ`/`u` are both distinct. Worth correcting the record, because that
collapse was presented as a limit of English orthography and it was not one —
it was the table being wrong, and the apology described the symptom as though it
were the constraint. The merge that *is* a real limit sits one pair over.

**What is still approximate** and would need a speaker rather than more
reasoning: `th` [ð] written `th` invites *thin* for *the*; `g` [ɣ] and `b` [β]
are fricatives respelled as stops; `o` [ɔ] and `ũ` [o] both respell `o`, which
*is* a real limit of English; and stress is unmarked.

**Verified on both platforms** (2026-08-30), which closes the "unverified on a
device" caveat for this feature and not for the ones around it. **Still
unverified:** the Korean copy in both notes is author-written rather than
native-checked, and the corrected Kikuyu table has been checked against one
reported word plus a published phonology — not against a speaker across a range
of terms.

## The pronunciation aid: Japanese from a dictionary, Kikuyu from neither (2026-08-30)

The backlog item asked for a text pronunciation aid per language and said to
plan before code, because "the reading" is a different job in each language.
Scoped on the user's call to **Japanese and Kikuyu first** — which is a sharper
pair than it looks, since neither language's gap is the *reading*. Japanese
already has furigana; what furigana cannot say is **pitch accent** (箸/橋/端 are
all はし). Kikuyu's gap is **tone**. Both are melody, and both were measured
before anything was built.

**Gemini cannot do either, and the Japanese failure is the more instructive
one.** Probed inside the `/api/explain` prompt shape rather than in isolation,
three runs per term at the route's own temperature (0.1):

| | correct | self-consistent |
|---|---|---|
| Japanese pitch accent, 27 terms with known NHK values | **6/27** | 18/27 |
| Kikuyu tone, 19 terms | unverifiable | **2/19** |

The Japanese number carries a warning worth more than the feature: **the model
is not noisy, it is stably wrong.** Eighteen of 27 terms gave the same answer
all three runs, and only six were right — it defaults to [1] 頭高 and, doing so,
returns *one* accent for 雨 and 飴, *one* for 花 and 鼻, *one* for 髪·神·紙. It
erases exactly the minimal pairs that justify a pitch badge. So
**self-consistency is not evidence of correctness**, which is worth remembering
against the Swedish and Kikuyu probes, where consistency was all there was to
measure: inconsistency still proves unreliability, but consistency proves
nothing.

**Japanese ships from a dictionary, and the lookup lives on the route.**
[kanjium](https://github.com/mifunetoshiro/kanjium)'s accent table scored
**27/27** on the same ground truth — written before the file was fetched, so the
two validate each other — with ~99% coverage on realistic lookups. It sits in
`apps/web/src/data/` and is read by `/api/explain`, which keeps three promises
at once: the backlog's rule that readings come from the same route furigana does
(what changed is one field's *source*, not the number of round trips), 0 bytes
added to the mobile bundle, and a value stored on the card so review still works
offline. Provenance, licence and the refresh command are in that folder's
README. **`outputFileTracingIncludes` in `next.config.ts` is load-bearing** —
without it the deployed function ships without the file and the only symptom is
every Japanese card quietly losing its badge, while local dev keeps working.

**The card stores the position, not the mark.** `pitchAccent` is the アクセント核
— 0 for 平板, otherwise the mora after which the pitch falls — and
`markPitchAccent` renders は＼し from it. Storing the datum rather than the
notation is what lets the badge change shape later without a backfill. It also
rides *inside* the existing furigana badge rather than beside it: は＼し already
contains the reading, so it costs no space, and a card with no accent falls back
to bare furigana, which is what every Japanese card showed before.

**Two things that are easy to get wrong and are covered by tests.** A mora is
not a character — きょう is two morae, so counting characters puts 今日 [1]'s
fall inside the ようおん. And **0 is a real accent**: 端 and 学校 are 平板, so any
truthiness check turns "flat" into "unknown". A dictionary *miss* must stay
`undefined`, which is why the two are kept apart at every hop.

**Kikuyu gets a rule, not tone, and this is the finished state.** Same verdict
as its noun class and for a sharper reason: the model was not merely wrong but
not self-consistent, and several runs respelled ũ/ĩ as ú/í — corrupting the two
vowels the registry entry exists to protect, in a language whose whole audio
story is that Swahili is not an acceptable stand-in. There is also **no
alternative source**: no tone-marked machine-readable Kikuyu dictionary exists;
the Rice sketch grammar omits tone, and AfriVoices-KE is ASR audio, not lexical
tone. So Kikuyu gets `pronunciationNote` — a static line about the seven-vowel
system — which is true, useful, and costs no per-card data. **Do not re-probe
tone against a general model**; the thing that would change this is a lexical
source or a native reviewer, not a better prompt.

**The note is the third mechanism, and Japanese uses it too.** A notation nobody
explains is not an aid, so the same slot that teaches Kikuyu's vowels teaches
the ＼ mark. It also carries the kanjium credit, which CC BY-SA 4.0 makes
**required rather than decorative** — it renders on the Learn screen, not in a
licence file nobody opens.

**Not verified on a binary:** mobile shows the badge and the note through
`@amgi/core`, checked by `tsc` and the shared tests only. And nothing exercised
`/api/word-of-the-day` end to end — that route writes a real document for the
day, so it was left to its tests rather than run against production.

## Audio on mobile review hides offline rather than failing (2026-08-28)

The second of the three items queued 2026-08-25, and the smallest: `expo-audio`
is already in the shipped build and `PronounceButton` was already mounted on
Learn, decks, drill and card detail, so review was placement, not capability.
Three calls, two of which the backlog had already made — **study side only**
(the gloss is in a language you already have) and **press-to-play, not autoplay
on reveal**, since audio that fires itself on every card is a different feature
from a playable word.

**The third was the real one: offline it hides.** Review is mobile's
offline-first surface — cached cards, queued ratings — and `/api/pronounce` is a
network call with no local cache, which is the one question web never had to
answer. The precedent decided it: `PronounceButton` already returns `null` for a
language with no configured voice, on the stated reasoning that it will not
render a button that can only fail on click. Offline is that same condition,
temporally. What makes hiding affordable rather than mysterious is that the
progress line above the card already carries `offlineShort`, so the missing
button is explained on screen instead of reading as a bug.

**A measurement sharpened it, and is worth keeping.** The backlog assumed the
button would "spin and land in its error state". It is worse than that:
`getPronunciationUrl` (`packages/core/src/tts.ts`) is a bare `fetch` with **no
`withTimeout`** around it, unlike everything else the review screen calls, so the
spinner has no deadline of the app's own and waits out the platform's. That is a
latent problem on every surface with a pronounce button, not just this one —
review is only the surface where being offline is *expected*. Not fixed here,
because a timeout on `tts.ts` is a shared-code change with its own blast radius.

**Parity turned out to include the examples.** Web puts a `size="sm"` button on
each example sentence in `ReviewDetailsPanel`, and mobile's Learn and card-detail
already do the same — review's example list was the actual last divergence, not
just the term. It takes the same offline gate.

One layout note, learned from drill: the term row is **unconditional**, so the
word sits in the same place in both directions, offline, and on a language with
no voice. `flexShrink` on the text is what keeps a long term wrapping inside the
row instead of pushing the button off the card.
