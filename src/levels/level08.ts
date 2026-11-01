import type { LevelDef } from '../core/level';

/**
 * Level 08. NEW: ascenders. Not every letter shrinks: l, h, b, d, k, t, f stay tall in lowercase.
 * "OHO" becomes a bump (o, tall h, o) you climb over instead of a wall.
 * "OL" becomes a staircase: 'o' is 40px, 'l' stays 56px. That extra height is the
 * only way to reach the 'o' on the block.
 */
export const level08: LevelDef = {
  id: '08',
  name: 'Read the shapes',
  map: [
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '                  ⌂ ',
    '              O█████',
    '☺   OHO     OL██████',
    '████████████████████',
  ],
};
