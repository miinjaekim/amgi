# Generating article practice — the measurement pass (2026-10-02)

What was measured before deciding whether Munli's article practice may be
generated rather than premade. It follows
[english-articles-draft.md](english-articles-draft.md), whose 54
Tatoeba sentences are the answer key here, and it is written the way
[pronunciation-research.md](../pronunciation-research.md) is: numbers first, the
decision left to the Decisions entry that cites it. **No decision is recorded
here.** Whether generation is allowed is the user's call.

## The question

The draft's content is 54 fixed sentences, about seven per rule, and the rule is
what gets scheduled. Seven vehicles per rule get memorised. Generation would fix
that, but [README.md](README.md) says the model is not a source and
that a model agreeing with itself is not evidence.

So the test was of a **checker that does a different job from the writer**: it
sees only the blanked sentence and must list every article that fits each
blank. If it reproduces the sourced answers and flags the sentences already
rejected as non-forcing, it could license generated sentences.

## Method

`gemini-2.5-flash`, the model every route in the app uses, with thinking left at
its default as the routes leave it. Checker at `temperature: 0.1`, generator at
`1.0` (the value `/api/grammar/exercise` uses). JSON responses. **Three runs per
sentence**, one call per sentence per run.

**Three sets:**

- **Sourced**: the draft's 54 sentences, 66 boxes. The key is the sentence's
  own article.
- **Rejects**: the five sentences swapped out of the draft because another
  article also reads naturally. The checker should list more than one answer.
- **Generated**: 40 sentences, five per rule, from one call per rule that was
  given the rule text from the draft's table.

Each sentence went to the checker **as the app would render it**: boxes
numbered, other articles printed, and the word after a sentence-opening box
lowercased.

⚠️ **Two checker wordings, and the second was written after seeing two results
from the first.** Wording A asks for every option that gives a natural
sentence. The smoke test (two sentences) showed it accepting `the` almost
anywhere, so wording B was added: what a speaker would say with no earlier
conversation. Both were then fixed and run on everything. Neither was tuned
afterwards. Both are quoted in full at the end.

**How a box is scored.** *Only the sourced answer* means the checker listed
that one article and nothing else in **all three runs**. A box where any run
listed a second answer does not count.

## Results

### The checker never contradicted the key

**0 of 66 sourced boxes**, under either wording, in any of 396 box-readings:
the sourced article was always in the list. The model knows which article the
native speaker used. What varies is what else it lists.

### Sourced sentences: agreement per rule

| rule | boxes | A: only the sourced answer | A: same set all 3 runs | B: only the sourced answer | B: same set all 3 runs |
|---|---|---|---|---|---|
| `new` | 10 | 0 | 8 | 8 | 8 |
| `known` | 7 | 0 | 5 | 2 | 3 |
| `general` | 12 | 0 | 9 | 11 | 12 |
| `job` | 6 | 0 | 6 | 6 | 6 |
| `routine` | 8 | 0 | 5 | 6 | 6 |
| `place-zero` | 8 | 7 | 7 | 8 | 8 |
| `place-the` | 8 | 8 | 8 | 8 | 8 |
| `unique` | 7 | 2 | 5 | 5 | 6 |
| **all** | 66 | 17 | 53 | 54 | 57 |

**A: 17 of 66. B: 54 of 66.** Same sentences, same model, same temperature.
The difference is the wording.

### The five rejects

| rejected sentence | key | A: runs listing a second answer | B: runs listing a second answer | B runs |
|---|---|---|---|---|
| [1] dogs are very smart. | – | 3/3 | 2/3 | –/the · –/the · – |
| [1] stars came out. | the | 3/3 | 2/3 | the · –/the · –/the |
| Look at [1] stars. | the | 3/3 | 0/3 | the · the · the |
| [1] kids like to play. | – | 3/3 | 2/3 | –/the · –/the · – |
| [1] milk is good for you. | – | 3/3 | 0/3 | – · – · – |

**A flagged 5 of 5, in every run. B flagged none of them in every run**: three
were flagged in two runs of three, and two were never flagged.

