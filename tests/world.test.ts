import { describe, expect, it } from 'vitest';
import { levelFrom, simulate } from './helpers';

describe('shifting', () => {
  it('a letter that would crush the player jams, then shifts once the player leaves', () => {
    // Walk under a '^' (shifted '6'), then let go of Shift while inside it.
    const sim = simulate(levelFrom(['☺  6       ⌂', '████████████████████']));
    sim.run(1.5, { right: true }, { shift: true });
    const door = sim.world.glyphs.find((g) => g.base === '6')!;
    sim.player.vx = 0;
    // Park the player under the door.
    sim.player.x = door.sx * 48 + 18;
    sim.run(0.1, {}, { shift: true });
    expect(door.shown).toBe('^');

    sim.run(0.1, {}, { shift: false });
    expect(door.jammed).toBe(true);
    expect(door.shown).toBe('^');

    sim.run(1, { right: true }, { shift: false });
    expect(door.jammed).toBe(false);
    expect(door.shown).toBe('6');
  });

  it('standing on "o" and shifting lifts the player onto the "O"', () => {
    const sim = simulate(levelFrom(['☺o        ⌂', '████████████████████']));
    sim.run(0.3, { right: true, jumpHeld: true });
    sim.run(0.6);
    const yOnLower = sim.player.y;
    sim.run(0.1, {}, { shift: true });
    expect(yOnLower - sim.player.y).toBeCloseTo(16, 0);
    expect(sim.world.glyphs.find((g) => g.base === 'o')!.shown).toBe('O');
  });
});
