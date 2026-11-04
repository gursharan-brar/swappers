/** All tunables. Pure constants: safe to import from src/core (no Phaser). */

export const GAME_W = 960;
export const GAME_H = 540;

/** Height of the top HUD strip (shift clock, lives, coworker walking in). */
export const HUD_H = 92;
/** Height of the bottom strip holding the microgame timer bar. */
export const FOOTER_H = 36;

export const RUN = {
  /** Length of the whole shift, in seconds. The clock keeps running between microgames. */
  shiftSeconds: 90,
  lives: 3,
  /** Time to beat the first microgames. */
  startMicroSeconds: 5,
  /** Every N wins, microgames get faster... */
  speedUpEvery: 3,
  /** ...by this factor... */
  speedUpFactor: 0.88,
  /** ...but never shorter than this. */
  minMicroSeconds: 2.4,
  /** The big instruction word shows for this long before each microgame. */
  introSeconds: 0.8,
  /** The WIN / FAIL stamp shows for this long after each microgame. */
  resultSeconds: 0.7,
};

/** How the incoming coworker grades your shift. */
export const GRADES = {
  angelMinWins: 14,
  angelMaxLosses: 1,
  monsterMaxWins: 7,
};

export const COWORKER = 'Dave';

export const COLORS = {
  background: 0x1b1d24,
  hud: 0x111318,
  panel: 0x2a2e38,
  panelLight: 0x3a3f4c,
  text: '#e9e6dc',
  dim: '#8a8f9e',
  good: 0x6fd08c,
  bad: 0xff5a5a,
  warn: 0xf2b84b,
  accent: 0x7cc6ff,
} as const;
