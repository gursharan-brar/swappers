import Phaser from 'phaser';
import { CELL, COLORS, FIXED_DT, GAME_W, HUD_H, PLAYER, SHIFT_RULES, SLOT_H } from '../config';
import { LEVEL_ROWS, parseLevel, type ParsedLevel } from '../core/level';
import { createPlayer, stepPlayer, type Player } from '../core/physics';
import { World, boxesOverlap, exitBox, spawnPoint } from '../core/world';
import { LEVELS } from '../levels';
import { ModifierKeys } from './ModifierKeys';

type Status = 'playing' | 'cleared';

/** `?level=7` in the URL starts at level 7. Handy for playtesting one level. */
function levelFromUrl(): number {
  const n = Number(new URLSearchParams(window.location.search).get('level'));
  return Number.isInteger(n) && n >= 1 && n <= LEVELS.length ? n - 1 : 0;
}

/**
 * Grey-box scene: draws the glyph grid as flat rectangles. All game rules live in src/core;
 * this file only wires input -> core -> pixels. Keep it that way so rules stay testable.
 */
export class GameScene extends Phaser.Scene {
  private levelIndex = 0;
  private level!: ParsedLevel;
  private world!: World;
  private player!: Player;
  private mods!: ModifierKeys;
  private status: Status = 'playing';

  private keys!: Record<
    'left' | 'right' | 'a' | 'd' | 'up' | 'w' | 'space' | 'r' | 'enter',
    Phaser.Input.Keyboard.Key
  >;
  private jumpQueued = false;
  private accumulator = 0;
  private drawnVersion = -1;

  private worldGfx!: Phaser.GameObjects.Graphics;
  private playerRect!: Phaser.GameObjects.Rectangle;
  private shiftLabel!: Phaser.GameObjects.Text;
  private capsLabel!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private focusHint!: Phaser.GameObjects.Text;

  constructor() {
    super('game');
  }

  init(data: { index?: number }): void {
    this.levelIndex = data.index ?? levelFromUrl();
    this.accumulator = 0;
    this.drawnVersion = -1;
    this.jumpQueued = false;
  }

  create(): void {
    const def = LEVELS[this.levelIndex];
    if (!def) throw new Error(`No level at index ${this.levelIndex}`);
    this.level = parseLevel(def);
    this.world = new World(this.level);
    this.player = this.spawnPlayer();
    this.status = 'playing';

    this.mods = new ModifierKeys(window);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.mods.destroy());

    const kb = this.input.keyboard;
    if (!kb) throw new Error('Keyboard input unavailable');
    const K = Phaser.Input.Keyboard.KeyCodes;
    // addKey captures the key, which stops arrows and Space from scrolling the itch.io page.
    this.keys = {
      left: kb.addKey(K.LEFT),
      right: kb.addKey(K.RIGHT),
      a: kb.addKey(K.A),
      d: kb.addKey(K.D),
      up: kb.addKey(K.UP),
      w: kb.addKey(K.W),
      space: kb.addKey(K.SPACE),
      r: kb.addKey(K.R),
      enter: kb.addKey(K.ENTER),
    };
    for (const key of [this.keys.up, this.keys.w, this.keys.space]) {
      key.on('down', () => (this.jumpQueued = true));
    }
    this.keys.r.on('down', () => this.goToLevel(this.levelIndex));
    this.keys.enter.on('down', () => {
      if (this.status !== 'cleared') return;
      this.goToLevel((this.levelIndex + 1) % LEVELS.length);
    });

    // World space starts below the HUD strip.
    this.cameras.main.setScroll(0, -HUD_H);
    this.worldGfx = this.add.graphics();
    this.playerRect = this.add.rectangle(0, 0, this.player.w, this.player.h, COLORS.player).setOrigin(0, 0);
    this.buildHud();

