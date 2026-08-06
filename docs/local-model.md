# Local model — options, constraints, and the first step

_Written 2026-08-06 against `main` @ `e9fbf60`. Answers the High-priority
backlog item "Local model spike — can Amgi run a model on-device?", which
absorbed the two older research entries (on-device definitions/translations,
and the survey of language-learning models). Output is a written answer, not a
feature._

**The short version.** On-device inference is technically reachable on mobile
and technically hopeless on web, but it is the wrong first move regardless,
because it is the *most* expensive way to buy the things we actually want.
Almost everything a local model would give Amgi — instant lookups, offline
lookups, near-zero marginal cost — is bought more cheaply by **caching what
Gemini already returns**, which is one Firestore collection and no build. Do
that first. It is also, not coincidentally, how you collect the corpus that any
later fine-tune would need. The on-device question then becomes answerable
instead of speculative, because you will have both an eval set and a measured
cache hit rate.

---

## 1. "Local" means three different things

The backlog says "on-device", but the option space is wider and the three
readings have very different economics. Keep them separate — most confused
arguments about this topic come from sliding between them.

| | What runs where | Buys | Costs |
|---|---|---|---|
| **A. On-device** | Model runs on the phone | Offline, privacy, zero marginal cost | Native module, build cycle, RAM/thermals, quality cliff, mobile-only |
| **B. Self-hosted open weights** | Amgi runs Qwen/Gemma on rented GPU | No vendor per-token cost, full control, fine-tunable | Infra to run and pay for 24/7, no offline, no privacy gain |
| **C. Precomputed** | No inference at point of use | Instant, offline, ~free, works everywhere | Only covers what you thought to precompute |

Amgi's real pains are worth naming before picking, because two of them are not
actually pains:

- **Cost is not a problem today.** Gemini 2.5 Flash at Amgi's traffic — a
  single-digit TestFlight beta — is rounding-error money. Anyone arguing local
  on cost grounds is solving a problem we do not have. _(See §7 for the one
  feature that changes this.)_
- **Latency is barely a problem.** A 1–3B model at Q4 on an A17 does maybe
  15–40 tok/s. `/api/explain` returns ~60–100 tokens of JSON. That is 2–5 s on
  device against a Gemini Flash round trip in the same range. On-device is not
  a speed win for short structured output; a *cache hit* is, by two orders of
  magnitude.
