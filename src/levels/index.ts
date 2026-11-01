import type { LevelDef } from '../core/level';
import { level01 } from './level01';

/** Play order. Add new levels here; tests/levels.test.ts checks that every one parses. */
export const LEVELS: readonly LevelDef[] = [level01];
