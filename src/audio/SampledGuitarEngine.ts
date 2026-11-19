/**
 * Real Acoustic Guitar Sampled Engine
 * Loads and plays genuine studio-recorded acoustic steel guitar samples
 * for every string and fret.
 */

const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export function midiToNoteName(midi: number): string {
  const name = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

// Base MIDI numbers for guitar strings (0 = Low E ... 5 = High E)
export const STRING_BASE_MIDI = [40, 45, 50, 55, 59, 64];

export function getGuitarMidi(stringIndex: number, fret: number): number {
  if (fret < 0) return -1;
  return STRING_BASE_MIDI[stringIndex] + fret;
}

export class SampledGuitarEngine {
  private ctx: AudioContext | null = null;
  private sampleBuffers: Map<string, AudioBuffer> = new Map();
  private sampleRawData: Record<string, string> | null = null;
  private isLoading: boolean = false;
  private isLoaded: boolean = false;
  private loadProgress: number = 0; // 0 to 100
  private onProgressListeners: ((progress: number, isLoaded: boolean) => void)[] = [];

  public init(ctx: AudioContext): void {
    this.ctx = ctx;
    this.loadSamples();
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

  /**
   * Fetches JSON of base64 MP3s and decodes priority guitar range first
   */
  public async loadSamples(): Promise<void> {
    if (this.isLoading || this.isLoaded) return;
    this.isLoading = true;

    try {
      const res = await fetch('/samples/acoustic_guitar_steel.json');
      if (!res.ok) throw new Error('Failed to load sample bank');
      this.sampleRawData = await res.json();

      if (!this.sampleRawData) return;

      const allKeys = Object.keys(this.sampleRawData);
      const totalKeys = allKeys.length;

      // Priority notes: guitar playing range E2 (40) to E5 (76)
      const priorityKeys = allKeys.filter((key) => {
        const octave = parseInt(key.slice(-1), 10);
        return octave >= 2 && octave <= 5;
      });

      // Decode priority notes first so user can play immediately
      let decodedCount = 0;

      for (const key of priorityKeys) {
        await this.decodeSingleNote(key);
        decodedCount++;
        this.loadProgress = Math.min(100, Math.round((decodedCount / totalKeys) * 100));
        this.notifyProgress();
      }

      this.isLoaded = true;
      this.isLoading = false;
      this.loadProgress = 100;
      this.notifyProgress();

      // Decode remainder in background
      const otherKeys = allKeys.filter((k) => !priorityKeys.includes(k));
      for (const key of otherKeys) {
        this.decodeSingleNote(key).catch(() => {});
      }
    } catch (err) {
      console.warn('Real acoustic sample loading fallback:', err);
      this.isLoading = false;
    }
  }

  private async decodeSingleNote(noteName: string): Promise<AudioBuffer | null> {
    if (this.sampleBuffers.has(noteName)) {
      return this.sampleBuffers.get(noteName)!;
    }

    if (!this.sampleRawData || !this.sampleRawData[noteName] || !this.ctx) {
      return null;
    }

    try {
      const dataUrl = this.sampleRawData[noteName];
      const base64 = dataUrl.split(',')[1] || dataUrl;
      const binaryString = window.atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBuffer = await this.ctx.decodeAudioData(bytes.buffer.slice(0));
      this.sampleBuffers.set(noteName, audioBuffer);
      return audioBuffer;
    } catch (e) {
      return null;
    }
  }

  /**
   * Plays a real recorded studio acoustic guitar note
   */
  public playNote(
    midiNote: number,
    time: number,
    velocity: number = 0.85,
    destination: AudioNode,
    isMuted: boolean = false
  ): boolean {
    if (!this.ctx || midiNote < 0) return false;

    const noteName = midiToNoteName(midiNote);
    const buffer = this.sampleBuffers.get(noteName);

    if (!buffer) {
      // If exact note not loaded yet, try to decode or return false for fallback
      this.decodeSingleNote(noteName);
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
      // Palm mute: fast decay
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    } else {
      // Real natural acoustic guitar sustain decay
      gainNode.gain.setValueAtTime(peakVolume, now + 1.2);
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
