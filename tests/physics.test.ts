import { describe, expect, it } from 'vitest';
import { CELL, SLOT_H } from '../src/config';
import { levelFrom, simulate } from './helpers';

const FLOOR_TOP = 8 * SLOT_H * CELL; // top surface of the bottom row of blocks

describe('jump tuning (the rule every level depends on)', () => {
  it('apex is above lowercase x-height (40px) and below the 48px shoulder of round capitals', () => {
    const sim = simulate(levelFrom(['☺        ⌂', '████████████████████']));
    sim.run(0.2);
    let apex = 0;
    for (let i = 0; i < 120; i++) {
      sim.run(1 / 120, { jumpHeld: true });
      apex = Math.max(apex, FLOOR_TOP - (sim.player.y + sim.player.h));
    }
    expect(apex).toBeGreaterThan(40 + 4);
    expect(apex).toBeLessThan(48 - 1.5);
  });

  it('cannot cross "NO", can cross "no"', () => {
    for (const [word, passable] of [['NO', false], ['no', true]] as const) {
      const sim = simulate(levelFrom([`☺  ${word}   ⌂`, '████████████████████']));
      for (let i = 0; i < 6; i++) {
        sim.run(0.5, { right: true, jumpHeld: true });
        sim.run(0.1, { right: true });
      }
      expect(sim.atExit(), word).toBe(passable);
    }
  });

  it('never falls into the gap between letters', () => {
    // Start on a block, drop onto a row of 'o's and walk along their tops.
    const sim = simulate(levelFrom(['☺ ', '█oooooo      ⌂', '████████████████████']));
    sim.run(5, { right: true });
    expect(sim.atExit()).toBe(true);
  });
});