- **Offline lookup is a real problem.** Offline review shipped (#53), so the
  app half-works on a plane and then dead-ends the moment you look a word up.
- **"Own your learning" is a real motivation.** The vision principle is honest
  data policies and no dark patterns. "Your lookups never leave your phone" is
  the strongest possible version of that. But it is only sayable if coverage is
  total — see §5.

## 2. The constraint that decides most of this — and it is not the one we assumed

`.scratchpad/tech-stack.md` says no OTA, so anything shipping a model ships in
a build, and a model file is not a small one. That framing is half right, and
the half that is wrong opens the door.

**Weights are data. The runtime is code.** The no-OTA constraint binds the
*inference runtime* — llama.rn, MLC, ExecuTorch, or a hand-rolled Swift module
— because that is a native module and native modules ship in builds. It does
not bind the weights. `expo-file-system` is already a dependency
(`apps/mobile/package.json`); downloading a model file at first launch is
ordinary asset delivery, and App Store rules permit downloading data while
forbidding downloading executable code. Weights are data.

So the shape is: **one build gets the runtime in, after which models are
swappable without a build.** That is materially better than "every model
change is an App Store review cycle" and it should be recorded, because the
backlog entry currently implies the worse version.

Three constraints survive intact, and they are the ones that actually bite:

1. **Expo Go cannot load a native inference module.** Every iteration against a
   local model needs a dev client or a production build. That guts the
   development loop the shipping model is built around — "iterate in Expo Go,
   cut a build when a batch is worth releasing" (tech-stack.md) — for the whole
   duration of the work. This is the single biggest hidden cost in the whole
   proposal and it is not a technical risk, it is a velocity one.
2. **Web cannot follow.** On-device on web means WebGPU plus transformers.js or
   WebLLM, i.e. a multi-hundred-megabyte download per browser profile for a
   feature that has a working server route. Not credible. Any on-device path is
   mobile-only, which forks a codebase that was deliberately brought to parity
   in July (`project_mobile_web_parity`). It has to be a *fallback ladder*, not
   a fork — see §6.
3. **Six study languages, two native languages.** This is the quality killer
   and it gets its own section.

## 3. What a local model would actually replace

Every model call in the app, and how each fares:

| Route | Temp | Job | Frequency | Local viable? |
|---|---|---|---|---|
| `/api/explain` | 0.1 | Ambiguity check, or the core card: translation, gloss, `briefDefinition`, plus `formality` / `gender` / `furigana` / `pinyin` | **Hottest** — every lookup | **Partially.** The only real candidate |
| `/api/explain/depth`, `depth-stream` | 0.1 | Nuance, near-synonym contrast, character breakdown, cultural notes | On demand | No |
| `/api/explain/examples`, `examples-stream` | 0.4 | 2–3 natural sentences + translations | On demand | No — naturalness is precisely the small-model failure |
| `/api/writing` | 0.1 | Passage review: level calibration, ordered findings, rewrite, native rewrite, card candidates | Rare, long | No |
| `/api/word-of-the-day` | 1.0 | One word per day | 1/day/language pair, **already Firestore-cached** | Pointless — already ~free |
| `/api/vocab-list` | 0.7 | Goal → word list | Parked feature | N/A |
| `/api/pronounce` | — | Google TTS, Storage-cached by content hash | Hot | Not an LLM; separate question, see §8 |

The honest read is uncomfortable for the on-device thesis. **The only route
worth replacing is the one non-ambiguous arm of `/api/explain`**, and 293
authored pack entries already bypass it. Everything else is either already
cached, already free, or exactly the kind of judgment a 1–3B model cannot do.

And note what the table shows about *value*: the routes a local model cannot
touch — depth, examples, writing review — are the ones carrying Amgi's actual
differentiation. `/api/explain`'s core arm is the commodity half.

## 4. Can a small model clear Amgi's bar?

Amgi's content rule (vision.md): the value is in words where a one-word
translation is insufficient — nuance, register, familiar words carrying an
unfamiliar second meaning. That sentence is a nearly exact description of what
small models are worst at. A 1B model will happily map 사과 → apple. It will
not reliably tell you why 여건 is not 조건.

Specific things the current prompts demand that a 1–3B model will fail at, in
rough order of severity:

- **Ambiguity judgment.** `/api/explain` asks the model to decide whether a
  term has two or more genuinely distinct common meanings, and to *not* fire on
  closely-related variants or archaic senses. That is a calibrated judgment
  call. Small models fire constantly or never.
- **Non-English quality.** Every open small model is trained English-first.
  Korean, Japanese and Traditional Chinese quality drops off a cliff below ~7B
  and stays there. Qwen is the best of them on CJK by a wide margin and is
  still not close to Flash.
- **Script fidelity.** The Traditional Chinese prompts spend real words
  forbidding Simplified characters. A small model will leak 简体字 regularly,
  and the failure is invisible to anyone who cannot read the difference — the
  worst failure mode there is.
- **Register classification.** Korean `formality` as one of Casual / Standard /
  Formal / Honorific / Slang is a fine-grained sociolinguistic call.
- **Format adherence.** Eight routes parse with `stripMarkdownCodeBlock` then
  `JSON.parse`, and `/api/explain` and `/api/writing` have no `try`/`catch` at
  all (already a backlog item). Small models break JSON far more often. A local
  path makes that latent exposure load-bearing.

**Where a small model plausibly is good enough:** short, closed-class,
classification-shaped jobs on text the app already has. Two live backlog items
fit that description exactly, and neither is the hot path —

- **Spellcheck on lookup** (Medium). The item's open question is where the
  correction comes from, and worries about "a second call before the first". An
  on-device pre-pass is precisely a zero-cost, zero-latency second call. This
  is the best local-model fit in the entire backlog, and it is a small feature.
- **Ambiguity pre-filter.** Not the judgment itself, but cheaply skipping the
  ambiguity round trip for terms that obviously have one sense.

## 5. Sizes, devices, and the coverage problem

Approximate Q4-quantized footprints — **verify before relying on any of
these**, they move with every release:

| Model | ~Weights (Q4) | Verdict |
|---|---|---|
| Qwen3 0.6B | ~0.4 GB | Runs anywhere, too weak for anything here |
| Llama 3.2 1B / Gemma 3 1B | ~0.7 GB | English-decent, CJK poor |
| Qwen3 1.7B | ~1.1 GB | Best CJK-per-byte of this group |
| Llama 3.2 3B / Qwen3 4B | ~2.0–2.5 GB | Borderline on 4 GB devices |
| Gemma 3n E2B / E4B | ~1.5–4 GB | Designed for on-device; E4B is too big for broad support |

The binding limit is **RAM, not disk**. iOS jetsams an app at roughly half to
60% of device memory. An iPhone 15 Pro has 8 GB; an iPhone 13 has 4 GB. Two
gigabytes of weights plus a KV cache on a 4 GB phone is a crash, not a slow
response. The realistic ceiling for supporting the devices a beta actually runs
on is **≤ ~1.5 GB of weights, i.e. 3B at Q4 at the very top**. Which is exactly
the size band that fails §4.

Also: sustained decode heats the phone. A lookup flow issues a call every few
seconds while the learner works through a list. This is not a one-shot workload.

### Apple Foundation Models — the option that dodges the size problem

Worth its own note because it dominates the naive on-device path on iOS, and
because Amgi is iOS-first (`com.tegi.amgi`, TestFlight 1.2.0):

**For:** ~3B model shipped by the OS — zero bundle cost, zero download, zero
storage, zero marginal cost. Guided generation binds output to a Swift
`@Generable` type, which would eliminate the JSON-parsing fragility outright
rather than mitigating it.

**Against, and it is decisive:** it requires iOS 26+ on Apple Intelligence
hardware (iPhone 15 Pro and later). That is a *minority* of any real install
base and a smaller minority of a friends-and-family TestFlight. Its language
coverage is limited and English-centric — verify Korean before assuming.
Apple's own guidance says the model is not a world-knowledge model and is meant
for summarization, extraction and classification over app-provided content.
`/api/explain` is a knowledge lookup. That is the use Apple explicitly steers
away from.

**And it still needs a native module**, so it pays the same Expo Go tax as any
other on-device path.

**The coverage problem generalizes.** Partial device coverage plus partial
language coverage means the privacy claim from §1 becomes "your lookups stay on
your phone, sometimes, for some languages, on some devices" — which is not a
claim worth making, and is worse than saying nothing. On-device only pays for
the "Own your learning" principle if it is total, and it cannot be total.

## 6. If it is built anyway: the seam

`packages/core/src/gemini.ts` is already the one place every model call
funnels through — `getTermExplanation`, `getTermDepth`, `getTermExamples`,
`getWordOfTheDay`, and `getWritingReview` from `writing.ts`, each taking a
`baseUrl`. Mobile re-exports them with `BASE_URL` bound
(`apps/mobile/src/services/gemini.ts`); `useCardEnrichment.ts` is the only
other holder of that constant.

That is the seam, and it is already the right shape. A local provider slots
**behind** those functions as a resolver chain:

```
cache hit  →  on-device (if available, if this language, if this route)  →  /api/*
```

Call sites do not change, which is what keeps the reuse-the-endpoint rule
intact: the rule says a new surface calls the same route as existing ones
rather than growing a parallel prompt, and a resolver behind a shared fetch
obeys it. **A second prompt maintained in Swift or in a `.gguf`-adjacent
template file is exactly what the rule forbids** — that is the drift that put
`reviewQueue`, `drill` and `reminders` into core in the first place. If a local
path ever ships, its prompt has to live next to the server one and be diffable
against it, or the two will silently disagree within a month.

The fallback direction matters too. Local-then-remote degrades gracefully;
remote-then-local does not exist as a useful ordering. And the ladder must
never surface *which* rung answered, because a user who learns that answers
differ by device has lost trust in all of them.

## 7. Fine-tuning vs prompting

**Prompting wins today, for a reason that is about the product, not the
models.** The prompts encode judgment that is still actively changing: two
open backlog items propose rewriting `/api/explain`'s (two glosses instead of
one, across all 12 templates; the third `ExplainResult` arm for grammar
patterns), and `/api/writing`'s calibration paragraph is the whole feature.
Fine-tuning freezes that into weights and turns every product revision into a
retrain. Freezing a design that is still moving is the classic way to spend a
month buying nothing.