⚠️ **A catching all five is not discrimination.** It also lists a second answer
for 49 of the 66 sourced boxes (74%). It flags nearly everything outside place
names, the rejects included.

**Applied as a filter** (keep a sentence only if every box has one answer in
all three runs):

| | sourced boxes kept | rejects kept (should be 0) |
|---|---|---|
| A | 17 / 66 | 0 / 5 |
| B | 54 / 66 | 2 / 5 |

Five rejects is a small sample, and it is all there was.

### Generated: keep-rate

**40 generated. A keeps 13. B keeps 33.**

- A: `new` 0/5 · `known` 1/5 · `general` 0/5 · `job` 0/5 · `routine` 1/5 · `place-zero` 5/5 · `place-the` 5/5 · `unique` 1/5
- B: `new` 4/5 · `known` 2/5 · `general` 5/5 · `job` 5/5 · `routine` 3/5 · `place-zero` 5/5 · `place-the` 5/5 · `unique` 4/5

| # | generated, as returned | A | B |
|---|---|---|---|
| new-1 | I bought [a\|new] new shirt. | a/the · a/the · a/the | kept |
| new-2 | My sister wants to be [an\|new] engineer. | an/the · an/the · an/the | kept |
| new-3 | Could you please hand me [a\|new] book? | a/the · a/the · a/the | a/the · a/the · a/the |
| new-4 | That was [a\|new] really strange dream. | a/the · a/the · a/the | kept |
| new-5 | We need [a\|new] solution to this problem. | a/the · a/the · a/the | kept |
| known-1 | Please close [the\|known] door. | a/the · a/the · a/the | a/the · a/the · a/the |
| known-2 | Have you seen [the\|known] sun today? | kept | kept |
| known-3 | Pass me [the\|known] salt, please. | –/the · –/the · –/the | –/the · –/the · –/the |
| known-4 | Where did you put [the\|known] keys? | –/the · –/the · –/the | kept |
| known-5 | Let's meet at [the\|known] park entrance. | a/the · a/the · a/the | a/the · a/the · a/the |
| general-1 | I love [-\|general] music. | –/the · –/the · –/the | kept |
| general-2 | [-\|general] Birds build nests. | –/the · –/the · –/the | kept |
| general-3 | She enjoys reading books about [-\|general] history. | –/the · a/–/the · a/–/the | kept |
| general-4 | [-\|general] Children need guidance from adults. | –/the · –/the · –/the | kept |
| general-5 | They believe in [-\|general] equality for everyone. | an/–/the · –/the · an/–/the | kept |
| job-1 | My brother is [a\|job] doctor. | a/the · a/the · a/the | kept |
| job-2 | He wants to be [an\|job] engineer. | an/the · an/the · an/the | kept |
| job-3 | She works as [a\|job] teacher at a school. | a/the · a/the · a/the | kept |
| job-4 | Is your mother [a\|job] lawyer? | a/the · a/the · a/the | kept |
| job-5 | My friend is [an\|job] artist. | an/the · an/the · an/the | kept |
| routine-1 | I usually go to [-\|routine] bed around ten. | –/the · a/–/the · –/the | kept |
| routine-2 | She always leaves for [-\|routine] work early. | –/the · –/the · –/the | kept |
| routine-3 | My kids are at [-\|routine] school right now. | a/–/the · a/–/the · a/–/the | –/the · –/the · –/the |
| routine-4 | We should really go [-\|routine] home soon. | kept | kept |
| routine-5 | He just got out of [-\|routine] bed. | a/–/the · a/–/the · a/–/the | –/the · –/the · –/the |
| place-zero-1 | Many tourists visit [-\|place-zero] Asia annually. | kept | kept |
| place-zero-2 | They moved to [-\|place-zero] Canada for work. | kept | kept |
| place-zero-3 | Our flight lands in [-\|place-zero] Rome late tonight. | kept | kept |
| place-zero-4 | Climbing [-\|place-zero] Mount Kilimanjaro is a huge challenge. | kept | kept |
| place-zero-5 | Is [-\|place-zero] Lake Superior the largest freshwater lake? | kept | kept |
| place-the-1 | They crossed [the\|place-the] Atlantic Ocean last year. | kept | kept |
| place-the-2 | [the\|place-the] Nile is Earth's longest river. | kept | kept |
| place-the-3 | Hiking in [the\|place-the] Alps is wonderful. | kept | kept |
| place-the-4 | She moved to [the\|place-the] United States. | kept | kept |
| place-the-5 | We sailed across [the\|place-the] Mediterranean Sea. | kept | kept |
| unique-1 | Look at [the\|unique] sun setting over the ocean. | kept | kept |
| unique-2 | Is [the\|unique] moon visible from your window now? | the · a/the · a/the | kept |
| unique-3 | Scientists are exploring [the\|unique] Earth's deepest oceans. | –/the · –/the · –/the | – · – · – |
| unique-4 | We watched the stars in [the\|unique] night sky. | a/the · a/the · a/the | kept |
| unique-5 | Many people dream of travelling [the\|unique] world. | the · a/the · the | kept |

