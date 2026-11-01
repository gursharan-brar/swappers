import { CELL, FIXED_DT, PLAYER, SHIFT_RULES, SLOT_H, SLOT_W } from '../config';
import { BLOCK, LEVEL_COLS, LEVEL_ROWS, parseLevel, type LevelDef, type ParsedLevel } from './level';
import { createPlayer, stepPlayer, type Player } from './physics';
import type { ShiftState } from './shift';
import { World, boxesOverlap, exitBox, spawnPoint, type ShiftRules, type WorldSnapshot } from './world';

/**
 * Brute-force level solver. Best-first search (towards the exit) over short bursts of input
 * (move left/right/none, jump held or not, Shift held or not, Caps Lock on or off),
 * running the real physics and shift rules. Used by tests to prove that:
 *   - every level can be beaten, and
 *   - a level really needs the element it introduces (it can't be beaten with that element banned).
 *
 * It is a dev tool: never import it from game code.
 */

export interface SolveOptions {
  /** Shift states the player may use. Default [false, true]; [true] = Shift held the whole time. */
  shiftValues?: readonly boolean[];
  /** Caps Lock states the player may use. Default [false, true]. */
  capsValues?: readonly boolean[];
  /** Shift rules; pass maxLift: 0 to ban lifts. */
  rules?: ShiftRules;
  /** Treat any jam as a dead end, to check whether a level needs the jam rule. */
  banJam?: boolean;
  /** Physics steps per input burst. 12 steps = 0.1s. */
  burstSteps?: number;
  /** Give up after expanding this many states. */
  maxStates?: number;
}

export interface Burst {
  dir: -1 | 0 | 1;
  jump: boolean;
  shift: boolean;
  caps: boolean;
}

export interface SolveResult {
  solved: boolean;
  /** True if the search ran out of states to try, so "unsolved" is a proof, not a timeout. */
  exhausted: boolean;
  states: number;
  /** The winning input, one Burst per burstSteps physics steps. */
  path?: Burst[];
}

interface Node {
  player: Player;
  world: WorldSnapshot;
  jumpWasHeld: boolean;
  shift: boolean;
  caps: boolean;
  parent: number;
  burst: Burst | undefined;
}

export function solveLevel(def: LevelDef, opts: SolveOptions = {}): SolveResult {
  const shiftValues = opts.shiftValues ?? [false, true];
  const capsValues = opts.capsValues ?? [false, true];
  const rules = opts.rules ?? SHIFT_RULES;
  const burstSteps = opts.burstSteps ?? 12;
  const maxStates = opts.maxStates ?? 400_000;

  const level = parseLevel(def);
  const world = new World(level);
  const goal = exitBox(level.exit);
  const deathY = world.heightPx + 32;
  const start = spawnPoint(level.spawn, PLAYER.w, PLAYER.h);

  const bursts: Burst[] = [];
  for (const dir of [1, -1, 0] as const) {
    for (const jump of [false, true]) {
      for (const shift of shiftValues) {
        for (const caps of capsValues) bursts.push({ dir, jump, shift, caps });
      }
    }
  }

  const nodes: Node[] = [];
  const depth: number[] = [];
  const seen = new Set<string>();
  // States closer than this are treated as the same. Coarse on purpose: it keeps the search
  // small enough to run in tests. The price: "unsolvable" means "the solver found no way",
  // which is strong evidence, not a mathematical proof.
  const keyOf = (n: Omit<Node, 'parent' | 'burst'>, worldKey: string): string => {
    const p = n.player;
    return (
      `${Math.round(p.x / 2)},${Math.round(p.y / 2)},${Math.round(p.vx / 40)},${Math.round(p.vy / 60)},` +
      `${p.grounded ? 1 : 0}${p.jumping ? 1 : 0}${n.jumpWasHeld ? 1 : 0}${n.shift ? 1 : 0}${n.caps ? 1 : 0},${worldKey}`
    );
  };
  // Weighted A*: bursts taken so far + 3x the estimated bursts left. The estimate follows
  // the route around solid blocks (letters may move, so they count as open): whole slots
  // still to cross, plus the exact distance to the next slot on that route.
  const goalX = goal.x + goal.w / 2;
  const goalY = goal.y + goal.h / 2;
  const route = slotRoute(level);
  const slotW = SLOT_W * CELL;
  const slotH = SLOT_H * CELL;
  const priority = (i: number): number => {
    const p = nodes[i]!.player;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    const sx = Math.min(LEVEL_COLS - 1, Math.max(0, Math.floor(cx / slotW)));
    const sy = Math.min(LEVEL_ROWS - 1, Math.max(0, Math.floor(cy / slotH)));
    const here = sy * LEVEL_COLS + sx;
    const slots = route.dist[here]!;
    const next = route.next[here]!;
    const tx = next < 0 ? goalX : (next % LEVEL_COLS + 0.5) * slotW;
    const ty = next < 0 ? goalY : (Math.floor(next / LEVEL_COLS) + 0.5) * slotH;
    const px = Math.max(0, slots - 1) * slotW + Math.hypot(cx - tx, cy - ty);
    return depth[i]! + (3 * px) / 13; // ~13px per burst at run speed
  };
  const open = new MinHeap(priority);

  const first: Node = {
    player: createPlayer(start.x, start.y),
    world: world.snapshot(),
    jumpWasHeld: false,
    shift: shiftValues[0] ?? false,
    caps: capsValues[0] ?? false,
    parent: -1,
    burst: undefined,
  };
  nodes.push(first);
  depth.push(0);
  seen.add(keyOf(first, world.stateKey()));
  open.push(0);

  let expanded = 0;
  while (open.size > 0) {
    if (expanded >= maxStates) return { solved: false, exhausted: false, states: expanded };
    const head = open.pop();
    const node = nodes[head]!;
    expanded++;

    for (const burst of bursts) {
      world.restore(node.world);
      const player: Player = { ...node.player };
      const state: ShiftState = { shift: burst.shift, caps: burst.caps };
      let jumpWasHeld = node.jumpWasHeld;
      let dead = false;
      let won = false;

      for (let i = 0; i < burstSteps; i++) {
        const shifted = world.applyShift(state, player, rules);
        if (opts.banJam && shifted.newlyJammed.length > 0) {
          dead = true;
          break;
        }
        stepPlayer(
          player,
          { left: burst.dir < 0, right: burst.dir > 0, jumpHeld: burst.jump, jumpPressed: burst.jump && !jumpWasHeld },
          world,
          FIXED_DT,
        );
        jumpWasHeld = burst.jump;
        if (player.y > deathY) {
          dead = true;
          break;
        }
        if (boxesOverlap(player, goal)) {
          won = true;
          break;
        }
      }
      if (dead) continue;

      const child: Node = {
        player,
        world: world.snapshot(),
        jumpWasHeld,
        shift: burst.shift,
        caps: burst.caps,
        parent: head,
        burst,
      };
      if (won) {
        nodes.push(child);
        return { solved: true, exhausted: false, states: expanded, path: pathTo(nodes, nodes.length - 1) };
      }
      const key = keyOf(child, world.stateKey());
      if (seen.has(key)) continue;
      seen.add(key);
      nodes.push(child);
      depth.push(depth[head]! + 1);
      open.push(nodes.length - 1);
    }
  }
  return { solved: false, exhausted: true, states: expanded };
}

