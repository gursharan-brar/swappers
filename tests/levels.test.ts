import { describe, expect, it } from 'vitest';
import { parseLevel } from '../src/core/level';
import { describePath, solveLevel } from '../src/core/solver';
import { LEVELS } from '../src/levels';

const cases = LEVELS.map((l) => [`${l.id} ${l.name}`, l] as const);

describe('levels', () => {
  it('there are at least 10, with unique ids in order', () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(10);
    expect(LEVELS.map((l) => l.id)).toEqual(LEVELS.map((_, i) => String(i + 1).padStart(2, '0')));
  });

  it.each(cases)('%s parses', (_name, level) => {
    expect(() => parseLevel(level)).not.toThrow();
  });

  // The solver plays the real physics and shift rules. Caps Lock is left out on purpose:
  // every level must be beatable with Shift alone, so Caps Lock is a convenience, never a lock-out.
  it.each(cases)(
    '%s is beatable with Shift alone',
    (_name, level) => {
      const result = solveLevel(level, { capsValues: [false], maxStates: 200_000 });
      expect(result.solved, `no route found after ${result.states} states`).toBe(true);
      expect(describePath(result.path ?? [])).not.toBe('');
    },
    60_000,
  );
});