**Where fine-tuning genuinely would win** is the narrow, stable part: format
adherence and house style. "Single best translation, never semicolons or
slashes", the back-gloss style rules, the JSON shape — those are stable, they
are stated over and over across twelve templates, and they are exactly what a
few thousand LoRA examples teaches better than any prompt. A fine-tune that
targets *only* format and style on top of a small model is a much more
plausible bet than one trying to close the knowledge gap.

**The corpus already exists as a byproduct.** Every Gemini response the app has
returned is a labelled example. Storing them is the same work as building the
cache in §8 — which means the cache is simultaneously the cheapest useful
feature and the data collection for any future fine-tune. That is the single
strongest argument for the ordering recommended here.

**But nothing can be fine-tuned or even evaluated without an eval set, and
there isn't one.** `npm test` is 175 unit tests; not one of them measures model
output quality. There is currently no way to answer "is this local model good
enough" other than by vibes. **Building the eval harness is the real
prerequisite for every option in this document**, and it is worth doing even if
no local model is ever shipped, because it is also how you would safely change
a prompt.

**The volume argument, stated fairly.** Grammar patterns (backlog, High) is the
first feature whose call count is a *per-session multiplier* rather than
per-lookup: _n_ patterns means _2n_ calls, generation plus grading. That is the
first thing in the roadmap that could make inference cost real. It is also the
feature with the highest quality demand in the app, since grading a learner's
production wrongly is worse than not grading it. Economics and quality point in
opposite directions here, and quality wins — grade with Flash.

