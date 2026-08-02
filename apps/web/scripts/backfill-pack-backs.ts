/**
 * Fills in the native-language back on cards enrolled from a pre-authored pack
 * before backs became native-aware.
 *
 * Cards saved by the old code carry only the back language their study language
 * dictated — for the kana packs, romaji in `english`. A Korean-native learner
 * reading those now gets the `getBackSide` fallback, so review, Cards and CSV
 * export show them romaji indefinitely; only the deck tile shows hangul,
 * because it falls through to the pack's own text. This makes the stored card
 * say what the pack always said.
 *
 * Pack cards are the only cards this is possible for. The pack is the source of
 * truth: `packId` plus the study side identifies the entry, and the entry has
 * both backs written by hand. A card created through Learn has no such source —
 * repairing one would mean asking a model to invent a side — so those are out
 * of scope and stay on the fallback until they are next saved.
 *
 * Dry run by default. Pass --apply to write.
 *
 *   npm run backfill:pack-backs --workspace @amgi/web
 *   npm run backfill:pack-backs --workspace @amgi/web -- --apply
 *   npm run backfill:pack-backs --workspace @amgi/web -- --uid=abc123 --apply
 */
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import {
  VOCAB_PACKS,
  getStudyLanguageConfig,
  type CardSideField,
  getPackEntries,
  type PackEntry,
  type StudyLanguage,
} from '@amgi/core';

/** Firestore writes per batch; the API's own ceiling is 500. */
const BATCH_LIMIT = 500;

/** The two slots a back can live in, and the pack field each is authored as. */
const BACK_SLOTS: { field: CardSideField; key: 'English' | 'Korean' }[] = [
  { field: 'english', key: 'English' },
  { field: 'korean', key: 'Korean' },
];

function db(): Firestore {
  if (getApps().length === 0) {
    const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (!encoded) throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 is not set');
    initializeApp({ credential: cert(JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'))) });
  }
  return getFirestore();
}

type Repair = {
  ref: FirebaseFirestore.DocumentReference;
  uid: string;
  study: string;
  fill: Partial<Record<CardSideField, string>>;
};

/**
 * What one collection needs written, or nothing where a card is already whole.
 *
 * Only *empty* slots are filled. A back the user edited is theirs and is left
 * alone even when it disagrees with the pack — the point is to give them the
 * side they never had, not to reset the deck to factory text.
 */
async function planForLanguage(
  store: Firestore,
  studyLanguage: StudyLanguage,
  uidFilter: string | null,
): Promise<Repair[]> {
  // Every pack is pre-authored now, so there is no kind to filter on — the
  // packs that used to be skipped here are exactly the ones this can repair.
  const packs = VOCAB_PACKS[studyLanguage] ?? [];
  if (packs.length === 0) return [];

  const { collection, studyField } = getStudyLanguageConfig(studyLanguage);
  // Study side → entry, per pack. Lowercased for the same reason the app
  // matches saved terms that way.
  const byPack = new Map<string, Map<string, PackEntry>>(
    packs.map(pack => [
      pack.id,
      new Map(getPackEntries(pack).map(entry => [entry.study.toLowerCase(), entry])),
    ]),
  );

  let query: FirebaseFirestore.Query = store
    .collection(collection)
    .where('packId', 'in', [...byPack.keys()]);
  if (uidFilter) query = query.where('uid', '==', uidFilter);

  const repairs: Repair[] = [];
  for (const doc of (await query.get()).docs) {
    const data = doc.data();
    const study = data[studyField];
    const entry = typeof study === 'string'
      ? byPack.get(data.packId)?.get(study.toLowerCase())
      : undefined;
    // A front that no longer matches the pack is not the pack's to repair.
    if (!entry) continue;

    const fill: Partial<Record<CardSideField, string>> = {};
    for (const { field, key } of BACK_SLOTS) {
      // The study side lives in one of these slots on an English or Korean
      // deck. Writing a back there would overwrite the front.
      if (field === studyField) continue;
      const current = data[field];
      if (typeof current === 'string' && current.trim()) continue;
      // A pack only authors the side it can store, so the other one is
      // routinely absent. Firestore throws on an explicit undefined, and a
      // side the pack never wrote is not a gap this can fill anyway.
      const authored = entry.back[key];
      if (authored === undefined) continue;
      fill[field] = authored;
    }
    if (Object.keys(fill).length > 0) {
      repairs.push({ ref: doc.ref, uid: String(data.uid ?? '?'), study: String(study), fill });
    }
  }
  return repairs;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const uidFilter = args.find(a => a.startsWith('--uid='))?.slice('--uid='.length) ?? null;

  const store = db();
  const languages = Object.keys(VOCAB_PACKS) as StudyLanguage[];
  const repairs: Repair[] = [];
  for (const language of languages) {
    repairs.push(...(await planForLanguage(store, language, uidFilter)));
  }

  if (repairs.length === 0) {
    console.log('Nothing to backfill — every pack card already carries both backs.');
    return;
  }

  const perAccount = new Map<string, number>();
  for (const r of repairs) perAccount.set(r.uid, (perAccount.get(r.uid) ?? 0) + 1);

  console.log(`${repairs.length} card(s) across ${perAccount.size} account(s):`);
  for (const [uid, count] of perAccount) console.log(`  ${uid}  ${count} card(s)`);
  console.log('\nSample of what would be written:');
  for (const r of repairs.slice(0, 5)) {
    const fields = Object.entries(r.fill).map(([f, v]) => `${f}=${v}`).join(', ');
    console.log(`  ${r.study}  →  ${fields}`);
  }

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to write.');
    return;
  }

  for (let i = 0; i < repairs.length; i += BATCH_LIMIT) {
    const batch = store.batch();
    for (const r of repairs.slice(i, i + BATCH_LIMIT)) batch.update(r.ref, r.fill);
    await batch.commit();
    console.log(`Wrote ${Math.min(i + BATCH_LIMIT, repairs.length)}/${repairs.length}`);
  }
  console.log('Done. Re-running is safe — filled slots are skipped.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