A cell shows `kept`, or the three runs' lists for the first box.

⚠️ **One generated answer was wrong, and the checker caught it.**
*Scientists are exploring [the] Earth's deepest oceans*: B listed only "no
article" in all three runs, which is the natural reading (*exploring Earth's
deepest oceans*). It is the only contradiction in the whole pass.

**What the checker cannot see, from reading the 33 that B kept.** This is one
reader's judgement against the draft's rule table, not a measurement:

- **Wrong rule, right article (2).** `new-2` *wants to be an engineer* is the
  `job` rule. `known-2` *the sun* is `unique`. The checker only sees the
  article, so a mis-tag passes.
- **Non-forcing by the draft's standard (1).** `general-4` *children need
  guidance* reads fine as *The children need…*, the same pattern as the five
  rejects.
- **Not a slot (1).** `routine-4` *go home*: `home` is an adverb there, and no
  article could ever go before it.
- **Outside the cited list (2).** `unique-4` *the night sky* and `unique-5`
  *the world*. Cambridge's list is sun, stars, moon, earth, planet.

That leaves 27 of 40 with nothing to object to.

### What the checker found in the draft

Reading B's disagreements as a review of the sourced set, **one is a real
defect**: *[ ] earth is round* and *[ ] earth goes around the sun* both take
no article as well (*Earth is round*), listed in 3 of 3 and 2 of 3 runs. The
draft treats `the earth` as forced. The others are judgement calls: *Turn off
a light*, *He walks to the school*, *Whales are not a fish*.

### Every sourced disagreement, wording B (12 boxes)

`–` is no article.

| sentence | box | rule | key | run 1 | run 2 | run 3 |
|---|---|---|---|---|---|---|
| [1] helium is [2] gas. | 2 | `new` | a | a/– | a | a/– |
| [1] water is [2] liquid. | 2 | `new` | a | a | a/– | a |
| Who broke [1] window? | 1 | `known` | the | a/the | the | the |
| Turn off [1] light. | 1 | `known` | the | a/the | a/the | a/the |
| Did you feed [1] dog? | 1 | `known` | the | the | a/the | the |
| Where did you put [1] keys? | 1 | `known` | the | –/the | the | the |
| Pass me [1] salt. | 1 | `known` | the | –/the | the | –/the |
| [1] whales are not [2] fish. | 2 | `general` | – | a/– | a/– | a/– |
| I work at [1] home. | 1 | `routine` | – | a/– | a/– | – |
| He walks to [1] school. | 1 | `routine` | – | –/the | a/–/the | a/–/the |
| [1] earth is round. | 1 | `unique` | the | –/the | –/the | –/the |
| [1] earth goes around [2] sun. | 1 | `unique` | the | –/the | –/the | the |

### Every sourced disagreement, wording A (49 boxes)

