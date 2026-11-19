/**
 * 100% Organic Acoustic Percussion Synthesizer
 * Cajon (Bass & Slap), Studio Seed Shaker, Tambourine, Foot Stomp
 * No electronic 808s or synth drums - purely acoustic wooden & percussive textures.
 */
export class AcousticPercussion {
  private ctx: AudioContext;
  private outputNode: GainNode;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.outputNode = ctx.createGain();
    this.outputNode.gain.setValueAtTime(0.85, ctx.currentTime);
    this.outputNode.connect(destination);
  }

  public setVolume(vol: number): void {
    this.outputNode.gain.setTargetAtTime(Math.max(0, Math.min(1.2, vol)), this.ctx.currentTime, 0.02);
  }

  /**
   * Cajon Low Bass (Ahşap Kahon Gövde Vuruşu)
   */
  public playCajonBass(time?: number, velocity: number = 0.9): void {
    const ctx = this.ctx;
    const now = Math.max(time ?? ctx.currentTime, ctx.currentTime);

    // 1. Wooden body tone (sine sweep with fast drop)
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(85, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.12);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(velocity * 0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    // Wooden chamber body filter
    const woodFilter = ctx.createBiquadFilter();
    woodFilter.type = 'peaking';
    woodFilter.frequency.setValueAtTime(110, now);
    woodFilter.gain.setValueAtTime(6.0, now);

    osc.connect(woodFilter);
    woodFilter.connect(gain);
    gain.connect(this.outputNode);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * Cajon Snare Slap (Kahon Üst Köşe Tokat Vuruşu)
   */
  public playCajonSlap(time?: number, velocity: number = 0.85): void {
    const ctx = this.ctx;
    const now = Math.max(time ?? ctx.currentTime, ctx.currentTime);

    // Crisp wood slap noise with wire rattle
    const len = Math.floor(ctx.sampleRate * 0.1);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.025));
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.Q.setValueAtTime(2.2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(velocity * 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    src.start(now);
    src.stop(now + 0.12);
  }

  /**
   * Studio Seed Shaker (Akustik Tohum / Marakas Çalkalama)
   */
  public playShaker(time?: number, velocity: number = 0.5, isAccent: boolean = false): void {
    const ctx = this.ctx;
    const now = Math.max(time ?? ctx.currentTime, ctx.currentTime);

    const len = Math.floor(ctx.sampleRate * 0.045);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const decay = Math.exp(-i / (ctx.sampleRate * (isAccent ? 0.015 : 0.008)));
      data[i] = (Math.random() * 2 - 1) * decay;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(4500, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(velocity * (isAccent ? 0.6 : 0.35), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    src.start(now);
    src.stop(now + 0.05);
  }

  /**
   * Tambourine Jingle (Zilli Akustik Tef)
   */
  public playTambourine(time?: number, velocity: number = 0.75): void {
    const ctx = this.ctx;
    const now = Math.max(time ?? ctx.currentTime, ctx.currentTime);

    const len = Math.floor(ctx.sampleRate * 0.14);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      // Ringing metallic jingle envelope
      const t = i / ctx.sampleRate;
      const env = Math.exp(-t * 28) + 0.25 * Math.exp(-t * 12);
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(6200, now);
    filter.Q.setValueAtTime(3.5, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(velocity * 0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    src.start(now);
    src.stop(now + 0.15);
  }
}
