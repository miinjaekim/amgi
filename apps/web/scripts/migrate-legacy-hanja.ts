/**
 * Moves the deprecated `hanja` depth field onto `characterBreakdown`, then
 * removes it — freeing the name for the Hanja study language, whose cards use
 * `hanja` for the character itself.
 *
 * `hanja` held the per-character breakdown on Korean cards saved before that
 * field was generalized across Han-script languages (葛 갈 + 藤 등). It was left
 * in place and read through `getCharacterBreakdown()` precisely so no migration
 * was needed. Adding Hanja as a study language ends that: `hanja` would mean the
 * breakdown of a Korean word on one card and the character 水 on another, in one
 * type, and a fallback that has to remember which is which is the kind of thing
 * that is right until someone forgets. So the legacy cards move.
 *
 * ⚠️ **Never runs against the Hanja collection.** There `hanja` is the study
 * side — the front of the card — and copying it into `characterBreakdown` would
 * put the character in its own breakdown section before deleting the front
 * outright. `MIGRATED_LANGUAGES` excludes it by construction rather than by
 * filter, so a Hanja deck cannot be reached even by a future edit that widens
 * the loop.
 *
 * An existing `characterBreakdown` wins: it is the current field, written by a
 * later enrichment, and the legacy value it would overwrite is the older answer
 * to the same question. Those cards only lose the dead field.
 *
 * Dry run by default. Pass --apply to write.
 *
 *   npm run migrate:legacy-hanja --workspace @amgi/web
 *   npm run migrate:legacy-hanja --workspace @amgi/web -- --apply
 *   npm run migrate:legacy-hanja --workspace @amgi/web -- --uid=abc123 --apply
 */
import { getFirestore, FieldValue, type Firestore } from 'firebase-admin/firestore';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { STUDY_LANGUAGE_CONFIGS, getStudyLanguageConfig, type StudyLanguage } from '@amgi/core';

/** Firestore writes per batch; the API's own ceiling is 500. */
const BATCH_LIMIT = 500;

/**
 * Every study language whose cards could carry the legacy field — which is all
 * of them except Hanja, where the name means the front of the card.
 *
 * Korean is the only language the field was ever written for, and the sweep is
 * wider than that on purpose: reading it as Korean-only is an assumption about
 * code that no longer exists, and the cost of being wrong is a card that keeps
 * a field the app has stopped reading. Empty collections cost one query each.
 */
const MIGRATED_LANGUAGES = (Object.keys(STUDY_LANGUAGE_CONFIGS) as StudyLanguage[])
  .filter(language => language !== 'Hanja');

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
  /** The breakdown being promoted, or null where one already exists. */
  promote: string | null;
};

async function planForLanguage(
  store: Firestore,
  studyLanguage: StudyLanguage,
  uidFilter: string | null,
): Promise<Move[]> {
  const { collection, studyField } = getStudyLanguageConfig(studyLanguage);

  // `> ''` is how Firestore asks "has a non-empty string here" — the same shape
  // `backfill:pack-backs` uses for `packId`. A card whose `hanja` is an empty
  // string has nothing to promote and no field worth deleting.
  let query: FirebaseFirestore.Query = store.collection(collection).where('hanja', '>', '');
  if (uidFilter) query = query.where('uid', '==', uidFilter);

  const moves: Move[] = [];
  for (const doc of (await query.get()).docs) {
    const data = doc.data();
    const legacy = data.hanja;
    if (typeof legacy !== 'string' || !legacy.trim()) continue;
    const current = data.characterBreakdown;
    const hasCurrent = typeof current === 'string' && current.trim().length > 0;
    moves.push({
      ref: doc.ref,
      uid: String(data.uid ?? '?'),
      study: String(data[studyField] ?? data.term ?? '?'),
      promote: hasCurrent ? null : legacy.trim(),
    });
  }
  return moves;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const uidFilter = args.find(a => a.startsWith('--uid='))?.slice('--uid='.length) ?? null;

  const store = db();
  const moves: Move[] = [];
  for (const language of MIGRATED_LANGUAGES) {
    moves.push(...(await planForLanguage(store, language, uidFilter)));
  }

  if (moves.length === 0) {
    console.log('Nothing to migrate — no card carries the legacy `hanja` field.');
    return;
  }

  const promoted = moves.filter(m => m.promote !== null);
  const perAccount = new Map<string, number>();
  for (const m of moves) perAccount.set(m.uid, (perAccount.get(m.uid) ?? 0) + 1);

  console.log(`${moves.length} card(s) across ${perAccount.size} account(s):`);
  for (const [uid, count] of perAccount) console.log(`  ${uid}  ${count} card(s)`);
  console.log(
    `  ${promoted.length} promoted to characterBreakdown, ` +
    `${moves.length - promoted.length} already had one (field dropped only)`,
  );
  console.log('\nSample of what would be written:');
  for (const m of moves.slice(0, 5)) {
    console.log(`  ${m.study}  →  ${m.promote === null ? 'delete hanja' : `characterBreakdown=${m.promote}`}`);
  }

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to write.');
    return;
  }

  for (let i = 0; i < moves.length; i += BATCH_LIMIT) {
    const batch = store.batch();
    for (const m of moves.slice(i, i + BATCH_LIMIT)) {
      batch.update(m.ref, {
        ...(m.promote === null ? {} : { characterBreakdown: m.promote }),
        hanja: FieldValue.delete(),
      });
    }
    await batch.commit();
    console.log(`Wrote ${Math.min(i + BATCH_LIMIT, moves.length)}/${moves.length}`);
  }
  console.log('Done. Re-running is safe — migrated cards no longer match the query.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
