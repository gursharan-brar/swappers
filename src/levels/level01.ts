import type { LevelDef } from '../core/level';

/**
 * Level 01. NEW: Shift. Capitals are 56px walls; you can't jump over them.
 * Lowercase is 40px; you can hop onto it. Hold Shift: NO becomes no.
 * "neon" is already lowercase, so the first hop needs no Shift (and Shift would make it a wall).
 */
export const level01: LevelDef = {
  id: '01',
  name: 'NO means no',
  map: [
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '☺  neon  NO   ON   ⌂',
    '████████████████████',
  ],
};
