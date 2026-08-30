# Text pronunciation aid — the measurement pass (2026-08-30)

What was measured before any code was written, and the working prototypes for
the languages that are still open. **Japanese and Kikuyu shipped from this
pass**; their reasoning is in the Decisions entry in `.scratchpad/status.md`,
and this file is the part that outlives them — the numbers for the other five,
and the two rule engines that scored well enough to build on.

## Method

Every reading was generated **inside the `/api/explain` prompt shape**, not in
isolation — the Kikuyu noun-class probe had already shown that contamination
comes from context (the model reached for Swahili morphology unprompted).
`gemini-2.5-flash`, `temperature: 0.1`, matching the route. Three runs per term,
~20 real terms per language.

## Results

| Language | Self-consistent | Content | Verdict |
|---|---|---|---|
| Japanese pitch accent | 18/27 | **6/27** vs known NHK values | dictionary — **shipped** |
| Kikuyu tone | **2/19** | unverifiable | nothing exists — **refused** |
| Korean sound change | stable | 14/18 | **rules beat it 17/18** |
| Spanish stress | n/a | rules 16/16 | rules |
| Swahili stress | n/a | rules 9/9 | rules |
| French IPA | 8/17 | ~16/17 correct | model + normalizer |
| English IPA | 5/15 | ~15/15 correct | model + normalizer |
| Swedish pitch accent | 6/16 | unreliable | no source yet |

### The finding that outlives the feature

**Self-consistency is not evidence of correctness.** Japanese is the proof: 18
of 27 terms returned the same answer all three runs and only 6 were right. The
model defaults to `[1]` 頭高 and returns *one* accent for 雨 and 飴, *one* for 花
and 鼻, *one* for 髪·神·紙 — erasing exactly the minimal pairs a pitch badge
exists to teach. Inconsistency still proves unreliability, but consistency
proves nothing, which is worth remembering against the Kikuyu and Swedish
numbers above, where consistency was all there was to measure.

### Korean, head to head on the same 18 terms

Rules **17/18**, Gemini **14/18**, and the failure sets barely overlap:

| term | standard | model | rules |
|---|---|---|---|
| 신라 | 실라 | `null` ✗ | 실라 ✓ |
| 급행 | 그팽 | `null` ✗ | 그팽 ✓ |
| 한국말 | 한궁말 | `null` ✗ | 한궁말 ✓ |
| 값어치 | 가버치 | 가버치 ✓ | 갑서치 ✗ |

The model misses **regular phonology**, always by claiming no change. The rules
miss only what needs a **morpheme boundary** — 값어치 needs to know 어치 is a
실질형태소, 솜이불/색연필 need ㄴ첨가 at a compound seam. Those three are the
whole residue at 37/40, and no amount of extra rules reaches them.

### Caveat on Spanish and Swahili

Those expectation tables were **author-written**, so they test the
implementation more than they test the assumptions. The Korean table is
checkable against 표준국어대사전; these are not, to the same degree. Swahili's
penultimate-stress invariant is well established, and the Spanish cases chosen
(teléfono, árbol, increíble, día) are textbook, but treat the scores as
"the engine does what I believe" rather than as independent validation.

## Prototype: Korean 표준 발음법 — 37/40

Pure transform over jamo, no model call, no stored field. Would need rewriting
against `packages/core` conventions before shipping.

