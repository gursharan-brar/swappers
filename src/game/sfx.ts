/**
 * Every sound in the prototype is synthesized with the Web Audio API, so there are no
 * audio files to make yet. Swap these for recorded sounds later (a coworker saying
 * "forty on six" beats any beep).
 *
 * Browsers block audio until the player interacts, so call unlock() from a click.
 */

interface ToneOptions {
  type?: OscillatorType;
  gain?: number;
  /** Glide to this frequency over the tone's duration. */
  slideTo?: number;
  /** Seconds from now. */
  delay?: number;
}

interface NoiseOptions {
  gain?: number;
  delay?: number;
  /** Low-pass cutoff in Hz; lower sounds duller. */
  cutoff?: number;
}

export class Sfx {
  private ctx: AudioContext | undefined;
  private master: GainNode | undefined;
  private noiseBuffer: AudioBuffer | undefined;
  private nextBeat = 0;
  private beatCount = 0;
  muted = false;

  /** Create or resume the audio context. Must be called from a user gesture. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      const length = this.ctx.sampleRate;
      this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    }
    void this.ctx.resume();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  // ---------- Named sounds ----------

  click(): void {
    this.tone(900, 0.04, { type: 'square', gain: 0.15 });
  }
  win(): void {
    this.tone(660, 0.09, { type: 'square', gain: 0.2 });
    this.tone(990, 0.14, { type: 'square', gain: 0.2, delay: 0.08 });
  }
  lose(): void {
    this.tone(220, 0.35, { type: 'sawtooth', gain: 0.25, slideTo: 90 });
  }
  stamp(): void {
    this.noise(0.08, { gain: 0.5, cutoff: 1200 });
    this.tone(120, 0.1, { type: 'sine', gain: 0.4, slideTo: 60 });
  }
  tick(): void {
    this.tone(1400, 0.03, { type: 'square', gain: 0.12 });
  }
  whir(): void {
    this.tone(180, 0.5, { type: 'sawtooth', gain: 0.12, slideTo: 420 });
  }
  zap(): void {
    this.noise(0.25, { gain: 0.45, cutoff: 6000 });
    this.tone(1800, 0.2, { type: 'square', gain: 0.15, slideTo: 200 });
  }
  vroom(): void {
    this.tone(70, 0.6, { type: 'sawtooth', gain: 0.3, slideTo: 160 });
  }
  clunk(): void {
    this.tone(300, 0.06, { type: 'triangle', gain: 0.35, slideTo: 150 });
  }
  squeak(): void {
    this.tone(1200 + Math.random() * 500, 0.05, { type: 'sine', gain: 0.08 });
  }
  clockIn(): void {
    this.noise(0.05, { gain: 0.4, cutoff: 3000 });
    this.tone(523, 0.1, { type: 'square', gain: 0.2, delay: 0.06 });
    this.tone(784, 0.18, { type: 'square', gain: 0.2, delay: 0.16 });
  }
  handoff(): void {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.16, { type: 'square', gain: 0.18, delay: i * 0.11 }));
  }

  /**
   * Background beat, scheduled slightly ahead on the audio clock so it stays steady.
   * Call every frame while playing; `tempo` 1 = 112 bpm.
   */
  pumpBeat(tempo: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const secondsPerBeat = 60 / (112 * tempo);
    if (this.nextBeat < ctx.currentTime) this.nextBeat = ctx.currentTime + 0.05;
    while (this.nextBeat < ctx.currentTime + 0.12) {
      const delay = this.nextBeat - ctx.currentTime;
      const onBeat = this.beatCount % 2 === 0;
      if (onBeat) this.tone(110, 0.12, { type: 'sine', gain: 0.35, slideTo: 45, delay });
      else this.noise(0.03, { gain: 0.12, cutoff: 9000, delay });
      this.nextBeat += secondsPerBeat / 2;
      this.beatCount++;
    }
  }

  stopBeat(): void {
    this.nextBeat = 0;
    this.beatCount = 0;
  }

  // ---------- Building blocks ----------

  tone(freq: number, duration: number, opts: ToneOptions = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const start = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type ?? 'square';
    osc.frequency.setValueAtTime(freq, start);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, start + duration);
    gain.gain.setValueAtTime(opts.gain ?? 0.2, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  noise(duration: number, opts: NoiseOptions = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noiseBuffer) return;
    const start = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = opts.cutoff ?? 4000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(opts.gain ?? 0.3, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(start, Math.random() * 0.5);
    src.stop(start + duration + 0.02);
  }
}
