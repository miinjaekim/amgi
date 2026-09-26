/**
 * Runs the user-made pack pipeline as the people behind the hand-made packs
 * would have, and writes the result beside those packs for review.
 *
 * The backlog's gate for this feature is exactly this comparison, run before any
 * learner sees an agent-made pack. It calls the same functions the routes do,
 * so what it measures is what ships.
 *
 *   npm run eval:user-packs --workspace @amgi/web
 *   npm run eval:user-packs --workspace @amgi/web -- --only=toeic
 *
 * Writes docs/packs/user-pack-eval.md. Every subtopic proposed is sourced,
 * which is the most expensive thing a learner could ask for.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  IDIOMS_PACK,
  VOCAB_PACKS,
  getPackTerms,
  normalizeTerm,
  type PackBrief,
  type StudyLanguage,
  type VocabPack,
  type WordSource,
} from '@amgi/core';
import { proposeSubtopics, sourceSubtopic, type SourcingResult } from '../src/lib/userPackSourcing';

interface Persona {
  id: string;
  label: string;
  studyLanguage: StudyLanguage;
  brief: PackBrief;
  /** The hand-made pack to compare against, when there is one in the repo. */
  handMade?: VocabPack;
}

const TOEIC_PACK = VOCAB_PACKS.English!.find(p => p.id === 'toeic-core')!;

// The answers are a guess at what each person would have typed. Correct them
// and re-run: the comparison is only as fair as they are.
const PERSONAS: Persona[] = [
  {
    id: 'toeic',
    label: 'TOEIC (goal)',
    studyLanguage: 'English',
    handMade: TOEIC_PACK,
    brief: {
      purpose: 'goal',
      about: 'TOEIC 900점 넘기려고 준비 중이에요. 파트 5, 6, 7에서 단어 때문에 자꾸 틀려요.',
      usage: 'TOEIC 시험, 그리고 나중에 외국계 회사 업무 이메일',
    },
  },
  {
    id: 'idioms',
    label: 'English idioms (struggle)',
    studyLanguage: 'English',
    handMade: IDIOMS_PACK,
    brief: {
      purpose: 'struggle',
      about: '단어는 다 아는데 원어민이 관용 표현을 쓰면 무슨 뜻인지 모르겠어요.',
      usage: '미국 동료들과의 회의, 드라마, 팟캐스트',
    },
  },
  {
    id: 'argentina',
    label: 'Moving to Argentina (situation)',
    studyLanguage: 'Spanish',
    brief: {
      purpose: 'situation',
      about: '다음 달에 부에노스아이레스로 이사 가요. 스페인어 기초는 조금 알아요.',
      usage: '집 구하기, 은행, 장보기, 이웃이랑 대화',
      focus: '스페인 스페인어 말고 아르헨티나에서 실제로 쓰는 말',
    },
  },
];

function cite(s: WordSource): string {
  return s.kind === 'material' ? 'their material' : `[${s.title || new URL(s.url).hostname}](${s.url})`;
}

function escapeCell(s: string): string {
  return s.replace(/\|/g, '\\|');
}

