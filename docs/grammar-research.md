# How people actually learn and practise grammar

_Written 2026-08-08, after the first grammar-patterns trial went badly and
before any more design. The question asked was not "is our design good" but
"what is known about this", so this doc leads with the research and only then
turns it on Amgi._

The short version: **the first cut got the destination right and the route
wrong.** Free production from a situation is where the evidence says acquisition
happens — and it is also the *last* rung of a sequence the design skipped
straight to. Nearly every complaint from the trial is a symptom of starting at
the end.

---

## 1. What the research says

### Explicit grammar instruction works — for a narrower claim than it sounds

Two meta-analyses are the usual citations. [Norris & Ortega
(2000)](https://www.researchgate.net/publication/228003219_Effectiveness_of_L2_Instruction_A_Research_Synthesis_and_Quantitative_Meta-analysis)
found focused L2 instruction produces large gains, with explicit beating
implicit, and — importantly — that the effects are **durable**. [Spada & Tomita
(2010)](https://onlinelibrary.wiley.com/doi/10.1111/j.1467-9922.2010.00562.x)
replicated the explicit advantage across both simple and complex features.

**The caveat is load-bearing and is the reason this section is first.** The
standing critique is that the outcome measures in these studies largely tested
*explicit knowledge* — the ability to do grammar exercises — rather than the
implicit knowledge that drives spontaneous use. So the honest reading is: a
grammar SRS will reliably make you better at grammar exercises. Whether it makes
you better at *writing Korean* is a separate claim needing a separate mechanism.
Hold onto this; it comes back in §4.

### Explicit practice pays off most on *easy* rules

[Second language acquisition of grammatical rules: the effects of learning
condition, rule difficulty, and executive
function](https://www.cambridge.org/core/journals/bilingualism-language-and-cognition/article/second-language-acquisition-of-grammatical-rules-the-effects-of-learning-condition-rule-difficulty-and-executive-function/F7361C0ECBCCDD6B5C057CFA8F7774B8)
found the explicit advantage is **concentrated in easy rules**; for difficult
rules, explicit and incidental conditions did not differ significantly.

"Easy" here means the properties [Housen catalogues as difficulty and
complexity](https://onlinelibrary.wiley.com/doi/10.1002/9781405198431.wbeal1443):
short scope, high reliability, few exceptions, formally simple.

This is directly useful, because it inverts an assumption. The intuition is that
the hard, subtle patterns deserve the practice slots. The evidence says the
small mechanical rules are the ones explicit practice actually moves.

### Practice runs controlled → meaningful → free, and skipping ahead does not work

[Paulston's classification (1970)](https://www.researchgate.net/publication/229564020_Structural_Pattern_Drills_A_Classification)
splits practice into **mechanical** (form only, no meaning), **meaningful**
(meaning required, answer known), and **communicative** (the speaker adds new
information about the real world), and argues for that order.

Two findings sit on top of it, and they pull in opposite directions:

- **Mechanical drills alone are not enough.** There is strong consensus that
  they do not build form-meaning mapping or communicative ability, and
  [meaningful drills outperform mechanical
  ones](https://www.researchgate.net/publication/255179825_The_Effect_of_Mechanical_and_Meaningful_Drills_on_the_Acquisition_of_Comparative_and_Superlative_Adjectives)
  for acquisition.
- **But you cannot open with free production either.** The received sequence is
  controlled practice, then semi-guided, then free — and [practitioner
  accounts](https://gianfrancoconti.com/2015/12/18/beyond-imitation-five-l2-writing-teaching-techniques-that-work-yet-few-modern-language-teachers-use/)
  are blunt that gap-fills alone are "mere imitation" while unscaffolded free
  writing is where learners drown.

[DeKeyser & Suzuki's skill acquisition
theory](https://yuichisuzuki.net/wp-content/uploads/2025/07/PreprintDeKeyser-R.-M.-Suzuki-Y.-2025.-Skill-acquisition-theory.-In-B.-VanPatten-G.-D.-Keating-S.-Wulff-Eds.-Theories-in-second-language-acquisition-An-introduction-4th-ed.-pp.-157-182-.pdf)
gives the mechanism: **declarative → procedural → automatized**, where
proceduralization requires practice *of the skill you want*, and each stage is
practised differently. DeKeyser (1997) measured the learning curves directly.

### Production does something comprehension does not

[Swain's output hypothesis](https://files.eric.ed.gov/fulltext/EJ1095572.pdf):
producing language forces learners from *semantic* processing into *syntactic*
processing, and it surfaces the gap between what they want to say and what they
can say. Comprehension does not require this. Three functions: noticing the gap,
hypothesis testing, metalinguistic reflection.

This is the strongest argument for keeping free production as the terminal rung
rather than settling at cloze.

The counter-position is worth knowing. [VanPatten's Processing
Instruction](https://onlinelibrary.wiley.com/doi/10.1002/9781118784235.eelt0094)
argues output-oriented practice can *interfere*, and that structured *input* —
comprehension tasks where getting the meaning requires parsing the target form —
is the more direct route. The evidence is genuinely mixed:
[studies](https://jan.ucc.nau.edu/jgc/research/pi/) find PI effective, but also
find output-based instruction **equally** effective where the form carries
communicative value. Not settled, and not a reason to abandon a production
stance.

### Spacing and interleaving

Two robust results, both directly implementable:

- **Distributed beats massed** for proceduralizing morphology
  ([Suzuki & DeKeyser
  2017](https://yuichisuzuki.net/wp-content/uploads/2023/04/Suzuki-DeKeyser-2017-LTR.pdf)),
  with longer gaps giving longer retention. This is the same spacing effect SM-2
  already implements.
- **Interleaving beats blocking** for grammar
  ([Suzuki, Yokosawa & Aline
  2022](https://journals.sagepub.com/doi/abs/10.1177/1362168820913985);
  [Nakata & Suzuki](https://www.researchgate.net/publication/333385481_Mixing_Grammar_Exercises_Facilitates_Long-Term_Retention_Effects_of_Blocking_Interleaving_and_Increasing_Practice)),
  on delayed tests — **even though blocked practice looks better during
  training**. That inversion is the whole finding, and it means in-session
  accuracy is a misleading signal to optimise for.

### Corrective feedback: type matters less than you would think

A [Bayesian meta-analysis (Brown, Liu & Norouzian
2023)](https://journals.sagepub.com/doi/10.1177/13621688221147374) finds direct,
indirect and metalinguistic feedback yield **similar effect sizes**, with
learner proficiency the strongest moderator. One
[study](https://www.sciencedirect.com/science/article/abs/pii/S1060374313000271)
found metalinguistic explanation outperformed direct correction but that its
advantage **faded over time**.

Practical read: do not agonise over feedback wording. Pick the cheapest and
kindest form and spend the effort elsewhere.

### You cannot teach grammar out of developmental order

[Pienemann's teachability
hypothesis](https://en.wikipedia.org/wiki/Teachability_Hypothesis): processing
procedures build on each other, so instruction can change the **rate** of
acquisition and ultimate attainment but **not the route**. Teaching a structure
a learner is not developmentally ready for does not work.

---

## 2. Prior art: Bunpro is the closest thing to what Amgi is building

[Bunpro](https://bunpro.jp/landing) is a Japanese grammar SRS, and the
[Tofugu review](https://www.tofugu.com/reviews/bunpro/) documents the mechanics.
It is worth studying because it has already solved the problem the trial hit.

**The format is cloze deletion.** A sentence with the target grammar point
blanked; the learner *types* the answer. Not multiple choice.

**Disambiguation — the trial's biggest complaint — is solved two ways:**

1. **The sentence constrains the blank.** Context does the work a
   free-production prompt cannot.
2. **A two-tier hint**, and note what tier 1 is: *a concise definition of the
   grammar point being asked for*. Tier 2 is the full English translation of the
   sentence with the target defined. So the meaning is available on request
   without being given away up front.

**Cloze is cued recall, not recognition.** [Glover
(1989)](https://grokipedia.com/page/Bunpro) found cloze more effective for
long-term learning than recognition tests. This matters for Amgi specifically:
it means adopting cloze does **not** violate the no-multiple-choice principle.

**Bunpro's known failure is the interesting part.** Its own community's most
frequent question is "how do I practise speaking?" — reviewers note that knowing
grammar and using grammar are different skills, and Bunpro only does the first.
That is §1's caveat showing up in a shipped product.

**Anki practitioner consensus** points the same way: don't learn the rule from
the flashcard — learn it elsewhere and use SRS to drill *contextual usage*, with
cloze over word cards. And the recurring warning that SRS becomes "progress
theatre" — flawless recall, no real-world gain.

---

## 3. What this means for Amgi

### It confirms three things already decided

- **No curated grammar curriculum.** This was decided on aesthetic grounds
  ("adaptivity should be emergent, not configured"). Pienemann gives it a
  *mechanistic* backing that is much stronger: instruction cannot change the
  route of acquisition, so an ordered syllabus is not merely un-Amgi, it is
  fighting a constraint. And errors-as-syllabus is well-founded rather than just
  elegant — the patterns you get wrong in your own writing are, by construction,
  the ones at your developmental edge.
- **No multiple choice.** Confirmed, and now with a route out of the corner it
  painted us into: cloze is cued recall, so it is production of the form, not
  recognition between candidates.
- **Spacing.** SM-2 is the right substrate; distributed practice is exactly what
  proceduralization wants.

### It contradicts one thing, and it is the thing that failed

**Free production was made rung one when it is rung three.** Controlled →
meaningful → free is the sequence, and (1a) starts at free. Every trial
complaint follows:

| Complaint | Cause |
|---|---|
| Ambiguous which pattern is being asked | A situation is the *least* constrained prompt there is |
| Too much variance in grading | Free text has unbounded correct answers |
| Vague what counts as a pattern | Only one exercise existed, so everything had to fit it |
| No management surface | Independent — a genuine gap |

### It reframes the choice/form split

The split from the 2026-08-08 redesign is real but is **the wrong primary
axis**. The primary axis is the learner's *stage* with a given pattern —
controlled, then free — and Amgi already tracks stage, in `production.repetitions`.

So the model the research implies:

1. **Cloze first.** The pattern blanked in a sentence, typed answer, hint tier 1
   = the meaning of the target point (Bunpro's design, and it fixes ambiguity).
   Graded by exact comparison — **no model call**, so no grading variance.
2. **Free production once it sticks.** What (1a) built, unlocked by the
   scheduler rather than chosen up front. This is the rung that carries the
   transfer claim, and Swain says it is not optional.

Choice-vs-form then becomes a *secondary* axis with one job: deciding whether a
pattern ever graduates. A form rule like `de` → `d'` can live at cloze forever —
there is no meaning to choose, so free production has nothing to add. A choice
pattern like `-다가` must graduate, or Amgi is Bunpro with the same known ceiling.

### It answers the `d'` question

`d'` is the paradigm **easy rule** — total reliability, tiny scope, no
exceptions — which §1 says is precisely where explicit practice pays off *most*.
So it is worth practising. It was never the pattern that was wrong; it was that
the only exercise on offer cost forty seconds. As a five-second cloze that SRS
retires quickly, it is a good item.

### It settles an open question

**Interleave.** Interleaving beats blocking for grammar on delayed tests. The
open item "whether patterns interleave into the vocab queue" should resolve
toward yes — with the caveat that the measured comparison is grammar points
against *each other*, not grammar against vocabulary, so that specific mix is an
extrapolation. Note also the trap: blocked practice **looks better during a
session**, so a subjective "this felt smoother" is exactly the wrong signal.

---

## 4. What the research does not settle

- **Whether cloze practice transfers to spontaneous production.** This is *the*
  open question, and Bunpro is the cautionary case. The literature's answer is
  "not on its own, which is why the sequence continues" — but nobody has shown
  how much free production is enough. Amgi's own acquisition signal (a pattern
  that stops appearing as a finding in your writing) is a better answer to this
  than anything in the literature, and is already in the backlog.
- **Whether to add an input/comprehension rung at all.** VanPatten's structured
  input is effective and cheap to grade, and it would open the
  sentence × comprehension cell the vision notes is empty. But it is forced-choice
  interpretation, which sits awkwardly beside the no-multiple-choice principle,
  and the evidence does not show it beating output practice. A real option, not
  a mandate.
- **Spacing parameters for grammar specifically.** Optimal gaps depend on the
  retention interval you are optimising for. SM-2's defaults are not known to be
  right here, but nothing suggests they are wrong enough to touch.
- **How much of the measured benefit is explicit knowledge only.** The honest
  position: the research strongly supports Amgi making people better at grammar
  exercises, and supports the *transfer* claim only through the production rung
  and the sequence argument. Worth staying humble about.
