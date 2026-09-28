# English Articles — Draft for Review

**Munli's second practice type, and the first that isn't conjugation.** An
article is a *choice* rather than a form, so this is a new kind of question
rather than a new dataset for the conjugation one. It is written here first
because [README.md](README.md) governs: **the model is not a source**, and both
halves of this — which rules exist, and which sentences test them — are claims
about English.

**8 rules, 54 sentences, 66 boxes.** Every sentence was written by a native
English speaker on Tatoeba, and the answer in every box is that sentence's own
article. The model chose and tagged the sentences but wrote none of them.

Designed with the user 2026-09-28: **articles before prepositions**, **a box on
every slot**, **only contexts that force one answer**, and **the rule, not the
sentence, is what gets scheduled**.

---

## Calls that need you

1. **Slots that aren't forcing are shown filled, not blanked.** "Box every
   slot" was the call, and forcing contexts was the other. They collide in
   *There's a cat in **the** box*: `a` is forced (nobody says *there's the
   cat*) but `the box` is not (*in a box* is fine). So `the box` is printed
   and only `a` gets a box. The same goes for fixed phrases (*for **a** walk*),
   directions (*in **the** east*) and anything outside the eight rules. The
   cost: a filled article shows the learner where a slot is, which is half of
   what a Korean speaker is learning. The alternative is dropping every
   sentence that has a non-forcing slot, and that removes most of the
   `new` rule.
2. **How "no article" is typed.** Proposed: `-`, plus the dashes an iOS
   keyboard substitutes for it (`–` `—`), plus `x`. An **empty box doesn't
   count**. Check is held until every box has something in it (as in
   conjugation), and an empty box meaning "nothing" would make "I didn't
   answer" and "I answered no article" the same thing.
3. **`a` where `an` belongs.** The *choice* was right and the *form* was wrong.
   Proposed: `hard`, shown with the correction, rather than `again`. The rule
   being scheduled is about choosing, and a/an is a form rule (see below)
   riding along with it. Marking it `again` would drill the choice for a
   spelling slip.
4. **What happens to a box whose rule isn't due.** A sentence can carry two
   rules (*[ ] London is on [ ] Thames*). Conjugation hides non-due boxes
   because a filled `je parle` gives away `tu parles`. Here nothing leaks
   between boxes, so the proposal is: **every box is asked, only a due rule's
   box writes a schedule**, and the others are practice. Rating a non-due
   rule early would reschedule it on evidence it didn't wait for.
5. **Two rules are tier B**, and B ships if it says so: `unique` (Cambridge
   only) and the `home` sentences inside `routine` (British Council only).
   Keep both?
6. **The Korean rule names are a draft** (the 한국어 column below). They need
   your approval, as all Korean copy does.

## What a question looks like

```
She has [   ] cat. [   ] cat is white.          → a · the
[   ] London is on [   ] Thames.                 → – · the
There's [   ] cat in the box.                    → a        (the box: given)
```

The learner types `a`, `an`, `the` or `-` into each box. Grading is
case-insensitive (`The` = `the`). After Check, each box shows ✓/✗ and **the
name of its rule**, which is the explanation. Hints are still to be designed,
and an honest one is hard here: naming the rule is almost the answer, since
each rule maps to exactly one answer. So a hint probably has to cost a miss,
the way two hints do in conjugation.

