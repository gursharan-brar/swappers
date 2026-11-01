import type { LevelDef } from '../core/level';

/**
 * Level 04. NEW: the number row. Shift turns '6' into '^', which only fills the top of its slot:
 * a door you walk under. Caps Lock only changes letters, so it can't open these.
 */
export const level04: LevelDef = {
  id: '04',
  name: 'Shift 6',
  map: [
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '☺  NO   6   66   6 ⌂',
    '████████████████████',
  ],
};
