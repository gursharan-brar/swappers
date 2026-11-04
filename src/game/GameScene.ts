import Phaser from 'phaser';
import { COLORS, COWORKER, FOOTER_H, GAME_H, GAME_W, HUD_H, RUN } from '../config';
import { Run, pickNext, type Grade } from '../core/run';
import { MICROGAMES } from './microgames';
import type { Area, Microgame, MicrogameContext, MicrogameInstance } from './microgames/types';
import { Sfx } from './sfx';

type Phase = 'title' | 'intro' | 'micro' | 'result' | 'over';

const BIG = 'Arial Black, Arial, sans-serif';
const MONO = 'monospace';

const GRADE_LINES: Record<Grade, { title: string; line: string; color: number }> = {
  angel: { title: 'ANGEL', line: `"Wait... you actually did everything?"`, color: COLORS.good },
  acceptable: { title: 'ACCEPTABLE', line: `"Eh. I've walked into worse."`, color: COLORS.warn },
  monster: { title: 'MONSTER', line: `"What happened in here?!"`, color: COLORS.bad },
};

/** `?only=mop` plays one microgame on repeat. For testing a new microgame. */
function onlyFromUrl(): string | undefined {
  const id = new URLSearchParams(window.location.search).get('only') ?? undefined;
  return id && MICROGAMES.some((m) => m.id === id) ? id : undefined;
}

/**
 * The whole prototype in one scene: title -> (intro -> microgame -> result)* -> shift change.
 * Rules live in src/core/run.ts; each microgame lives in src/game/microgames/.
 */
export class GameScene extends Phaser.Scene {
  private readonly sfx = new Sfx();
  private readonly only = onlyFromUrl();
  private phase: Phase = 'title';
  private phaseLeft = 0;
  private run = new Run();
  private previousId: string | undefined;

  private current: Microgame | undefined;
  private instance: MicrogameInstance | undefined;
  private microTotal = 0;
  private microLeft = 0;
  private lastTickSecond = -1;
  private resolved = false;
  private cleanup: (() => void)[] = [];

  private titleLayer: Phaser.GameObjects.GameObject[] = [];
  private overLayer: Phaser.GameObjects.GameObject[] = [];

  private clockText!: Phaser.GameObjects.Text;
  private servedText!: Phaser.GameObjects.Text;
  private cups: Phaser.GameObjects.Rectangle[] = [];
  private coworker!: Phaser.GameObjects.Container;
  private hudLayer: Phaser.GameObjects.GameObject[] = [];
  private instruction!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private timerBar!: Phaser.GameObjects.Rectangle;
  private stamp!: Phaser.GameObjects.Text;

  constructor() {
    super('game');
  }

