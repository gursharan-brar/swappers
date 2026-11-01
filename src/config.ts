/**
 * All tunables live here. Pure constants: safe to import from src/core (no Phaser).
 *
 * The jump numbers are NOT free to change. tests/physics.test.ts enforces the
 * invariant the whole game depends on:
 *     lowercase x-height (40px) < jump apex < 48px
 * i.e. you can hop onto "no" but not over "NO". 48, not 56: round capitals like O and C
 * have a shoulder one cell below the top, and reaching it lets you climb over them.
 */

/** One font pixel, in screen pixels. */
export const CELL = 8;
/** A slot is one character of level text: a 5x7 glyph plus a 1-cell gap column. */
export const SLOT_W = 6;
export const SLOT_H = 7;

export const GAME_W = 960;
export const GAME_H = 540;
/** The level (20x9 slots = 960x504) is drawn under a 36px HUD strip. */
export const HUD_H = 36;

/** Physics runs at a fixed rate so feel is identical on 60Hz and 144Hz screens. */
export const FIXED_DT = 1 / 120;

export const PLAYER = {
  w: 10, // wider than the 8px gap between letters, so you never fall between them
  h: 14,
} as const;

export const PHYSICS = {
  gravity: 1400, // px/s^2
  jumpVelocity: 362, // px/s, apex ~45px: above x-height (40), below the 48px shoulder of round capitals
  runSpeed: 130, // px/s
  groundAccel: 1600,
  airAccel: 1100,
  groundFriction: 2000,
  maxFall: 520,
  coyoteTime: 0.08, // s you can still jump after walking off a ledge
  jumpBuffer: 0.1, // s a jump press is remembered before landing
  jumpCutMultiplier: 0.45, // releasing jump early cuts upward speed: short hops
  stepUp: 8, // px. Walking into a 1-cell bump climbs it. Makes pixel-font edges and diagonals feel smooth.
} as const;

export const SHIFT_RULES = {
  /**
   * When a glyph grows into the player, push the player up by at most this many px
   * (16 = the height difference between lowercase and capitals). Standing on "o"
   * and shifting to "O" lifts you. If no lift fits, the glyph jams instead.
   */
  maxLift: 16,
  /**
   * 'glyph': only the letter(s) overlapping the player jam; everything else shifts.
   * 'world': if any letter would jam, nothing shifts.
   * Playtest both; flip this and reload.
   */
  jamMode: 'glyph' as 'glyph' | 'world',
};

/** Alternatives for players whose Shift triggers Sticky Keys or whose Caps Lock is remapped. */
export const ALT_KEYS = {
  holdShift: 'KeyX',
  toggleCaps: 'KeyC',
} as const;

export const COLORS = {
  background: 0x14161c,
  hud: 0x1d2029,
  block: 0x3b4252,
  glyph: 0xe5e0d3,
  glyphFlipped: 0xf2b84b,
  glyphJammed: 0xff5a5a,
  exit: 0x6fd08c,
  player: 0x7cc6ff,
} as const;