/** Binary min-heap of node indices ordered by a priority function. */
class MinHeap {
  private readonly items: number[] = [];
  private readonly keys: number[] = [];
  constructor(private readonly priority: (i: number) => number) {}

  get size(): number {
    return this.items.length;
  }

  push(item: number): void {
    const key = this.priority(item);
    let i = this.items.length;
    this.items.push(item);
    this.keys.push(key);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.keys[parent]! <= key) break;
      this.items[i] = this.items[parent]!;
      this.keys[i] = this.keys[parent]!;
      i = parent;
    }
    this.items[i] = item;
    this.keys[i] = key;
  }

  pop(): number {
    const top = this.items[0]!;
    const lastItem = this.items.pop()!;
    const lastKey = this.keys.pop()!;
    const n = this.items.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        if (l >= n) break;
        const r = l + 1;
        const c = r < n && this.keys[r]! < this.keys[l]! ? r : l;
        if (this.keys[c]! >= lastKey) break;
        this.items[i] = this.items[c]!;
        this.keys[i] = this.keys[c]!;
        i = c;
      }
      this.items[i] = lastItem;
      this.keys[i] = lastKey;
    }
    return top;
  }
}

/**
 * Breadth-first slot distances from the exit, walking around '█' blocks, plus for each slot
 * the neighbouring slot one step closer (-1 for the exit slot itself).
 */
function slotRoute(level: ParsedLevel): { dist: Int32Array; next: Int32Array } {
  const n = LEVEL_COLS * LEVEL_ROWS;
  const dist = new Int32Array(n).fill(n);
  const next = new Int32Array(n).fill(-1);
  const blocked = new Uint8Array(n);
  for (const s of level.slots) if (s.char === BLOCK) blocked[s.sy * LEVEL_COLS + s.sx] = 1;
  const start = level.exit.sy * LEVEL_COLS + level.exit.sx;
  const queue = [start];
  dist[start] = 0;
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q]!;
    const x = i % LEVEL_COLS;
    const y = Math.floor(i / LEVEL_COLS);
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const) {
      if (nx < 0 || ny < 0 || nx >= LEVEL_COLS || ny >= LEVEL_ROWS) continue;
      const j = ny * LEVEL_COLS + nx;
      if (blocked[j] || dist[j]! <= dist[i]! + 1) continue;
      dist[j] = dist[i]! + 1;
      next[j] = i;
      queue.push(j);
    }
  }
  return { dist, next };
}

function pathTo(nodes: Node[], index: number): Burst[] {
  const path: Burst[] = [];
  for (let n = nodes[index]; n && n.burst; n = nodes[n.parent]) path.push(n.burst);
  return path.reverse();
}

/** Human-readable route, e.g. "→ 0.3s, →+jump 0.2s, ⇧→ 0.5s". For debugging levels. */
export function describePath(path: Burst[], burstSeconds = 0.1): string {
  const label = (b: Burst) =>
    `${b.caps ? '⇪' : ''}${b.shift ? '⇧' : ''}${b.dir > 0 ? '→' : b.dir < 0 ? '←' : '·'}${b.jump ? '+jump' : ''}`;
  const out: string[] = [];
  let prev = '';
  let count = 0;
  for (const b of path) {
    const l = label(b);
    if (l === prev) count++;
    else {
      if (prev) out.push(`${prev} ${(count * burstSeconds).toFixed(1)}s`);
      prev = l;
      count = 1;
    }
  }
  if (prev) out.push(`${prev} ${(count * burstSeconds).toFixed(1)}s`);
  return out.join(', ');
}
