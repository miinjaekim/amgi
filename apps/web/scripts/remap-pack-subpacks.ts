/**
 * Moves cards saved under a bare pack id into the subpack they came from.
 *
 * Enrolling files each card under `pack/section` now, so a card saved before
 * that carries only `kikuyu-basics` and sits in the pack but in no subpack. It
 * still works — a pack review takes its own cards as well as every subpack's,
 * and it still renders under the pack's real name — so this is a repair, not a
 * rescue, and nothing breaks if it never runs. What it buys is the second
 * level: until a card is remapped, "review Greetings" does not include it.
 *
 * The derivation is the same one `backfill-pack-backs.ts` uses, and it works
 * for the same reason: `packId` plus the study side identifies the entry, and
 * an entry sits in exactly one section, which names its subpack. Where a term
 * somehow appears in two sections of one pack the card is left alone rather
 * than guessed at — see `ambiguous` below.
 *
 * Dry run by default. Pass --apply to write.
 *
 *   npm run remap:subpacks --workspace @amgi/web
 *   npm run remap:subpacks --workspace @amgi/web -- --apply
 *   npm run remap:subpacks --workspace @amgi/web -- --uid=abc123 --apply
 */
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import {
  VOCAB_PACKS,
  getStudyLanguageConfig,
  packRefId,
  type StudyLanguage,
} from '@amgi/core';

/** Firestore writes per batch; the API's own ceiling is 500. */
const BATCH_LIMIT = 500;

function db(): Firestore {
  if (getApps().length === 0) {
    const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (!encoded) throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 is not set');
    initializeApp({ credential: cert(JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'))) });
  }
  return getFirestore();
}

type Move = {
  ref: FirebaseFirestore.DocumentReference;
  uid: string;
  study: string;
  from: string;
  to: string;
};

type Plan = {
  moves: Move[];
  /** Cards whose front no longer matches any entry in the pack they claim. */
  unmatched: number;
  /** Terms appearing in more than one section of their pack — see below. */
  ambiguous: string[];
};

/**
 * What one study language's cards need, per pack.
 *
 * Queried on the bare pack ids only, so a card already carrying a subpack is
 * never read and re-running costs nothing. `packId in [...]` takes at most 30
 * values and no language registers more than five packs, so one query serves.
 */
async function planForLanguage(
  store: Firestore,
  studyLanguage: StudyLanguage,
  uidFilter: string | null,
): Promise<Plan> {
  const packs = VOCAB_PACKS[studyLanguage] ?? [];
  const empty: Plan = { moves: [], unmatched: 0, ambiguous: [] };
  if (packs.length === 0) return empty;

  const { collection, studyField } = getStudyLanguageConfig(studyLanguage);

  // Study side → section id, per pack. Lowercased for the same reason the app
  // matches saved terms that way.
  //
  // A term in two sections of one pack maps to nothing: both answers are
  // defensible, the card is fine where it is, and quietly picking the first
  // section would put a word in a subpack its owner never enrolled in. It is
  // reported instead, because it is a fact about the pack worth knowing.
  const ambiguous: string[] = [];
  const byPack = new Map<string, Map<string, string | null>>();
  for (const pack of packs) {
    const sections = new Map<string, string | null>();
    for (const section of pack.sections) {
      for (const entry of section.entries) {
        const key = entry.study.toLowerCase();
        if (sections.has(key)) {
          sections.set(key, null);
          ambiguous.push(`${pack.id}: ${entry.study}`);
        } else {
          sections.set(key, section.id);
        }
      }
    }
    byPack.set(pack.id, sections);
  }

  let query: FirebaseFirestore.Query = store
    .collection(collection)
    .where('packId', 'in', [...byPack.keys()]);
  if (uidFilter) query = query.where('uid', '==', uidFilter);

  const moves: Move[] = [];
  let unmatched = 0;
  for (const doc of (await query.get()).docs) {
    const data = doc.data();
    const study = data[studyField];
    const sectionId = typeof study === 'string'
      ? byPack.get(data.packId)?.get(study.toLowerCase())
      : undefined;
    // A front that no longer matches the pack — an edited card, or a word
    // dropped from the pack since. It stays at the pack level, which is a
    // place it still reviews from.
    if (!sectionId) { unmatched += 1; continue; }
    moves.push({
      ref: doc.ref,
      uid: String(data.uid ?? '?'),
      study: String(study),
      from: data.packId,
      to: packRefId(data.packId, sectionId),
    });
  }
  return { moves, unmatched, ambiguous };
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const uidFilter = args.find(a => a.startsWith('--uid='))?.slice('--uid='.length) ?? null;

  const store = db();
  const moves: Move[] = [];
  let unmatched = 0;
  const ambiguous: string[] = [];
  for (const language of Object.keys(VOCAB_PACKS) as StudyLanguage[]) {
    const plan = await planForLanguage(store, language, uidFilter);
    moves.push(...plan.moves);
    unmatched += plan.unmatched;
    ambiguous.push(...plan.ambiguous);
  }

  if (ambiguous.length > 0) {
    console.log(`${ambiguous.length} term(s) sit in two sections of their pack and are left alone:`);
    for (const term of ambiguous) console.log(`  ${term}`);
    console.log('');
  }

  if (moves.length === 0) {
    console.log(`Nothing to remap — every pack card already names its subpack. (${unmatched} left at pack level.)`);
    return;
  }

  const perTarget = new Map<string, number>();
  for (const move of moves) perTarget.set(move.to, (perTarget.get(move.to) ?? 0) + 1);
  const accounts = new Set(moves.map(move => move.uid));

  console.log(`${moves.length} card(s) across ${accounts.size} account(s) into ${perTarget.size} subpack(s):`);
  for (const [target, count] of perTarget) console.log(`  ${target}  ${count} card(s)`);
  if (unmatched > 0) {
    console.log(`\n${unmatched} card(s) match no entry in the pack they claim; they stay at pack level.`);
  }
  console.log('\nSample of what would be written:');
  for (const move of moves.slice(0, 5)) console.log(`  ${move.study}  ${move.from}  →  ${move.to}`);

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to write.');
    return;
  }

  for (let i = 0; i < moves.length; i += BATCH_LIMIT) {
    const batch = store.batch();
    for (const move of moves.slice(i, i + BATCH_LIMIT)) batch.update(move.ref, { packId: move.to });
    await batch.commit();
    console.log(`Wrote ${Math.min(i + BATCH_LIMIT, moves.length)}/${moves.length}`);
  }
  console.log('Done. Re-running is safe — the query only reads bare pack ids.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
