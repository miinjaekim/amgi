import { describe, it, expect } from 'vitest';
import { cardsToAnki, cardsToCSV } from '@amgi/core';
import type { Flashcard, StudyLanguagePair } from '@amgi/core';

const card = (fields: Partial<Flashcard>): Flashcard => ({
  term: '', createdAt: new Date('2026-09-01T00:00:00Z'), ...fields,
} as Flashcard);

const pairs: StudyLanguagePair[] = [
  { study: 'Korean', native: 'English' },
  { study: 'Japanese', native: 'Korean' },
];

const korean = card({ studyLanguage: 'Korean', korean: '사과', english: 'apple', definition: 'a fruit' });
const japanese = card({ studyLanguage: 'Japanese', japanese: '猫', english: 'cat', korean: '고양이', archived: true });

describe('cardsToCSV', () => {
  const rows = cardsToCSV([korean, japanese], pairs).split('\n');

  it('names each row\'s language, since one file holds all of them', () => {
    expect(rows[0].startsWith('"Language","Front","Back"')).toBe(true);
    expect(rows[1].startsWith('"Korean","사과","apple"')).toBe(true);
  });

  it('writes each back in the language its own deck is explained in', () => {
    expect(rows[2]).toContain('"猫","고양이"');
  });

  it('keeps archived cards, marked as such', () => {
    expect(rows[2].endsWith('"archived"')).toBe(true);
    expect(rows).toHaveLength(3);
  });

  it('escapes quotes', () => {
    const quoted = card({ studyLanguage: 'Korean', korean: '"따옴표"', english: 'x' });
    expect(cardsToCSV([quoted], pairs)).toContain('"""따옴표"""');
  });
});

describe('cardsToAnki', () => {
  const lines = cardsToAnki([korean, japanese], pairs).split('\n');

  it('puts each language in its own subdeck', () => {
    expect(lines).toContain('#deck column:1');
    expect(lines).toContain('Amgi::Korean\t사과\tapple — a fruit');
    expect(lines.some(l => l.startsWith('Amgi::Japanese\t猫\t고양이'))).toBe(true);
  });

  it('falls back to English backs for a language no longer on the list', () => {
    const out = cardsToAnki([japanese], []);
    expect(out).toContain('猫\tcat');
  });

  it('keeps a tab or newline in a field from breaking the row', () => {
    const messy = card({ studyLanguage: 'Korean', korean: '가\t나', english: 'a\nb' });
    expect(cardsToAnki([messy], pairs).split('\n').pop()).toBe('Amgi::Korean\t가 나\ta b');
  });
});
