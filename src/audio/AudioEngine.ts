import { AcousticStringVoice } from './AcousticString';
import { createAcousticBodyImpulse } from './ImpulseGenerator';
import { sampledGuitarEngine, getGuitarMidi } from './SampledGuitarEngine';
import { BodyPreset } from '../types';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private isUnlocked: boolean = false;

  public getIsUnlocked(): boolean {
    return this.isUnlocked;
  }

  // Audio Node Graph
  private masterGain!: GainNode;
  private limiter!: DynamicsCompressorNode;
  private bodyEqLow!: BiquadFilterNode;
  private bodyEqMid!: BiquadFilterNode;
  private bodyEqHigh!: BiquadFilterNode;
  private reverbConvolver!: ConvolverNode;
  private reverbGain!: GainNode;
  private dryGain!: GainNode;
  private chorusDelay!: DelayNode;
  private chorusGain!: GainNode;

  // 6 String Stereo Panners & Voices
  private stringPanners: StereoPannerNode[] = [];
  private stringVoices: AcousticStringVoice[] = [];

  // Active settings
  public preset: BodyPreset = {
    id: 'dreadnought',
    name: 'Martin D-28 Dreadnought',
    description: 'Dolgun baslar ve sıcak gövde tınısı.',
    bodySize: 'dreadnought',
    brightness: 0.75,
    bodyResonance: 0.85,
    reverbWet: 0.25,
    chorusWet: 0.0,
    strumSpeedMs: 22
  };

  public init(): AudioContext {
    if (this.ctx) return this.ctx;

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    const ctx = this.ctx;

    // 1. Master Output & Limiter (protect against clipping)
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, ctx.currentTime);

    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.setValueAtTime(-2.0, ctx.currentTime);
    this.limiter.knee.setValueAtTime(3.0, ctx.currentTime);
    this.limiter.ratio.setValueAtTime(12.0, ctx.currentTime);
    this.limiter.attack.setValueAtTime(0.003, ctx.currentTime);
    this.limiter.release.setValueAtTime(0.15, ctx.currentTime);

    this.limiter.connect(this.masterGain);
    this.masterGain.connect(ctx.destination);

    // 2. Acoustic Guitar Body EQ
    // Low resonance: soundhole cavity ~110Hz
    this.bodyEqLow = ctx.createBiquadFilter();
    this.bodyEqLow.type = 'peaking';
    this.bodyEqLow.frequency.setValueAtTime(108, ctx.currentTime);
    this.bodyEqLow.Q.setValueAtTime(2.0, ctx.currentTime);
    this.bodyEqLow.gain.setValueAtTime(3.5, ctx.currentTime);

    // Mid resonance: spruce/mahogany body wood ~900Hz
    this.bodyEqMid = ctx.createBiquadFilter();
    this.bodyEqMid.type = 'peaking';
    this.bodyEqMid.frequency.setValueAtTime(880, ctx.currentTime);
    this.bodyEqMid.Q.setValueAtTime(1.2, ctx.currentTime);
    this.bodyEqMid.gain.setValueAtTime(1.0, ctx.currentTime);

    // High presence: fingerpick attack & bronze sheen ~4.5kHz
    this.bodyEqHigh = ctx.createBiquadFilter();
    this.bodyEqHigh.type = 'highshelf';
    this.bodyEqHigh.frequency.setValueAtTime(4500, ctx.currentTime);
    this.bodyEqHigh.gain.setValueAtTime(2.0, ctx.currentTime);

    // EQ Chain
    this.bodyEqLow.connect(this.bodyEqMid);
    this.bodyEqMid.connect(this.bodyEqHigh);

    // 3. Dry / Wet Effects Bus
    this.dryGain = ctx.createGain();
    this.dryGain.gain.setValueAtTime(1.0, ctx.currentTime);
    this.bodyEqHigh.connect(this.dryGain);
    this.dryGain.connect(this.limiter);

    // Reverb Bus
    this.reverbConvolver = ctx.createConvolver();
    this.reverbConvolver.buffer = createAcousticBodyImpulse(ctx, 1.4, 2.8, this.preset.bodySize);
    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.setValueAtTime(this.preset.reverbWet, ctx.currentTime);

    this.bodyEqHigh.connect(this.reverbConvolver);
    this.reverbConvolver.connect(this.reverbGain);
    this.reverbGain.connect(this.limiter);

    // Chorus / 12-String Shimmer Bus
    this.chorusDelay = ctx.createDelay();
    this.chorusDelay.delayTime.setValueAtTime(0.018, ctx.currentTime); // 18ms detune delay
    this.chorusGain = ctx.createGain();
    this.chorusGain.gain.setValueAtTime(this.preset.chorusWet, ctx.currentTime);

    // Subtle LFO for Chorus
    const chorusLfo = ctx.createOscillator();
    chorusLfo.type = 'sine';
    chorusLfo.frequency.setValueAtTime(1.5, ctx.currentTime); // 1.5 Hz modulation
    const chorusLfoGain = ctx.createGain();
    chorusLfoGain.gain.setValueAtTime(0.002, ctx.currentTime); // ±2ms pitch drift
    chorusLfo.connect(chorusLfoGain);
    chorusLfoGain.connect(this.chorusDelay.delayTime);
    chorusLfo.start();

    this.bodyEqHigh.connect(this.chorusDelay);
    this.chorusDelay.connect(this.chorusGain);
    this.chorusGain.connect(this.limiter);

    // 4. Create 6 String Stereo Panners
    const panPositions = [-0.35, -0.2, -0.08, 0.08, 0.2, 0.35];

    this.stringPanners = [];
    this.stringVoices = [];

    for (let i = 0; i < 6; i++) {
      let panner: StereoPannerNode | null = null;
      if (ctx.createStereoPanner) {
        panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(panPositions[i], ctx.currentTime);
        panner.connect(this.bodyEqLow);
        this.stringPanners.push(panner);
      }
      const targetNode = panner ? panner : this.bodyEqLow;
      this.stringVoices.push(new AcousticStringVoice(ctx, targetNode));
    }

    // Initialize Real Sample Engine
    sampledGuitarEngine.init(ctx);

    return ctx;
  }

  public async unlock(): Promise<boolean> {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.isUnlocked = true;
    return true;
  }

  public getContext(): AudioContext {
    if (!this.ctx) {
      this.init();
    }
    return this.ctx!;
  }

  public setMasterVolume(volume: number): void {
    if (!this.masterGain || !this.ctx) return;
    const clamped = Math.max(0, Math.min(1.2, volume));
    this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.02);
  }

  public applyPreset(preset: BodyPreset): void {
    this.preset = preset;
    if (!this.ctx) return;

    // Update body resonance impulse
    this.reverbConvolver.buffer = createAcousticBodyImpulse(
      this.ctx,
      preset.bodySize === 'jumbo' ? 1.8 : 1.2,
      2.5,
      preset.bodySize
    );

    this.reverbGain.gain.setTargetAtTime(preset.reverbWet, this.ctx.currentTime, 0.05);
    this.chorusGain.gain.setTargetAtTime(preset.chorusWet, this.ctx.currentTime, 0.05);

    // Body EQ adjustments based on preset
    const bassBoost = preset.bodyResonance * 5.0;
    this.bodyEqLow.gain.setTargetAtTime(bassBoost, this.ctx.currentTime, 0.05);

    const highSheen = (preset.brightness - 0.5) * 6.0;
    this.bodyEqHigh.gain.setTargetAtTime(highSheen, this.ctx.currentTime, 0.05);
  }

  public setBrightness(val: number): void {
    this.preset.brightness = Math.max(0.1, Math.min(1.0, val));
    if (this.ctx && this.bodyEqHigh) {
      const highSheen = (this.preset.brightness - 0.5) * 6.0;
      this.bodyEqHigh.gain.setTargetAtTime(highSheen, this.ctx.currentTime, 0.05);
    }
  }

  public setReverb(val: number): void {
    this.preset.reverbWet = Math.max(0, Math.min(0.8, val));
    if (this.ctx && this.reverbGain) {
      this.reverbGain.gain.setTargetAtTime(this.preset.reverbWet, this.ctx.currentTime, 0.05);
    }
  }

  public setChorus(val: number): void {
    this.preset.chorusWet = Math.max(0, Math.min(0.6, val));
    if (this.ctx && this.chorusGain) {
      this.chorusGain.gain.setTargetAtTime(this.preset.chorusWet, this.ctx.currentTime, 0.05);
    }
  }

  public setStrumSpeed(speedMs: number): void {
    this.preset.strumSpeedMs = Math.max(8, Math.min(60, speedMs));
  }

  /**
   * Triggers an individual acoustic string pluck using real studio recordings
   */
  public pluckString(
    stringIndex: number,
    fret: number,
    freq: number,
    time?: number,
    velocity: number = 0.85,
    isMuted: boolean = false
  ): void {
    if (!this.ctx) this.init();
    if (stringIndex < 0 || stringIndex >= 6 || fret < 0) return;

    const playTime = time ?? this.ctx!.currentTime;
    const targetNode = this.stringPanners[stringIndex] || this.bodyEqLow;

    // 1. Try playing real studio recorded acoustic guitar sample
    const midiNote = getGuitarMidi(stringIndex, fret);
    const playedSample = sampledGuitarEngine.playNote(
      midiNote,
      playTime,
      velocity,
      targetNode,
      isMuted
    );

    // 2. If sample not yet decoded or available, use physical modeling fallback
    if (!playedSample) {
      this.stringVoices[stringIndex].trigger(
        freq,
        playTime,
        velocity,
        stringIndex,
        isMuted,
        this.preset.brightness
      );
    }
  }

  /**
   * Triggers an acoustic body slap / palm percussion
   */
  public triggerPercussion(time?: number, velocity: number = 0.9): void {
    if (!this.ctx) this.init();
    const playTime = time ?? this.ctx!.currentTime;
    this.stringVoices[0].triggerPerccusion(playTime, velocity);
  }
}

export const audioEngine = new AudioEngine();
