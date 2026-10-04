# Decisions: Study languages

Per-language calls: Spanish, Kikuyu, Swahili, Hanja, and a native language per deck. Newest first. Indexed from
[status.md](../status.md).

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
