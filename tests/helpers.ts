import { FIXED_DT, SHIFT_RULES } from '../src/config';
import { parseLevel, type LevelDef } from '../src/core/level';
import { createPlayer, stepPlayer, type Player, type PlayerInput } from '../src/core/physics';
import type { ShiftState } from '../src/core/shift';
import { World, boxesOverlap, slotRect } from '../src/core/world';

/** Build a 20x9 level from the rows you care about; missing rows above are blank. */
export function levelFrom(rows: string[]): LevelDef {
  const blank = ' '.repeat(20);
  const map = [...Array(9 - rows.length).fill(blank), ...rows].map((r) => r.padEnd(20, ' '));
  return { id: 'test', name: 'test', map };
}

export interface Sim {
  world: World;
  player: Player;
  /** Run for `seconds` holding the given input and shift state. */
  run(seconds: number, input?: Partial<PlayerInput>, state?: Partial<ShiftState>): void;
  /** Step until `done()` is true; throws after `maxSeconds` so a broken route fails loudly. */
  until(
    done: () => boolean,
    input?: Partial<PlayerInput>,
    state?: Partial<ShiftState>,
    maxSeconds?: number,
  ): void;
  atExit(): boolean;
}

export function simulate(def: LevelDef): Sim {
  const level = parseLevel(def);
  const world = new World(level);
  const spawn = slotRect(level.spawn.sx, level.spawn.sy);
  const player = createPlayer(spawn.x + (spawn.w - 10) / 2, spawn.y + spawn.h - 14);
  const exit = slotRect(level.exit.sx, level.exit.sy);
  let reachedExit = false;
  let jumpWasHeld = false;

  return {
    world,
    player,
    run(seconds, input = {}, state = {}) {
      const steps = Math.round(seconds / FIXED_DT);
      for (let i = 0; i < steps; i++) {
        const jumpHeld = input.jumpHeld ?? false;
        world.applyShift({ shift: false, caps: false, ...state }, player, SHIFT_RULES);
        stepPlayer(
          player,
          { left: false, right: false, ...input, jumpHeld, jumpPressed: jumpHeld && !jumpWasHeld },
          world,
          FIXED_DT,
        );
        jumpWasHeld = jumpHeld;
        if (boxesOverlap(player, exit)) reachedExit = true;
      }
    },
    until(done, input = {}, state = {}, maxSeconds = 5) {
      for (let t = 0; t < maxSeconds; t += FIXED_DT) {
        if (done()) return;
        this.run(FIXED_DT, input, state);
      }
      throw new Error(
        `until() timed out at x=${player.x.toFixed(1)} y=${player.y.toFixed(1)} grounded=${player.grounded}`,
      );
    },
    atExit: () => reachedExit,
  };
}