  create(): void {
    this.buildHud();
    this.showTitle();

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') this.sfx.toggleMute();
    });
    this.input.on('pointerdown', () => {
      if (this.phase === 'title') this.startShift();
      else if (this.phase === 'over' && this.phaseLeft <= 0) this.startShift();
    });

    if (import.meta.env.DEV) {
      // Handle for scripted playtests in the browser console or Playwright. Stripped from builds.
      (window as unknown as { __prepay: GameScene }).__prepay = this;
    }
  }

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.1);
    this.phaseLeft -= dt;

    if (this.phase === 'intro' || this.phase === 'micro' || this.phase === 'result') {
      this.run.tick(dt);
      this.sfx.pumpBeat(this.run.tempo);
      this.updateHud();
    }

    switch (this.phase) {
      case 'intro':
        if (this.phaseLeft <= 0) this.beginMicrogame();
        break;
      case 'micro':
        this.updateMicrogame(dt);
        break;
      case 'result':
        if (this.phaseLeft <= 0) {
          this.endMicrogame();
          this.nextMicrogame();
        }
        break;
      default:
        break;
    }
  }

  // ---------- Flow ----------

  private startShift(): void {
    this.sfx.unlock();
    this.sfx.clockIn();
    this.sfx.stopBeat();
    this.destroyAll(this.titleLayer);
    this.destroyAll(this.overLayer);
    this.run = new Run();
    this.previousId = undefined;
    this.setHudVisible(true);
    this.updateHud();
    this.nextMicrogame();
  }

  private nextMicrogame(): void {
    if (this.run.over) {
      this.endShift();
      return;
    }
    const id = this.only ?? pickNext(MICROGAMES.map((m) => m.id), this.previousId, Math.random);
    this.previousId = id;
    this.current = MICROGAMES.find((m) => m.id === id);
    if (!this.current) throw new Error(`Unknown microgame ${id}`);

    this.phase = 'intro';
    this.phaseLeft = RUN.introSeconds;
    this.timerBar.setVisible(false);
    this.stamp.setVisible(false);
    this.instruction
      .setText(this.current.instruction)
      .setFontSize(110)
      .setPosition(GAME_W / 2, GAME_H / 2 - 10)
      .setScale(0.2)
      .setAlpha(1)
      .setVisible(true);
    this.hint.setText(this.current.hint).setPosition(GAME_W / 2, GAME_H / 2 + 70).setVisible(true);
    this.tweens.add({ targets: this.instruction, scale: 1, duration: 220, ease: 'Back.Out' });
    this.sfx.tick();
  }

  private beginMicrogame(): void {
    const micro = this.current;
    if (!micro) return;
    this.phase = 'micro';
    this.resolved = false;
    this.microTotal = this.run.microSeconds;
    this.microLeft = this.microTotal;
    this.lastTickSecond = -1;

    // Instruction shrinks into the top of the play area so it stays readable.
    this.instruction.setFontSize(34).setScale(1).setPosition(GAME_W / 2, HUD_H + 24).setAlpha(0.85);
    this.hint.setVisible(false);
    this.timerBar.setVisible(true).setFillStyle(COLORS.good);

    const area: Area = { x: 0, y: HUD_H, w: GAME_W, h: GAME_H - HUD_H - FOOTER_H };
    const owned: Phaser.GameObjects.GameObject[] = [];
    const ctx: MicrogameContext = {
      scene: this,
      area,
      tier: this.run.tier,
      sfx: this.sfx,
      random: Math.random,
      add: (obj) => {
        owned.push(obj);
        return obj;
      },
      on: (event, fn) => {
        this.input.on(event, fn);
        this.cleanup.push(() => this.input.off(event, fn));
      },
      onKey: (fn) => {
        const handler = (e: KeyboardEvent) => fn(e.key);
        this.input.keyboard?.on('keydown', handler);
        this.cleanup.push(() => this.input.keyboard?.off('keydown', handler));
      },
      win: () => this.resolve('win'),
      lose: () => this.resolve('lose'),
    };
    this.cleanup.push(() => {
      for (const obj of owned) {
        this.tweens.killTweensOf(obj);
        obj.destroy();
      }
    });
    this.instance = micro.start(ctx);
    // Keep the instruction above whatever the microgame drew.
    this.children.bringToTop(this.instruction);
  }

  private updateMicrogame(dt: number): void {
    this.instance?.update?.(dt);
    if (this.phase !== 'micro') return; // the microgame resolved itself this frame
    this.microLeft -= dt;
    const fraction = Math.max(0, this.microLeft / this.microTotal);
    this.timerBar.setSize((GAME_W - 40) * fraction, 14);
    if (fraction < 0.35) this.timerBar.setFillStyle(COLORS.bad);
    else if (fraction < 0.6) this.timerBar.setFillStyle(COLORS.warn);

    const second = Math.ceil(this.microLeft);
    if (second <= 2 && second !== this.lastTickSecond) {
      this.lastTickSecond = second;
      this.sfx.tick();
    }
    if (this.microLeft <= 0) this.resolve(this.instance?.timeUp?.() ?? 'lose');
  }

  private resolve(result: 'win' | 'lose'): void {
    if (this.phase !== 'micro' || this.resolved) return;
    this.resolved = true;
    this.phase = 'result';
    this.phaseLeft = RUN.resultSeconds;

    if (result === 'win') {
      this.run.win();
      this.sfx.win();
      this.showStamp('NICE', COLORS.good);
    } else {
      this.run.lose();
      this.sfx.lose();
      this.cameras.main.shake(180, 0.008);
      this.cameras.main.flash(120, 255, 60, 60);
      this.showStamp('NOPE', COLORS.bad);
    }
    this.updateHud();
  }

  private endMicrogame(): void {
    for (const fn of this.cleanup.splice(0)) fn();
    this.instance = undefined;
    this.current = undefined;
  }

  private endShift(): void {
    this.phase = 'over';
    this.phaseLeft = 1; // ignore clicks for a moment so a stray click doesn't restart
    this.sfx.stopBeat();
    this.sfx.handoff();
    this.instruction.setVisible(false);
    this.hint.setVisible(false);
    this.timerBar.setVisible(false);
    this.stamp.setVisible(false);
    this.coworker.setX(70);

    const grade = this.run.grade();
    const g = GRADE_LINES[grade];
    const cx = GAME_W / 2;
    const heading = this.run.sentHome ? 'SENT HOME EARLY' : 'SHIFT CHANGE!';
    const sub = this.run.sentHome
      ? `The manager called ${COWORKER} in early. He looks around...`
      : `${COWORKER} clocks in. He looks around the store...`;
    this.overLayer.push(
      this.add.rectangle(cx, GAME_H / 2 + 30, 760, 380, COLORS.hud, 0.95).setStrokeStyle(4, g.color),
      this.add.text(cx, 150, heading, { fontFamily: BIG, fontSize: '54px', color: COLORS.text }).setOrigin(0.5),
      this.add.text(cx, 210, sub, { fontFamily: MONO, fontSize: '18px', color: COLORS.dim }).setOrigin(0.5),
      this.add.text(cx, 265, g.line, { fontFamily: BIG, fontSize: '28px', color: COLORS.text }).setOrigin(0.5),
      this.add.text(cx, 335, g.title, { fontFamily: BIG, fontSize: '64px', color: hex(g.color) }).setOrigin(0.5).setAngle(-4),
      this.add
        .text(cx, 410, `served ${this.run.wins}   ·   messed up ${this.run.losses}`, { fontFamily: MONO, fontSize: '20px', color: COLORS.text })
        .setOrigin(0.5),
      this.add.text(cx, 470, 'click to clock in again', { fontFamily: MONO, fontSize: '18px', color: COLORS.dim }).setOrigin(0.5),
    );
  }

  // ---------- Drawing ----------

  private showTitle(): void {
    this.setHudVisible(false);
    const cx = GAME_W / 2;
    this.titleLayer.push(
      this.add.text(cx, 150, 'PREPAY ONLY', { fontFamily: BIG, fontSize: '84px', color: COLORS.text }).setOrigin(0.5),
      this.add
        .text(cx, 225, 'One gas-bar shift. 90 seconds until SHIFT CHANGE.', { fontFamily: MONO, fontSize: '20px', color: COLORS.dim })
        .setOrigin(0.5),
      this.add.rectangle(cx, 340, 340, 90, COLORS.panel).setStrokeStyle(4, COLORS.warn),
      this.add.text(cx, 340, 'CLICK TO CLOCK IN', { fontFamily: BIG, fontSize: '30px', color: hex(COLORS.warn) }).setOrigin(0.5),
      this.add
        .text(cx, 440, 'Do what the screen says. Fast. Mouse only (number keys work too).  M = mute', {
          fontFamily: MONO,
          fontSize: '16px',
          color: COLORS.dim,
        })
        .setOrigin(0.5),
    );
    if (this.only) {
      this.titleLayer.push(
        this.add.text(cx, 490, `testing one microgame: ${this.only}`, { fontFamily: MONO, fontSize: '16px', color: hex(COLORS.accent) }).setOrigin(0.5),
      );
    }
  }

  private buildHud(): void {
    this.hudLayer.push(this.add.rectangle(0, 0, GAME_W, HUD_H, COLORS.hud).setOrigin(0, 0));
    this.clockText = this.add.text(20, 12, '', { fontFamily: BIG, fontSize: '28px', color: COLORS.text });
    this.servedText = this.add.text(GAME_W - 20, 16, '', { fontFamily: MONO, fontSize: '20px', color: COLORS.text }).setOrigin(1, 0);
    this.hudLayer.push(this.clockText, this.servedText);
    for (let i = 0; i < RUN.lives; i++) {
      const cup = this.add.rectangle(GAME_W - 260 + i * 34, 30, 22, 28, COLORS.warn).setStrokeStyle(2, 0x000000);
      this.cups.push(cup);
      this.hudLayer.push(cup);
    }

    // Strip where the coworker walks toward the staff door as the shift runs out.
    const stripY = 74;
    this.hudLayer.push(
      this.add.rectangle(0, stripY - 2, GAME_W, 2, COLORS.panelLight).setOrigin(0, 0.5),
      this.add.rectangle(70, stripY - 12, 26, 26, COLORS.panelLight).setStrokeStyle(2, 0x000000),
      this.add.text(70, stripY - 12, 'STAFF', { fontFamily: MONO, fontSize: '8px', color: COLORS.text }).setOrigin(0.5),
    );
    this.coworker = this.add.container(GAME_W - 40, stripY - 14, [
      this.add.rectangle(0, 2, 12, 18, COLORS.accent),
      this.add.circle(0, -11, 6, 0xd9b38c),
      this.add.text(0, 19, COWORKER, { fontFamily: MONO, fontSize: '10px', color: COLORS.text }).setOrigin(0.5),
    ]);
    this.hudLayer.push(this.coworker);

    this.instruction = this.add.text(GAME_W / 2, GAME_H / 2, '', { fontFamily: BIG, fontSize: '110px', color: COLORS.text }).setOrigin(0.5).setDepth(20);
    this.instruction.setStroke('#000000', 10);
    this.hint = this.add.text(GAME_W / 2, GAME_H / 2 + 70, '', { fontFamily: MONO, fontSize: '20px', color: COLORS.dim }).setOrigin(0.5).setDepth(20);
    this.timerBar = this.add.rectangle(20, GAME_H - FOOTER_H / 2, GAME_W - 40, 14, COLORS.good).setOrigin(0, 0.5).setDepth(20);
    this.stamp = this.add.text(GAME_W / 2, GAME_H / 2, '', { fontFamily: BIG, fontSize: '120px', color: '#ffffff' }).setOrigin(0.5).setDepth(30);
    this.stamp.setStroke('#000000', 12);
    for (const obj of [this.instruction, this.hint, this.timerBar, this.stamp]) (obj as Phaser.GameObjects.Text).setVisible(false);
  }

  private updateHud(): void {
    const t = Math.ceil(this.run.timeLeft);
    this.clockText.setText(
      t > 0 ? `SHIFT CHANGE IN ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` : 'SHIFT CHANGE! finish this one',
    );
    this.clockText.setColor(t <= 10 ? hex(COLORS.bad) : COLORS.text);
    this.servedText.setText(`SERVED ${this.run.wins}`);
    this.cups.forEach((cup, i) => cup.setFillStyle(i < this.run.lives ? COLORS.warn : COLORS.panelLight));
    const progress = 1 - this.run.timeLeft / RUN.shiftSeconds;
    this.coworker.setX(GAME_W - 40 - progress * (GAME_W - 40 - 70));
  }

  private showStamp(text: string, color: number): void {
    this.sfx.stamp();
    this.stamp.setText(text).setColor(hex(color)).setVisible(true).setScale(2.4).setAngle(-12).setAlpha(1);
    this.tweens.add({ targets: this.stamp, scale: 1, duration: 160, ease: 'Cubic.In' });
  }

  private setHudVisible(visible: boolean): void {
    for (const obj of this.hudLayer) (obj as Phaser.GameObjects.Components.Visible & Phaser.GameObjects.GameObject).setVisible(visible);
  }

  private destroyAll(list: Phaser.GameObjects.GameObject[]): void {
    for (const obj of list.splice(0)) obj.destroy();
  }
}

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
