import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getStudyLanguageConfig } from '@amgi/core';
import { bucket } from '@/lib/firebaseAdmin';

// Slightly slower than natural speaking speed — easier for learners to hear
// individual sounds than TTS's default conversational pace.
const SPEAKING_RATE = 0.85;

export async function POST(req: NextRequest) {
  const { text, studyLanguage } = await req.json();

  if (!text || typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const config = getStudyLanguageConfig(studyLanguage);
  const { ttsLanguageCode, ttsVoiceName } = config;
  if (!ttsLanguageCode || !ttsVoiceName) {
    return NextResponse.json({ error: 'Pronunciation not yet available for this language' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Google TTS API not configured' }, { status: 500 });
  }

  const normalized = text.trim().normalize('NFC');
  const hash = createHash('sha256').update(normalized).digest('hex');
  const path = `pronunciation/${ttsLanguageCode}/${ttsVoiceName}-r${SPEAKING_RATE}/${hash}.mp3`;

  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const publicUrl = `https://storage.googleapis.com/${bucketName}/${path}`;

  try {
    const file = bucket.file(path);
    const [exists] = await file.exists();
    if (exists) {
      return NextResponse.json({ url: publicUrl });
    }

    const ttsRes = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: normalized },
        voice: { languageCode: ttsLanguageCode, name: ttsVoiceName },
        audioConfig: { audioEncoding: 'MP3', speakingRate: SPEAKING_RATE },
      }),
    });

    if (!ttsRes.ok) {
      const errBody = await ttsRes.text();
      return NextResponse.json({ error: `TTS generation failed: ${errBody}` }, { status: 502 });
    }

    const { audioContent } = await ttsRes.json();
    if (!audioContent) {
      return NextResponse.json({ error: 'TTS generation returned no audio' }, { status: 502 });
    }

    const buffer = Buffer.from(audioContent, 'base64');
    await file.save(buffer, { metadata: { contentType: 'audio/mpeg' } });
    await file.makePublic();

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Pronunciation generation failed' }, { status: 500 });
  }
}
