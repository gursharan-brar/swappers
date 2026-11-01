import { hasGlyph } from './glyphs';

/**
 * Levels are written as plain text, one string per row of slots.
 * A slot is one character = one 6x7-cell glyph box (48x56 px).
 *
 * Every level is one screen: exactly LEVEL_COLS x LEVEL_ROWS slots.
 *
 * Structure characters (never change when you shift):
 *   '█'  solid block, fills the whole slot so neighbouring blocks merge into floors and walls
 *   '☺'  player spawn (empty slot; the player stands on whatever is below)
 *   '⌂'  exit (empty slot; touch it to finish)
 *
 * Anything else must be a character in glyphs.ts. ' ' is empty space.
 * The bottom edge of the screen is a pit: falling off it respawns the player.
 */

export const LEVEL_COLS = 20;
export const LEVEL_ROWS = 9;

export const BLOCK = '█';
export const SPAWN = '☺';
export const EXIT = '⌂';

export interface LevelDef {
  id: string;
  name: string;
  map: readonly string[];
}

export interface SlotPos {
  sx: number;
  sy: number;
}

export interface ParsedLevel {
  id: string;
  name: string;
  /** Every non-empty character slot: glyphs and blocks. */
  slots: { sx: number; sy: number; char: string }[];
  spawn: SlotPos;
  exit: SlotPos;
}

export function parseLevel(def: LevelDef): ParsedLevel {
  const where = `Level ${def.id} (${def.name})`;
  if (def.map.length !== LEVEL_ROWS) {
    throw new Error(`${where}: has ${def.map.length} rows, expected ${LEVEL_ROWS}`);
  }

  const slots: ParsedLevel['slots'] = [];
  let spawn: SlotPos | undefined;
  let exit: SlotPos | undefined;

  def.map.forEach((row, sy) => {
    const chars = Array.from(row);
    if (chars.length !== LEVEL_COLS) {
      throw new Error(`${where}: row ${sy} is ${chars.length} characters wide, expected ${LEVEL_COLS}`);
    }
    chars.forEach((char, sx) => {
      if (char === ' ') return;
      if (char === SPAWN) {
        if (spawn) throw new Error(`${where}: more than one spawn '${SPAWN}'`);
        spawn = { sx, sy };
        return;
      }
      if (char === EXIT) {
        if (exit) throw new Error(`${where}: more than one exit '${EXIT}'`);
        exit = { sx, sy };
        return;
      }
      if (char !== BLOCK && !hasGlyph(char)) {
        throw new Error(`${where}: row ${sy} col ${sx} has '${char}', which has no glyph`);
      }
      slots.push({ sx, sy, char });
    });
  });

  if (!spawn) throw new Error(`${where}: no spawn '${SPAWN}'`);
  if (!exit) throw new Error(`${where}: no exit '${EXIT}'`);
  return { id: def.id, name: def.name, slots, spawn, exit };
}
