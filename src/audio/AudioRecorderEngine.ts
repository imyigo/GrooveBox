/**
 * Web Audio Microphone Recorder Engine
 * Captures live vocal or instrument audio from the user's microphone,
 * decodes into AudioBuffer, and plays back synchronized with the DAW timeline.
 */

export interface RecordedVocalTake {
  id: string;
  blob: Blob;
  url: string;
  buffer: AudioBuffer | null;
  durationSec: number;
  startBar: number;
  volume: number;
  isMuted: boolean;
}

export class AudioRecorderEngine {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private isRecording: boolean = false;
  private currentVocalTake: RecordedVocalTake | null = null;
  private activeSourceNode: AudioBufferSourceNode | null = null;
  private vocalGainNode: GainNode | null = null;
  private listeners: ((take: RecordedVocalTake | null, isRecording: boolean) => void)[] = [];

  public async startRecording(startBar: number = 0): Promise<boolean> {
    if (this.isRecording) return false;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(this.stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Decode into AudioBuffer
        let decodedBuffer: AudioBuffer | null = null;
        try {
          const arrayBuffer = await audioBlob.arrayBuffer();
          const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        } catch (e) {
          console.warn('Could not decode recorded vocal audio:', e);
        }

        this.currentVocalTake = {
          id: `take_${Date.now()}`,
          blob: audioBlob,
          url: audioUrl,
          buffer: decodedBuffer,
          durationSec: decodedBuffer ? decodedBuffer.duration : 0,
          startBar,
          volume: 0.95,
          isMuted: false
        };

        this.notify();
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      this.notify();
      return true;
    } catch (err) {
      console.warn('Microphone access denied or error:', err);
      return false;
    }
  }

  public stopRecording(): void {
    if (!this.isRecording || !this.mediaRecorder) return;
    this.isRecording = false;
    this.mediaRecorder.stop();
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.notify();
  }

  public playVocal(ctx: AudioContext, destination: AudioNode, startTime: number = 0, offset: number = 0): void {
    if (!this.currentVocalTake || !this.currentVocalTake.buffer || this.currentVocalTake.isMuted) return;

    this.stopPlayback();

    const source = ctx.createBufferSource();
    source.buffer = this.currentVocalTake.buffer;

    this.vocalGainNode = ctx.createGain();
    this.vocalGainNode.gain.setValueAtTime(this.currentVocalTake.volume, startTime);

    source.connect(this.vocalGainNode);
    this.vocalGainNode.connect(destination);

    source.start(startTime, offset);
    this.activeSourceNode = source;
  }

  public stopPlayback(): void {
    if (this.activeSourceNode) {
      try {
        this.activeSourceNode.stop();
        this.activeSourceNode.disconnect();
      } catch {
        // Ignored
      }
      this.activeSourceNode = null;
    }
  }

  public setVocalVolume(vol: number): void {
    if (this.currentVocalTake) {
      this.currentVocalTake.volume = Math.max(0, Math.min(1.5, vol));
    }
    if (this.vocalGainNode) {
      this.vocalGainNode.gain.value = vol;
    }
  }

  public setVocalMuted(muted: boolean): void {
    if (this.currentVocalTake) {
      this.currentVocalTake.isMuted = muted;
    }
    if (muted) {
      this.stopPlayback();
    }
  }

  public deleteTake(): void {
    this.stopPlayback();
    if (this.currentVocalTake?.url) {
      URL.revokeObjectURL(this.currentVocalTake.url);
    }
    this.currentVocalTake = null;
    this.notify();
  }

  public getVocalTake(): RecordedVocalTake | null {
    return this.currentVocalTake;
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  public subscribe(listener: (take: RecordedVocalTake | null, isRecording: boolean) => void): () => void {
    this.listeners.push(listener);
    listener(this.currentVocalTake, this.isRecording);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l(this.currentVocalTake, this.isRecording));
  }
}

export const audioRecorder = new AudioRecorderEngine();
