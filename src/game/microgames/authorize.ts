import { COLORS } from '../../config';
import type { Microgame } from './types';

const AMOUNTS = ['Ten', 'Twenty', 'Forty', 'Fifty', 'Sixty', 'Fill it'];
const NUMBERS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

/** "Forty on six!" Click (or press) the pump number the customer said. Prepay only. */
export const authorize: Microgame = {
  id: 'authorize',
  instruction: 'AUTHORIZE!',
  hint: 'click the pump they said (or press 1-8)',
  start(ctx) {
    const { scene, area, random } = ctx;
    const pump = 1 + Math.floor(random() * 8);
    const amount = AMOUNTS[Math.floor(random() * AMOUNTS.length)] ?? 'Forty';
    let done = false;

    // Customer at the counter.
    const cx = area.x + 190;
    const floorY = area.y + area.h - 20;
    ctx.add(scene.add.rectangle(cx, floorY - 75, 90, 150, 0x8f6b52));
    ctx.add(scene.add.circle(cx, floorY - 182, 34, 0xd9b38c));
    ctx.add(scene.add.rectangle(area.x + 360, floorY - 40, 720, 30, COLORS.panelLight)); // counter

    // Speech bubble.
    const bx = cx + 170;
    const by = area.y + 95;
    ctx.add(scene.add.triangle(bx - 120, by + 40, 0, 0, 30, 0, 0, 34, 0xffffff));
    ctx.add(scene.add.rectangle(bx, by, 330, 76, 0xffffff));
    ctx.add(
      scene.add
        .text(bx, by, `"${amount} on ${NUMBERS[pump - 1]}!"`, {
          fontFamily: 'Arial Black, Arial, sans-serif',
          fontSize: '30px',
          color: '#111111',
        })
        .setOrigin(0.5),
    );

    // Pump console: 2 rows of 4 buttons.
    const px = area.x + 700;
    const py = area.y + area.h / 2 + 30;
    ctx.add(scene.add.rectangle(px, py, 420, 250, COLORS.panel).setStrokeStyle(4, 0x000000));
    ctx.add(scene.add.text(px, py - 105, 'PUMPS', { fontFamily: 'monospace', fontSize: '16px', color: COLORS.dim }).setOrigin(0.5));
    const buttons: Phaser.GameObjects.Rectangle[] = [];
    for (let n = 1; n <= 8; n++) {
      const col = (n - 1) % 4;
      const row = Math.floor((n - 1) / 4);
      const x = px - 150 + col * 100;
      const y = py - 35 + row * 100;
      const button = ctx.add(scene.add.rectangle(x, y, 80, 80, COLORS.panelLight).setStrokeStyle(3, 0x000000));
      button.setInteractive({ useHandCursor: true }).on('pointerdown', () => choose(n));
      ctx.add(scene.add.text(x, y, String(n), { fontFamily: 'Arial Black, Arial', fontSize: '36px', color: COLORS.text }).setOrigin(0.5));
      buttons.push(button);
    }

    const choose = (n: number) => {
      if (done) return;
      done = true;
      const button = buttons[n - 1];
      if (n === pump) {
        button?.setFillStyle(COLORS.good);
        ctx.sfx.whir();
        ctx.win();
      } else {
        button?.setFillStyle(COLORS.bad);
        buttons[pump - 1]?.setStrokeStyle(6, COLORS.good);
        ctx.lose();
      }
    };
    ctx.onKey((key) => {
      const n = Number(key);
      if (Number.isInteger(n) && n >= 1 && n <= 8) choose(n);
    });
    return {};
  },
};
