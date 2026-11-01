import { describe, expect, it } from 'vitest';
import { solveLevel } from '../src/core/solver';
import { LEVELS } from '../src/levels';

/**
 * Proof that each level actually uses its mechanics. "Impossible" here means the solver
 * explored every reachable state (within its position rounding) and never reached the exit.
 * If one of these fails after a level edit, the level got a shortcut: check it in the browser.
 */
const byId = (id: string) => {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`No level ${id}`);
  return level;
};

describe('level design', () => {
  it.each(LEVELS.map((l) => [`${l.id} ${l.name}`, l] as const))(
    '%s cannot be beaten without Shift or Caps Lock',
    (_name, level) => {
      const r = solveLevel(level, { shiftValues: [false], capsValues: [false], maxStates: 400_000 });
      expect(r.solved).toBe(false);
      expect(r.exhausted).toBe(true);
    },
    60_000,
  );

  // These levels are about letting go at the right moment.
  it.each(['01', '02', '03', '05', '06', '09'])(
    'level %s cannot be beaten by holding Shift the whole time',
    (id) => {
      const r = solveLevel(byId(id), { shiftValues: [true], capsValues: [false], maxStates: 400_000 });
      expect(r.solved).toBe(false);
      expect(r.exhausted).toBe(true);
    },
    60_000,
  );
});
