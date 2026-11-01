import type { LevelDef } from '../core/level';

/**
 * Level 10. Everything. Bottom floor: NO wall, '6' door with a TT bridge (let go inside the door).
 * Right shaft: lift on the 'o' into the 'n', then the '-' bars (shift while standing
 * on one so it jams and the other rises). Top floor, back left: CAPS LOCK section.
 */
export const level10: LevelDef = {
  id: '10',
  name: 'Final shift',
  map: [
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '⌂ NO ^ NO ^ NO      ',
    '████████████████--  ',
    '                  N ',
    '☺  NO  6         o█ ',
    '████████TT██████████',
  ],
};
