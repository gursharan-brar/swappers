import type { LevelDef } from '../core/level';

/**
 * Level 05. NEW: jamming. A letter never crushes you: let go of Shift inside the '^'
 * and it stays open (red) until you step out.
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
export const level05: LevelDef = {
  id: '05',
  name: 'Jammed',
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
