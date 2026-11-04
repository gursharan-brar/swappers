import { authorize } from './authorize';
import { boost } from './boost';
import { mop } from './mop';
import { reletter } from './reletter';
import type { Microgame } from './types';

/**
 * Every microgame in the shift. To add one: copy a file in this folder, give it a new id,
 * and add it here. Play just yours with ?only=<id>, e.g. http://localhost:5173/?only=mop
 */
export const MICROGAMES: readonly Microgame[] = [authorize, boost, reletter, mop];