## 8. The cheapest useful first step

The backlog asks for this by name. It is not a model.

### Step 1 — A shared term cache. No build, no native module, no model risk.

A `terms` collection keyed by normalized term + study language + native
language, holding the `/api/explain` core response and, once warm, depth and
examples. This is already in the backlog under "Needs clarification"; this
document is the argument for promoting it.

Copy the pattern from `/api/pronounce` verbatim — it already does exactly this
with content-hash paths in Firebase Storage, including the lesson about a bad
generation being permanent when entries never expire
(`MIN_PLAUSIBLE_AUDIO_BYTES`, `apps/web/src/app/api/pronounce/route.ts`). Any
term cache needs the same guard against caching a malformed response forever.

What it buys, against what on-device buys:

| | Term cache | On-device |
|---|---|---|
| Lookup latency on a hit | ~instant | 2–5 s |
| Marginal cost per repeat lookup | zero | zero |
| Offline | yes, if mirrored | yes |
| Works on web | yes | no |
| Quality | identical to today | worse |
| Build required | no | yes |
| Dev loop preserved | yes | no |
| Produces a fine-tuning corpus | yes | no |

The one thing it does not buy is a cold lookup of a word nobody has ever asked
for, offline. That is a genuinely small slice of the offline story.

### Step 2 — Precompute the packs. One script, one afternoon.

This is the hypothesis the backlog names — "pre-cached content for a pack may
beat inference on-device and is a fraction of the work" — and the answer is
yes, decisively. The 293 pack entries (133 TOEIC, 160 TOPIK, plus generated
kana) already have authored backs; what they lack is depth and examples,
generated per card on demand today. Precomputing both for every entry is ~600
Gemini calls, a few dollars, and a one-time script writing into the Step 1
cache. Result: every pack card is instantly deep and fully offline, on both
platforms, forever.

### Step 3 — Build the eval harness. Then, and only then, measure.

100 terms per study language, drawn from the packs and from real lookups.
Gemini's output as the reference. Score candidates on the **core `/api/explain`
arm only** — not depth, not examples, not writing review, which §3 already
rules out. Judge on: translation correctness, script fidelity, JSON validity
rate, and the language-specific field (`formality` / `gender` / `furigana` /
`pinyin`).

Candidates worth the slot: Qwen3 1.7B (best CJK-per-byte), Gemma 3n E2B
(purpose-built for on-device), and Apple Foundation Models if a throwaway
native module is cheap enough to build. Run them on a laptop first — there is
no reason to pay the Expo Go tax to find out a model cannot do Korean.

That produces a defensible yes or no. Everything before it is speculation, and
everything after it is a build decision rather than a research one.

## 9. Open questions

- **Does the Apple Foundation Models framework support Korean well enough to
  matter?** Verify rather than assume; if yes, it changes §5's verdict for
  iOS-recent devices. If no, that path closes entirely.
- **What is the actual cache hit rate?** Unknowable until Step 1 ships and runs
  for a few weeks, and it determines whether Steps 2 and 3 are worth starting.
  If lookups are overwhelmingly long-tail, caching helps less than expected and
  the offline argument for on-device gets stronger.
- **Does a cached term ever go stale?** Pronunciation audio never does — the
  hash is the content. An explanation can be improved by a prompt change, so
  the cache needs a version key or a manual bust. Decide before writing, not
  after 10,000 rows.
- **Where does an on-device path live in the type system?** Nothing in
  `ExplainResult` currently distinguishes provenance. If the resolver ladder is
  ever built, decide deliberately whether provenance is recorded — useful for
  debugging, dangerous if it reaches the UI (§6).

---

_Not tracked by default: `.gitignore` excludes `docs/*`, so this file is
re-included explicitly alongside `docs/testflight-beta-info.md`. If it is
renamed, rename it there too or it silently stops being tracked._
