import { describe, it, expect } from 'vitest';
import { extractJsonBlock, parseModelJson, stripCodeFences } from '@amgi/core';

describe('parseModelJson', () => {
  it('parses a bare object', () => {
    expect(parseModelJson('{"rewrite":"ok"}')).toEqual({ rewrite: 'ok' });
  });

  it('parses a fenced object, with or without a language tag', () => {
    expect(parseModelJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseModelJson('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  // The failure that prompted this: a complete, valid review followed by the
  // model explaining itself. `JSON.parse` on the whole string threw
  // "Unexpected non-whitespace character after JSON" and the passage the
  // learner waited on was lost to an unhandled 500.
  it('ignores commentary after the JSON', () => {
    const raw = '{"rewrite":"어제 친구를 만났어요."}\n\nI kept their voice and only fixed the particle.';
    expect(parseModelJson(raw)).toEqual({ rewrite: '어제 친구를 만났어요.' });
  });

  it('ignores preamble before the JSON', () => {
    expect(parseModelJson('Here is the review:\n{"a":1}')).toEqual({ a: 1 });
  });

  // A naive "first { to last }" slice joins two objects into one unparseable
  // string. Models do emit two when they decide to show their work.
  it('takes the first object when the model emits two', () => {
    expect(parseModelJson('{"a":1}\n{"b":2}')).toEqual({ a: 1 });
  });

  it('is not fooled by braces inside string values', () => {
    // Every one of these responses carries user-facing prose in its values, so
    // a brace in a note must not end the scan early.
    const raw = '{"note":"use {this} form","kind":"grammar"}';
    expect(parseModelJson(raw)).toEqual({ note: 'use {this} form', kind: 'grammar' });
  });

  it('is not fooled by an escaped quote inside a string', () => {
    const raw = '{"note":"they wrote \\"corkscrew\\" in English"}';
    expect(parseModelJson(raw)).toEqual({ note: 'they wrote "corkscrew" in English' });
  });

  it('handles nested objects and arrays', () => {
    const raw = '{"findings":[{"card":{"back":{"English":"a"}}}]}';
    expect(parseModelJson(raw)).toEqual({ findings: [{ card: { back: { English: 'a' } } }] });
  });

  it('parses a top-level array', () => {
    expect(parseModelJson('```json\n[{"a":1}]\n```')).toEqual([{ a: 1 }]);
  });

  it('throws when there is nothing parseable, which callers already handle', () => {
    expect(() => parseModelJson('I cannot help with that.')).toThrow(SyntaxError);
    expect(() => parseModelJson('')).toThrow(SyntaxError);
    // Unbalanced: no matching close, so no block is found.
    expect(() => parseModelJson('{"a":1')).toThrow(SyntaxError);
  });
});

describe('extractJsonBlock', () => {
  it('returns null rather than guessing when nothing balances', () => {
    expect(extractJsonBlock('no json here')).toBeNull();
    expect(extractJsonBlock('{"unclosed": true')).toBeNull();
  });
});

describe('stripCodeFences', () => {
  it('removes fences anywhere and trims', () => {
    expect(stripCodeFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(stripCodeFences('  {"a":1}  ')).toBe('{"a":1}');
  });
});
