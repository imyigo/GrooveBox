/**
 * Real Acoustic Sampled Multi-Instrument Engine
 * Supports Violin (Keman), Clarinet (Klarnet), Saxophone (Saksafon),
 * Harmonica (Mızıka), Nylon Guitar, Steel Guitar, and Acoustic Bass.
 */

const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export function midiToNoteName(midi: number): string {
  const name = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

export const STRING_BASE_MIDI = [40, 45, 50, 55, 59, 64];

export function getGuitarMidi(stringIndex: number, fret: number): number {
  if (fret < 0) return -1;
  return STRING_BASE_MIDI[stringIndex] + fret;
}

export type AcousticInstrumentType =
  | 'violin'
  | 'clarinet'
  | 'alto_sax'
  | 'harmonica'
  | 'steel'
  | 'nylon'
  | 'piano'
  | 'bass'
  | 'drums';

export interface InstrumentMeta {
  id: AcousticInstrumentType;
  name: string;
  category: 'strings' | 'woodwind' | 'brass' | 'reed' | 'guitar' | 'piano' | 'bass' | 'percussion';
  icon: string;
  defaultOctave: number;
}

export interface InstrumentEnvelope {
  attackSec: number;
  decaySec: number;
  sustainLevel: number;
  maxHoldSec: number;
  releaseSec: number;
}

export const INSTRUMENT_ENVELOPES: Record<AcousticInstrumentType, InstrumentEnvelope> = {
  // Keman: Zengin yay rezonansı ve uzun akıcı sustain
  violin: { attackSec: 0.035, decaySec: 0.45, sustainLevel: 0.75, maxHoldSec: 3.8, releaseSec: 0.28 },
  // Klarnet: Sıcak ahşap nefes ve parlak kamış tonu
  clarinet: { attackSec: 0.022, decaySec: 0.40, sustainLevel: 0.70, maxHoldSec: 3.5, releaseSec: 0.25 },
  // Saksafon: Pirinç gövde vibratosu ve rezonans
  alto_sax: { attackSec: 0.020, decaySec: 0.42, sustainLevel: 0.72, maxHoldSec: 3.5, releaseSec: 0.26 },
  // Mızıka: Akustik hava blues kamış tınısı
  harmonica: { attackSec: 0.015, decaySec: 0.35, sustainLevel: 0.65, maxHoldSec: 3.2, releaseSec: 0.22 },
  // Sıcak Naylon: İspanyol sedir gövde, ölçülü 3.6s doğal oda rezonansı
  nylon: { attackSec: 0.004, decaySec: 0.75, sustainLevel: 0.38, maxHoldSec: 3.6, releaseSec: 0.28 },
  // Çelik Akustik: Parlak fosfor bronz tınlama ve 4.0s zengin sustain
  steel: { attackSec: 0.003, decaySec: 0.85, sustainLevel: 0.42, maxHoldSec: 4.0, releaseSec: 0.30 },
  // Konser Piyanosu: Zengin çekiç vuruşu ve geniş gövde sustaini
  piano: { attackSec: 0.004, decaySec: 0.95, sustainLevel: 0.45, maxHoldSec: 4.5, releaseSec: 0.35 },
  // Akustik Bas: Dolgun ahşap kontrbas vuruşu
  bass: { attackSec: 0.005, decaySec: 0.60, sustainLevel: 0.32, maxHoldSec: 3.2, releaseSec: 0.24 },
  // Davul: Akustik Kahon & Doğal Perküsyon
  drums: { attackSec: 0.001, decaySec: 0.20, sustainLevel: 0.05, maxHoldSec: 1.2, releaseSec: 0.15 }
};

interface ActiveSoloVoice {
  midi: number;
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  instrument: AcousticInstrumentType;
  stopTime: number;
}

export const INSTRUMENT_METAS: Record<AcousticInstrumentType, InstrumentMeta> = {
  nylon: { id: 'nylon', name: 'Sıcak Naylon Gitar', category: 'guitar', icon: '🎸', defaultOctave: 3 },
  steel: { id: 'steel', name: 'Çelik Akustik Gitar', category: 'guitar', icon: '🎸', defaultOctave: 3 },
  piano: { id: 'piano', name: 'Kuyruklu Piyano', category: 'piano', icon: '🎹', defaultOctave: 3 },
  violin: { id: 'violin', name: 'Keman', category: 'strings', icon: '🎻', defaultOctave: 4 },
  clarinet: { id: 'clarinet', name: 'Klarnet', category: 'woodwind', icon: '🎷', defaultOctave: 4 },
  alto_sax: { id: 'alto_sax', name: 'Saksafon', category: 'brass', icon: '🎷', defaultOctave: 3 },
  harmonica: { id: 'harmonica', name: 'Mızıka', category: 'reed', icon: '🪗', defaultOctave: 4 },
  bass: { id: 'bass', name: 'Akustik Bas', category: 'bass', icon: '🎻', defaultOctave: 2 },
  drums: { id: 'drums', name: 'Davul', category: 'percussion', icon: '🥁', defaultOctave: 3 }
};

export class SampledGuitarEngine {
  private ctx: AudioContext | null = null;
  private currentChordInstrument: AcousticInstrumentType = 'nylon';
  private currentSoloInstrument: AcousticInstrumentType = 'violin'; // Default solo to expressive Violin!

  // Separate buffer cache for each instrument type
  private sampleBuffers: Record<AcousticInstrumentType, Map<string, AudioBuffer>> = {
    violin: new Map(),
    clarinet: new Map(),
    alto_sax: new Map(),
    harmonica: new Map(),
    nylon: new Map(),
    steel: new Map(),
    piano: new Map(),
    bass: new Map(),
    drums: new Map()
  };

  private sampleRawData: Record<AcousticInstrumentType, Record<string, string> | null> = {
    violin: null,
    clarinet: null,
    alto_sax: null,
    harmonica: null,
    nylon: null,
    steel: null,
    piano: null,
    bass: null,
    drums: null
  };

  private loadProgress: number = 0;
  private onProgressListeners: ((progress: number, isLoaded: boolean) => void)[] = [];
  private activeSoloVoices: ActiveSoloVoice[] = [];
  private lastSoloMidi: number = -1;
  private lastSoloTime: number = 0;

  public init(ctx: AudioContext): void {
    this.ctx = ctx;
    // Load chord instrument & solo instrument with priority
    this.loadSamples(this.currentChordInstrument);
    this.loadSamples(this.currentSoloInstrument);
    this.loadSamples('steel');
    this.loadSamples('clarinet');
  }

  public setChordInstrument(type: AcousticInstrumentType): void {
    this.currentChordInstrument = type;
    this.loadSamples(type);
  }

  public getChordInstrument(): AcousticInstrumentType {
    return this.currentChordInstrument;
  }

  public setSoloInstrument(type: AcousticInstrumentType): void {
    this.currentSoloInstrument = type;
    this.loadSamples(type);
  }

  public getSoloInstrument(): AcousticInstrumentType {
    return this.currentSoloInstrument;
  }

  public onProgress(listener: (progress: number, isLoaded: boolean) => void): () => void {
    this.onProgressListeners.push(listener);
    listener(this.loadProgress, true);
    return () => {
      this.onProgressListeners = this.onProgressListeners.filter((l) => l !== listener);
    };
  }

  public async loadSamples(type: AcousticInstrumentType): Promise<void> {
    if (type === 'drums' || type === 'piano') {
      return; // Synthesized organically via acoustic physical modeling!
    }
    if (this.sampleBuffers[type].size > 20) return;

    try {
      const fileMap: Record<Exclude<AcousticInstrumentType, 'drums' | 'piano'>, string> = {
        violin: '/samples/violin.json',
        clarinet: '/samples/clarinet.json',
        alto_sax: '/samples/alto_sax.json',
        harmonica: '/samples/harmonica.json',
        nylon: '/samples/acoustic_guitar_nylon.json',
        steel: '/samples/acoustic_guitar_steel.json',
        bass: '/samples/acoustic_bass.json'
      };

      const res = await fetch(fileMap[type]);
      if (!res.ok) return;
      const rawData = await res.json();
      this.sampleRawData[type] = rawData;

      const allKeys = Object.keys(rawData);
      // Priority range
      const priorityKeys = allKeys.filter((key) => {
        const oct = parseInt(key.slice(-1), 10);
        return type === 'bass' ? oct >= 1 && oct <= 4 : oct >= 2 && oct <= 6;
      });

      for (const k of priorityKeys) {
        await this.decodeSingleNote(k, type);
      }

      this.loadProgress = 100;
      this.onProgressListeners.forEach((l) => l(100, true));

      // Background remainder
      const rest = allKeys.filter((k) => !priorityKeys.includes(k));
      for (const k of rest) {
        this.decodeSingleNote(k, type).catch(() => {});
      }
    } catch (e) {
      console.warn('Sample load fallback:', e);
    }
  }

  private async decodeSingleNote(noteName: string, type: AcousticInstrumentType): Promise<AudioBuffer | null> {
    const bufferMap = this.sampleBuffers[type];
    if (bufferMap.has(noteName)) {
      return bufferMap.get(noteName)!;
    }

    const rawData = this.sampleRawData[type];
    if (!rawData || !rawData[noteName] || !this.ctx) return null;

    try {
      const dataUrl = rawData[noteName];
      const base64 = dataUrl.split(',')[1] || dataUrl;
      const binaryString = window.atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBuffer = await this.ctx.decodeAudioData(bytes.buffer.slice(0));
      bufferMap.set(noteName, audioBuffer);
      return audioBuffer;
    } catch {
      return null;
    }
  }

  /**
   * Chokes all active solo voices with a musical 20ms release crossfade
   * so solo lines never build up muddy overlapping notes.
   */
  public chokeActiveSoloVoices(time?: number): void {
    if (!this.ctx) return;
    const now = Math.max(time ?? this.ctx.currentTime, this.ctx.currentTime);
    this.activeSoloVoices.forEach((voice) => {
      try {
        voice.gainNode.gain.cancelScheduledValues(now);
        voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now);
        voice.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);
        voice.source.stop(now + 0.03);
      } catch {
        // already stopped
      }
    });
    this.activeSoloVoices = [];
  }

  /**
   * Stops a specific solo note (on keyup) with authentic acoustic release damping
   */
  public stopSoloNote(midi?: number, time?: number): void {
    if (!this.ctx) return;
    const now = Math.max(time ?? this.ctx.currentTime, this.ctx.currentTime);
    const toRemove: ActiveSoloVoice[] = [];

    this.activeSoloVoices.forEach((voice) => {
      if (midi === undefined || voice.midi === midi) {
        const env = INSTRUMENT_ENVELOPES[voice.instrument] || INSTRUMENT_ENVELOPES.nylon;
        const rel = env.releaseSec;
        try {
          voice.gainNode.gain.cancelScheduledValues(now);
          voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now);
          voice.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + rel);
          voice.source.stop(now + rel + 0.01);
        } catch {
          // already stopped
        }
        toRemove.push(voice);
      }
    });

    this.activeSoloVoices = this.activeSoloVoices.filter((v) => !toRemove.includes(v));
  }

  /**
   * Plays a real recorded note for Chords & Strumming
   * with velocity-dependent dynamic low-pass filtering and string tension detune.
   */
  public playNote(
    midiNote: number,
    time: number,
    velocity: number = 0.85,
    destination: AudioNode,
    isMuted: boolean = false,
    instrument?: AcousticInstrumentType
  ): boolean {
    if (!this.ctx || midiNote < 0) return false;

    const chosenInst = instrument ?? this.currentChordInstrument;
    const noteName = midiToNoteName(midiNote);
    const buffer = this.sampleBuffers[chosenInst].get(noteName);

    if (!buffer) {
      this.decodeSingleNote(noteName, chosenInst);
      return false;
    }

    const ctx = this.ctx;
    const now = Math.max(time, ctx.currentTime);

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // 1. Dynamic Velocity-to-Timbre Tracking Filter
    // Soft touches roll off highs; hard strokes unleash full acoustic bite
    const dynamicFilter = ctx.createBiquadFilter();
    dynamicFilter.type = 'lowpass';
    const cutoff = isMuted ? 3200 : (2600 + Math.pow(velocity, 2) * 15000);
    dynamicFilter.frequency.setValueAtTime(cutoff, now);
    dynamicFilter.Q.setValueAtTime(0.7, now);

    // 2. Initial String Tension Detune Spike & Human Micro-Intonation (±3 cents)
    const humanIntonation = (Math.random() - 0.5) * 5.5;
    const attackTensionSpike = velocity > 0.75 ? (velocity - 0.75) * 22.0 : 0;
    source.detune.setValueAtTime(humanIntonation + attackTensionSpike, now);
    source.detune.linearRampToValueAtTime(humanIntonation, now + 0.038);

    const gainNode = ctx.createGain();
    const env = INSTRUMENT_ENVELOPES[chosenInst] || INSTRUMENT_ENVELOPES.nylon;
    const peakVolume = Math.min(1.2, Math.max(0.1, velocity * (isMuted ? 0.35 : 0.95)));

    // Natural attack & smooth acoustic decay with setTargetAtTime
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(peakVolume, now + env.attackSec);

    if (isMuted) {
      gainNode.gain.setTargetAtTime(0.0001, now + env.attackSec, 0.035);
    } else {
      // Natural chord sustain across full measure
      gainNode.gain.setTargetAtTime(0.0001, now + env.attackSec, env.decaySec * 1.5);
    }

    source.connect(dynamicFilter);
    dynamicFilter.connect(gainNode);
    gainNode.connect(destination);

    // AudioScheduledSourceNode rule: start MUST be called before stop!
    source.start(now);
    source.stop(now + (isMuted ? 0.16 : env.maxHoldSec));

    return true;
  }

  /**
   * Virtuoso Solo Engine:
   * Expressive solo note playing with physical acoustic modeling:
   * - Legato slide (portamento) between consecutive notes
   * - Velocity-dependent dynamic timber tracking filter
   * - Initial tension spike & human micro-intonation drift
   * - Instrument-specific natural release damping
   * - Subtle delayed vibrato
   */
  public playSoloNote(
    midiNote: number,
    time?: number,
    velocity: number = 0.9,
    destination?: AudioNode,
    instrument?: AcousticInstrumentType,
    withGraceNote: boolean = false
  ): boolean {
    if (!this.ctx || midiNote < 0) return false;

    const chosenInst = instrument ?? this.currentSoloInstrument;
    const ctx = this.ctx;
    const now = Math.max(time ?? ctx.currentTime, ctx.currentTime);
    const dest = destination ?? ctx.destination;

    const env = INSTRUMENT_ENVELOPES[chosenInst] || INSTRUMENT_ENVELOPES.violin;

    // 1. Virtuoso Grace Note (Çarpma süslemesi):
    if (withGraceNote) {
      const graceMidi = midiNote - (Math.random() > 0.5 ? 2 : 1);
      const graceName = midiToNoteName(graceMidi);
      const graceBuf = this.sampleBuffers[chosenInst].get(graceName);
      if (graceBuf) {
        const gSource = ctx.createBufferSource();
        gSource.buffer = graceBuf;
        const gGain = ctx.createGain();
        gGain.gain.setValueAtTime(velocity * 0.55, now);
        gGain.gain.setTargetAtTime(0.0001, now, 0.025);
        gSource.connect(gGain);
        gGain.connect(dest);
        gSource.start(now);
        gSource.stop(now + 0.06);
      }
    }

    // 2. Main Solo Note
    const mainStartTime = withGraceNote ? now + 0.025 : now;
    const noteName = midiToNoteName(midiNote);
    const buffer = this.sampleBuffers[chosenInst].get(noteName);

    if (!buffer) {
      this.decodeSingleNote(noteName, chosenInst);
      return false;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // 3. Legato Portamento / Slide Detection
    const isLegato = (now - this.lastSoloTime) < 0.22 && this.lastSoloMidi > 0 && Math.abs(midiNote - this.lastSoloMidi) <= 4;
    const legatoPitchDelta = isLegato ? (this.lastSoloMidi - midiNote) * 100 : 0;
    this.lastSoloMidi = midiNote;
    this.lastSoloTime = now;

    // 4. Dynamic Velocity-to-Timbre Tracking Filter
    const dynamicFilter = ctx.createBiquadFilter();
    dynamicFilter.type = 'lowpass';
    const cutoff = 2400 + Math.pow(velocity, 2) * 15500;
    dynamicFilter.frequency.setValueAtTime(cutoff, mainStartTime);
    dynamicFilter.Q.setValueAtTime(0.75, mainStartTime);

    // Initial pitch with legato slide if moving close in pitch
    if (isLegato && Math.abs(legatoPitchDelta) > 10) {
      source.detune.setValueAtTime(legatoPitchDelta, mainStartTime);
      source.detune.linearRampToValueAtTime(0, mainStartTime + 0.038); // 38ms smooth slide
    } else {
      const humanIntonation = (Math.random() - 0.5) * 5.0;
      const attackSpike = velocity > 0.8 ? (velocity - 0.8) * 18.0 : 0;
      source.detune.setValueAtTime(humanIntonation + attackSpike, mainStartTime);
      source.detune.linearRampToValueAtTime(humanIntonation, mainStartTime + 0.04);
    }

    const gainNode = ctx.createGain();
    const peakVolume = Math.min(1.2, Math.max(0.1, velocity * 0.95));

    // Natural sustained attack & acoustic decay curve
    gainNode.gain.setValueAtTime(0.0001, mainStartTime);
    gainNode.gain.linearRampToValueAtTime(peakVolume, mainStartTime + env.attackSec);
    gainNode.gain.setTargetAtTime(0.0001, mainStartTime + env.attackSec, env.decaySec * 1.8);

    // 5. Subtle Delayed Acoustic Vibrato for wind & strings
    if (chosenInst === 'violin' || chosenInst === 'clarinet' || chosenInst === 'alto_sax' || chosenInst === 'harmonica') {
      try {
        const vibratoRate = chosenInst === 'violin' ? 5.2 : chosenInst === 'harmonica' ? 6.0 : 4.8;
        const vibratoDepth = chosenInst === 'violin' ? 12 : chosenInst === 'harmonica' ? 10 : 8; // cents

        const vibratoLfo = ctx.createOscillator();
        vibratoLfo.frequency.setValueAtTime(vibratoRate, mainStartTime);

        const vibratoGain = ctx.createGain();
        // Delay vibrato onset by 140ms so note starts clean and warms up naturally!
        vibratoGain.gain.setValueAtTime(0, mainStartTime);
        vibratoGain.gain.setValueAtTime(0, mainStartTime + 0.14);
        vibratoGain.gain.linearRampToValueAtTime(vibratoDepth, mainStartTime + 0.35);

        vibratoLfo.connect(vibratoGain);
        vibratoGain.connect(source.detune);

        vibratoLfo.start(mainStartTime);
        vibratoLfo.stop(mainStartTime + env.maxHoldSec + 0.05);
      } catch {
        // Vibrato fallback
      }
    }

    source.connect(dynamicFilter);
    dynamicFilter.connect(gainNode);
    gainNode.connect(dest);

    source.start(mainStartTime);
    source.stop(mainStartTime + env.maxHoldSec + 0.05);

    // Track active voice without choking previous notes aggressively
    this.activeSoloVoices.push({
      midi: midiNote,
      source,
      gainNode,
      instrument: chosenInst,
      stopTime: mainStartTime + env.maxHoldSec
    });

    if (this.activeSoloVoices.length > 8) {
      const oldest = this.activeSoloVoices.shift();
      try {
        oldest?.gainNode.gain.setTargetAtTime(0.0001, now, 0.04);
      } catch {}
    }

    return true;
  }
}

export const sampledGuitarEngine = new SampledGuitarEngine();
