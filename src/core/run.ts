import { GRADES, RUN } from '../config';

export type Grade = 'angel' | 'acceptable' | 'monster';
export type RunConfig = typeof RUN;
export type GradeConfig = typeof GRADES;

/**
 * One shift: the 90-second clock, lives, score and speed-up. Pure logic, no Phaser,
 * so the rules are unit-tested. The scene drives it and draws it.
 */
export class Run {
  timeLeft: number;
  lives: number;
  wins = 0;
  losses = 0;

  constructor(
    private readonly cfg: RunConfig = RUN,
    private readonly grades: GradeConfig = GRADES,
  ) {
    this.timeLeft = cfg.shiftSeconds;
    this.lives = cfg.lives;
  }

  /** 0 at the start, +1 every `speedUpEvery` wins. Microgames can use it to get harder. */
  get tier(): number {
    return Math.floor(this.wins / this.cfg.speedUpEvery);
  }

  /** Seconds the player gets for the next microgame. */
  get microSeconds(): number {
    return Math.max(this.cfg.minMicroSeconds, this.cfg.startMicroSeconds * this.cfg.speedUpFactor ** this.tier);
  }

  /** Music speed multiplier: 1 at the start, higher as microgames get faster. */
  get tempo(): number {
    return this.cfg.startMicroSeconds / this.microSeconds;
  }

  tick(dt: number): void {
    this.timeLeft = Math.max(0, this.timeLeft - dt);
  }

  win(): void {
    this.wins++;
  }

  lose(): void {
    this.losses++;
    this.lives = Math.max(0, this.lives - 1);
  }

  get sentHome(): boolean {
    return this.lives <= 0;
  }

  /**
   * The shift ends when you run out of lives, or when the clock has hit zero.
   * The scene only checks this between microgames, so the clock running out
   * never cuts off a microgame halfway.
   */
  get over(): boolean {
    return this.sentHome || this.timeLeft <= 0;
  }

  grade(): Grade {
    if (this.sentHome || this.wins <= this.grades.monsterMaxWins) return 'monster';
    if (this.wins >= this.grades.angelMinWins && this.losses <= this.grades.angelMaxLosses) return 'angel';
    return 'acceptable';
  }
}

/** Pick the next microgame id at random, never the same one twice in a row. */
export function pickNext(ids: readonly string[], previous: string | undefined, random: () => number): string {
  const options = ids.length > 1 ? ids.filter((id) => id !== previous) : ids;
  const choice = options[Math.floor(random() * options.length)];
  if (choice === undefined) throw new Error('No microgames to pick from');
  return choice;
}
