import type { LevelDef } from '../core/level';

/**
 * Level 06. NEW: '-' and '_'. Shift drops a '-' bar to the bottom of its slot ('_') and raises
 * a '_' to the middle ('-'), 24px either way. Climb the bars over the pit. To reach the
 * high ledge you need the upper bars raised while you stand on a low one: shift while
 * standing on it (your bar jams, the others rise) or shift mid-jump.
 */
export const level06: LevelDef = {
  id: '06',
  name: 'Low bar',
  map: [
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '                  ⌂ ',
    '          ____ █████',
    '☺     ----     █████',
    '██████         █████',
  ],
};
