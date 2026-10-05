# Decisions: Study languages

Per-language calls: Spanish, Kikuyu, Swahili, Hanja, and a native language per deck. Newest first. Indexed from
[status.md](../status.md).

## Arabic is Modern Standard, unvowelled on the front, with a reading nobody checked (2026-10-05)

A twelfth deck, `cards_arabic`. Every call below was the user's, approved
2026-10-05 on the recommendations put to them; the words were "go with your
recommendations for arabic".

**Modern Standard Arabic, not a dialect.** Google Cloud TTS carries one Arabic
locale, `ar-XA` (30 Chirp 3: HD voices, 4 WaveNet, 4 Standard, checked against
the live list). There is no Egyptian, Levantine or Gulf voice, so a dialect
deck would ship with standard-Arabic audio or none. The cost is known: nobody
speaks MSA at home, and Cantonese was added precisely because it is what is
said.

**The front is unvowelled; the vowelled form is the reading.** كتاب on the
card, كِتَاب beside it, the way furigana sits beside a kanji word. Arabic is
printed without its vowel marks, so a vowelled front would teach a form the
learner does not meet. The route strips marks from the front itself rather than
trusting the prompt, so a card is never filed under a spelling the next lookup
of the same word would miss. **No romanisation**: the audience is not
beginners, and the vowelled Arabic is the reading.

**The interface stays left to right.** No mirroring. A line of Arabic takes its
own direction and is right-aligned: `dir="auto"` on web, `rtlLine` and
`rtlInline` on mobile, both judged from the text and not the deck, because an
Arabic card's back is English. Nothing in the app handled right-to-left text
before this.

**No pack at launch**, as Cantonese. The five example terms on Learn were
approved by the user as proposed: طرب, غربة, longing, awkward, عين. The first
is also the word first run looks up.

**Smaller defaults, taken as listed to the user:** an m/f badge on nouns, no
root or plural field, English and Korean backs, no worked example on the
Writing tab.

### The reading: what was measured, and why 55 of 57 was superseded

The reading is the model's. No dictionary checks it. That was decided on
numbers, and the numbers moved three times, so all of them are here.

The reference throughout is English Wiktionary's Arabic entries: each vowelled
headword, compared after dropping case endings and optional marks.
`gemini-2.5-flash`, the lookup's temperature, three runs each.

| what was asked | right on all three runs |
|---|---|
| 57 common words, no meaning given, any listed vowelling counted right | 55 / 57 |
| 102 word-and-meaning pairs, asked plainly | 77 / 102 |
| the same pairs, with the stricter wording | 91 / 102 |
| the same pairs through `/api/explain`, reading as one more field | 78 / 102 |
| through `/api/explain`, reading as a second step with the stricter wording | 77 / 102 |
| the same, with a rule that the context decides the word (what ships) | **79 / 102** |

**55 of 57 was the wrong question.** It gave the model a bare word and accepted
any vowelling the dictionary lists. But 28 of those 57 words have more than one
(ملك is king, angel, dominion, property and "to possess"), so the bare word
does not determine the reading; the meaning does. Asked with a meaning, the
plain prompt answered with the most frequent word of that spelling whatever was
asked: a noun for a verb, a doubled consonant that should be single, and in 8
of 306 answers a different word altogether.

**The stricter wording** states the part of speech, says to keep every letter,
to choose the vowelling for this meaning and not the most frequent, and when a
shadda is allowed. It is in `apps/web/src/lib/arabicVowelling.ts`. On this
wording, plus a label, the user decided to ship.

**Through the real route it did not hold, and the reason is upstream of the
reading.** The lookup first settles what the card is about, and for a spelling
shared by several words it often settles on the common one whatever the context
said: خبز asked as "to bake" becomes a card for "bread", شمس as "to be sunny"
becomes "sun". The reading it then gives is right for the card it made. Of the
23 pairs missed in the last row, read one by one: about 17 are cards whose
reading agrees with the meaning shown on that same card, 3 have a reading that
is wrong for their own meaning (سنة shown as "drowsiness" but vowelled as
"year", درس as "trace", one run of حسب), 2 came back with no reading, and 1 is
mixed. That sorting is the building session's own reading of the Arabic, not a
dictionary's. Mechanically, 279 of 306 answers are some listed vowelling of the
spelling, the front was the word asked for in 306 of 306, and no front carried
a mark.

