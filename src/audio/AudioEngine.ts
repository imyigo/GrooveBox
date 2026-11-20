import { playPiano } from "./PianoEngine";
import { stopAllVoices, trackVoice } from "./voices";
import type { MixSettings, WavTrack } from "../project";
import { AcousticStringVoice } from "./AcousticString";
import { createAcousticBodyImpulse } from "./ImpulseGenerator";
import {
  sampledGuitarEngine,
  getGuitarMidi,
  AcousticInstrumentType,
} from "./SampledGuitarEngine";
import { AcousticPercussion } from "./AcousticPercussion";
import { BodyPreset } from "../types";

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private isUnlocked: boolean = false;
  private desiredMix: MixSettings | null = null;
  private desiredVolume = 0.85;
  private wavTrack?: WavTrack;
  private wavBuffer: AudioBuffer | null = null;
  private wavGain: GainNode | null = null;
  private wavSource: AudioBufferSourceNode | null = null;
  private wavLoading: Promise<void> = Promise.resolve();

  public setWavTrack(track: WavTrack | undefined): void {
    const changed = this.wavTrack?.dataUrl !== track?.dataUrl;
    this.wavTrack = track;
    if (this.wavGain && this.ctx)
      this.wavGain.gain.setTargetAtTime(
        track && !track.muted ? track.volume : 0,
        this.ctx.currentTime,
        0.02,
      );
    if (changed) {
      this.wavBuffer = null;
      try {
        this.wavSource?.stop();
      } catch {
        /* already ended */
      }
      this.wavLoading = this.prepareWav();
      void this.wavLoading.catch(() => {}); // ready() reports decode failures to the transport.
    }
  }

  private async prepareWav(): Promise<void> {
    if (!this.ctx || !this.wavTrack) return;
    const dataUrl = this.wavTrack.dataUrl;
    const binary = atob(dataUrl.split(",")[1]);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const buffer = await this.ctx.decodeAudioData(bytes.buffer);
    if (this.wavTrack?.dataUrl === dataUrl) this.wavBuffer = buffer;
  }

  public seekWav(songSeconds: number, time: number): void {
    try {
      this.wavSource?.stop(time);
    } catch {
      /* already ended */
    }
    this.wavSource = null;
    const track = this.wavTrack;
    if (!track || !this.wavBuffer || !this.ctx || !this.wavGain) return;
    const offset = Math.max(0, songSeconds - track.offsetSeconds);
    if (offset >= this.wavBuffer.duration) return;
    const source = trackVoice(this.ctx.createBufferSource());
    source.buffer = this.wavBuffer;
    source.connect(this.wavGain);
    source.start(time + Math.max(0, track.offsetSeconds - songSeconds), offset);
    this.wavSource = source;
  }

  public configure(mix: MixSettings, volume: number): void {
    this.desiredMix = { ...mix };
    this.desiredVolume = volume;
    if (!this.ctx) return;
    this.setMasterVolume(volume);
    this.setChordVolume(mix.chordVolume);
    this.setDrumVolume(mix.drumVolume);
    this.setSoloVolume(mix.soloVolume);
    this.setReverb(mix.reverbWet);
    this.setBrightness(mix.brightness);
    this.setBodyResonance(mix.bodyResonance);
    this.setStrumSpeed(mix.strumSpeedMs);
  }

  public getIsUnlocked(): boolean {
    return this.isUnlocked;
  }

  public stopAll(): void {
    stopAllVoices();
    sampledGuitarEngine.chokeActiveSoloVoices();
  }

  public async ready(
    instruments: AcousticInstrumentType[] = [],
  ): Promise<void> {
    await Promise.all(
      [
        sampledGuitarEngine.ready(),
        this.wavLoading,
        ...new Set(instruments),
      ].map((task) =>
        typeof task === "string" ? sampledGuitarEngine.loadSamples(task) : task,
      ),
    );
  }

  public createRecordingOutput(): {
    node: MediaStreamAudioDestinationNode;
    release: () => void;
  } {
    const ctx = this.getContext();
    const node = ctx.createMediaStreamDestination();
    this.masterGain.connect(node);
    return {
      node,
      release: () => {
        this.masterGain.disconnect(node);
        node.stream.getTracks().forEach((t) => t.stop());
      },
    };
  }

  public playPianoNote(
    midi: number,
    time?: number,
    velocity = 0.85,
    solo = false,
  ): void {
    const ctx = this.getContext();
    playPiano(
      ctx,
      solo ? this.soloSubGain : this.chordSubGain,
      midi,
      time ?? ctx.currentTime,
      velocity,
    );
  }

  public getChordInstrument(): AcousticInstrumentType {
    return sampledGuitarEngine.getChordInstrument();
  }

  public setBodyResonance(value: number): void {
    this.preset.bodyResonance = value;
    if (this.ctx)
      this.bodyEqLow.gain.setTargetAtTime(
        value * 5,
        this.ctx.currentTime,
        0.02,
      );
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

  // Track Submix Busses
  public soloSubGain!: GainNode;
  public chordSubGain!: GainNode;
  public drumSubGain!: GainNode;

  // 6 String Stereo Panners & Voices
  private stringPanners: StereoPannerNode[] = [];
  private stringVoices: AcousticStringVoice[] = [];

  // Acoustic Percussion Synthesizer
  public percussion!: AcousticPercussion;

  // Active settings
  public preset: BodyPreset = {
    id: "dreadnought",
    name: "Martin D-28 Dreadnought",
    description: "Dolgun baslar ve sıcak gövde tınısı.",
    bodySize: "dreadnought",
    brightness: 0.75,
    bodyResonance: 0.85,
    reverbWet: 0.04, // Very dry, crisp acoustic studio room
    chorusWet: 0.0,
    strumSpeedMs: 22,
  };

  public init(): AudioContext {
    if (this.ctx) return this.ctx;

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
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
    this.wavGain = ctx.createGain();
    this.wavGain.gain.value =
      this.wavTrack && !this.wavTrack.muted ? this.wavTrack.volume : 0;
    this.wavGain.connect(this.limiter);
    this.wavLoading = this.prepareWav();
    void this.wavLoading.catch(() => {});

    // 2. Acoustic Guitar Body EQ
    // Low resonance: soundhole cavity ~110Hz
    this.bodyEqLow = ctx.createBiquadFilter();
    this.bodyEqLow.type = "peaking";
    this.bodyEqLow.frequency.setValueAtTime(108, ctx.currentTime);
    this.bodyEqLow.Q.setValueAtTime(2.0, ctx.currentTime);
    this.bodyEqLow.gain.setValueAtTime(3.5, ctx.currentTime);

    // Mid resonance: spruce/mahogany body wood ~900Hz
    this.bodyEqMid = ctx.createBiquadFilter();
    this.bodyEqMid.type = "peaking";
    this.bodyEqMid.frequency.setValueAtTime(880, ctx.currentTime);
    this.bodyEqMid.Q.setValueAtTime(1.2, ctx.currentTime);
    this.bodyEqMid.gain.setValueAtTime(1.0, ctx.currentTime);

    // High presence: fingerpick attack & bronze sheen ~4.5kHz
    this.bodyEqHigh = ctx.createBiquadFilter();
    this.bodyEqHigh.type = "highshelf";
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

    // Reverb Bus (Tight studio acoustic room, low wet)
    this.reverbConvolver = ctx.createConvolver();
    this.reverbConvolver.buffer = createAcousticBodyImpulse(
      ctx,
      0.32,
      9.5,
      this.preset.bodySize,
    );
    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.setValueAtTime(this.preset.reverbWet, ctx.currentTime);

    this.bodyEqHigh.connect(this.reverbConvolver);
    this.reverbConvolver.connect(this.reverbGain);
    this.reverbGain.connect(this.limiter);

    // Submix Busses for independent mix control
    this.soloSubGain = ctx.createGain();
    this.soloSubGain.gain.setValueAtTime(0.95, ctx.currentTime);
    this.soloSubGain.connect(this.bodyEqHigh);

    this.chordSubGain = ctx.createGain();
    this.chordSubGain.gain.setValueAtTime(0.95, ctx.currentTime);
    this.chordSubGain.connect(this.bodyEqLow);

    this.drumSubGain = ctx.createGain();
    this.drumSubGain.gain.setValueAtTime(0.9, ctx.currentTime);
    this.drumSubGain.connect(this.bodyEqMid);

    // Chorus / 12-String Shimmer Bus
    this.chorusDelay = ctx.createDelay();
    this.chorusDelay.delayTime.setValueAtTime(0.018, ctx.currentTime); // 18ms detune delay
    this.chorusGain = ctx.createGain();
    this.chorusGain.gain.setValueAtTime(this.preset.chorusWet, ctx.currentTime);

    // Subtle LFO for Chorus
    const chorusLfo = ctx.createOscillator();
    chorusLfo.type = "sine";
    chorusLfo.frequency.setValueAtTime(1.5, ctx.currentTime); // 1.5 Hz modulation
    const chorusLfoGain = ctx.createGain();
    chorusLfoGain.gain.setValueAtTime(0.002, ctx.currentTime); // ±2ms pitch drift
    chorusLfo.connect(chorusLfoGain);
    chorusLfoGain.connect(this.chorusDelay.delayTime);
    chorusLfo.start();

    this.bodyEqHigh.connect(this.chorusDelay);
    this.chorusDelay.connect(this.chorusGain);
    this.chorusGain.connect(this.limiter);

    // 4. Create 6 String Stereo Panners connected to chordSubGain
    const panPositions = [-0.35, -0.2, -0.08, 0.08, 0.2, 0.35];

    this.stringPanners = [];
    this.stringVoices = [];

    for (let i = 0; i < 6; i++) {
      let panner: StereoPannerNode | null = null;
      if (ctx.createStereoPanner) {
        panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(panPositions[i], ctx.currentTime);
        panner.connect(this.chordSubGain);
        this.stringPanners.push(panner);
      }
      const targetNode = panner ? panner : this.chordSubGain;
      this.stringVoices.push(new AcousticStringVoice(ctx, targetNode));
    }

    // Initialize Acoustic Percussion to drum submix
    this.percussion = new AcousticPercussion(ctx, this.drumSubGain);

    // Initialize Real Sample Engine
    sampledGuitarEngine.init(ctx);

    if (this.desiredMix) this.configure(this.desiredMix, this.desiredVolume);

    return ctx;
  }

  public setChordInstrument(type: AcousticInstrumentType): void {
    sampledGuitarEngine.setChordInstrument(type);
  }

  public setSoloInstrument(type: AcousticInstrumentType): void {
    sampledGuitarEngine.setSoloInstrument(type);
  }

  public getSoloInstrument(): AcousticInstrumentType {
    return sampledGuitarEngine.getSoloInstrument();
  }

  public playRecordedNote(
    midi: number,
    time: number,
    velocity: number,
    instrument?: AcousticInstrumentType,
  ): void {
    const type = instrument || this.getSoloInstrument();
    if (type === "piano") {
      this.playPianoNote(midi, time, velocity, true);
      return;
    }
    if (type === "drums") {
      const hits = {
        36: "kick",
        38: "snare",
        42: "hihat_closed",
        46: "hihat_open",
        49: "tambourine",
        45: "wood",
      } as const;
      const hit = hits[midi as keyof typeof hits];
      if (hit) this.playDrumHit(hit, time, velocity);
      return;
    }
    sampledGuitarEngine.playSoloNote(
      midi,
      time,
      velocity,
      this.soloSubGain,
      type,
    );
  }

  /**
   * Plays a solo note by MIDI number using the Virtuoso Solo Engine
   */
  public playSoloMidiNote(
    midi: number,
    time?: number,
    velocity: number = 0.9,
    withGraceNote: boolean = false,
  ): void {
    if (!this.ctx) this.init();
    const playTime = time ?? this.ctx!.currentTime;

    if (sampledGuitarEngine.getSoloInstrument() === "piano") {
      this.playPianoNote(midi, playTime, velocity, true);
      return;
    }

    // Direct drum percussion synthesis if Davul is selected
    if (sampledGuitarEngine.getSoloInstrument() === "drums") {
      const drumTypes: (
        "kick" | "snare" | "hihat_closed" | "hihat_open" | "tambourine" | "wood"
      )[] = [
        "kick",
        "snare",
        "hihat_closed",
        "hihat_open",
        "tambourine",
        "wood",
      ];
      const drumMidi = [36, 38, 42, 46, 49, 45];
      const hit = drumTypes[Math.max(0, drumMidi.indexOf(midi))];
      this.playDrumHit(hit, playTime, velocity);
      return;
    }

    const dest = this.soloSubGain || this.bodyEqHigh;
    sampledGuitarEngine.playSoloNote(
      midi,
      playTime,
      velocity,
      dest,
      undefined,
      withGraceNote,
    );
  }

  /**
   * Plays a direct acoustic drum hit (Kick, Snare, HiHats, Tambourine, Woodblock)
   */
  public playDrumHit(
    hitType:
      "kick" | "snare" | "hihat_closed" | "hihat_open" | "tambourine" | "wood",
    time?: number,
    velocity: number = 0.9,
  ): void {
    if (!this.ctx) this.init();
    const playTime = time ?? this.ctx!.currentTime;
    if (!this.percussion) return;

    switch (hitType) {
      case "kick":
        this.percussion.playCajonBass(playTime, velocity);
        break;
      case "snare":
        this.percussion.playCajonSlap(playTime, velocity);
        break;
      case "hihat_closed":
        this.percussion.playShaker(playTime, velocity, false, false);
        break;
      case "hihat_open":
        this.percussion.playShaker(playTime, velocity, true, true);
        break;
      case "tambourine":
        this.percussion.playTambourine(playTime, velocity);
        break;
      case "wood":
        this.percussion.playWoodBlock(playTime, velocity);
        break;
    }
  }

  /**
   * Stops an active solo note on key-up with natural acoustic release
   */
  public stopSoloNote(midi?: number, time?: number): void {
    sampledGuitarEngine.stopSoloNote(midi, time);
  }

  public setDrumVolume(vol: number): void {
    if (this.drumSubGain && this.ctx) {
      this.drumSubGain.gain.setTargetAtTime(
        Math.max(0, Math.min(1.2, vol)),
        this.ctx.currentTime,
        0.02,
      );
    }
  }

  public setChordVolume(vol: number): void {
    if (this.chordSubGain && this.ctx) {
      this.chordSubGain.gain.setTargetAtTime(
        Math.max(0, Math.min(1.2, vol)),
        this.ctx.currentTime,
        0.02,
      );
    }
  }

  public setSoloVolume(vol: number): void {
    if (this.soloSubGain && this.ctx) {
      this.soloSubGain.gain.setTargetAtTime(
        Math.max(0, Math.min(1.2, vol)),
        this.ctx.currentTime,
        0.02,
      );
    }
  }

  public async unlock(): Promise<boolean> {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === "suspended") {
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

    // Update body resonance impulse (tight studio response)
    this.reverbConvolver.buffer = createAcousticBodyImpulse(
      this.ctx,
      preset.bodySize === "jumbo" ? 0.38 : 0.3,
      9.0,
      preset.bodySize,
    );

    this.reverbGain.gain.setTargetAtTime(
      preset.reverbWet,
      this.ctx.currentTime,
      0.05,
    );
    this.chorusGain.gain.setTargetAtTime(
      preset.chorusWet,
      this.ctx.currentTime,
      0.05,
    );

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
      this.bodyEqHigh.gain.setTargetAtTime(
        highSheen,
        this.ctx.currentTime,
        0.05,
      );
    }
  }

  public setReverb(val: number): void {
    this.preset.reverbWet = Math.max(0, Math.min(0.8, val));
    if (this.ctx && this.reverbGain) {
      this.reverbGain.gain.setTargetAtTime(
        this.preset.reverbWet,
        this.ctx.currentTime,
        0.05,
      );
    }
  }

  public setChorus(val: number): void {
    this.preset.chorusWet = Math.max(0, Math.min(0.6, val));
    if (this.ctx && this.chorusGain) {
      this.chorusGain.gain.setTargetAtTime(
        this.preset.chorusWet,
        this.ctx.currentTime,
        0.05,
      );
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
    isMuted: boolean = false,
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
      isMuted,
    );

    // 2. If sample not yet decoded or available, use physical modeling fallback
    if (!playedSample) {
      this.stringVoices[stringIndex].trigger(
        freq,
        playTime,
        velocity,
        stringIndex,
        isMuted,
        this.preset.brightness,
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