⚠️ **Rendering found a leak, and it's fixed in the tables below.** When a box
opens a sentence, the next word's capital gives the answer away. *[ ] Water is
a liquid* says "nothing goes here", and *[ ] cat is white* says "something
does". **The word after a sentence-opening box is lowercased unless it's a
proper noun** (*[ ] London*, *[ ] Mount Fuji* keep theirs, and a proper
noun's capital is about the noun, not its position). This has to be a rule
in the renderer, not in the data, so the test pins it.

## The rules

Two independent published references. Both are learner grammars from
different publishers, not one database behind two skins.

| # | source | what it is |
|---|---|---|
| C | [Cambridge Dictionary, *A/an and the*](https://dictionary.cambridge.org/grammar/british-grammar/a-an-and-the), adapted from *English Grammar Today* (Carter, McCarthy, Mark, O'Keeffe; Cambridge University Press 2016) | published reference grammar |
| BC | British Council LearnEnglish, [*Articles: a, an, the*](https://learnenglish.britishcouncil.org/grammar/a1-a2-grammar/articles-a-an-the) and [*Articles: 'the' or no article*](https://learnenglish.britishcouncil.org/free-resources/grammar/a1-a2-grammar/articles-the-or-no-article) | published learner grammar |

Consulted 2026-09-28. Nothing is taken from either but the rule itself. The
explanations shown in the app will be written fresh.

| id | answer | rule | 한국어 (draft) | tier | C says | BC says |
|---|---|---|---|---|---|---|
| `new` | a/an | not already known to the listener; one of a group or type | 처음 꺼내는 것 | **A** | "A/an before a noun shows that what is referred to is not already known" | "first mention … or something that is part of a group or type" |
| `known` | the | both sides know which one | 서로 아는 것 | **A** | "The before a noun shows that what is referred to is already known" | "when the listener knows which specific item is meant" — *take the dog for a walk* |
| `general` | – | plural or uncountable nouns, meant in general | 일반적인 것 (복수·셀 수 없는 명사) | **A** | "We don't use the with plural nouns when we are referring to things in general"; no a/an before uncountables | "General things": *Birds eat worms. Water freezes at 0°C.* |
| `job` | a/an | saying what someone's job is | 직업 | **A** | "When we talk about a person's job, we use a" | "Use a/an when describing occupations" |
| `routine` | – | bed, work, school, home as what you do there, not the building | 본래 용도로 가는 곳 | **A** (bed, work, school) · **B** (home: BC only) | bed, work, school "when we talk about the activity" | "go to bed … go to work … go home … go to school" |
| `place-zero` | – | continents, countries, cities, Mount X, Lake X | 나라·도시·산·호수 이름 | **A** | "We don't use articles with continents, countries, towns …" and Mount/Lake names | "No article for continents, most countries, cities … Lake Victoria; Mount Everest" |
| `place-the` | the | oceans and seas, rivers, mountain ranges, *United …* | 바다·강·산맥 이름 | **A** | "mountain ranges … rivers … seas"; "some countries" | "Seas, oceans, and mountain ranges"; *the Nile*; "Countries with 'United'" |
| `unique` | the | things there is only one of: the sun, the moon, the earth | 하나뿐인 것 | **B** (C only) | "things known to everyone (the sun, the stars, the moon, the earth, the planet)" | — |

**a vs an is a form rule, not a ninth rule.** It is the one both sources state
most plainly: `a` before a consonant *sound*, `an` before a vowel *sound*
(*a university*, *an hour*). vision.md's split is "name a form rule, hide a
choice pattern", and it isn't scheduled: it's graded inside every `new` and
`job` box. See call 3.

### What's deliberately not here

- **`hospital`, `university`, `college`.** British and American English split
  on them (*in hospital* / *in the hospital*, *at university* / *in college*),
  so a box would be wrong for half the audience. Cambridge's own examples are
  British and Tatoeba's are mostly American. The same split was checked for
  every sentence below.
- **Everyday things** (*take the train*), **the + adjective** (*the rich*),
  **inventions and instruments** (*the violin*), **months and seasons**,
  **the Internet / the radio**. All Cambridge only (B), and each one a
  narrower pattern than the eight above. They can be added once these are in
  use.
- **Superlatives, ordinals, *the capital of X*.** Real `the` rules, but
  neither source files them under articles.
- **Plural indefinite** (*Birds have [–] sharp eyes*). No article is right,
  but no rule above names it (it's the plural of `new`), so those slots are
  given or the sentence is left out.

## Sentences

**Source: [Tatoeba](https://tatoeba.org), CC BY 2.0 FR.** Filtered to authors
who list English at native level, 4–16 words. Checked by script against
Tatoeba's export of 2026-09-26: **every sentence below, with its articles
restored, is character for character the Tatoeba text**, and **none has a
negative review**. 50 of 54 have a positive one; the four without are marked.
CK, who wrote most of these, is the largest English contributor in the
export (748,173 sentences; next is 220,680).

⚠️ **The tags are the model's judgement, and they're what you're reviewing.**
The sentence and its answer are sourced. Which rule a box tests, and whether
the context really forces one answer, is a reading of the rule text above.
Five sentences were swapped out on that check before this draft, all for the
same reason: **a general subject only forces no-article when the predicate is
a fact about the whole kind.** *[ ] dogs are very smart* also reads fine as
*The dogs are very smart* (these dogs), and so did *kids like to play* and
*milk is good for you*. *Gold is heavier than iron* doesn't have that
problem. *Look at [ ] stars* and *[ ] stars came out* went for the same
reason.

A sentence with two rules is filed under the less common one.

### `new`

| # | question | answers | Tatoeba |
|---|---|---|---|
| 1 | There's [ ] cat in the box. | `a` new | [#2652530](https://tatoeba.org/en/sentences/show/2652530) · CK |
| 2 | There's [ ] map on the wall. | `a` new | [#2713355](https://tatoeba.org/en/sentences/show/2713355) · CK |
| 3 | I have [ ] dog. | `a` new | [#378502](https://tatoeba.org/en/sentences/show/378502) · CK |
| 4 | I have [ ] brother. | `a` new | [#2358668](https://tatoeba.org/en/sentences/show/2358668) · CK |
| 5 | I have [ ] idea. | `an` new | [#34684](https://tatoeba.org/en/sentences/show/34684) · CK |
| 6 | There's [ ] fly in my soup. | `a` new | [#11490822](https://tatoeba.org/en/sentences/show/11490822) · CK |
| 7 | [ ] water is [ ] liquid. | `–` general · `a` new | [#270793](https://tatoeba.org/en/sentences/show/270793) · CK |
| 8 | [ ] helium is [ ] gas. | `–` general · `a` new | [#2549565](https://tatoeba.org/en/sentences/show/2549565) · CK |

### `known`

| # | question | answers | Tatoeba |
|---|---|---|---|
| 1 | She has [ ] cat. [ ] cat is white. | `a` new · `the` known | [#316114](https://tatoeba.org/en/sentences/show/316114) · CK |
| 2 | My uncle gave me [ ] book yesterday. This is [ ] book. | `a` new · `the` known | [#65061](https://tatoeba.org/en/sentences/show/65061) · CM |
| 3 | Turn off [ ] light. | `the` known | [#279153](https://tatoeba.org/en/sentences/show/279153) · CK |
| 4 | Did you feed [ ] dog? | `the` known | [#3393036](https://tatoeba.org/en/sentences/show/3393036) · CK |
| 5 | Who broke [ ] window? | `the` known | [#274231](https://tatoeba.org/en/sentences/show/274231) · CK |
| 6 | Where did you put [ ] keys? | `the` known | [#3573737](https://tatoeba.org/en/sentences/show/3573737) · CK |
| 7 | Pass me [ ] salt. | `the` known | [#64750](https://tatoeba.org/en/sentences/show/64750) · CK |

### `general`

| # | question | answers | Tatoeba |
|---|---|---|---|
| 1 | [ ] gold is heavier than [ ] iron. | `–` general · `–` general | [#18578](https://tatoeba.org/en/sentences/show/18578) · CK |
| 2 | [ ] whales are not [ ] fish. | `–` general · `–` general | [#8671585](https://tatoeba.org/en/sentences/show/8671585) · Hybrid |
| 3 | [ ] water freezes at 0 degrees Centigrade. | `–` general | [#270776](https://tatoeba.org/en/sentences/show/270776) · CK |
| 4 | I only drink [ ] water. | `–` general | [#1956033](https://tatoeba.org/en/sentences/show/1956033) · CK |
| 5 | We eat [ ] bread every day. | `–` general | [#11598323](https://tatoeba.org/en/sentences/show/11598323) · CK |
| 6 | I usually drink [ ] tea without [ ] sugar. | `–` general · `–` general | [#12070330](https://tatoeba.org/en/sentences/show/12070330) · CK |

### `job`

| # | question | answers | Tatoeba |
|---|---|---|---|
| 1 | Tom will be [ ] teacher. | `a` job | [#6440297](https://tatoeba.org/en/sentences/show/6440297) · CK |
| 2 | Why did you become [ ] doctor? | `a` job | [#3825182](https://tatoeba.org/en/sentences/show/3825182) · CK |
| 3 | Tom is [ ] engineer. | `an` job | [#2272946](https://tatoeba.org/en/sentences/show/2272946) · CK |
| 4 | I want to be [ ] actor. | `an` job | [#2090871](https://tatoeba.org/en/sentences/show/2090871) · CK |
| 5 | Tom, my neighbor, is [ ] carpenter. | `a` job | [#11170980](https://tatoeba.org/en/sentences/show/11170980) · CK |
| 6 | Tom is [ ] accountant. | `an` job | [#1025092](https://tatoeba.org/en/sentences/show/1025092) · CK |

### `routine`

| # | question | answers | Tatoeba |
|---|---|---|---|
| 1 | I think I'll go to [ ] bed. | `–` routine | [#5636521](https://tatoeba.org/en/sentences/show/5636521) · CK |
| 2 | Tom told his children to go to [ ] bed. | `–` routine | [#8956148](https://tatoeba.org/en/sentences/show/8956148) · CK |
| 3 | What time do you leave [ ] work? | `–` routine | [#3738101](https://tatoeba.org/en/sentences/show/3738101) · CK |
| 4 | I didn't feel very well, but I went to [ ] work anyway. | `–` routine | [#1770856](https://tatoeba.org/en/sentences/show/1770856) · CK |
| 5 | He walks to [ ] school. | `–` routine | [#303609](https://tatoeba.org/en/sentences/show/303609) · CK |
| 6 | Tom was late for [ ] school. | `–` routine | [#3496586](https://tatoeba.org/en/sentences/show/3496586) · CK |
| 7 | I am at [ ] home. | `–` routine | [#29049](https://tatoeba.org/en/sentences/show/29049) · CK |
| 8 | I work at [ ] home. | `–` routine | [#2549653](https://tatoeba.org/en/sentences/show/2549653) · CK |

### `place-zero`

| # | question | answers | Tatoeba |
|---|---|---|---|
| 1 | I go to [ ] Boston every week. | `–` place-zero | [#6268070](https://tatoeba.org/en/sentences/show/6268070) · CK |
| 2 | Is English spoken in [ ] Canada? | `–` place-zero | [#26296](https://tatoeba.org/en/sentences/show/26296) · CK |
| 3 | [ ] Mount Fuji is beautiful. | `–` place-zero | [#3511308](https://tatoeba.org/en/sentences/show/3511308) · Hybrid (unreviewed) |
| 4 | How deep is [ ] Lake Biwa? | `–` place-zero | [#318134](https://tatoeba.org/en/sentences/show/318134) · CK |
| 5 | Tom climbed [ ] Mount Everest. | `–` place-zero | [#7890267](https://tatoeba.org/en/sentences/show/7890267) · Hybrid (unreviewed) |
| 6 | I was in [ ] Boston last summer. | `–` place-zero | [#5266998](https://tatoeba.org/en/sentences/show/5266998) · CK |

### `place-the`

| # | question | answers | Tatoeba |
|---|---|---|---|
| 1 | [ ] London is on [ ] Thames. | `–` place-zero · `the` place-the | [#29276](https://tatoeba.org/en/sentences/show/29276) · CK |
| 2 | Where are [ ] Alps? | `the` place-the | [#9194873](https://tatoeba.org/en/sentences/show/9194873) · CK |
| 3 | We flew across [ ] Atlantic. | `the` place-the | [#275785](https://tatoeba.org/en/sentences/show/275785) · CK |
| 4 | [ ] Toronto isn't in [ ] United States. | `–` place-zero · `the` place-the | [#6607782](https://tatoeba.org/en/sentences/show/6607782) · MaryJ (unreviewed) |
| 5 | [ ] Himalayas are higher than [ ] Alps. | `the` place-the · `the` place-the | [#719349](https://tatoeba.org/en/sentences/show/719349) · CM |
| 6 | Where is [ ] Nile? | `the` place-the | [#11952867](https://tatoeba.org/en/sentences/show/11952867) · sundown (unreviewed) |
| 7 | I've never seen [ ] Pacific Ocean. | `the` place-the | [#5937335](https://tatoeba.org/en/sentences/show/5937335) · CK |

### `unique`

| # | question | answers | Tatoeba |
|---|---|---|---|
| 1 | [ ] sun is up. | `the` unique | [#281047](https://tatoeba.org/en/sentences/show/281047) · CK |
| 2 | Look at [ ] moon. | `the` unique | [#2648775](https://tatoeba.org/en/sentences/show/2648775) · CK |
| 3 | [ ] earth is round. | `the` unique | [#277121](https://tatoeba.org/en/sentences/show/277121) · CK |
| 4 | [ ] sun rises in the east. | `the` unique | [#6267360](https://tatoeba.org/en/sentences/show/6267360) · CK |
| 5 | [ ] earth goes around [ ] sun. | `the` unique · `the` unique | [#277137](https://tatoeba.org/en/sentences/show/277137) · CK |
| 6 | [ ] ice melts in [ ] sun. | `–` general · `the` unique | [#318330](https://tatoeba.org/en/sentences/show/318330) · CM |

### Licence

**CC BY 2.0 FR requires attribution, and the data carries it.** Each sentence
is stored with its Tatoeba id and author, and the Articles topic screen needs a
line crediting Tatoeba with a link: *"Sentences from Tatoeba (CC BY 2.0 FR)"*.
Unlike the Wiktionnaire case in the irregular verbs draft, there is **no
share-alike**, so taking the sentences puts no obligation on the repo beyond
the credit. A Tatoeba sentence is authored text, not a fact about the
language. That makes it different from a verb form, and it's why attribution
is owed here when it wasn't there.

## How this was found, for the next batch

Everything below is repeatable from Tatoeba's weekly exports. Nothing was
searched by hand.

1. `per_language/eng/eng_sentences_detailed.tsv` (text + author) and
   `user_languages.csv`, keeping authors whose English is level 5.
2. A regex per rule to pull candidate pools: `There's a X in the Y`,
   `is a/an <job>`, `go to bed|work|school`, `the <sea|river|range>`, etc.
3. Picked by hand for forcing, with a preference for CK's sentences.
4. `users_sentences.csv` for reviews: any `-1` disqualifies.
5. The annotated list is checked by stripping its boxes and comparing it with
   the export text.
