import { CELL, SLOT_H, SLOT_W } from '../config';
import { GLYPH_H, GLYPH_W, getGlyph } from './glyphs';
import { BLOCK, LEVEL_COLS, LEVEL_ROWS, type ParsedLevel } from './level';
import { displayChar, isLetter, isShiftableSymbol, type ShiftState } from './shift';

/** Axis-aligned box in world pixels. (0,0) is the top-left of the level, not the screen. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type GlyphKind = 'block' | 'letter' | 'symbol' | 'static';

export interface GlyphInstance {
  readonly index: number;
  readonly sx: number;
  readonly sy: number;
  /** The character as written in the level file. */
  readonly base: string;
  readonly kind: GlyphKind;
  /** The character currently shown and collided with. */
  shown: string;
  /** True while this glyph wants to shift but the player is in the way. */
  jammed: boolean;
}

export interface ShiftRules {
  maxLift: number;
  jamMode: 'glyph' | 'world';
}

export interface ShiftResult {
  /** px the player was pushed up to make room (0 if none). Already applied to the box. */
  lift: number;
  /** Glyph indices that started jamming this call (for feedback: shake, sound). */
  newlyJammed: number[];
}

const EPS = 1e-6;

function kindOf(char: string): GlyphKind {
  if (char === BLOCK) return 'block';
  if (isLetter(char)) return 'letter';
  if (isShiftableSymbol(char)) return 'symbol';
  return 'static';
}

export class World {
  /** Size in cells. */
  readonly cols = LEVEL_COLS * SLOT_W;
  readonly rows = LEVEL_ROWS * SLOT_H;
  readonly widthPx = this.cols * CELL;
  readonly heightPx = this.rows * CELL;
  readonly glyphs: GlyphInstance[];
  /** Bumped whenever what is drawn changes. Renderers redraw when it differs. */
  version = 0;

  /** Glyph index owning each cell, or -1 for empty. */
  private readonly owner: Int16Array;

  constructor(level: ParsedLevel) {
    this.owner = new Int16Array(this.cols * this.rows);
    this.glyphs = level.slots.map((s, index) => ({
      index,
      sx: s.sx,
      sy: s.sy,
      base: s.char,
      kind: kindOf(s.char),
      shown: s.char,
      jammed: false,
    }));
    this.rebuild();
  }

  /** Glyph index at a cell, or -1. Outside the level: -1 (use isSolidCell for collision). */
  ownerAt(cx: number, cy: number): number {
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return -1;
    return this.owner[cy * this.cols + cx] ?? -1;
  }

  /** Left/right edges and the ceiling are walls. Below the bottom edge is an open pit. */
  isSolidCell(cx: number, cy: number): boolean {
    if (cx < 0 || cx >= this.cols || cy < 0) return true;
    if (cy >= this.rows) return false;
    return (this.owner[cy * this.cols + cx] ?? -1) >= 0;
  }

