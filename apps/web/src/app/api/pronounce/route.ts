import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getStudyLanguageConfig } from '@amgi/core';
import { getBucket } from '@/lib/firebaseAdmin';

// Slightly slower than natural speaking speed — easier for learners to hear
// individual sounds than TTS's default conversational pace.
const SPEAKING_RATE = 0.85;

/**
 * Below this, the response is silence rather than speech.
 *
 * Cached audio is keyed by content hash and never expires, so a bad generation
 * is permanent — which is exactly how a silent あ survived to be played. The
 * two populations are well separated: a real one-character clip is 3.8–4.8 kB
 * at this rate, while the silent responses were ~1.1 kB, and every longer
 * utterance is far bigger than either. So this only ever rejects a failure.
 */
const MIN_PLAUSIBLE_AUDIO_BYTES = 2048;

export async function POST(req: NextRequest) {
  const { text, studyLanguage } = await req.json();

  if (!text || typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const config = getStudyLanguageConfig(studyLanguage);
  const { ttsLanguageCode, ttsVoiceName, ttsShortVoiceName } = config;
  if (!ttsLanguageCode || !ttsVoiceName) {
    return NextResponse.json({ error: 'Pronunciation not yet available for this language' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Google TTS API not configured' }, { status: 500 });
  }

  const normalized = text.trim().normalize('NFC');

  // A lone character goes to the non-generative voice — see `ttsShortVoiceName`.
  // Because the voice name is part of the cache path, this also routes around
  // every silent single-character clip already sitting in the bucket.
  const isSingleCharacter = [...normalized].length === 1;
  const voiceName = (isSingleCharacter && ttsShortVoiceName) || ttsVoiceName;

  const hash = createHash('sha256').update(normalized).digest('hex');
  const path = `pronunciation/${ttsLanguageCode}/${voiceName}-r${SPEAKING_RATE}/${hash}.mp3`;

  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const publicUrl = `https://storage.googleapis.com/${bucketName}/${path}`;

  try {
    const file = getBucket().file(path);
    const [exists] = await file.exists();
    if (exists) {
      return NextResponse.json({ url: publicUrl });
    }

    async function synthesize() {
      const ttsRes = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: normalized },
          voice: { languageCode: ttsLanguageCode, name: voiceName },
          audioConfig: { audioEncoding: 'MP3', speakingRate: SPEAKING_RATE },
        }),
      });
      if (!ttsRes.ok) throw new Error(`TTS generation failed: ${await ttsRes.text()}`);
      const { audioContent } = await ttsRes.json();
      if (!audioContent) throw new Error('TTS generation returned no audio');
      return Buffer.from(audioContent, 'base64');
    }

    // Retry once on a silent response, then give up rather than store it: an
    // error the user can retry is recoverable, a cached silence is not.
    let buffer = await synthesize();
    if (buffer.length < MIN_PLAUSIBLE_AUDIO_BYTES) buffer = await synthesize();
    if (buffer.length < MIN_PLAUSIBLE_AUDIO_BYTES) {
      return NextResponse.json({ error: 'TTS returned silence twice' }, { status: 502 });
    }

    await file.save(buffer, { metadata: { contentType: 'audio/mpeg' } });
    await file.makePublic();

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Pronunciation generation failed' }, { status: 500 });
  }
}
