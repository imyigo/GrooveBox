/**
 * Real Acoustic Sampled Multi-Instrument Engine
 * Supports Warm Nylon Guitar, Steel Dreadnought, and Acoustic Bass
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

export type AcousticInstrumentType = 'nylon' | 'steel' | 'bass';

export class SampledGuitarEngine {
  private ctx: AudioContext | null = null;
  private currentChordInstrument: AcousticInstrumentType = 'nylon';
  private currentSoloInstrument: AcousticInstrumentType = 'steel';

  // Cache buffers for each instrument type
  private sampleBuffers: Record<AcousticInstrumentType, Map<string, AudioBuffer>> = {
    nylon: new Map(),
    steel: new Map(),
    bass: new Map()
  };

  private sampleRawData: Record<AcousticInstrumentType, Record<string, string> | null> = {
    nylon: null,
    steel: null,
    bass: null
  };

  private isLoaded: boolean = false;
  private loadProgress: number = 0;
  private onProgressListeners: ((progress: number, isLoaded: boolean) => void)[] = [];

  public init(ctx: AudioContext): void {
    this.ctx = ctx;
    this.loadSamples('nylon');
    this.loadSamples('steel');
    this.loadSamples('bass');
  }

  public setChordInstrument(type: AcousticInstrumentType): void {
    this.currentChordInstrument = type;
    if (this.sampleBuffers[type].size === 0) {
      this.loadSamples(type);
    }
  }

  public getChordInstrument(): AcousticInstrumentType {
    return this.currentChordInstrument;
  }

  public setSoloInstrument(type: AcousticInstrumentType): void {
    this.currentSoloInstrument = type;
    if (this.sampleBuffers[type].size === 0) {
      this.loadSamples(type);
    }
  }

  public getSoloInstrument(): AcousticInstrumentType {
    return this.currentSoloInstrument;
  }

  public onProgress(listener: (progress: number, isLoaded: boolean) => void): () => void {
    this.onProgressListeners.push(listener);
    listener(this.loadProgress, this.isLoaded);
    return () => {
      this.onProgressListeners = this.onProgressListeners.filter((l) => l !== listener);
    };
  }

  public getIsLoaded(): boolean {
    return this.isLoaded;
  }

  public getLoadProgress(): number {
    return this.loadProgress;
  }

  private notifyProgress(): void {
    this.onProgressListeners.forEach((l) => l(this.loadProgress, this.isLoaded));
  }

  public async loadSamples(type: AcousticInstrumentType): Promise<void> {
    if (this.sampleBuffers[type].size > 20) return;

    try {
      const fileMap: Record<AcousticInstrumentType, string> = {
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
        return type === 'bass' ? oct >= 1 && oct <= 4 : oct >= 2 && oct <= 5;
      });

      let decoded = 0;
      for (const k of priorityKeys) {
        await this.decodeSingleNote(k, type);
        decoded++;
        this.loadProgress = Math.min(100, Math.round((decoded / priorityKeys.length) * 100));
        this.notifyProgress();
      }

      this.isLoaded = true;
      this.loadProgress = 100;
      this.notifyProgress();

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
      const sustainTime = chosenInst === 'bass' ? 2.5 : 1.5;
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
