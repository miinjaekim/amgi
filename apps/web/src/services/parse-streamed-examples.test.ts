import { describe, it, expect } from 'vitest';
import { parseStreamedExamples } from '@amgi/core';

describe('parseStreamedExamples', () => {
  it('parses Korean study pairs', () => {
    const text = '{"korean":"밥 먹었어?","english":"Have you eaten?"}\n{"korean":"눈치가 빠르다","english":"quick-witted"}';
    const result = parseStreamedExamples(text, 'Korean');
    expect(result).toHaveLength(2);
    expect(result[0].korean).toBe('밥 먹었어?');
  });

  it('parses Swedish study pairs', () => {
    const text = '{"swedish":"Det är lagom varmt.","english":"It is just warm enough."}';
    expect(parseStreamedExamples(text, 'Swedish')).toHaveLength(1);
  });

  it('parses French study pairs', () => {
    const text = '{"french":"J\'aime flâner à Paris.","english":"I like to stroll in Paris."}';
    const result = parseStreamedExamples(text, 'French');
    expect(result).toHaveLength(1);
    expect(result[0].french).toBe("J'aime flâner à Paris.");
  });

  it('parses Japanese study pairs', () => {
    const text = '{"japanese":"木漏れ日が美しい。","english":"The light through the trees is beautiful."}';
    expect(parseStreamedExamples(text, 'Japanese')).toHaveLength(1);
  });

  it('parses English study pairs (Korean back side)', () => {
    const text = '{"english":"I tend to procrastinate.","korean":"저는 미루는 경향이 있어요."}';
    const result = parseStreamedExamples(text, 'English');
    expect(result).toHaveLength(1);
    expect(result[0].english).toBe('I tend to procrastinate.');
  });

  it('skips incomplete lines while the stream is arriving', () => {
    const text = '{"french":"Phrase complète.","english":"Complete sentence."}\n{"french":"Phrase coupée...';
    expect(parseStreamedExamples(text, 'French')).toHaveLength(1);
  });

  it('skips pairs missing the study-language side', () => {
    // A korean/english pair is not a valid French example
    const text = '{"korean":"한국어 문장","english":"Korean sentence"}';
    expect(parseStreamedExamples(text, 'French')).toHaveLength(0);
  });

  it('ignores non-JSON noise', () => {
    expect(parseStreamedExamples('Here are your examples:\nnot json', 'Korean')).toHaveLength(0);
  });
});
