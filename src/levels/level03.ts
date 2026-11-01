import type { LevelDef } from '../core/level';

/**
 * Level 03. NEW: lifts. Stand on the 'o' and press Shift: it grows into 'O' and carries you up 16px.
 * At the same moment the 'N' shrinks into an 'n' you can now reach. From the 'o' alone
 * the 'n' is out of jump range; you need the lift.
 */
export const level03: LevelDef = {
  id: '03',
  name: 'Going up',
  map: [
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '                  ⌂ ',
    '           N████████',
    '☺   NO    o█████████',
    '████████████████████',
  ],
};