| sentence | box | rule | key | run 1 | run 2 | run 3 |
|---|---|---|---|---|---|---|
| There's [1] fly in my soup. | 1 | `new` | a | a/the | a/the | a/the |
| I have [1] brother. | 1 | `new` | a | a/the | a/the | a |
| [1] helium is [2] gas. | 2 | `new` | a | a/– | a/–/the | a/–/the |
| There's [1] cat in the box. | 1 | `new` | a | a/the | a/the | a/the |
| [1] water is [2] liquid. | 2 | `new` | a | a/–/the | a/–/the | a/–/the |
| There's [1] map on the wall. | 1 | `new` | a | a/the | a/the | a/the |
| She has [1] cat. [2] cat is white. | 1 | `new` | a | a/the | a/the | a/the |
| I have [1] idea. | 1 | `new` | an | an/the | an/the | an/the |
| I have [1] dog. | 1 | `new` | a | a/the | a/the | a/the |
| My uncle gave me [1] book yesterday. This is [2] book. | 1 | `new` | a | a/the | a/the | a/the |
| Who broke [1] window? | 1 | `known` | the | a/the | a/the | a/the |
| Turn off [1] light. | 1 | `known` | the | a/the | a/the | a/the |
| She has [1] cat. [2] cat is white. | 2 | `known` | the | the | a/the | a/the |
| Did you feed [1] dog? | 1 | `known` | the | a/the | a/the | a/the |
| Where did you put [1] keys? | 1 | `known` | the | –/the | –/the | –/the |
| Pass me [1] salt. | 1 | `known` | the | a/–/the | –/the | a/–/the |
| My uncle gave me [1] book yesterday. This is [2] book. | 2 | `known` | the | a/the | a/the | a/the |
| We eat [1] bread every day. | 1 | `general` | – | –/the | –/the | a/–/the |
| I usually drink [1] tea without [2] sugar. | 1 | `general` | – | a/–/the | a/–/the | a/–/the |
| I usually drink [1] tea without [2] sugar. | 2 | `general` | – | –/the | a/–/the | –/the |
| [1] gold is heavier than [2] iron. | 1 | `general` | – | –/the | –/the | –/the |
| [1] gold is heavier than [2] iron. | 2 | `general` | – | –/the | –/the | –/the |
| I only drink [1] water. | 1 | `general` | – | –/the | –/the | –/the |
| [1] helium is [2] gas. | 1 | `general` | – | – | –/the | –/the |
| [1] water freezes at 0 degrees Centigrade. | 1 | `general` | – | –/the | –/the | –/the |
| [1] water is [2] liquid. | 1 | `general` | – | –/the | –/the | –/the |
| [1] ice melts in [2] sun. | 1 | `general` | – | –/the | –/the | –/the |
| [1] whales are not [2] fish. | 1 | `general` | – | –/the | –/the | –/the |
| [1] whales are not [2] fish. | 2 | `general` | – | a/–/the | a/–/the | a/–/the |
| Tom is [1] accountant. | 1 | `job` | an | an/the | an/the | an/the |
| Tom, my neighbor, is [1] carpenter. | 1 | `job` | a | a/the | a/the | a/the |
| I want to be [1] actor. | 1 | `job` | an | an/the | an/the | an/the |
| Tom is [1] engineer. | 1 | `job` | an | an/the | an/the | an/the |
| Why did you become [1] doctor? | 1 | `job` | a | a/the | a/the | a/the |
| Tom will be [1] teacher. | 1 | `job` | a | a/the | a/the | a/the |
| I didn't feel very well, but I went to [1] work anyway. | 1 | `routine` | – | – | –/the | –/the |
| I work at [1] home. | 1 | `routine` | – | a/–/the | a/–/the | a/–/the |
| I am at [1] home. | 1 | `routine` | – | a/–/the | a/–/the | a/–/the |
| He walks to [1] school. | 1 | `routine` | – | a/–/the | a/–/the | a/–/the |
| Tom was late for [1] school. | 1 | `routine` | – | a/–/the | –/the | a/–/the |
| What time do you leave [1] work? | 1 | `routine` | – | –/the | – | –/the |
| I think I'll go to [1] bed. | 1 | `routine` | – | a/–/the | a/–/the | a/–/the |
| Tom told his children to go to [1] bed. | 1 | `routine` | – | a/–/the | a/–/the | a/–/the |
| I was in [1] Boston last summer. | 1 | `place-zero` | – | –/the | – | – |
| Look at [1] moon. | 1 | `unique` | the | a/the | a/the | a/the |
| [1] earth is round. | 1 | `unique` | the | –/the | –/the | –/the |
| [1] earth goes around [2] sun. | 1 | `unique` | the | –/the | –/the | –/the |
| [1] earth goes around [2] sun. | 2 | `unique` | the | a/–/the | the | the |
| [1] sun is up. | 1 | `unique` | the | the | the | a/the |

