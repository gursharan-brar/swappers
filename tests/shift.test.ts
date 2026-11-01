import { describe, expect, it } from 'vitest';
import { displayChar } from '../src/core/shift';

const none = { shift: false, caps: false };
const shift = { shift: true, caps: false };
const caps = { shift: false, caps: true };
const both = { shift: true, caps: true };

describe('displayChar', () => {
  it('Shift and Caps Lock flip letters; both together cancel out', () => {
    expect(displayChar('a', none)).toBe('a');
    expect(displayChar('a', shift)).toBe('A');
    expect(displayChar('a', caps)).toBe('A');
    expect(displayChar('a', both)).toBe('a');
    expect(displayChar('N', shift)).toBe('n');
  });

  it('only Shift flips the number row and punctuation, in both directions', () => {
    expect(displayChar('6', shift)).toBe('^');
    expect(displayChar('6', caps)).toBe('6');
    expect(displayChar('6', both)).toBe('^');
    expect(displayChar('^', shift)).toBe('6');
    expect(displayChar('-', shift)).toBe('_');
  });

  it('leaves characters without a partner alone', () => {
    expect(displayChar(' ', both)).toBe(' ');
  });
});