```js
// Prototype: 표준 발음법 as a pure transform over jamo. No model call.
const CHO=['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNG=['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONG=['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const isH=c=>c>='가'&&c<='힣';
const dec=c=>{const n=c.charCodeAt(0)-0xAC00;return{c:CHO[Math.floor(n/588)],v:JUNG[Math.floor(n/28)%21],t:JONG[n%28]};};
const com=({c,v,t})=>String.fromCharCode(0xAC00+CHO.indexOf(c)*588+JUNG.indexOf(v)*28+JONG.indexOf(t));

// 겹받침 -> [what stays as coda, what can move to the next onset]
const CLUSTER={'ㄳ':['ㄱ','ㅅ'],'ㄵ':['ㄴ','ㅈ'],'ㄶ':['ㄴ','ㅎ'],'ㄺ':['ㄱ','ㄹ'],'ㄻ':['ㅁ','ㄹ'],
  'ㄼ':['ㄹ','ㅂ'],'ㄽ':['ㄹ','ㅅ'],'ㄾ':['ㄹ','ㅌ'],'ㄿ':['ㅂ','ㄹ'],'ㅀ':['ㄹ','ㅎ'],'ㅄ':['ㅂ','ㅅ']};
// 겹받침 whose *second* jamo is the one that liaises (ㄺ ㄻ ㄿ keep the sonorant)
const MOVES={'ㄳ':'ㅅ','ㄵ':'ㅈ','ㄺ':'ㄱ','ㄻ':'ㅁ','ㄼ':'ㅂ','ㄽ':'ㅅ','ㄾ':'ㅌ','ㄿ':'ㅍ','ㅄ':'ㅅ'};
const KEEPS={'ㄳ':'ㄱ','ㄵ':'ㄴ','ㄺ':'ㄹ','ㄻ':'ㄹ','ㄼ':'ㄹ','ㄽ':'ㄹ','ㄾ':'ㄹ','ㄿ':'ㄹ','ㅄ':'ㅂ'};
// 음절의 끝소리 규칙: seven representative codas
const REP={'ㄲ':'ㄱ','ㅋ':'ㄱ','ㅅ':'ㄷ','ㅆ':'ㄷ','ㅈ':'ㄷ','ㅊ':'ㄷ','ㅌ':'ㄷ','ㅎ':'ㄷ','ㅍ':'ㅂ',
  'ㄳ':'ㄱ','ㄵ':'ㄴ','ㄶ':'ㄴ','ㄺ':'ㄱ','ㄻ':'ㅁ','ㄼ':'ㄹ','ㄽ':'ㄹ','ㄾ':'ㄹ','ㄿ':'ㅂ','ㅀ':'ㄹ','ㅄ':'ㅂ'};
const TENSE={'ㄱ':'ㄲ','ㄷ':'ㄸ','ㅂ':'ㅃ','ㅅ':'ㅆ','ㅈ':'ㅉ'};
const ASPIR={'ㄱ':'ㅋ','ㄷ':'ㅌ','ㅂ':'ㅍ','ㅈ':'ㅊ'};
const NASAL={'ㄱ':'ㅇ','ㄷ':'ㄴ','ㅂ':'ㅁ'};

export function pronounce(word){
  if(![...word].every(isH)) return null;
  const s=[...word].map(dec);
  for(let i=0;i<s.length;i++){
    const cur=s[i], nxt=s[i+1];
    if(!nxt){ // final syllable: neutralize coda only
      if(REP[cur.t]) cur.t=REP[cur.t];
      continue;
    }
    // --- ㅎ interactions come first (축약 / 탈락) ---
    if(cur.t==='ㅎ'||cur.t==='ㄶ'||cur.t==='ㅀ'){
      const rest=cur.t==='ㄶ'?'ㄴ':cur.t==='ㅀ'?'ㄹ':'';
      if(ASPIR[nxt.c]){ nxt.c=ASPIR[nxt.c]; cur.t=rest; continue; }
      if(nxt.c==='ㅅ'){ nxt.c='ㅆ'; cur.t=rest; continue; }
      if(nxt.c==='ㄴ'){ cur.t=rest||'ㄴ'; continue; }
      if(nxt.c==='ㅇ'){ cur.t=''; if(rest){nxt.c=rest;} continue; } // ㅎ 탈락 + 연음
    }
    if(nxt.c==='ㅎ'&&ASPIR[cur.t]){ nxt.c=ASPIR[cur.t]; cur.t=''; continue; }
    // --- 연음: next syllable starts with a vowel ---
    if(nxt.c==='ㅇ'&&cur.t){
      if(CLUSTER[cur.t]){ nxt.c=MOVES[cur.t]; cur.t=KEEPS[cur.t]; }
      else { nxt.c=cur.t==='ㅇ'?'ㅇ':cur.t; if(cur.t!=='ㅇ') cur.t=''; }
      // 구개음화: ㄷ/ㅌ + 이 -> ㅈ/ㅊ
      if(nxt.v==='ㅣ'&&(nxt.c==='ㄷ'||nxt.c==='ㅌ')) nxt.c=nxt.c==='ㄷ'?'ㅈ':'ㅊ';
      continue;
    }
    // --- coda neutralization before a consonant ---
    // 밟- is the documented ㄼ exception: it keeps ㅂ where 넓- keeps ㄹ.
    const orig=cur.t;
    if(cur.t==='ㄼ'&&com({...cur,t:''})==='바') cur.t='ㅂ';
    else if(REP[cur.t]) cur.t=REP[cur.t];
    // --- 유음화 ---
    if(cur.t==='ㄴ'&&nxt.c==='ㄹ'){ cur.t='ㄹ'; nxt.c='ㄹ'; continue; }
    if(cur.t==='ㄹ'&&nxt.c==='ㄴ'){ nxt.c='ㄹ'; continue; }
    // --- 비음화 ---
    if(NASAL[cur.t]&&(nxt.c==='ㄴ'||nxt.c==='ㅁ')){ cur.t=NASAL[cur.t]; continue; }
    // ㄹ 비음화: ㅁ/ㅇ/ㄱ/ㅂ + ㄹ -> ㄴ
    if(nxt.c==='ㄹ'&&['ㅁ','ㅇ'].includes(cur.t)){ nxt.c='ㄴ'; continue; }
    if(nxt.c==='ㄹ'&&['ㄱ','ㅂ'].includes(cur.t)){ nxt.c='ㄴ'; cur.t=NASAL[cur.t]; continue; }
    // --- 경음화 after an obstruent coda ---
    // 표준 발음법 24: an obstruent coda tenses a following ㄱㄷㅅㅈ — and so do the
    // verb-stem clusters ㄵ ㄼ ㄾ ㄻ ㄺ, which neutralize to a sonorant and would
    // otherwise lose the tensing (앉다 [안따], 핥다 [할따], 넓다 [널따]).
    if((['ㄱ','ㄷ','ㅂ'].includes(cur.t)||['ㄵ','ㄼ','ㄾ','ㄻ','ㄺ'].includes(orig))&&TENSE[nxt.c]){ nxt.c=TENSE[nxt.c]; continue; }
  }
  const out=s.map(com).join('');
  return out===word?null:out;
}
```