### Run-to-run stability

Sourced boxes that got the same list in all three runs: **A 53 of 66, B 57 of
66.** Generated: A 35 of 40, B 40 of 40. `known` is the least stable rule
under B (3 of 7).

## Cost

Measured from the API's usage metadata, all 602 calls:

| | calls | input | output | thinking |
|---|---|---|---|---|
| checker | 594 | 130,725 | 12,661 | 380,111 |
| generator | 8 | 1,919 | 689 | 10,354 |
| **total** | **602** | **132,644** | **13,350** | **390,465** |

**Thinking is 97% of what the model produced.** A checker call averages 220
tokens in, 21 out and 640 thinking.

The dollar figure is an estimate and the token counts are not: at $0.30 per
million input and $2.50 per million output including thinking (the list price
as recalled, not looked up on the day), the whole pass is about **$1.05**, a
checker call about **$0.0017**, and one sentence checked three times about
**half a cent**.

## The wordings, in full

### Checker A

```
You are checking a fill-in-the-blank exercise on English articles.

The sentence below has numbered blanks. Each blank sits where an article could go. For each blank, list EVERY option that gives a sentence a native English speaker could naturally say, reading the sentence on its own with no other context. The options are:

- "a"
- "an"
- "the"
- "none" (nothing goes in the blank)

Some blanks have exactly one option that fits. Others have two or more. List all that fit and only those. Do not pick a favourite. An option fits if the sentence is natural with it, even when it changes the meaning (for example from things in general to particular ones). Words already printed in the sentence are fixed. Ignore capitalisation.

Sentence: {q}

Return JSON only, one key per blank number, each a list of the options that fit, e.g. {"1": ["a"], "2": ["the", "none"]}
```

### Checker B

```
You are checking a fill-in-the-blank exercise on English articles.

The sentence below has numbered blanks. Each blank sits where an article could go. Imagine a native English speaker saying this sentence with no earlier conversation: nothing has been mentioned before, and the listener knows only what the sentence itself tells them plus ordinary knowledge of the world and of the room they are in. For each blank, list the options that speaker would use:

- "a"
- "an"
- "the"
- "none" (nothing goes in the blank)

If two or more options are all normal in that situation, list all of them. Leave out an option that only works if the listener already knew about something the sentence does not establish, and leave out anything that sounds odd. Words already printed in the sentence are fixed. Ignore capitalisation.

Sentence: {q}

Return JSON only, one key per blank number, each a list of options, e.g. {"1": ["a"], "2": ["the", "none"]}
```

### Generator

```
Write {n} short English sentences (4 to 12 words each) for an exercise on articles, for adult learners.

Each sentence must test this rule:
  rule "{rule}": use {ans} when {text}.

Requirements:
- Mark the article slot being tested as [form|{rule}], where form is a, an, the, or - (a hyphen, for no article), written in place of the article. For no article write the marker where an article would have gone, followed by a space. Examples: "She is [a|job] nurse." / "I go to [-|routine] bed early."
- The context must FORCE the answer: with the marked slot blanked, a native speaker reading the sentence alone would accept only that one answer. Avoid sentences where another article would also be natural.
- Mark only slots that test this rule. Any other article in the sentence is written normally.
- Plain everyday sentences, all different from each other. American and British speakers must agree on the article.

Return JSON only: {"sentences": ["...", "..."]}
```

`{q}` is the rendered sentence; `{n}`, `{rule}`, `{ans}` and `{text}` come from
the draft's rule table. The scripts were throwaway and are not in the repo.

