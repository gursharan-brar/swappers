import type { LevelDef } from '../core/level';

/**
 * Level 01 teaches the whole Shift set in one screen, left to right:
 *
 *   NO   A wall. Capitals are 56px, too tall to jump. Hold Shift: "no" is 40px, hop over.
 *   6    A door. Hold Shift: '6' becomes '^', which only fills the top of the slot. Walk under.
 *   TTT  A bridge over the pit, but only while unshifted: 't' has no top bar.
 *        So let go of Shift while you are under the '^'. The '^' can't turn back into '6'
 *        with you inside it, so it jams (red) until you step out.
 *   n█O  Climb. The 'O' is too tall to reach from the block. Shift turns it into 'o'. Jump on,
 *        then let go of Shift: the 'O' grows back under you and lifts you level with the exit ledge.
 *
 * Map legend: █ block, ☺ spawn, ⌂ exit, ' ' empty, anything else is a glyph.
 * Exactly 20 columns x 9 rows. Keep the comment above in sync when you change the map.
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
    '                  ⌂ ',
    '               O████',
    '☺   NO   6   n██████',
    '██████████TTT███████',
  ],
};
