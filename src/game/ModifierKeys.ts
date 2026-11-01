import { ALT_KEYS } from '../config';
import type { ShiftState } from '../core/shift';

/**
 * Tracks Shift and Caps Lock straight from DOM events instead of Phaser keys.
 *
 * Why not Phaser keys:
 *   - Caps Lock is a toggle the OS owns. macOS fires keydown only when it turns ON and keyup
 *     when it turns OFF. Reading getModifierState('CapsLock') on every event is the only
 *     reliable way to follow it, and it also picks up a Caps Lock that was on before the game loaded.
 *   - Alt-tabbing while holding Shift loses the keyup. Re-reading the modifier state on every
 *     event fixes that by itself, and blur clears it.
 *
 * Alternatives (config ALT_KEYS): hold X = Shift, press C = toggle a game-side Caps Lock.
 * The game-side toggle XORs with the OS one, so it works even if Caps Lock is remapped.
 */
export class ModifierKeys {
  private shiftHeld = false;
  private altShiftHeld = false;
  private osCaps = false;
  private altCaps = false;

  constructor(private readonly target: Window = window) {
    target.addEventListener('keydown', this.onKey);
    target.addEventListener('keyup', this.onKey);
    target.addEventListener('pointerdown', this.onPointer);
    target.addEventListener('blur', this.onBlur);
  }

  get state(): ShiftState {
    return {
      shift: this.shiftHeld || this.altShiftHeld,
      caps: this.osCaps !== this.altCaps,
    };
  }

  destroy(): void {
    this.target.removeEventListener('keydown', this.onKey);
    this.target.removeEventListener('keyup', this.onKey);
    this.target.removeEventListener('pointerdown', this.onPointer);
    this.target.removeEventListener('blur', this.onBlur);
  }

  private readonly onKey = (e: KeyboardEvent): void => {
    this.shiftHeld = e.getModifierState('Shift');
    this.osCaps = e.getModifierState('CapsLock');
    if (e.code === ALT_KEYS.holdShift) this.altShiftHeld = e.type === 'keydown';
    if (e.code === ALT_KEYS.toggleCaps && e.type === 'keydown' && !e.repeat) this.altCaps = !this.altCaps;
  };

  private readonly onPointer = (e: PointerEvent): void => {
    this.osCaps = e.getModifierState('CapsLock');
  };

  private readonly onBlur = (): void => {
    this.shiftHeld = false;
    this.altShiftHeld = false;
  };
}
