import { COLORS } from '../../config';
import type { Microgame } from './types';

/** The price changed. Drag the missing digit up onto the sign before the wind gets worse. */
export const reletter: Microgame = {
  id: 'reletter',
  instruction: 'RE-LETTER!',
  hint: 'drag the missing number onto the sign',
  start(ctx) {
    const { scene, area, random, sfx } = ctx;
    let done = false;

    const tenths = 1400 + Math.floor(random() * 500); // 140.0 .. 189.9
    const price = `${Math.floor(tenths / 10)}.${tenths % 10}`;
    const chars = [...price];
    const digitPositions = chars.map((c, i) => (c === '.' ? -1 : i)).filter((i) => i >= 0);
    const missing = digitPositions[Math.floor(random() * digitPositions.length)] ?? 0;
    const answer = chars[missing] ?? '0';

    // Sign on a post.
    const sx = area.x + 420;
    const sy = area.y + 150;
    ctx.add(scene.add.rectangle(sx, sy + 170, 24, 140, 0x555a66));
    ctx.add(scene.add.rectangle(sx, sy, 440, 200, 0xf4f1e6).setStrokeStyle(6, 0x1f6f3f));
    ctx.add(scene.add.text(sx, sy - 70, 'REGULAR', { fontFamily: 'Arial Black, Arial', fontSize: '24px', color: '#1f6f3f' }).setOrigin(0.5));
    const cellW = 72;
    const startX = sx - ((chars.length - 1) * cellW) / 2;
    let slot = { x: 0, y: 0 };
    chars.forEach((c, i) => {
      const x = startX + i * cellW;
      const y = sy + 20;
      if (i === missing) {
        ctx.add(scene.add.rectangle(x, y, 60, 90, 0xd9d4c3).setStrokeStyle(3, 0x888888));
        slot = { x, y };
      } else {
        ctx.add(scene.add.text(x, y, c, { fontFamily: 'Arial Black, Arial', fontSize: '72px', color: '#111111' }).setOrigin(0.5));
      }
    });

    // The note from the manager, flapping in the wind.
    const note = ctx.add(scene.add.rectangle(area.x + 820, area.y + 110, 190, 120, 0xfff176).setAngle(4));
    const noteText = ctx.add(
      scene.add
        .text(note.x, note.y, `NEW PRICE\n${price}`, { fontFamily: 'Arial Black, Arial', fontSize: '28px', color: '#222222', align: 'center' })
        .setOrigin(0.5)
        .setAngle(4),
    );
    scene.tweens.add({ targets: [note, noteText], angle: -3, duration: 260, yoyo: true, repeat: -1 });

    // Three tiles: the right digit and two wrong ones.
    const options = new Set<string>([answer]);
    while (options.size < 3) options.add(String(Math.floor(random() * 10)));
    const shuffled = [...options].sort(() => random() - 0.5);
    const tiles = shuffled.map((digit, i) => {
      const home = { x: area.x + 300 + i * 180, y: area.y + area.h - 55 };
      const box = ctx.add(scene.add.rectangle(home.x, home.y, 64, 84, 0xffffff).setStrokeStyle(4, 0x000000));
      const label = ctx.add(scene.add.text(home.x, home.y, digit, { fontFamily: 'Arial Black, Arial', fontSize: '60px', color: '#111111' }).setOrigin(0.5));
      return { digit, home, box, label };
    });

    let held: (typeof tiles)[number] | undefined;
    const moveTile = (t: (typeof tiles)[number], x: number, y: number) => {
      t.box.setPosition(x, y);
      t.label.setPosition(x, y);
    };

    ctx.on('pointerdown', (p) => {
      if (done) return;
      held = tiles.find((t) => Math.abs(p.worldX - t.box.x) < 40 && Math.abs(p.worldY - t.box.y) < 50);
      if (held) sfx.click();
    });
    ctx.on('pointermove', (p) => {
      if (held) moveTile(held, p.worldX, p.worldY);
    });
    ctx.on('pointerup', () => {
      if (!held || done) return;
      const t = held;
      held = undefined;
      if (Math.hypot(t.box.x - slot.x, t.box.y - slot.y) < 60) {
        done = true;
        moveTile(t, slot.x, slot.y);
        sfx.clunk();
        if (t.digit === answer) ctx.win();
        else {
          t.box.setFillStyle(COLORS.bad);
          ctx.lose();
        }
      } else {
        moveTile(t, t.home.x, t.home.y);
      }
    });
    return {};
  },
};