**The user chose to ship on these numbers** (2026-10-05, "go with (a)"): the
branch as it stands, with the label.

⚠️ **So two things are true of what ships.** What a learner sees nearly always
agrees with itself. And choosing a rarer meaning does not always get that
meaning's card. The second is a property of the shared lookup prompt, not of
Arabic, and was not measured on the app's own list of meanings, which is an
easier case than Wiktionary's rare senses.

**What is enforced.** One thing: `arabicReading` drops a reading that, with its
marks removed, is not the word on the card. It cannot tell a right vowelling
from a wrong one.

**The label.** `getReading` appends "not checked" / "검토 안 됨" to every Arabic
reading, so none of the eight render sites can show one bare. It is the tag
Munli puts on a verb the model conjugated (PR #182), from one constant. Learn's
pronunciation note says the same at length.

**Why the reading is a second model call.** Same route, no new endpoint and no
client change: one extra fast call per Arabic lookup. As a field of the
lookup's own answer it scored the same, so the second call earns its place only
by isolating the wording the decision rests on. If that stops being worth a
call, fold it back.

### Audio

`ar-XA-Chirp3-HD-Charon`, like the rest. 80 words of three letters or more, 0
under the 2048-byte floor. **Two-letter words are the exception**: 20 of them
three times each gave 8 silent clips of 60 (لا, في, هي, ما, يا, هل, أخ), and
0 of 20 on `ar-XA-Wavenet-B`. So `ttsShortMaxLetters: 2` sends words that
short to WaveNet, counted without vowel marks. Other decks keep the old rule of
one character.

⚠️ **Unverified by ear.** Sizes show speech, not which reading. The button
speaks the unvowelled front, so for a spelling with several readings the voice
picks one unprompted, as `yue-HK` does for 行.

### Not done, and not checked

- **The Firestore rule and index for `cards_arabic` are console state.** The
  user added the rule on 2026-10-05 and the composite indexes were building at
  the time. Saving an Arabic card was not exercised by the building session.
- **The normal-use case is unmeasured, and will stay so.** The 102 pairs take
  their meanings from Wiktionary, rare senses included. What a learner actually
  does is pick from the app's own list of meanings for an ambiguous word, which
  should be easier. A run of that case was planned and stopped at its first
  call when the Gemini prepaid credits ran out. **The user dropped it on
  2026-10-05**: they do not know Arabic well enough to check the result
  themselves, will go by what users report, and do not want bulk calls made to
  the Gemini API. Feedback from users replaces it. Do not run it, or any other
  batch of model calls on the production key, without the user asking.
- **Nothing was seen rendered.** Right-to-left layout on web and mobile, the
  tag beside the reading, and typed answers in Arabic have not been looked at
  in a browser or on a device.
- Typed answers ignore vowel marks (`foldText`), so كِتَاب typed against كتاب is
  right. Search in My Cards does not: a query typed with marks finds nothing.

## Cantonese is its own deck, and the model needed no persuading (2026-10-04)

**Hong Kong Cantonese in Traditional characters, as its own registry entry and
collection** (`cards_cantonese`), beside Chinese (Traditional) and Hanja. It
shares a script and a card shape with the Chinese deck, so the precedent is not
Hanja's "the card is different" but the plain one: it is a different language.
The words differ (佢, 唔, 嘅, 食飯), the reading is Jyutping and not pinyin, and
the voice is `yue-HK`. The reading is Jyutping with tone numbers, the user's
choice; how it is filled is in
[pronunciation](pronunciation.md#jyutping-the-model-answers-and-a-dictionary-overrules-it-2026-10-04).

Three things were measured before code, 2026-10-04.

**The voice is Chirp 3: HD, and single characters need no second voice.** The
live voice list has 2066 voices in 63 locales; `yue-HK` is the only Cantonese
one, with 34 voices: 30 Chirp 3: HD and 4 Standard, no WaveNet or Neural2. Six
words came back 5.4–8.3 kB on `yue-HK-Chirp3-HD-Charon`. The question that
mattered was single characters, a normal card here, because Chirp 3: HD
returned silence on 11/70 kana and 9/21 Korean syllables. **On Cantonese it did
not: 124 single-character clips, 0 under the 2048-byte floor, smallest 3.1 kB.**
So no `ttsShortVoiceName`. Two caveats are on the registry entry: one clip of 唔
was 14 kB, three times its usual size, and `yue-HK-Standard-B` (byte-identical
on every repeat) is the fallback if that is audible.

⚠️ **Unverified: what the voice actually says.** Byte sizes show speech, not
which reading. 行 alone can be haang4, hang4 or hong4, the voice chooses, and
nobody has listened. This is the Hanja problem (the button there speaks the 음
because a glyph's reading is a guess) without Hanja's way out, since Jyutping is
not something a voice can be handed.

**The model writes Cantonese when the prompt says "Cantonese".** The worry was
standard written Chinese in Traditional characters. Through the examples
route's prompt at its temperature, 16 terms (12 Cantonese, 4 English), two runs,
three wordings:

| wording | sentences | in standard written Chinese |
|---|---|---|
| the label, "Cantonese" | 91 | **0** |
| "Cantonese (Hong Kong)" | 89 | 0 |
| the label plus an explicit written-Cantonese rule | 89 | 0 |

"Standard written Chinese" means a Mandarin function word (是, 的, 他, 在, 了)
and no Cantonese one, by pattern. The 27 sentences with neither were read one by
one and are short Cantonese all the same (今晚不如出去食飯啦, 記得帶遮啊). Formal terms
did not drag it into 書面語: 經濟, 政府 and 重要 all came back in spoken
register. On lookups, 20 of 20 English terms returned the Cantonese word (睇,
嘢, 遮, 雪櫃, 鍾意, never 看, 東西, 雨傘), with or without a rule saying so.
**So no special wording was needed**, and the examples route is untouched. The
lookup and list prompts carry one line about what a Hong Kong speaker says, for
robustness and not because anything failed, the same standing as the
Traditional-not-Simplified line in [data-model.md](../data-model.md).

Worth knowing: a Mandarin word typed into this deck is answered with its
Cantonese counterpart. 看 and 东西, each with a sense picked, came back as 睇
and 嘢. That falls out of the prompt and looks right for a deck whose point is
what is said.

Not done: no worked example on the Writing tab. Those are quoted from a
dictionary, never written by the model, and none has been sourced for Cantonese.

## A native language per deck, and an interface language beside it (2026-09-12)

**`nativeLanguage` was doing three jobs, and the third is why it had to
split.** It picked the card's back slot, it was interpolated into every
`/api/explain` prompt, *and* it was the language of the app's own chrome.
Reading them as one made "Japanese explained in Korean, app in English"
unsayable. The user's call, asked before any code: **backs and explanations
follow the deck; chrome becomes its own setting.**

The deciding argument for putting explanations on the deck side is that they
are **stored on the card and never regenerated** — `definition`, `notes`,
`characterBreakdown`, `briefDefinition` are `Flashcard` fields. Tying them to a
setting that changes later would leave a card whose back is Korean beside a
definition in English, permanently. Shape, migration and the collection
constraint are in [data-model.md](../data-model.md).

**The collision resolvers are deleted rather than deprecated**, and that is the
part worth knowing before anyone re-derives them. `resolveStudyLanguage` and
`resolveNativeLanguage` repaired one situation *after* it happened — studying
the language Amgi was speaking to you in — by moving the other setting out from
under the user. With a native language per deck, `nativeOptionsFor` drops the
study language at the point of choosing, so the pair cannot be built; and the
interface language is independent of every deck, so switching decks cannot move
it. That also **retires the one-tap-switch confirmation dialog** recorded in the
2026-09-04 navigation entry in [app-shell.md](app-shell.md), along with its three i18n keys. The dialog was correct
for as long as a switch could re-language the whole interface. It no longer can.

**The compiler was made to find the call sites, because it otherwise cannot.**
Both values are `string`, so a miscategorised one is silent — a Korean back
beside an English definition, or an app that flips language on a deck switch.
So the context stopped exposing `nativeLanguage` at all and now exposes
`interfaceLanguage` and `deckNativeLanguage`: every one of the ~40 consuming
files failed to compile and had to be re-read and classified deliberately. Two
useful findings fell out of that pass. `directionLabel`/`directionPrompt` were
genuinely *mixed* — they translate chrome **and** derive the back slot from the
same argument — so they take both languages now, which is what lets a chip read
"Japanese → Korean" *in English*; there is a test pinning exactly that sentence,
because it is the one the old signature could not produce. And
`DeleteAccountModal`'s `LOCAL_KEYS` had to learn the two new cache keys, or a
deleted account would leave its language list behind for the next sign-up to
adopt.

**Not done, deliberately:** no backfill of stored explanations. A card written
in English before this stays in English; the deck's language governs what is
written *next*. Rewriting existing cards would spend a model call per card to
change text the learner may have already read and scheduled.

⚠️ **Verified by typecheck and the web suite, not on a device.** Web is
619/619 with both apps clean under `tsc --noEmit`. `npm test` at the root still
fails on `@amgi/mobile` having no `test` script — pre-existing, and the reason
mobile's half is an `expo export` instead. Nobody has yet watched the migration
run against a real multi-deck account, which is the thing to watch first.

## A phrase on the Hanja deck stays a list of characters (2026-09-09)

**Left as built, on the user's call.** Typing 수신제가치국평천하 — or 修身齊家治
國平天下 — into the Hanja deck returns an eight-item disambiguation, one entry
per character with its 훈음, and picking any of them gives a proper card. The
rule that makes a multi-character term ambiguous rather than a card generalises
to the hangul form on its own; no separate handling was needed.

**The argument for leaving it**: every chip is a genuine hanja card, and someone
who types a 고사성어 into a character deck plausibly wants exactly that — its
characters. Studying 고사성어 by their hanja is a normal way to study them.

**What was considered and declined.** The deck is answering a different question
than the one asked, and does not say so — the *phrase* is a Korean vocabulary
item, and the Korean deck already answers it properly (`partOfSpeech: 'idiom'`,
a real gloss, and the depth section breaking out its hanja; the user's own card
for this phrase lives there). The right fix is a cross-deck pointer — "this is a
word, study it on the Korean deck" — and that needs a concept the app has never
had. Declined for now rather than invented mid-branch.

⚠️ **`meanings` has no cap anywhere**, so a pasted run of hanja renders as many
chips as the model returns. Known and accepted: nothing breaks, it is only long,
and no real input has hit it. A prompt-level cap was offered and declined with
the rest. If the wall ever shows up in use, that is the cheap half of the fix.

## Three-sided hanja cards cost a setting, not a scheduling axis (2026-09-09)

**Shipped as scoped**, and the scoping is the whole story: the first read of
"three-sided" looked like a third `ReviewDirection`, which is a two-member union
read in 92 places across 24 files and written into every card document in every
language. It is not that. Three parts split into a front and a back is six
configurations, and those six are three partitions × the two directions that
already exist — so `sm2.ts`, `reviewQueue.ts`, `offlineReview.ts` and the
direction filter were **not touched at all**.

**`hanjaFaces()` is the only place the parts are joined**, and that is the rule
worth keeping. `hun` and `eum` are stored apart because the split moves; any
surface that assembles its own 훈음 is a second opinion about the separator.
The back also keeps 한자 · 훈 · 음 order whichever part was lifted out of it, so
水 물 and 물 水 never appear as the same fact in two orders.

**`korean` is still written, and derived.** Every surface keyed on the language
pair — the card list, the detail modal, CSV and Anki export, `getBackSide` —
reads `korean` and now gets the assembled 훈음 without knowing partitions exist.
It is filled from `hunEum()` at the one point a card is written, so it cannot
drift from the two fields it comes from. The alternative was making six generic
surfaces Hanja-aware to avoid storing a derived string; this is the smaller
change and the drift risk is contained to one line per platform.

**Typing is off on Hanja, in both directions.** `gradeTypedAnswer` grades
against *a* side, and a typed 물 against a back of 물 수 is neither right nor
wrong until someone decides whether both parts are required — and on the default
partition the expected answer is a glyph most learners cannot type. Left off
rather than guessed at; `promptsForTyping` takes the study language to say so.

⚠️ **The accepted cost stands: switching partition inherits intervals earned
answering a different question.** The control lives in settings on both
platforms and **nowhere else** — in the review session it would drift into a
per-session toggle and make those inherited intervals meaningless. Reopen with
partition-keyed tracking if switching turns out to be common; it is additive and
invalidates nothing stored.

## Hanja's card back, and the `hanja` name it had to take (2026-09-09)

Two calls taken together, because the registry entry could not be written
without either. Both set by the user.

**An English native gets 훈음 *plus* an English gloss, not instead of it.** 水 is
물 수 to every reader — 훈음 is how the character is *named* in Korean, and
"water" is a different fact about it rather than a translation of 물 수. The
alternative on the table was a Korean-native-only deck, which is arguably truer
to an 어문회 exam deck and closes it to everyone else. So a hanja card carries
four parts: the character, its 훈, its 음, and an English meaning that an English
native sees in addition to the 훈음.

**This is the first card `getBackSideConfig` does not fully describe**, and the
gap is structural rather than a bug. That function answers "which slot holds the
translation", keyed on the *pair* of languages; 훈음 is not a translation and
belongs to neither side of the pair. It still answers correctly for the gloss
slot, which is all it is asked for, and the Hanja branch of `/api/explain` asks
for `korean` outright instead of routing through `nativeBackRule` — which is
empty for an English native and would have dropped the 훈음 for exactly the
reader who most needs it spelled out.

**The deprecated `hanja` depth field was migrated rather than guarded.** It held
legacy Korean cards' character breakdown and was left in place precisely to
avoid a migration, read through `getCharacterBreakdown()`. The new study field
wants the same name for the character itself. The cheap option was a guard —
fall back to the legacy field only for Korean cards, which is precise, since it
was only ever written for them — and the user chose the migration instead:
`migrate:legacy-hanja` promotes it to `characterBreakdown` and deletes it, and
`TermDepth` loses the field. One name, one meaning, nothing to remember later.

⚠️ **The migration must never touch `cards_hanja`**, where `hanja` is the front
of the card: promoting it would put the character in its own breakdown section
and then delete the front. The script excludes Hanja by construction — it builds
its collection list from the registry minus that one entry — rather than by a
filter a later edit could widen past.

## Swahili takes the audio and drops the noun class (2026-08-27)

The ninth study language, and the one where the backlog item had already made
most of the calls. Two it left open were answered by measurement rather than
assumption, in both cases because the alternative was a silent wrong answer.

**`Intl.Segmenter` accepts `sw`.** Checked, not trusted — the same check `ki`
got, and for the same reason: an unrecognised tag does not throw, it resolves to
the host locale, and every writing diff would then mis-segment with nothing on
screen to say why. `sw` resolves to `sw`.

**It takes audio, and takes the ordinary voice.** This is the interesting
inversion: `sw-KE` was found while *ruling Swahili out* as a Kikuyu stand-in, so
the fact a voice existed was already known — what was not known was which kind.
The live list has 30 `sw-KE` voices and every one is Chirp 3: HD, so Swahili
takes `Charon` like Korean, Swedish, French and Spanish, and none of the
Traditional Chinese WaveNet-fallback reasoning applies. Synthesised before
wiring: `rafiki`, `kuandika`, `furaha` at 6–8 kB, well clear of the 2048-byte
silence floor `/api/pronounce` enforces. No `ttsShortVoiceName` — that field
exists for languages where a lone character is a normal card, and Swahili has no
one-letter words worth one.

**No noun class, same as Kikuyu, and the Kikuyu probe is the evidence.** Swahili
marks class, not gender, so `gender` stays off. What makes this more than an
analogy: the Kikuyu probe failed *by returning Swahili morphology* — `ndimi` for
`thiomi`. That says the model pattern-matches the Bantu class system rather than
knowing any one language's, which is an argument about Swahili and not merely
one made next to it. Class also drives agreement on verbs, adjectives and
possessives, so a wrong one is more damaging here than `el`/`la` ever is.

**The prompt branch is Spanish's, not Kikuyu's.** Kikuyu earned two extra rules
by failing on orthography and on Swahili contamination; Swahili failed at
neither, so it inherits neither. In particular there is **no "not Swahili"
rule** — the contamination runs the other way, Swahili being what leaks into
its lower-resource neighbours. 45 lookups across both directions came back
right: loanwords (`kompyuta`, `daktari`, `simu`), plurals (`miti`, `watoto`,
`vitabu`), and `pole`, `safari` and `jambo` correctly split as ambiguous, which
is the genuinely hard case since two of those are English words too.

**One rule was added on deliberately thin evidence, and is labelled as such.**
Verbs are cited with the `ku-` infinitive; one verb in 32 came back as a bare
stem (`salimu` for "to greet") and it did not reproduce — a re-run with and
without the line was 12/12 prefixed either way. It stays because it costs one
line and the failure it prevents is invisible and permanent: a lone bare stem is
inconsistent with every other verb card in the deck, and `typedAnswer.ts` grades
strictly, so `kusalimu` against a stored `salimu` is a false miss. **It was never
measured to help** — the comment in the route says so, and anyone tightening
that prompt should not read it as load-bearing.

**Unrelated, found while probing and left alone:** in the ambiguous branch the
model often echoes the placeholder `"Swahili or English"` back as
`termLanguage` instead of choosing. Reproduced on Spanish (`pan`, `red`),
French (`pain`, `coin`) and Swedish (`fart`), so it is **pre-existing and
generic to every Latin-script language**, not Swahili's. It is harmless today:
`termLanguage` is only ever compared `=== studyLanguage`, so the value falls to
the English branch, and the ambiguous response carries no side fields for it to
mis-route. Not fixed here because it was not this item's scope.

## Kikuyu ships with no audio and no noun class, both measured (2026-08-22)

Kikuyu is the first study language added where the open questions were about the
*language's* support rather than the app's, and the backlog item said to answer
them on real words before wiring any UI. Both were answered that way.

**No pronunciation, because no voice exists.** Checked against the live Google
Cloud TTS voice list rather than inferred: 2066 voices across 62 locales, and no
`ki`. The only Bantu locale is `sw-KE`, and Swahili is the wrong stand-in for a
reason worse than accent — its alphabet has no `ĩ` or `ũ`, which are the two
vowels that separate Kikuyu words from each other. A voice that cannot say the
distinguishing sounds teaches the wrong pronunciation confidently, which is worse
than a hidden button. So the entry has no `ttsLanguageCode`, and the optional-TTS
path that had been written but never used is now live.

**No noun class on the card, even though it is the obvious analogue of
`gender`.** Kikuyu marks class, not gender, and class governs agreement across
the whole sentence — so it is more useful than `el`/`la`, and a wrong one is
also much more damaging. Probed on eight nouns: `mũndũ` (1/2, `andũ`) and `mũtĩ`
(3/4, `mĩtĩ`) came back right, but `rũthiomi` came back with `ndimi` — the
*Swahili* plural, where Kikuyu has `thiomi`. A field that is wrong that often
teaches wrong agreement everywhere the learner uses the word. Left off until
something better than the model can fill it. The Swahili leak is also why the
prompt branch names Swahili explicitly as something not to answer with; the
nearest high-resource Bantu language is a live contamination risk, not a
theoretical one.

**Everything else was better than expected.** Single-word lookup was correct on
~19 of 20 real words in both directions, `ũhoro` was correctly split into its two
senses, depth returned accurate cultural notes (including the `mũgũnda`/`werũ`
contrast), and example sentences carried correct locative morphology. The one
gloss believed wrong was `gũtherũka`, returned as "to become clear" where it
means "to boil" — close to `gũthera`, which is the shape of error to expect here:
a real Kikuyu word confused with a near neighbour, not an invented one.

**Worth knowing: the spellcheck rule turned out to be a Kikuyu feature.** It was
written for transposed letters and missing accents, and on Kikuyu it restores
dropped vowel diacritics — `muthenya` → `mũthenya`, which is exactly how a
learner will type. The fear was the opposite, that a low-resource language would
be over-corrected into hallucinated forms; five real-but-less-common words
(`gĩthomo`, `mũhĩrĩga`, `kĩrĩma`, `nyeki`, `gũtherũka`) all came back with
`corrected: null`. Re-measure this if the rule is ever loosened.

## Spanish is European Spanish, and that is a deck not a setting (2026-08-21)

The registry needs a locale and a voice, and Spanish is the first language added
where the obvious choice is genuinely contested: `es-ES` against `es-US`, where
the Latin American varieties have the larger audience and differ well past the
accent — `coche`/`carro`, `vosotros`, `ordenador`/`computadora`.

**Went with `es-ES`/`es-ES-Chirp3-HD-Charon`**, on consistency with how `fr-FR`
and `sv-SE` were already chosen: one registry entry names one variety and speaks
it. The alternative was never "support both" — it was a preference toggle, and
that is the design the file header already rejects for Traditional vs Simplified
Chinese. If Latin American Spanish is ever wanted it is **its own entry with its
own collection**, so neither deck constrains the other and a learner's cards
never silently change which Spanish they teach. The comment on the entry says so,
because the cheap-looking fix is to add an accent setting.

Worth knowing: the voice was **verified against the live TTS API**, listed and
synthesized, rather than assumed from the naming pattern. A wrong voice name is a
runtime 400 on the pronounce path that no build or test would catch — the same
class of gap as the two console steps this language is still blocked on.
