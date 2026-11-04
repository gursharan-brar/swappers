import { COLORS } from '../../config';
import type { Microgame } from './types';

const SPILLS = [
  { label: 'slushie', color: 0x3fa7d6 },
  { label: 'coffee', color: 0x6b4226 },
  { label: 'mystery', color: 0x9acd32 },
];

/** Someone dropped their slushie. Rub the mouse over each spill until the floor is clean. */
export const mop: Microgame = {
  id: 'mop',
  instruction: 'MOP!',
  hint: 'rub the mouse over the spills',
  start(ctx) {
    const { scene, area, random, sfx } = ctx;
    const rubPerSpill = 360; // px of mouse movement over a spill to clean it
    let done = false;
    let squeakCooldown = 0;

    // Checkered floor.
    const floor = ctx.add(scene.add.graphics());
    for (let y = area.y; y < area.y + area.h; y += 60) {
      for (let x = area.x; x < area.x + area.w; x += 60) {
        floor.fillStyle(((x + y) / 60) % 2 === 0 ? 0xd9d6cc : 0xbfbcb2);
        floor.fillRect(x, y, 60, 60);
      }
    }

    const count = 1 + Math.min(1, ctx.tier); // more spills AND less time gets unfair fast
    const spills: { x: number; y: number; r: number; dirt: number; blob: Phaser.GameObjects.Ellipse; tag: Phaser.GameObjects.Text }[] = [];
    for (let i = 0; i < count; i++) {
      let x = 0;
      let y = 0;
      for (let tries = 0; tries < 30; tries++) {
        x = area.x + 120 + random() * (area.w - 240);
        y = area.y + 90 + random() * (area.h - 180);
        if (spills.every((s) => Math.hypot(s.x - x, s.y - y) > 170)) break;
      }
      const kind = SPILLS[Math.floor(random() * SPILLS.length)] ?? SPILLS[0]!;
      const r = 60 + random() * 15;
      const blob = ctx.add(scene.add.ellipse(x, y, r * 2.2, r * 1.6, kind.color));
      const tag = ctx.add(scene.add.text(x, y, kind.label, { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' }).setOrigin(0.5));
      spills.push({ x, y, r, dirt: 1, blob, tag });
    }

    const mopHead = ctx.add(scene.add.rectangle(area.x + area.w / 2, area.y + area.h / 2, 90, 30, 0xf0ead2).setStrokeStyle(3, 0x6d6a5c));
    let last: { x: number; y: number } | undefined;

    ctx.on('pointermove', (p) => {
      if (done) return;
      const x = p.worldX;
      const y = p.worldY;
      mopHead.setPosition(x, y).setAngle(Math.sin(x / 30) * 20);
      if (last) {
        const moved = Math.hypot(x - last.x, y - last.y);
        for (const s of spills) {
          if (s.dirt <= 0 || Math.hypot(x - s.x, (y - s.y) * 1.3) > s.r * 1.1) continue;
          s.dirt = Math.max(0, s.dirt - moved / rubPerSpill);
          s.blob.setAlpha(0.1 + 0.9 * s.dirt).setScale(0.6 + 0.4 * s.dirt);
          s.tag.setAlpha(s.dirt);
          if (squeakCooldown <= 0) {
            sfx.squeak();
            squeakCooldown = 0.07;
          }
        }
        if (spills.every((s) => s.dirt <= 0)) {
          done = true;
          mopHead.setFillStyle(COLORS.good);
          ctx.win();
        }
      }
      last = { x, y };
    });

    return {
      update(dt) {
        squeakCooldown -= dt;
      },
      timeUp: () => (spills.every((s) => s.dirt <= 0) ? 'win' : 'lose'),
    };
  },
};
