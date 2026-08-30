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
