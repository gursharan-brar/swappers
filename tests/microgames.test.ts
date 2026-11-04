import { describe, expect, it } from 'vitest';
import { MICROGAMES } from '../src/game/microgames';

describe('microgame registry', () => {
  it('has unique ids', () => {
    const ids = MICROGAMES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every instruction is one shouted word, short enough to read in a second', () => {
    for (const m of MICROGAMES) {
      expect(m.instruction, m.id).toMatch(/^[A-Z-]+!$/);
      expect(m.instruction.length, m.id).toBeLessThanOrEqual(12);
      expect(m.hint.length, m.id).toBeGreaterThan(0);
    }
  });
});
