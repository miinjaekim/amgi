#!/usr/bin/env python3
"""Builds the Hanja 급수 pack's entries from sourced data. Nothing here is
authored: every field is a source's own text or a stated cut of one.

Kept beside the draft because the draft's `tier` column is a *claim about
provenance*, and this is what backs it — re-runnable, so a reviewer can check
the cut rather than take it on faith.

Inputs, into a working directory:

    # 어문회 배정한자 — the official XLS transcribed to CSV. Through the
    # contents API rather than raw.githubusercontent, which this sandbox
    # blocks, and deliberately not through a fetch-and-summarise tool: that
    # puts a model between the source and the file, which is the one thing
    # `docs/packs/README.md` forbids outright.
    for L in 8급 7급Ⅱ 7급 6급Ⅱ 6급; do
      gh api "repos/rycont/hanja-grade-dataset/contents/by-level/$(python3 -c \
        'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))' "$L").csv" \
        --jq .content | base64 -d > "lvl_$L.csv"
    done

    curl -sSLO https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip
    unzip -o Unihan.zip

Then:

    python3 docs/packs/hanja-geupsu-ingest.py <working-dir> > entries.json
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
import csv, ast, json, re, unicodedata as ud
from collections import Counter
S = sys.argv[1] if len(sys.argv) > 1 else '.'
LEVELS = ['8급', '7급Ⅱ', '7급', '6급Ⅱ', '6급']

# ⚠️ NFC at ingest. Four rows in the source (金 車 不 樂) are CJK Compatibility
# Ideographs — U+F90A not U+91D1 — which look identical and are not the same
# character. They are exactly the four with two Korean readings, which is what
# that Unicode block is for. Stored raw, a card front would fail to match typed
# input, the kanji pack, and the pack's own saved-marking.
norm = lambda s: ud.normalize('NFC', s)

chars, order = {}, []
for lv in LEVELS:
    for r in csv.DictReader(open(f'{S}/lvl_{lv}.csv', encoding='utf-8')):
        ch = norm(r['hanja'])
        assert ch not in chars, f'{ch} appears twice'
        groups = ast.literal_eval(r['meaning'])
        chars[ch] = {'level': lv,
                     'readings': [(norm(', '.join(g[0])), norm('/'.join(g[1]))) for g in groups],
                     'strokes': r['total_strokes'], 'radical': norm(r['radical'])}
        order.append(ch)

uni = {}
for fn in ('Unihan_Readings.txt', 'Unihan_DictionaryLikeData.txt'):
    for line in open(f'{S}/{fn}', encoding='utf-8'):
        if line.startswith('#') or '\t' not in line: continue
        cp, field, val = line.rstrip('\n').split('\t', 2)
        ch = norm(chr(int(cp[2:], 16)))
        if ch in chars and field in ('kDefinition', 'kHangul'):
            uni.setdefault(ch, {}).setdefault(field, val)

variants = {}
for line in open(f'{S}/Unihan_Variants.txt', encoding='utf-8'):
    if line.startswith('#') or '\t' not in line: continue
    cp, field, val = line.rstrip('\n').split('\t', 2)
    if field not in ('kSemanticVariant', 'kSimplifiedVariant', 'kTraditionalVariant'): continue
    ch = norm(chr(int(cp[2:], 16)))
    for tok in val.split():
        variants.setdefault(ch, set()).add(norm(chr(int(tok.split('<')[0][2:], 16))))

src = open(f'{HERE}/../../packages/core/src/kanji.ts', encoding='utf-8').read()
kanji = {norm(r[0]): r[1] for r in re.findall(r"\['(.)', '([^']*)', '([^']*)', '([^']*)'\]", src)}

NOISE = re.compile(r'(kangxi radical|radical number|\d+(st|nd|rd|th) lunar mansion'
                   r'|determinative star|abbreviation for|variant of|same as|a surname'
                   r'|earthly branch|celestial stem)', re.I)

# Unihan parenthesises encyclopedia: "silver (element 47, Ag)", "replacement
# (of person or generation)". Never the gloss, always the footnote.
PAREN = re.compile(r'\s*\([^)]*\)')

# Where the rule below picks a sense the Korean 훈 does not mean.
#
# **Every value here is Unihan's own wording**, from a different sense group of
# the same entry — this table chooses among the source's senses, it does not
# write new ones. That is the whole licence tier D gives, and listing the
# choices is what keeps it checkable: 韓 is 한국 한, so "fence; surname" is the
# wrong half of "fence; surname; Korea".
#
# The rule cannot make these calls itself. It reads no Korean, and the 훈 is
# the only thing that says which sense a hanja card means.
OVERRIDES = {
    '韓': 'Korea',            # was 'fence; surname' — 훈 한국, 나라
    '住': 'reside, live at',  # was 'stop' — 훈 살
    '代': 'replace',          # was 'era, generation' — 훈 대신할
    '對': 'facing, opposed',  # was 'correct, right' — 훈 대할
    '題': 'title, headline',  # was 'forehead' — 훈 제목
    '使': 'cause, order',     # was 'envoy, messenger' — 훈 하여금, 부릴
    '習': 'practice',         # was 'practice; flapping wings' — the second half is not a gloss
    '李': 'plum',             # was 'plum; judge' — 훈 오얏
    '庭': 'courtyard',        # was three glosses, over the ceiling
    '待': 'wait',             # was 'treat, entertain' — 훈 기다릴
    '綠': 'green',            # was 'green; chlorine'
    '江': 'large river',      # was 'large river; the Yangzi'
}

# ⚠️ Unresolved, and left sourced-but-wrong on purpose rather than invented.
# 省 is 살필 성 — *examine*, as in 반성 and 성찰 — and Unihan carries only
# "province" and "save, economize", neither of which is that sense. Writing
# "examine" here would be tier C, an assertion with no source, which
# `docs/packs/README.md` says to cut or get checked rather than ship quietly.
NEEDS_A_SOURCE = {'省'}

def trim(defn):
    defn = PAREN.sub('', defn)
    groups = [g.strip() for g in defn.split(';') if g.strip()]
    kept = [g for g in groups if not NOISE.search(g)] or groups
    short = [g for g in kept if len(g.replace(',', ' ').split()) <= 4]
    pool = short or [min(kept, key=lambda g: len(g.split()))]
    first = pool[0]
    if len(pool) > 1 and ',' not in first and ',' not in pool[1]:
        return f'{first}; {pool[1]}'
    return ', '.join([p.strip() for p in first.split(',') if p.strip()][:2])

entries = []
for ch in order:
    info = chars[ch]
    (hun, eum), secondary = info['readings'][0], info['readings'][1:]
    defn = uni[ch]['kDefinition']
    form = next((f for f in ({ch} | variants.get(ch, set())) if f in kanji), None)
    if form:
        english = kanji[form]
        words = {w for w in re.findall(r'[a-z]+', english.lower()) if len(w) > 2}
        ok = bool(words & set(re.findall(r'[a-z]+', defn.lower())))
        tier = 'A' if ok else 'B'
        source = ('kanji pack + Unihan' if ok else 'kanji pack') + (f' (as {form})' if form != ch else '')
    elif ch in OVERRIDES:
        english, tier, source = OVERRIDES[ch], 'D', 'Unihan, sense chosen to match the 훈'
    else:
        english, tier, source = trim(defn), 'D', 'Unihan, trimmed'
    entries.append({'level': info['level'], 'hanja': ch, 'hun': hun, 'eum': eum,
                    'english': english, 'tier': tier, 'source': source,
                    'secondary': secondary, 'unihan': defn,
                    'hangul': uni[ch].get('kHangul', ''),
                    'strokes': info['strokes'], 'radical': info['radical'],
                    'unsourced': ch in NEEDS_A_SOURCE})

json.dump(entries, sys.stdout, ensure_ascii=False, indent=1)

# Sanity checks the draft's claims rest on. Loud, because a silent pass here
# is what let four CJK Compatibility Ideographs through the first time.
assert len(entries) == 300, len(entries)
assert dict(Counter(e['level'] for e in entries)) == {'8급': 50, '7급Ⅱ': 50, '7급': 50, '6급Ⅱ': 75, '6급': 75}
assert not [e for e in entries if ud.normalize('NFC', e['hanja']) != e['hanja']]
assert all(e['hangul'] for e in entries), 'every 음 wants Unihan corroboration'
