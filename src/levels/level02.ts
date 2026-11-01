import type { LevelDef } from '../core/level';

/**
 * Level 02. NEW: Shift works both ways. Lowercase letters GROW when you shift.
 * Left climb: hop the 'o' WITHOUT Shift, then hold Shift so the 'O' shrinks into a step.
 * Right climb: the opposite. Hold Shift to shrink the 'O', then let go so the 'o' stays low.
 */
export const level02: LevelDef = {
  id: '02',
  name: 'Both ways',
  map: [
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '                   ⌂',
    '        O███    o███',
    '☺     o█████  O█████',
    '████████████████████',
  ],
};