Failing cases at 37/40, all morphology-dependent: `값어치` → `갑서치` (wants
`가버치`), `솜이불` → `소미불` (wants `솜니불`), `색연필` → `새견필` (wants
`생년필`).

## Prototype: Spanish + Swahili stress — 16/16 and 9/9

```js
// Prototype: syllabify + mark stress from spelling alone. No model call.
const STRONG='aeoáéó', WEAK='iuü', ACCW='íú', VOW=STRONG+WEAK+ACCW;
const INSEP=['pr','br','tr','dr','cr','gr','fr','pl','bl','cl','gl','fl','ch','ll','rr'];
const isV=c=>VOW.includes(c);

function syllablesEs(w){
  const s=w.toLowerCase(); const out=[]; let cur='';
  let i=0;
  while(i<s.length){
    // consonant onset
    let onset='';
    while(i<s.length&&!isV(s[i])){ onset+=s[i]; i++; }
    // nucleus (diphthong/triphthong)
    let nuc='';
    while(i<s.length&&isV(s[i])){
      if(nuc){
        const p=nuc[nuc.length-1];
        const bothStrong=STRONG.includes(p)&&STRONG.includes(s[i]);
        const accented=ACCW.includes(p)||ACCW.includes(s[i]);
        if(bothStrong||accented) break;   // hiatus: new syllable
      }
      nuc+=s[i]; i++;
    }
    cur=onset+nuc;
    // coda: consonants that don't start the next syllable
    let coda='';
    let j=i, cons='';
    while(j<s.length&&!isV(s[j])){ cons+=s[j]; j++; }
    if(j>=s.length) coda=cons;            // final consonants close this syllable
    else if(cons.length===1) coda='';     // V-CV
    else if(cons.length>=2){
      const last2=cons.slice(-2);
      coda=INSEP.includes(last2)?cons.slice(0,-2):cons.slice(0,-1);
    }
    out.push(cur+coda);
    i+=coda.length;
  }
  return out.filter(Boolean);
}

function stressEs(w){
  const syl=syllablesEs(w);
  const acc=syl.findIndex(s=>/[áéíóú]/.test(s));
  if(acc>=0) return {syl,idx:acc};
  const last=w.toLowerCase().slice(-1);
  const penult=isV(last)||last==='n'||last==='s';
  return {syl,idx:penult?Math.max(0,syl.length-2):syl.length-1};
}

// Swahili: open CV syllables, stress always penultimate.
const SW_CC=['mb','md','mv','mw','nd','ng','nj','ny','nz','ch','sh','th','dh','gh','kw','gw','sw','tw','ny','mp','nt','nk','ns','pw','bw','fy','vy','ki','ng’'];
function syllablesSw(w){
  const s=w.toLowerCase(); const out=[]; let i=0;
  while(i<s.length){
    let on='';
    while(i<s.length&&!'aeiou'.includes(s[i])){
      on+=s[i]; i++;
      // a nasal followed by a consonant is syllabic only when nothing else can carry it
      if(on.length>=2&&!SW_CC.includes(on)&&!SW_CC.includes(on.slice(-2))){ out.push(on.slice(0,-1)); on=on.slice(-1); }
    }
    if(i>=s.length){ if(on) out.push(on); break; }
    out.push(on+s[i]); i++;
    while(i<s.length&&'aeiou'.includes(s[i])){ out.push(s[i]); i++; }  // vowel sequences are separate syllables
  }
  return out.filter(Boolean);
}
const stressSw=w=>{const syl=syllablesSw(w); return {syl,idx:Math.max(0,syl.length-2)};};

const fmt=({syl,idx})=>syl.map((s,i)=>i===idx?s.toUpperCase():s).join('-');
```

## What to do next per language

- **Korean** — render-time transform off the engine above. It returns `null`
  when pronunciation matches spelling, which is the guard that keeps the badge
  off words it would teach nothing about.
- **Spanish, Swahili** — same mechanism, cheapest of the five.
- **French, English** — stored field from `/api/explain`. The content is
  already good; what it needs is a **normalizer** stripping `/…/` and syllable
  dots and pinning the variety (GA for English, standard Parisian for French).
  Half the runs wrapped in slashes despite the prompt forbidding it.
- **Swedish** — do **not** ship off the model. `sked` came back `ˈskeːd` with a
  literal /sk/, the beginner error the aid exists to prevent. Japanese is the
  precedent for what would work: find a lexical source.
