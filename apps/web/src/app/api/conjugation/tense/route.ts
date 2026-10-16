import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import {
  conjugationSpec,
  isInfinitive,
  parseModelJson,
  parseTenseForms,
  tenseFormRule,
  tensePersons,
  withCatalogueTenses,
} from '@amgi/core';
import type { StudyLanguage } from '@amgi/core';

/** More than any learner's spec holds (27 built in), and a bound on one call's output. */
const MAX_VERBS = 120;

/**
 * The forms of one tense, for every verb a learner has: Munli's "add a tense".
 *
 * ⚠️ **A route of its own, and an exception to "reuse the AI route"**, approved
 * by the user 2026-10-16 (`decisions/munli.md`). `/api/explain` answers about
 * one term; a tense is asked of every verb at once, and asking it through that
 * route would be one call per verb — 27 or more for one tense, each also
 * writing a definition nobody reads. A verb added *after* a tense still goes
 * through `/api/explain`, whose `conjugation` field takes the added tenses.
 *
 * ⚠️ **The model is the source here**, under the 2026-10-14 decision: what
 * comes back is narrowed to forms that fit the tense (`parseTenseForms`) and
 * nothing more. It goes to the learner who asked, who stores it on their own
 * document and sees it labelled as unverified.
 *
 * The tense is named by catalogue id, never free text: the client has already
 * matched what was typed (`requestTense`), so the model is told what the tense
 * is rather than asked.
 */
export async function POST(req: NextRequest) {
  const { studyLanguage = 'French', tenseId, verbs } = await req.json();

  const spec = conjugationSpec(studyLanguage as StudyLanguage);
  const asked = spec && withCatalogueTenses(spec, [tenseId]);
  const tense = asked?.tenses.find(t => t.id === tenseId && t.userAdded);
  if (!asked || !tense) {
    return NextResponse.json({ error: 'tenseId must be a tense this language can add' }, { status: 400 });
  }
  const wanted = Array.isArray(verbs)
    ? [...new Set(verbs.map(verb => (typeof verb === 'string' ? verb.normalize('NFC').trim().toLowerCase() : '')))]
        .filter(isInfinitive)
    : [];
  if (wanted.length === 0 || wanted.length > MAX_VERBS) {
    return NextResponse.json({ error: `verbs must be 1 to ${MAX_VERBS} infinitives` }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API not configured' }, { status: 500 });
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { temperature: 0 } });

  const persons = tensePersons(asked, tense.id);
  const prompt = `Conjugate each of these French verbs, for a learner's conjugation table.

${tenseFormRule(asked, tense)}

Each form is the bare verb form with no subject pronoun — "parle", never "je parle"; "ai parlé", never "j'ai parlé" — spelled exactly as French writes it, with its accents and any stem or spelling change (nous mangeons is "mangeons", j'appelle is "appelle"). Give the standard form a conjugation reference such as Bescherelle prints, and one form per person: no alternatives, no brackets, no notes.

Verbs: ${wanted.join(', ')}

Respond with only this JSON, one key per verb, spelled exactly as listed:
{
  "forms": {
    "${wanted[0]}": [${persons.length} forms: ${persons.map(p => p.label).join(', ')}],
    ...
  }
}`;

  const result = await model.generateContent(prompt);
  const parsed = parseModelJson(result.response.text());
  const raw = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>).forms : undefined;

  return NextResponse.json({ tenseId: tense.id, forms: parseTenseForms(asked, tense.id, wanted, raw) });
}
