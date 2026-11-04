import { COLORS } from '../../config';
import type { Microgame } from './types';

/** It's -30. Drag the red booster clamp onto the + terminal. Not the other one. */
export const boost: Microgame = {
  id: 'boost',
  instruction: 'BOOST!',
  hint: 'drag the red clamp onto +',
  start(ctx) {
    const { scene, area, random, sfx } = ctx;
    let done = false;
    let dragging = false;

    ctx.add(scene.add.text(area.x + 24, area.y + 16, '-30°C', { fontFamily: 'Arial Black, Arial', fontSize: '34px', color: '#bfe3ff' }));

    // Dead battery with terminals in random order.
    const bx = area.x + 640;
    const by = area.y + 270;
    ctx.add(scene.add.rectangle(bx, by, 320, 170, 0x30343f).setStrokeStyle(5, 0x000000));
    ctx.add(scene.add.text(bx, by + 30, 'DEAD', { fontFamily: 'monospace', fontSize: '22px', color: COLORS.dim }).setOrigin(0.5));
    const plusLeft = random() < 0.5;
    const plus = { x: bx + (plusLeft ? -90 : 90), y: by - 105 };
    const minus = { x: bx + (plusLeft ? 90 : -90), y: by - 105 };
    ctx.add(scene.add.circle(plus.x, plus.y, 30, 0xd94a4a).setStrokeStyle(4, 0x000000));
    ctx.add(scene.add.text(plus.x, plus.y, '+', { fontFamily: 'Arial Black, Arial', fontSize: '40px', color: '#ffffff' }).setOrigin(0.5));
    ctx.add(scene.add.circle(minus.x, minus.y, 30, 0x16171c).setStrokeStyle(4, 0x555555));
    ctx.add(scene.add.text(minus.x, minus.y, '−', { fontFamily: 'Arial Black, Arial', fontSize: '40px', color: '#ffffff' }).setOrigin(0.5));

    // Booster pack in the corner, cable to the clamp.
    const anchor = { x: area.x + 90, y: area.y + area.h - 50 };
    ctx.add(scene.add.rectangle(anchor.x, anchor.y, 120, 70, 0xf2b84b).setStrokeStyle(4, 0x000000));
    const cable = ctx.add(scene.add.graphics());
    const clamp = ctx.add(scene.add.circle(area.x + 230, area.y + 230, 26, 0xd94a4a).setStrokeStyle(4, 0xffffff));

    const near = (p: { x: number; y: number }, r: number) => Math.hypot(clamp.x - p.x, clamp.y - p.y) < r;

    ctx.on('pointerdown', (p) => {
      if (!done && Math.hypot(p.worldX - clamp.x, p.worldY - clamp.y) < 50) dragging = true;
    });
    ctx.on('pointermove', (p) => {
      if (dragging) clamp.setPosition(p.worldX, p.worldY);
    });
    ctx.on('pointerup', () => {
      if (!dragging || done) return;
      dragging = false;
      if (near(plus, 48)) {
        done = true;
        clamp.setPosition(plus.x, plus.y);
        sparks(plus.x, plus.y, 0xffe066);
        sfx.vroom();
        ctx.win();
      } else if (near(minus, 48)) {
        done = true;
        clamp.setPosition(minus.x, minus.y);
        sparks(minus.x, minus.y, 0x9fd7ff);
        sfx.zap();
        ctx.lose();
      }
    });

    const sparks = (x: number, y: number, color: number) => {
      for (let i = 0; i < 10; i++) {
        const s = ctx.add(scene.add.circle(x, y, 5, color));
        const a = random() * Math.PI * 2;
        scene.tweens.add({ targets: s, x: x + Math.cos(a) * 90, y: y + Math.sin(a) * 90, alpha: 0, duration: 400 });
      }
    };

    return {
      update() {
        cable.clear().lineStyle(8, 0x111111).lineBetween(anchor.x, anchor.y, clamp.x, clamp.y);
      },
    };
  },
};
