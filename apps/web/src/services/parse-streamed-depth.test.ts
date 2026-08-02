import { describe, it, expect } from 'vitest';
import { parseStreamedDepth, getCharacterBreakdown, depthFieldsToPersist } from '@amgi/core';

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

// What enrichment writes back to a card. Both depth prompts are told to leave a
// section empty when it has nothing to add, and both routinely do — so the
// filtering here is what keeps "no notes yet" distinct from "notes are empty",
// which every `card.notes &&` render check depends on.
describe('depthFieldsToPersist', () => {
  it('keeps the sections that have content', () => {
    expect(depthFieldsToPersist({ definition: 'a rule you follow', notes: 'formal register' }))
      .toEqual({ definition: 'a rule you follow', notes: 'formal register' });
  });

  it('drops empty and whitespace-only sections rather than writing them', () => {
    const fields = depthFieldsToPersist({ definition: 'x', characterBreakdown: '', notes: '   ' });
    expect(fields).toEqual({ definition: 'x' });
    expect('notes' in fields).toBe(false);
    expect('characterBreakdown' in fields).toBe(false);
  });

  it('trims, so a section is never stored with the prompt\'s stray newlines', () => {
    expect(depthFieldsToPersist({ definition: '  a rule\n' })).toEqual({ definition: 'a rule' });
  });

  // A model that returned nothing usable must produce no write at all, so the
  // caller can tell the user it failed instead of silently doing nothing.
  it('returns an empty object when nothing came back', () => {
    expect(depthFieldsToPersist({})).toEqual({});
    expect(depthFieldsToPersist({ definition: '', notes: '' })).toEqual({});
  });
});
