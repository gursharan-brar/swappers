import type { LevelDef } from '../core/level';

/**
 * Level 09. NEW: floating letters. Cross the pit on letters hanging in mid-air.
 * Capitals stand 16px taller than lowercase, so every jump needs the right case:
 * high stones need you lower, low stones need you higher. Mixed written case means
 * you keep switching.
 */
export const level09: LevelDef = {
  id: '09',
  name: 'Stepping stones',
  map: [
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '                    ',
    '                  ⌂ ',
    '     O  o n N o ████',
    '☺   o  O        ████',
    '████            ████',
  ],
};
