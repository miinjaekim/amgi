# `pitch-accents.txt`

Tokyo-standard pitch accent for 107,943 Japanese words, as
`surface⇥reading⇥accent`. `accent` is the アクセント核 position: `0` is 平板 (no
drop), otherwise the mora **after** which the pitch falls.

## Where it comes from, and why it is not the model

Derived from [kanjium](https://github.com/mifunetoshiro/kanjium)'s
`data/source_files/raw/accents.txt`, **CC BY-SA 4.0** — attribution is required
wherever this ships, which is why `PitchAccentCredit` renders on the Japanese
deck rather than being left to a licence file nobody opens.

`/api/explain` fills every other reading field from Gemini. This one it does
**not**, and the reason is measured rather than assumed. Probed on 27 terms with
known NHK values, three runs each at the route's own temperature (0.1):

| source | correct |
|---|---|
| `gemini-2.5-flash` | **6 / 27** |
| this file | **27 / 27** |

The model is not noisy, it is *stably wrong* — 18 of 27 terms returned the same
answer all three runs, so self-consistency proves nothing here. It defaults to
`1` (頭高) and, in doing so, collapses exactly the minimal pairs that justify the
feature: 雨 and 飴 both came back `1`, 花 and 鼻 both `1`, 髪·神·紙 all `1`. A
learner would be taught that the distinguishing pairs do not distinguish.

## Trimming

kanjium ships 124,137 rows; this keeps 107,943. Dropped: rows with no accent
value, and **alternate accents** — `木漏れ日` is `3,0` upstream and `3` here.
Re-checked after trimming, the 27 ground-truth values still agree 27/27, so the
first-listed accent is the primary one. Restore the alternates from upstream if
a surface ever needs to show "or".

## Updating

Re-run the trim against a fresh upstream copy:

```
curl -sL https://raw.githubusercontent.com/mifunetoshiro/kanjium/master/data/source_files/raw/accents.txt \
  | awk -F'\t' 'NF>=3 && $3!="" { split($3,a,","); if (a[1] ~ /^[0-9]+$/) print $1"\t"$2"\t"a[1] }' \
  > apps/web/src/data/pitch-accents.txt
```

**Server-side only.** It is read by `/api/explain` and must never be imported
into a client component or `packages/core` — 2.7 MB in the mobile bundle is the
whole reason the lookup lives on the route. `outputFileTracingIncludes` in
`next.config.ts` is what gets it into the deployed function; without that entry
the route silently finds no file and every card loses its badge.

# `jyutping.txt`

Jyutping for 128,818 Cantonese words and characters, as
`surface⇥reading[,reading…]`. Readings are lowercase with tone numbers, one
syllable per character, space-separated: `廣東話⇥gwong2 dung1 waa2`. 6,669
surfaces list more than one, ordered by the source's own weight, so the first is
the one to fall back on: `嘅⇥ge3,ge2,koi2,koi3`.

## Where it comes from, and why the model is only half of it

Derived from [rime-cantonese](https://github.com/rime/rime-cantonese)'s
`jyut6ping3.chars.dict.yaml` and `jyut6ping3.words.dict.yaml` (release
2026.08.10), **CC BY 4.0** — attribution is required wherever this ships, which
is why `JYUTPING_CREDIT` renders beside the Cantonese pronunciation note on both
apps. No share-alike, unlike the table above.

`/api/explain` asks Gemini for the reading and then `lookupJyutping` checks it
against this file. Measured 2026-10-04 on 144 terms across five bands (30 common,
30 everyday, 20 formal or rare, 31 built on multi-reading characters, 33
colloquial-only characters like 嘅 咗 啲 嚟), three runs each at the route's own
temperature (0.1), inside the route's prompt shape. One term (還錢) is in no
dictionary and is left out of the denominators:

| | right on all three runs |
|---|---|
| `gemini-2.5-flash`, judged against rime-cantonese ∪ CC-Canto | **121 / 143** (386 / 429 runs) |
| …on the multi-reading band alone | **22 / 30** |
| `gemini-2.5-flash`, judged against CC-Canto alone | 116 / 140 |
| the same answers after `lookupJyutping`, against CC-Canto alone | **135 / 140** |

The model is far better at this than at pitch accent (6/27), which is why it is
still asked. It is not good enough to be the last word:

- **Where the misses fall.** 18 of the 22 were a wrong segment and 4 a wrong
  tone alone. The largest group is a multi-reading character read the common
  way in a word that takes the other: 長大 as `coeng4`, 傳記 as `cyun4`, 重量
  and 重複 as `zung6`, 朝代 as `ziu1`. Then vowel length (`sang1`/`saang1` in
  學生, `ngam1`/`ngaam1` in 啱, `gam1` in 尷尬), and Yale spelling leaking in:
  `yu5` for `jyu5` in 落雨, `yun2` in 醫院, `ye5` for 嘢.
- **Repeated runs.** 126 of 144 terms returned one answer three times. Of the
  22 misses, 15 were unstable and **7 were the same wrong answer every run** —
  the pitch accent lesson again, in a milder form: agreement between runs is not
  evidence.
- **The five that still disagree with CC-Canto** after the lookup are the two
  dictionaries disagreeing with each other on a real variant (身份證 `fan2` or
  `fan6`, 行路 `haang4` or `hang4`, 使用, 大使), plus one CC-Canto row that does
  not parse (乜).

Coverage of the 144: 141 are in this file. A term that is not — a phrase, a new
coinage — keeps the model's reading, which is the 85% case rather than nothing.

## Why not the alternatives

- **CC-Canto** (CC BY-SA 3.0) is 8.8 MB across its two files and was last
  released in 2017 and 2015. It served as the independent reference above
  instead.
- **words.hk** is released under its own Non-Commercial Open Data License, which
  rules it out for an app that intends to charge.

## Updating

Re-run the trim against a fresh upstream copy. `sort -s` keeps the upstream order
among readings of equal weight, and an unweighted row counts as 100:

```
curl -sL https://raw.githubusercontent.com/rime/rime-cantonese/main/jyut6ping3.chars.dict.yaml \
         https://raw.githubusercontent.com/rime/rime-cantonese/main/jyut6ping3.words.dict.yaml \
  | awk -F'\t' '$2 ~ /^[a-z]+[1-6]( [a-z]+[1-6])*$/ { print $1 "\t" $2 "\t" ($3 == "" ? 100 : $3 + 0) }' \
  | LC_ALL=C sort -s -t"$(printf '\t')" -k1,1 -k3,3nr \
  | awk -F'\t' '{ if ($1 == prev) printf ",%s", $2; else { if (NR > 1) printf "\n"; printf "%s\t%s", $1, $2 } prev = $1 } END { printf "\n" }' \
  > apps/web/src/data/jyutping.txt
```

**Server-side only**, for the reason given above for the pitch accent table:
2.9 MB. It is read by `/api/explain` and `/api/word-of-the-day`, and both are
listed under `outputFileTracingIncludes` in `next.config.ts`. Without the entry
the lookup finds no file and every Cantonese card silently keeps the model's
unchecked reading.
