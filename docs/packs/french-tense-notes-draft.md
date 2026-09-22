# French Tense Notes — Draft for Review

**Three short notes, one per tense in the French spec** — what the tense does and
when to reach for it — shown on the Saved tab when a tense chip is selected.

**This is content, so it is sourced.** [README.md](README.md) governs anything
sourced and the rule is the whole of it: *the model is not a source*. A claim
about when a French speaker reaches for the imparfait is exactly the kind of
thing a model will produce fluently and get subtly wrong, so every line below
carries a tier and a citation, and the examples are the sources' own rather than
invented.

They land as `tenseFrench*Lead` / `tenseFrench*Points` in
`packages/core/src/i18n.ts`, pointed at from `FRENCH_TENSES`.

---

## Sources

| # | source | what it is | rank |
|---|---|---|---|
| O | **Banque de dépannage linguistique**, Office québécois de la langue française — [imparfait: usages](https://vitrinelinguistique.oqlf.gouv.qc.ca/24196/la-grammaire/le-verbe/temps-grammaticaux/passe/generalites-sur-limparfait) · [imparfait: valeur temporelle](https://vitrinelinguistique.oqlf.gouv.qc.ca/24197/la-grammaire/le-verbe/temps-grammaticaux/passe/valeur-temporelle-de-limparfait) · [futur simple](https://vitrinelinguistique.oqlf.gouv.qc.ca/24127/la-grammaire/le-verbe/temps-grammaticaux/futur/le-futur-simple) · [présent: valeurs particulières](https://vitrinelinguistique.oqlf.gouv.qc.ca/bdl/gabarit_bdl.asp?id=4200) | a **government language authority**'s reference grammar | published reference |
| L | **Larousse**, encyclopédie — [présent](https://www.larousse.fr/encyclopedie/divers/pr%C3%A9sent/82917) · [imparfait](https://www.larousse.fr/encyclopedie/divers/imparfait/60099) · [indicatif](https://www.larousse.fr/encyclopedie/divers/indicatif/60882) — and the dictionary entry for [futur](https://www.larousse.fr/dictionnaires/francais/futur/35702) | a published dictionary house's grammar entries | published reference |

Consulted 2026-09-22. ⚠️ **They are independent of each other** — a Québec
government body and a French commercial publisher — which is what makes
agreement worth anything.

⚠️ **The futur is the weak one and the table says so.** O has a full page of
uses for it; L's entry gives only the core value (*"forme verbale exprimant
qu'une action, un état sont situés dans l'avenir"*). So the futur's first point
is tier A and its other two rest on O alone.

### On the examples

**The examples are the sources' own, quoted**, not written here. That is
deliberate: an example sentence is a claim about French, so inventing one would
be the model sourcing itself in the one place a reader is most likely to trust
it. Each is five or six words, each is cited in the row it appears in, and
nothing else of either source's prose is taken — the notes below are written
fresh for a learner rather than translated from either page.

⚠️ **One consequence to accept knowingly**: the imparfait's simultaneity example
quotes a **passé simple** (`je sortis`), a tense the app does not teach. It is
kept because changing it would make it no longer the source's example; the note
around it does not ask the learner to produce that half.

---

## présent

**Lead** — *What is happening now, and what is generally true.*

| # | point | tier | source |
|---|---|---|---|
| 1 | Something happening as you speak — *Paul se lève*. | A | L ("présent ponctuel ou actuel"); O treats this as the general value its page of *valeurs particulières* departs from |
| 2 | Habits, and things that are simply true — *Il se lève tôt*; *Deux et deux font quatre*. | B | L ("habituel", "gnomique") |
| 3 | Something about to happen — *je reviens dans un instant*. | B | O ("futur proche") |

## imparfait

**Lead** — *The past as a setting: what was going on, rather than what happened.*

| # | point | tier | source |
|---|---|---|---|
| 1 | What was in progress when something else happened — *Il pleuvait quand je sortis*. | A | L ("action concomitante"); O ("simultanéité", *Quand elle arriva, il dormait*) |
| 2 | How things were — a description with no beginning and no end in view. | A | L ("sans indication de début ni de fin"); O ("circonstances autour des événements") |
| 3 | What used to happen, again and again — *Il s'asseyait à cet endroit*. | A | L ("habitude"); O ("répétition", *Francine nageait trois fois par semaine*) |

## futur simple

**Lead** — *What will happen, seen from where you are standing now.*

| # | point | tier | source |
|---|---|---|---|
| 1 | An action or state still to come — *Pierre prendra sa retraite dans deux ans*. | A | O; L ("situés dans l'avenir") |
| 2 | After *si* + présent, the other half is futur — *Si tu acceptes, tu ne le regretteras pas*. | B | O ("fait conditionnel") |
| 3 | Instructions, put politely — *Vous prendrez un comprimé tous les matins*. | B | O ("ordre atténué") |

---

## What was left out, and why

**Everything either source lists that a learner at this stage cannot use.** O's
futur page alone gives nine uses, including the historical future, indignation
and probability; its imparfait pages add the modal *si* + imparfait and a
politeness use. All are real and none is here.

⚠️ **Three points per tense is a ceiling, not a coincidence.** This text sits
under a table on an inventory screen, where somebody has gone to look something
up — the same argument `PageHeader`'s comment makes about its help sheet:
*"Someone who taps '?' wants to stop reading quickly, and a paragraph makes them
find the sentence that applies to them."* A tense's full range is what a grammar
is for, and it is a good reason to link one later rather than to inline one now.

**No Korean grammar terms beyond the ordinary.** The ko copy says 시제 and
현재/과거/미래 and otherwise describes rather than names — a learner reading the
Korean is learning French, not Korean linguistic vocabulary.
