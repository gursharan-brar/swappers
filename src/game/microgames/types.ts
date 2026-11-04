import type Phaser from 'phaser';
import type { Sfx } from '../sfx';

/** The rectangle a microgame may draw in: everything between the HUD and the timer bar. */
export interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * What a microgame gets when it starts. Everything created through `add`, `on` and
 * `onKey` is cleaned up automatically when the microgame ends, so a microgame never
 * has to tidy up after itself.
 */
export interface MicrogameContext {
  scene: Phaser.Scene;
  area: Area;
  /** 0 at the start of the shift, +1 every few wins. Use it to make things harder. */
  tier: number;
  sfx: Sfx;
  random: () => number;
  /** Register a game object so it is destroyed when the microgame ends. Returns it. */
  add<T extends Phaser.GameObjects.GameObject>(obj: T): T;
  /** Listen to a scene pointer event ('pointerdown', 'pointermove', 'pointerup') until the microgame ends. */
  on(event: 'pointerdown' | 'pointermove' | 'pointerup', fn: (pointer: Phaser.Input.Pointer) => void): void;
  /** Listen to key presses until the microgame ends. `key` is KeyboardEvent.key, e.g. '6'. */
  onKey(fn: (key: string) => void): void;
  /** Report the result. Only the first call counts. */
  win(): void;
  lose(): void;
}

export interface MicrogameInstance {
  /** Called every frame with seconds since the last frame. */
  update?(dt: number): void;
  /** What happens when the timer runs out. Default: lose. */
  timeUp?(): 'win' | 'lose';
}

export interface Microgame {
  /** Short id, used in ?only=<id> to play one microgame on repeat. */
  id: string;
  /** The big word shown before it starts. One verb, ends with "!". */
  instruction: string;
  /** A tiny hint under the instruction, e.g. "click the pump". */
  hint: string;
  start(ctx: MicrogameContext): MicrogameInstance;
}
