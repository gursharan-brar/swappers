import { describe, expect, it } from 'vitest';
import { parseLevel } from '../src/core/level';
import { LEVELS } from '../src/levels';

describe('levels', () => {
  it.each(LEVELS.map((l) => [l.id, l] as const))('level %s parses', (_id, level) => {
    expect(() => parseLevel(level)).not.toThrow();
  });
});