  overlaps(box: Box): boolean {
    const [cx0, cy0, cx1, cy1] = cellRange(box);
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        if (this.isSolidCell(cx, cy)) return true;
      }
    }
    return false;
  }

  /**
   * Bring every glyph in line with the current Shift/Caps state, without ever
   * putting a solid cell inside the player:
   *   1. Apply every pending change.
   *   2. If that overlaps the player, try lifting the player onto the top of the
   *      glyph that grew (at most maxLift px). Never into a glyph's hollow.
   *   3. If no lift fits, the glyphs that would crush the player jam (stay as they were)
   *      and retry every step until the player moves out of the way.
   */
  applyShift(state: ShiftState, player: Box, rules: ShiftRules): ShiftResult {
    const result: ShiftResult = { lift: 0, newlyJammed: [] };
    const pending: GlyphInstance[] = [];
    let dirty = false;

    for (const g of this.glyphs) {
      if (g.kind === 'block' || g.kind === 'static') continue;
      if (displayChar(g.base, state) !== g.shown) {
        pending.push(g);
      } else if (g.jammed) {
        g.jammed = false; // the key was released before the glyph ever shifted
        dirty = true;
      }
    }

    if (pending.length === 0) {
      if (dirty) this.version++;
      return result;
    }

    const previous = pending.map((g) => g.shown);
    for (const g of pending) g.shown = displayChar(g.base, state);
    this.rebuild();

    if (this.overlaps(player)) {
      const crushing = pending.filter((g) => this.glyphOverlaps(g, g.shown, player));
      const lift = this.findLift(player, crushing, rules.maxLift);
      if (lift > 0) {
        player.y -= lift;
        result.lift = lift;
      } else {
        const blockers = rules.jamMode === 'world' ? pending : crushing;
        for (const g of blockers) {
          g.shown = previous[pending.indexOf(g)] ?? g.base;
          if (!g.jammed) result.newlyJammed.push(g.index);
          g.jammed = true;
        }
        this.rebuild();
      }
    }

    for (const g of pending) {
      if (g.jammed && g.shown === displayChar(g.base, state)) g.jammed = false;
    }
    this.version++;
    return result;
  }

  /**
   * A lift must put the player ON TOP of every crushing glyph, never inside one
   * (otherwise a closing '6' would scoop the player into its loop). Returns 0 if
   * that needs more than maxLift px or the space above is blocked.
   */
  private findLift(player: Box, crushing: GlyphInstance[], maxLift: number): number {
    let lift = 0;
    for (const g of crushing) {
      const top = this.glyphTopUnder(g, player);
      if (top === undefined) return 0;
      lift = Math.max(lift, player.y + player.h - top);
    }
    if (lift <= 0 || lift > maxLift) return 0;
    return this.overlaps({ ...player, y: player.y - lift }) ? 0 : lift;
  }

  /** World y of the highest solid cell of glyph `g` within the player's columns. */
  private glyphTopUnder(g: GlyphInstance, box: Box): number | undefined {
    const pattern = getGlyph(g.shown);
    const [cx0, , cx1] = cellRange(box);
    const ox = g.sx * SLOT_W;
    for (let row = 0; row < GLYPH_H; row++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        if (pattern[row]?.[cx - ox]) return (g.sy * SLOT_H + row) * CELL;
      }
    }
    return undefined;
  }

  /** Would glyph `g`, drawn as `char`, have a solid cell inside `box`? */
  private glyphOverlaps(g: GlyphInstance, char: string, box: Box): boolean {
    const pattern = getGlyph(char);
    const [cx0, cy0, cx1, cy1] = cellRange(box);
    const ox = g.sx * SLOT_W;
    const oy = g.sy * SLOT_H;
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        if (pattern[cy - oy]?.[cx - ox]) return true;
      }
    }
    return false;
  }

  private rebuild(): void {
    this.owner.fill(-1);
    for (const g of this.glyphs) {
      const ox = g.sx * SLOT_W;
      const oy = g.sy * SLOT_H;
      if (g.kind === 'block') {
        for (let y = 0; y < SLOT_H; y++) {
          for (let x = 0; x < SLOT_W; x++) this.owner[(oy + y) * this.cols + ox + x] = g.index;
        }
        continue;
      }
      const pattern = getGlyph(g.shown);
      for (let y = 0; y < GLYPH_H; y++) {
        for (let x = 0; x < GLYPH_W; x++) {
          if (pattern[y]?.[x]) this.owner[(oy + y) * this.cols + ox + x] = g.index;
        }
      }
    }
  }
}

/** Inclusive cell range covered by a box. Touching an edge is not overlapping. */
export function cellRange(box: Box): [number, number, number, number] {
  return [
    Math.floor(box.x / CELL),
    Math.floor(box.y / CELL),
    Math.floor((box.x + box.w - EPS) / CELL),
    Math.floor((box.y + box.h - EPS) / CELL),
  ];
}

/** Pixel rect of a slot, in world coordinates. */
export function slotRect(sx: number, sy: number): Box {
  return { x: sx * SLOT_W * CELL, y: sy * SLOT_H * CELL, w: SLOT_W * CELL, h: SLOT_H * CELL };
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
