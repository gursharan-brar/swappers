import { describe, expect, it } from 'vitest';
import { GRADES, RUN } from '../src/config';
import { Run, pickNext } from '../src/core/run';

describe('Run', () => {
  it('starts with the full shift clock and all lives', () => {
    const run = new Run();
    expect(run.timeLeft).toBe(RUN.shiftSeconds);
    expect(run.lives).toBe(RUN.lives);
    expect(run.over).toBe(false);
  });

  it('speeds up every few wins, but never below the minimum', () => {
    const run = new Run();
    const first = run.microSeconds;
    for (let i = 0; i < RUN.speedUpEvery - 1; i++) run.win();
    expect(run.microSeconds).toBe(first);
    run.win();
    expect(run.microSeconds).toBeLessThan(first);
    expect(run.tempo).toBeGreaterThan(1);
    for (let i = 0; i < 100; i++) run.win();
    expect(run.microSeconds).toBe(RUN.minMicroSeconds);
  });

  it('ends when lives run out (sent home) or when the clock hits zero', () => {
    const early = new Run();
    for (let i = 0; i < RUN.lives; i++) early.lose();
    expect(early.over).toBe(true);
    expect(early.sentHome).toBe(true);
    expect(early.grade()).toBe('monster');

    const timed = new Run();
    timed.tick(RUN.shiftSeconds + 5);
    expect(timed.timeLeft).toBe(0);
    expect(timed.over).toBe(true);
    expect(timed.sentHome).toBe(false);
  });

  it('grades the shift the way the incoming coworker would', () => {
    const angel = new Run();
    for (let i = 0; i < GRADES.angelMinWins; i++) angel.win();
    expect(angel.grade()).toBe('angel');

    const okay = new Run();
    for (let i = 0; i < GRADES.monsterMaxWins + 1; i++) okay.win();
    okay.lose();
    okay.lose();
    expect(okay.grade()).toBe('acceptable');

    const slow = new Run();
    for (let i = 0; i < GRADES.monsterMaxWins; i++) slow.win();
    expect(slow.grade()).toBe('monster');
  });
});

describe('pickNext', () => {
  it('never picks the same microgame twice in a row', () => {
    const ids = ['a', 'b', 'c'];
    let prev: string | undefined;
    for (let i = 0; i < 200; i++) {
      const next = pickNext(ids, prev, Math.random);
      expect(next).not.toBe(prev);
      prev = next;
    }
  });

  it('repeats when there is only one microgame (the ?only= test mode)', () => {
    expect(pickNext(['mop'], 'mop', Math.random)).toBe('mop');
  });
});
