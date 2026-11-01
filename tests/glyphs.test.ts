import { describe, expect, it } from 'vitest';
import { GLYPH_H, getGlyph, glyphChars, hasGlyph } from '../src/core/glyphs';
import { displayChar } from '../src/core/shift';

/** Index of the first row with any solid cell (0 = full capital height). */
function topRow(char: string): number {
  return getGlyph(char).findIndex((row) => row.some(Boolean));
}

describe('glyph font', () => {
  it('has a glyph for every shifted form of every glyph', () => {
    for (const c of glyphChars()) {
      expect(hasGlyph(displayChar(c, { shift: true, caps: false })), `partner of '${c}'`).toBe(true);
    }
  });

  it('capitals are full height, so they are walls', () => {
    for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') expect(topRow(c), c).toBe(0);
  });

  it('x-height letters start at row 2, so you can hop onto them', () => {
    for (const c of 'acemnorsuvwxz') expect(topRow(c), c).toBe(2);
  });

  it('every glyph sits on the baseline or is meant to float', () => {
    const floating = new Set(["'", '"', '`', '~', '^', '-', '=', '*', '+', '/', '\\', ':', ';', ' ']);
    for (const c of glyphChars()) {
      if (floating.has(c)) continue;
      expect(getGlyph(c)[GLYPH_H - 1]?.some(Boolean), `'${c}' bottom row`).toBe(true);
    }
  });
});
