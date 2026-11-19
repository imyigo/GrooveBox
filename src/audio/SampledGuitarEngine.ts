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
  | 'bass';

export interface InstrumentMeta {
  id: AcousticInstrumentType;
  name: string;
  category: 'strings' | 'woodwind' | 'brass' | 'reed' | 'guitar' | 'bass';
  icon: string;
  defaultOctave: number;
}

export const INSTRUMENT_METAS: Record<AcousticInstrumentType, InstrumentMeta> = {
  violin: { id: 'violin', name: 'Keman', category: 'strings', icon: '🎻', defaultOctave: 4 },
  clarinet: { id: 'clarinet', name: 'Klarnet', category: 'woodwind', icon: '🎷', defaultOctave: 4 },
  alto_sax: { id: 'alto_sax', name: 'Saksafon', category: 'brass', icon: '🎷', defaultOctave: 3 },
  harmonica: { id: 'harmonica', name: 'Mızıka', category: 'reed', icon: '🪗', defaultOctave: 4 },
  nylon: { id: 'nylon', name: 'Sıcak Naylon', category: 'guitar', icon: '🎸', defaultOctave: 3 },
  steel: { id: 'steel', name: 'Çelik Akustik', category: 'guitar', icon: '🎸', defaultOctave: 3 },
  bass: { id: 'bass', name: 'Akustik Bas', category: 'bass', icon: '🎻', defaultOctave: 2 }
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
    bass: new Map()
  };

  private sampleRawData: Record<AcousticInstrumentType, Record<string, string> | null> = {
    violin: null,
    clarinet: null,
    alto_sax: null,
    harmonica: null,
    nylon: null,
    steel: null,
    bass: null
  };

  private loadProgress: number = 0;
  private onProgressListeners: ((progress: number, isLoaded: boolean) => void)[] = [];

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
    if (this.sampleBuffers[type].size > 20) return;

    try {
      const fileMap: Record<AcousticInstrumentType, string> = {
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
   * Plays a real recorded note on the chosen instrument
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

    const gainNode = ctx.createGain();
    const peakVolume = Math.min(1.2, velocity * (isMuted ? 0.45 : 0.95));
    gainNode.gain.setValueAtTime(peakVolume, now);

    if (isMuted) {
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    } else {
      const sustainTime = chosenInst === 'violin' || chosenInst === 'clarinet' ? 2.0 : 1.4;
      gainNode.gain.setValueAtTime(peakVolume, now + sustainTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + buffer.duration);
    }

    source.connect(gainNode);
    gainNode.connect(destination);

    source.start(now);
    source.stop(now + (isMuted ? 0.2 : buffer.duration));

    return true;
  }
}

export const sampledGuitarEngine = new SampledGuitarEngine();
