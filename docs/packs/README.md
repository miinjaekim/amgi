# Vocab pack drafts

Every curated pack is written here first, reviewed as a markdown file, and only
then translated into `packages/core`. The draft is not a by-product — it is the
artifact a reviewer can actually mark up, and it stays afterwards as the record
of *why* an entry reads the way it does, which a source diff cannot show.

Read [daily-life-pack-draft.md](daily-life-pack-draft.md) for the shape and
[spanish-basics-pack-draft.md](spanish-basics-pack-draft.md) for the fullest
worked example: word list and every back column in one file, leading with the
calls that need a decision, and closing with what review changed.

---

## Packs are sourced, and the draft says where from

_Standard set 2026-08-31, after the Kikuyu pack made the cost of not doing it
obvious._

**The model is not a source.** That is the whole rule; everything below is
mechanism. Asking a model to check its own word list is not corroboration —
`docs/pronunciation-research.md` measured 18 of 27 Japanese terms identical
across three runs with only 6 correct, and Kikuyu tone self-consistent on 2 of
19. **Self-consistency is not evidence of correctness**, so a second pass over a
generated list only launders the first one.

**Every entry carries a tier and a citation**, as columns in the table rather
than a paragraph at the bottom. The point is that a reviewer can see which rows
are load-bearing guesses without reading the whole list.

| tier | means | what to do with it |
|---|---|---|
| **A** | two independent sources agree, **spelling included** | ship |
| **B** | one source | ship, and say so |
| **C** | no source found — an assertion | cut it, or get it checked before merge |
| **D** | derived from a sourced stem plus a sourced rule | cite **both**; weaker than B |

**Orthography is part of the citation.** A source that drops diacritics
corroborates the *word* and not the *spelling* — lughayangu gives `Muthuri` and
`Uhoro` where the standard orthography is `mũthuuri` and `ũhoro`, and on a
language whose `ĩ`/`ũ` distinguish words that is most of what you needed. Cite
it as B for the word and leave the spelling unsourced.

**Rank sources before trusting them.** A published reference (Benson's
*Kikuyu-English Dictionary*, Oxford 1964; the RAE for Spanish) beats a
linguistics grammar, which beats a curated phrase site, which beats a
community-contributed wiki. The bottom tier is not merely thinner — it is
*contaminated*: lughayangu returns `Nakupenda` as Kikuyu, which is Swahili, and
that is the same failure the registry already refuses a Swahili TTS voice for.

**Record conflicts, do not resolve them silently.** Two sources giving `guka`
and `wagui` for grandfather is a fact about the language or about the sources,
and either way the reviewer should see both. A draft that picks one and says
nothing has spent the reviewer's only chance to catch it.

**A speaker outranks the lot.** The Kikuyu respelling was wrong three times, and
every one was caught by someone who can hear the language — none by review, and
none by reading more sources. See the lesson in `.scratchpad/lessons.md`. For a
language the model knows badly, a native check is a merge gate, not a nicety.

**Scale the obligation to the language.** Spanish needed sources for register
and variety calls — which word Spain uses — because the vocabulary itself was
never in doubt. Kikuyu needs one per entry. The test is not "is this language
obscure" but **"has the model been measured wrong here"**, and for Kikuyu this
repo has measured it wrong twice already: noun class (3 of 8) and tone (2 of 19).

## Render the pack before you believe the list

A word list is not what the learner sees. Run the entries through whatever
transforms the app applies — `kikuyuToEnglish`, `kikuyuToHangul`, the furigana
path — and put the **actual output** in the draft beside each entry. Building
the Kikuyu draft that way surfaced a syllabification bug in ten minutes, in the
word for "hello", that reading the table would never have shown.
