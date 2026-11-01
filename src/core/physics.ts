import { CELL, PHYSICS, PLAYER } from '../config';
import type { Box } from './world';

export type PhysicsTuning = typeof PHYSICS;

/** Anything the player can collide with. World implements this. */
export interface Collider {
  overlaps(box: Box): boolean;
}

export interface Player extends Box {
  vx: number;
  vy: number;
  grounded: boolean;
  /** Seconds left in which a jump still counts after leaving the ground. */
  coyote: number;
  /** Seconds left in which a buffered jump press fires on landing. */
  buffer: number;
  /** True while rising from a jump the player is still holding. */
  jumping: boolean;
}

export interface PlayerInput {
  left: boolean;
  right: boolean;
  /** Jump key is held this step. */
  jumpHeld: boolean;
  /** Jump key went down since the last step. */
  jumpPressed: boolean;
}

const EPS = 1e-6;

export function createPlayer(x: number, y: number): Player {
  return {
    x,
    y,
    w: PLAYER.w,
    h: PLAYER.h,
    vx: 0,
    vy: 0,
    grounded: false,
    coyote: 0,
    buffer: 0,
    jumping: false,
  };
}

function approach(value: number, target: number, amount: number): number {
  return value < target ? Math.min(value + amount, target) : Math.max(value - amount, target);
}

/** Advance the player one fixed step. Mutates `p`. */
export function stepPlayer(
  p: Player,
  input: PlayerInput,
  world: Collider,
  dt: number,
  t: PhysicsTuning = PHYSICS,
): void {
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir !== 0) {
    p.vx = approach(p.vx, dir * t.runSpeed, (p.grounded ? t.groundAccel : t.airAccel) * dt);
  } else {
    p.vx = approach(p.vx, 0, (p.grounded ? t.groundFriction : t.airAccel) * dt);
  }

  p.buffer = input.jumpPressed ? t.jumpBuffer : Math.max(0, p.buffer - dt);
  p.coyote = p.grounded ? t.coyoteTime : Math.max(0, p.coyote - dt);

  if (p.buffer > 0 && p.coyote > 0) {
    p.vy = -t.jumpVelocity;
    p.buffer = 0;
    p.coyote = 0;
    p.grounded = false;
    p.jumping = true;
  }
  if (p.jumping && !input.jumpHeld && p.vy < 0) {
    p.vy *= t.jumpCutMultiplier;
    p.jumping = false;
  }
  if (p.vy >= 0) p.jumping = false;

  p.vy = Math.min(p.vy + t.gravity * dt, t.maxFall);

  moveX(p, p.vx * dt, world, t.stepUp);
  moveY(p, p.vy * dt, world);
}

function moveX(p: Player, dx: number, world: Collider, stepUp: number): void {
  if (dx === 0) return;
  const nx = p.x + dx;
  if (!world.overlaps({ x: nx, y: p.y, w: p.w, h: p.h })) {
    p.x = nx;
    return;
  }
  if (p.grounded) {
    for (let s = 1; s <= stepUp; s++) {
      if (!world.overlaps({ x: nx, y: p.y - s, w: p.w, h: p.h })) {
        p.x = nx;
        p.y -= s;
        return;
      }
    }
  }
  // Snap flush against the cell we hit. Steps move < 1 cell, so it is the next cell boundary.
  if (dx > 0) {
    const col = Math.floor((nx + p.w - EPS) / CELL);
    p.x = Math.max(p.x, col * CELL - p.w);
  } else {
    const col = Math.floor(nx / CELL);
    p.x = Math.min(p.x, (col + 1) * CELL);
  }
  p.vx = 0;
}

function moveY(p: Player, dy: number, world: Collider): void {
  const ny = p.y + dy;
  if (!world.overlaps({ x: p.x, y: ny, w: p.w, h: p.h })) {
    p.y = ny;
    p.grounded = false;
    return;
  }
  if (dy > 0) {
    const row = Math.floor((ny + p.h - EPS) / CELL);
    p.y = Math.max(p.y, row * CELL - p.h);
    p.grounded = true;
  } else {
    const row = Math.floor(ny / CELL);
    p.y = Math.min(p.y, (row + 1) * CELL);
    p.jumping = false;
  }
  p.vy = 0;
}