    if (import.meta.env.DEV) {
      // Handle for scripted playtests in the browser console or Playwright. Stripped from builds.
      (window as unknown as { __swappers: GameScene }).__swappers = this;
    }
  }

  override update(_time: number, deltaMs: number): void {
    // Clamp so a background tab doesn't simulate seconds of physics in one frame.
    this.accumulator += Math.min(deltaMs / 1000, 0.1);
    while (this.accumulator >= FIXED_DT) {
      this.fixedStep();
      this.accumulator -= FIXED_DT;
    }
    this.render();
  }

  private fixedStep(): void {
    const jumpPressed = this.jumpQueued;
    this.jumpQueued = false;
    if (this.status !== 'playing') return;

    const shift = this.world.applyShift(this.mods.state, this.player, SHIFT_RULES);
    if (shift.newlyJammed.length > 0) this.cameras.main.shake(70, 0.004);

    stepPlayer(
      this.player,
      {
        left: this.keys.left.isDown || this.keys.a.isDown,
        right: this.keys.right.isDown || this.keys.d.isDown,
        jumpHeld: this.keys.up.isDown || this.keys.w.isDown || this.keys.space.isDown,
        jumpPressed,
      },
      this.world,
      FIXED_DT,
    );

    if (this.player.y > this.world.heightPx + 32) {
      this.respawn();
      return;
    }
    if (boxesOverlap(this.player, exitBox(this.level.exit))) {
      this.status = 'cleared';
      const last = this.levelIndex === LEVELS.length - 1;
      this.banner
        .setText(last ? 'YOU BEAT SWAPPERS\n\nEnter: play again' : 'CLEAR\n\nEnter: next level   R: replay')
        .setVisible(true);
    }
  }

  private spawnPlayer(): Player {
    const at = spawnPoint(this.level.spawn, PLAYER.w, PLAYER.h);
    return createPlayer(at.x, at.y);
  }

  /** Restart this scene on a level; also how R resets the current one (fresh world). */
  private goToLevel(index: number): void {
    this.scene.restart({ index });
  }

  private respawn(): void {
    this.player = this.spawnPlayer();
    this.cameras.main.flash(120, 255, 90, 90);
  }

  private render(): void {
    if (this.world.version !== this.drawnVersion) {
      this.drawWorld();
      this.drawnVersion = this.world.version;
    }
    this.playerRect.setPosition(Math.round(this.player.x), Math.round(this.player.y));
    this.playerRect.setSize(this.player.w, this.player.h);

    const s = this.mods.state;
    this.shiftLabel.setColor(s.shift ? '#f2b84b' : '#5c6273');
    this.capsLabel.setColor(s.caps ? '#f2b84b' : '#5c6273');
    this.focusHint.setVisible(!document.hasFocus());
  }

  private drawWorld(): void {
    const g = this.worldGfx;
    g.clear();

    const exit = exitBox(this.level.exit);
    g.lineStyle(2, COLORS.exit, 1);
    g.strokeRect(exit.x, exit.y, exit.w, exit.h);

    const colorOf = (index: number): number => {
      const glyph = this.world.glyphs[index];
      if (!glyph || glyph.kind === 'block') return COLORS.block;
      if (glyph.jammed) return COLORS.glyphJammed;
      return glyph.shown === glyph.base ? COLORS.glyph : COLORS.glyphFlipped;
    };

    // Merge horizontal runs of same-coloured cells into one rect each.
    for (let cy = 0; cy < this.world.rows; cy++) {
      let runStart = -1;
      let runColor = -1;
      for (let cx = 0; cx <= this.world.cols; cx++) {
        const owner = cx < this.world.cols ? this.world.ownerAt(cx, cy) : -1;
        const color = owner >= 0 ? colorOf(owner) : -1;
        if (color !== runColor) {
          if (runColor >= 0) {
            g.fillStyle(runColor, 1);
            g.fillRect(runStart * CELL, cy * CELL, (cx - runStart) * CELL, CELL);
          }
          runStart = cx;
          runColor = color;
        }
      }
    }
  }

  private buildHud(): void {
    const hud = this.add.rectangle(0, 0, GAME_W, HUD_H, COLORS.hud).setOrigin(0, 0).setScrollFactor(0);
    hud.setDepth(10);
    const style = { fontFamily: 'monospace', fontSize: '14px', color: '#c9cbd3' };
    this.add
      .text(12, 10, `${this.level.id}/${String(LEVELS.length).padStart(2, '0')}  ${this.level.name}`, style)
      .setScrollFactor(0)
      .setDepth(11);
    this.add
      .text(GAME_W / 2 + 40, 11, '←→ move · ↑/Space jump · hold Shift (X) · Caps Lock (C) · R restart', {
        ...style,
        fontSize: '12px',
        color: '#8a8f9e',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(11);
    this.shiftLabel = this.add
      .text(GAME_W - 132, 10, 'SHIFT', { ...style, fontStyle: 'bold' })
      .setScrollFactor(0)
      .setDepth(11);
    this.capsLabel = this.add
      .text(GAME_W - 72, 10, 'CAPS', { ...style, fontStyle: 'bold' })
      .setScrollFactor(0)
      .setDepth(11);

    const center = { x: GAME_W / 2, y: (SLOT_H * CELL * LEVEL_ROWS) / 2 };
    this.banner = this.add
      .text(center.x, center.y, '', { fontFamily: 'monospace', fontSize: '28px', color: '#6fd08c', align: 'center' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20)
      .setVisible(false);
    this.focusHint = this.add
      .text(center.x, center.y, 'click to play', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(30);
  }
}
