import { CELL, SLOT_H, SLOT_W } from '../config';
import { GLYPH_H, GLYPH_W, getGlyph } from './glyphs';
import { BLOCK, LEVEL_COLS, LEVEL_ROWS, type ParsedLevel, type SlotPos } from './level';
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
  /** What this glyph shows in each of the 4 shift states, indexed by stateIndex(). */
  readonly display: readonly [string, string, string, string];
}

/** Everything about the world that changes during play. Cheap to take and restore. */
export interface WorldSnapshot {
  readonly shown: readonly string[];
  readonly jammed: readonly boolean[];
  readonly owner: Int16Array;
  readonly settledFor: number;
}

/** 0 = none, 1 = Shift, 2 = Caps Lock, 3 = both. */
export function stateIndex(state: ShiftState): number {
  return (state.shift ? 1 : 0) | (state.caps ? 2 : 0);
}

const ALL_STATES: readonly ShiftState[] = [
  { shift: false, caps: false },
  { shift: true, caps: false },
  { shift: false, caps: true },
  { shift: true, caps: true },
];

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

  /**
   * Glyph index owning each cell, or -1 for empty. Never mutated after it is built:
   * rebuild() makes a new array, so snapshots can share it safely.
   */
  private owner: Int16Array;
  /** stateIndex() every glyph already matches with nothing jammed, or -1. Fast path. */
  private settledFor = 0;
  /** The snapshot the world currently equals, if nothing changed since; lets snapshot() reuse it. */
  private cleanSnapshot: WorldSnapshot | undefined;

  constructor(level: ParsedLevel) {
    this.glyphs = level.slots.map((s, index) => ({
      index,
      sx: s.sx,
      sy: s.sy,
      base: s.char,
      kind: kindOf(s.char),
      shown: s.char,
      jammed: false,
      display: ALL_STATES.map((st) => displayChar(s.char, st)) as unknown as [string, string, string, string],
    }));
    this.owner = this.build();
  }

  snapshot(): WorldSnapshot {
    if (this.cleanSnapshot) return this.cleanSnapshot;
    this.cleanSnapshot = {
      shown: this.glyphs.map((g) => g.shown),
      jammed: this.glyphs.map((g) => g.jammed),
      owner: this.owner,
      settledFor: this.settledFor,
    };
    return this.cleanSnapshot;
  }

  /** Short string identifying the current glyph state (for de-duplicating solver states). */
  stateKey(): string {
    return this.settledFor >= 0 ? `s${this.settledFor}` : this.glyphs.map((g) => g.shown).join('');
  }

  restore(snap: WorldSnapshot): void {
    this.glyphs.forEach((g, i) => {
      g.shown = snap.shown[i] ?? g.base;
      g.jammed = snap.jammed[i] ?? false;
    });
    this.owner = snap.owner;
    this.settledFor = snap.settledFor;
    this.cleanSnapshot = snap;
    this.version++;
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
    return this.overlapsRect(box.x, box.y, box.w, box.h);
  }

  /** Allocation-free overlap test; physics calls this thousands of times per frame in the solver. */
  overlapsRect(x: number, y: number, w: number, h: number): boolean {
    const cx0 = Math.floor(x / CELL);
    const cy0 = Math.floor(y / CELL);
    const cx1 = Math.floor((x + w - EPS) / CELL);
    const cy1 = Math.floor((y + h - EPS) / CELL);
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
    const si = stateIndex(state);
    if (this.settledFor === si) return result;
    this.cleanSnapshot = undefined;

    const pending: GlyphInstance[] = [];
    let dirty = false;

    for (const g of this.glyphs) {
      if (g.kind === 'block' || g.kind === 'static') continue;
      if (g.display[si] !== g.shown) {
        pending.push(g);
      } else if (g.jammed) {
        g.jammed = false; // the key was released before the glyph ever shifted
        dirty = true;
      }
    }

    if (pending.length === 0) {
      if (dirty) this.version++;
      this.settledFor = si;
      return result;
    }

    const previous = pending.map((g) => g.shown);
    for (const g of pending) g.shown = g.display[si] ?? g.base;
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

    let anyJammed = false;
    for (const g of pending) {
      if (g.jammed && g.shown === g.display[si]) g.jammed = false;
      if (g.jammed) anyJammed = true;
    }
    this.settledFor = anyJammed ? -1 : si;
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
    this.owner = this.build();
  }

  private build(): Int16Array {
    const owner = new Int16Array(this.cols * this.rows).fill(-1);
    for (const g of this.glyphs) {
      const ox = g.sx * SLOT_W;
      const oy = g.sy * SLOT_H;
      if (g.kind === 'block') {
        for (let y = 0; y < SLOT_H; y++) {
          for (let x = 0; x < SLOT_W; x++) owner[(oy + y) * this.cols + ox + x] = g.index;
        }
        continue;
      }
      const pattern = getGlyph(g.shown);
      for (let y = 0; y < GLYPH_H; y++) {
        for (let x = 0; x < GLYPH_W; x++) {
          if (pattern[y]?.[x]) owner[(oy + y) * this.cols + ox + x] = g.index;
        }
      }
    }
    return owner;
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

/** The exit counts when the player touches the lower part of its slot (the "door"). */
export function exitBox(exit: SlotPos): Box {
  const r = slotRect(exit.sx, exit.sy);
  return { x: r.x + CELL, y: r.y + 2 * CELL, w: r.w - 2 * CELL, h: r.h - 2 * CELL };
}

/** Where the player appears: centred in the spawn slot, feet on the slot's bottom edge. */
export function spawnPoint(spawn: SlotPos, playerW: number, playerH: number): { x: number; y: number } {
  const r = slotRect(spawn.sx, spawn.sy);
  return { x: r.x + (r.w - playerW) / 2, y: r.y + r.h - playerH };
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
