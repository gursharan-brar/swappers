import { describe, expect, it } from 'vitest';
import { level01 } from '../src/levels/level01';
import { simulate } from './helpers';

/** Slot column -> world x of its left edge. */
const col = (c: number) => c * 48;

describe('level 01 is beatable by the intended route', () => {
  it('NO wall, 6 door with a jam, TTT bridge, O lift, exit', () => {
    const sim = simulate(level01);
    const p = sim.player;
    const shift = { shift: true };
    const glyph = (base: string) => sim.world.glyphs.find((g) => g.base === base)!;
    const onGround = () => p.grounded;

    // Unshifted, "NO" is a wall.
    sim.run(2, { right: true });
    expect(p.x + p.w).toBeLessThanOrEqual(col(4) + 1);

    // Shift: hop onto "no" and walk across it.
    sim.until(onGround, {}, shift);
    sim.run(0.35, { right: true, jumpHeld: true }, shift);
    sim.until(() => p.x > col(7), { right: true }, shift);

    // Walk under the '^' (shifted 6) and stop inside it.
    sim.until(() => p.x > col(9) + 16, { right: true }, shift);
    sim.until(() => Math.abs(p.vx) < 1, {}, shift);
    expect(glyph('6').shown).toBe('^');

    // Let go of Shift while inside: the door jams instead of crushing us.
    sim.run(0.1);
    expect(glyph('6').jammed).toBe(true);
    expect(glyph('T').shown).toBe('T');

    // Cross the TTT bridge; the door closes behind us.
    sim.until(() => p.x > col(12), { right: true });
    expect(glyph('6').shown).toBe('6');
    expect(p.grounded).toBe(true);

    // Hop onto 'n', then onto the block.
    sim.run(0.35, { right: true, jumpHeld: true });
    sim.until(onGround);
    sim.until(() => p.x > col(14) + 4, { right: true, jumpHeld: true });
    sim.until(onGround);
    sim.until(() => p.x + p.w > col(15) - 1, { right: true });

    // 'O' is out of reach. Shift makes it 'o'; jump on.
    sim.run(0.1, {}, shift);
    sim.run(0.3, { right: true, jumpHeld: true }, shift);
    sim.until(onGround, { right: true }, shift);

    // Release Shift: the 'O' grows back underneath and lifts us to the ledge. Walk to the exit.
    sim.until(() => sim.atExit(), { right: true }, {}, 4);
    expect(sim.atExit()).toBe(true);
  });
});
