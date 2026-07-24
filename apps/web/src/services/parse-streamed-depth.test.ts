import { describe, it, expect } from 'vitest';
import { parseStreamedDepth, getCharacterBreakdown } from '@amgi/core';

describe('parseStreamedDepth', () => {
  it('parses a Han-script response with all three sections', () => {
    const text = [
      'DEFINITION:',
      'A building that houses books.',
      '',
      'CHARACTERS:',
      '図 と (on) — diagram + 書 しょ (on) — book + 館 かん (on) — building',
      '',
      'NOTES:',
      'Refers to the institution, not a personal collection.',
      '',
    ].join('\n');
    const depth = parseStreamedDepth(text);
    expect(depth.definition).toBe('A building that houses books.');
    expect(depth.characterBreakdown).toContain('図 と (on)');
    expect(depth.notes).toBe('Refers to the institution, not a personal collection.');
  });

  it('omits the breakdown for a language whose prompt has no CHARACTERS section', () => {
    const text = 'DEFINITION:\nJust the right amount.\n\nNOTES:\nA cultural ideal.\n';
    const depth = parseStreamedDepth(text);
    expect(depth.definition).toBe('Just the right amount.');
    expect(depth.characterBreakdown).toBeUndefined();
    expect(depth.notes).toBe('A cultural ideal.');
  });

  // A pure-kana word has nothing to break down, so the prompt asks for "none"
  // rather than a section the model has to invent content for.
  it('drops a "none" breakdown', () => {
    const text = 'DEFINITION:\nThank you.\n\nCHARACTERS:\nnone\n\nNOTES:\nCasual register.\n';
    expect(parseStreamedDepth(text).characterBreakdown).toBeUndefined();
  });

  // Sections appear as the stream arrives — a half-written response must not
  // yield a definition contaminated with the next section's marker.
  it('tolerates a response that is still streaming', () => {
    expect(parseStreamedDepth('DEFIN').definition).toBeUndefined();
    expect(parseStreamedDepth('DEFINITION:\nA building that hou').definition).toBe('A building that hou');
    const midway = parseStreamedDepth('DEFINITION:\nA building.\n\nCHARACTERS:\n図 と (on)');
    expect(midway.definition).toBe('A building.');
    expect(midway.characterBreakdown).toBe('図 と (on)');
    expect(midway.notes).toBeUndefined();
  });
});

describe('getCharacterBreakdown', () => {
  it('reads the current field', () => {
    expect(getCharacterBreakdown({ characterBreakdown: '電 diàn + 腦 nǎo' })).toBe('電 diàn + 腦 nǎo');
  });

  // Korean cards saved before the field was generalized still carry `hanja`,
  // which is what lets them render without a migration.
  it('falls back to a legacy Korean card’s hanja', () => {
    expect(getCharacterBreakdown({ hanja: '葛 갈 + 藤 등' })).toBe('葛 갈 + 藤 등');
  });

  it('returns undefined when a card has neither', () => {
    expect(getCharacterBreakdown({})).toBeUndefined();
  });
});