async function runPersona(apiKey: string, p: Persona): Promise<string> {
  const started = Date.now();
  const proposal = await proposeSubtopics({ apiKey, brief: p.brief, studyLanguage: p.studyLanguage, knownTerms: [] });
  const subtopics = proposal?.subtopics ?? [];

  const results: { name: string; estimated: number; result: SourcingResult | null; error?: string }[] = [];
  const sofar: string[] = [];
  for (const subtopic of subtopics) {
    console.log(`  ${p.id}: sourcing "${subtopic.name.English}"`);
    try {
      const result = await sourceSubtopic({
        apiKey,
        brief: p.brief,
        studyLanguage: p.studyLanguage,
        subtopic,
        knownTerms: [],
        excludeTerms: sofar,
      });
      sofar.push(...result.words.map(w => w.study));
      results.push({ name: `${subtopic.name.English} · ${subtopic.name.Korean}`, estimated: subtopic.estimatedWords, result });
    } catch (e) {
      results.push({ name: subtopic.name.English, estimated: subtopic.estimatedWords, result: null, error: String(e) });
    }
  }

  const agentWords = results.flatMap(r => r.result?.words ?? []);
  const dropped = results.flatMap(r => r.result?.dropped ?? []);
  const pages = results.flatMap(r => r.result?.pages ?? []);
  const seconds = Math.round((Date.now() - started) / 1000);

  const out: string[] = [];
  out.push(`## ${p.label}`, '');
  out.push('**Answers given**', '');
  out.push(`- For: ${p.brief.purpose}. ${p.brief.about}`);
  out.push(`- Where: ${p.brief.usage}`);
  if (p.brief.focus) out.push(`- Focus: ${p.brief.focus}`);
  out.push('');

  const tierA = agentWords.filter(w => w.tier === 'A').length;
  const byReason = (r: string) => dropped.filter(d => d.reason === r).length;
  out.push(
    `**${agentWords.length} words kept** (${tierA} tier A, ${agentWords.length - tierA} tier B) across ` +
      `${subtopics.length} subtopics in ${seconds}s. Cut: ${byReason('not-found')} found on no page, ` +
      `${byReason('duplicate') + byReason('known')} repeats. ` +
      `${pages.filter(pg => pg.readable).length} of ${pages.length} pages search returned could be read.`,
    '',
  );

  if (p.handMade) {
    const hand = getPackTerms(p.handMade);
    const handSet = new Set(hand.map(normalizeTerm));
    const agentSet = new Set(agentWords.map(w => normalizeTerm(w.study)));
    const both = hand.filter(t => agentSet.has(normalizeTerm(t)));
    const onlyHand = hand.filter(t => !agentSet.has(normalizeTerm(t)));
    out.push(`### Against the hand-made ${p.handMade.name.English} (${hand.length} entries)`, '');
    out.push(`- **In both (${both.length}):** ${both.join(', ') || '—'}`);
    out.push(`- **Only hand-made (${onlyHand.length}):** ${onlyHand.join(', ')}`);
    out.push(
      `- **Only agent (${agentWords.filter(w => !handSet.has(normalizeTerm(w.study))).length}):** marked ✚ in the tables below`,
    );
    out.push(
      `- Hand-made sections: ${p.handMade.sections.map(s => s.name.English).join(' · ')}`,
      `- Agent subtopics: ${subtopics.map(s => s.name.English).join(' · ')}`,
      '',
    );
  } else {
    out.push('_No hand-made pack for this one is in the repo, so there is nothing to diff against._', '');
  }

  const handSet = p.handMade ? new Set(getPackTerms(p.handMade).map(normalizeTerm)) : null;
  for (const r of results) {
    out.push(`### ${r.name}`, '');
    if (!r.result) {
      out.push(`⚠️ Failed: ${r.error}`, '');
      continue;
    }
    const readable = r.result.pages.filter(pg => pg.readable).length;
    out.push(
      `Estimated ${r.estimated}, kept ${r.result.words.length}. Search returned ${r.result.pages.length} pages, ${readable} readable.`,
      '',
    );
    out.push('| word | sense | tier | sources |', '|---|---|---|---|');
    for (const w of r.result.words) {
      const mark = handSet && !handSet.has(normalizeTerm(w.study)) ? '✚ ' : '';
      out.push(`| ${mark}${escapeCell(w.study)} | ${escapeCell(w.sense ?? '')} | ${w.tier} | ${w.sources.map(cite).join(', ')} |`);
    }
    if (r.result.dropped.length) {
      out.push('', `Cut: ${r.result.dropped.map(d => `${d.study} (${d.reason})`).join(', ')}`);
    }
    out.push('');
  }
  return out.join('\n');
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  const only = process.argv.find(a => a.startsWith('--only='))?.slice('--only='.length);
  const personas = PERSONAS.filter(p => !only || p.id === only);

  const sections: string[] = [];
  for (const p of personas) {
    console.log(`${p.label}…`);
    sections.push(await runPersona(apiKey, p));
  }

  const doc = [
    '# User-made packs: eval against the hand-made ones',
    '',
    `_Generated by \`apps/web/scripts/eval-user-packs.ts\` on ${new Date().toISOString().slice(0, 10)}. ` +
      'Re-run it rather than editing the tables._',
    '',
    'Each persona answers the set questions as the person behind a hand-made pack would have, with **no saved cards**, ' +
      'which is the hardest case: there is nothing to read their level from. Every proposed subtopic is sourced.',
    '',
    'A word is kept only when a page the search returned was fetched and actually contains it. Tier A is two domains, ' +
      'B is one ([docs/packs/README.md](README.md)). ✚ marks a word the hand-made pack does not have, which is not ' +
      'the same as wrong.',
    '',
    ...sections,
  ].join('\n');

  const file = path.resolve(__dirname, '../../../docs/packs/user-pack-eval.md');
  writeFileSync(file, doc);
  console.log(`Wrote ${file}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
