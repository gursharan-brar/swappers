import type { LevelDef } from '../core/level';

/**
 * Level 07. NEW: Caps Lock. These '^' doors are written open, so Shift CLOSES them (into '6').
 * Shift alone means juggling: shift for each NO, let go for each '^'.
 * Caps Lock flips letters but not symbols, so with it on you just walk through.
 * The end: 'no' is written lowercase and '6' needs Shift. Caps Lock + Shift cancel out
 * on letters, so the 'no' stays low while the 6 opens.
 */
export const level07: LevelDef = {
  id: '07',
  name: 'CAPS LOCK',
  map: [
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '☺ NO ^ NO ^ NO no 6⌂',
    '████████████████████',
  ],
};
