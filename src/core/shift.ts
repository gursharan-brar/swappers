/**
 * Shift rules, copied from a real US keyboard:
 *
 *   Caps Lock flips LETTERS only.
 *   Shift flips letters AND the number row / punctuation (1 <-> !, - <-> _, ...).
 *   Caps Lock + Shift: the letter flips cancel out, symbols stay flipped.
 *
 * A "flip" swaps a character with its partner, in both directions. So a level
 * that writes 'A' shows 'a' while shifted, and a level that writes '!' shows '1'.
 */

export interface ShiftState {
  shift: boolean;
  caps: boolean;
}

const SYMBOL_PAIRS: readonly (readonly [string, string])[] = [
  ['1', '!'], ['2', '@'], ['3', '#'], ['4', '$'], ['5', '%'],
  ['6', '^'], ['7', '&'], ['8', '*'], ['9', '('], ['0', ')'],
  ['-', '_'], ['=', '+'], ['[', '{'], [']', '}'], ['\\', '|'],
  [';', ':'], ["'", '"'], [',', '<'], ['.', '>'], ['/', '?'], ['`', '~'],
];

const SYMBOL_PARTNER: ReadonlyMap<string, string> = new Map(
  SYMBOL_PAIRS.flatMap(([a, b]) => [[a, b], [b, a]] as const),
);

export function isLetter(char: string): boolean {
  return /^[A-Za-z]$/.test(char);
}

export function isShiftableSymbol(char: string): boolean {
  return SYMBOL_PARTNER.has(char);
}

/** The character a glyph written as `base` should show in the given shift state. */
export function displayChar(base: string, state: ShiftState): string {
  if (isLetter(base)) {
    const flip = state.caps !== state.shift;
    if (!flip) return base;
    return base === base.toUpperCase() ? base.toLowerCase() : base.toUpperCase();
  }
  if (state.shift) return SYMBOL_PARTNER.get(base) ?? base;
  return base;
}
