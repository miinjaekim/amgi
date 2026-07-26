import { describe, it, expect } from 'vitest';
import { STUDY_LANGUAGE_CONFIGS, SUPPORTED_STUDY_LANGUAGES, userDataCollections } from '@amgi/core';

describe('userDataCollections', () => {
  it('covers every study language', () => {
    // The point of the whole test file. A language added to the registry
    // without its collection being swept would leave that language's cards in
    // Firestore after an account deletion the user was told had completed —
    // silently, and only for the languages they happened to study.
    const collections = userDataCollections();
    for (const language of SUPPORTED_STUDY_LANGUAGES) {
      expect(collections).toContain(STUDY_LANGUAGE_CONFIGS[language.code].collection);
    }
  });

  it('lists each collection once', () => {
    const collections = userDataCollections();
    expect(collections).toHaveLength(new Set(collections).size);
  });

  it('does not include the user preferences document', () => {
    // `users/{uid}` is a single document addressed by id, deleted directly.
    // Treating it as a uid-queried collection would silently delete nothing.
    expect(userDataCollections()).not.toContain('users');
  });

  it('does not include shared, non-personal collections', () => {
    // Word of the day is generated per language pair and shared between
    // everyone; pronunciation audio likewise. Sweeping either on account
    // deletion would destroy other people's data.
    expect(userDataCollections()).not.toContain('wordOfTheDay');
  });
});
