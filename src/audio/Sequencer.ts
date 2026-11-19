import { audioEngine } from './AudioEngine';
import { strumEngine } from './StrumEngine';
import { GUITAR_CHORDS } from '../config/chords';
import { STRUM_PATTERNS } from '../config/patterns';
import { StrumBeat } from '../types';

export interface SequencerState {
  isPlaying: boolean;
  bpm: number;
  currentChordIndex: number;
  currentStep: number;
  currentBeat: StrumBeat | null;
}

export class SongSequencer {
  private isRunning: boolean = false;
  private bpm: number = 104;
  private chords: string[] = ['C', 'G', 'Am', 'F'];
  private patternId: string = 'folk-rock';
  private humanize: boolean = true;
  private swing: number = 0.0; // 0.0 to 0.5 (swing feel)

  // Scheduling state
  private timerId: number | null = null;
  private lookaheadMs: number = 25.0; // How frequently to call scheduling function (in ms)
  private scheduleAheadSec: number = 0.12; // How far ahead to schedule audio (in sec)
  private nextStepTime: number = 0.0; // When the next step is due
  private currentStep: number = 0; // 0 to 15 (16th notes per bar)
  private currentChordIndex: number = 0;

  // Listeners for UI state
  private onStepListeners: ((state: SequencerState) => void)[] = [];
  private onStringPluckListeners: ((stringIndex: number, fret: number) => void)[] = [];

  public start(): void {
    if (this.isRunning) return;
    const ctx = audioEngine.getContext();
    audioEngine.unlock();

    this.isRunning = true;
    this.currentStep = 0;
    this.currentChordIndex = 0;
    this.nextStepTime = ctx.currentTime + 0.05;

    this.timerId = window.setInterval(() => this.scheduler(), this.lookaheadMs);
    this.notifyStep(null);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.currentStep = 0;
    this.notifyStep(null);
  }

  public toggle(): boolean {
    if (this.isRunning) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public setBpm(newBpm: number): void {
    this.bpm = Math.max(40, Math.min(220, newBpm));
  }

  public getBpm(): number {
    return this.bpm;
  }

  public setChords(chords: string[]): void {
    if (chords.length > 0) {
      this.chords = [...chords];
      if (this.currentChordIndex >= this.chords.length) {
        this.currentChordIndex = 0;
      }
    }
  }

  public setPattern(patternId: string): void {
    if (STRUM_PATTERNS[patternId]) {
      this.patternId = patternId;
    }
  }

  public setSwing(val: number): void {
    this.swing = Math.max(0, Math.min(0.4, val));
  }

  public setHumanize(val: boolean): void {
    this.humanize = val;
  }

  public onStep(listener: (state: SequencerState) => void): () => void {
    this.onStepListeners.push(listener);
    return () => {
      this.onStepListeners = this.onStepListeners.filter((l) => l !== listener);
    };
  }

  public onStringPluck(listener: (stringIndex: number, fret: number) => void): () => void {
    this.onStringPluckListeners.push(listener);
    return () => {
      this.onStringPluckListeners = this.onStringPluckListeners.filter((l) => l !== listener);
    };
  }

  private scheduler(): void {
    const ctx = audioEngine.getContext();
    // While there are notes that will need to play before the next interval,
    // schedule them and advance the pointer.
    while (this.nextStepTime < ctx.currentTime + this.scheduleAheadSec) {
      this.scheduleStep(this.currentStep, this.nextStepTime);
      this.advanceStep();
    }
  }

  private scheduleStep(step: number, time: number): void {
    const pattern = STRUM_PATTERNS[this.patternId] || STRUM_PATTERNS['folk-rock'];
    const beat = pattern.beats.find((b) => b.step === step);

    if (beat && beat.type !== 'rest') {
      const chordId = this.chords[this.currentChordIndex];
      const chord = GUITAR_CHORDS[chordId] || GUITAR_CHORDS['C'];

      strumEngine.strumChord(chord, {
        stroke: beat.type,
        velocity: beat.velocity,
        time: time,
        humanize: this.humanize,
        onStringPlucked: (s, f) => {
          this.onStringPluckListeners.forEach((l) => l(s, f));
        }
      });
    }

    // Schedule UI callback at the exact time
    const ctx = audioEngine.getContext();
    const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
    setTimeout(() => {
      if (this.isRunning) {
        this.notifyStep(beat || null);
      }
    }, delayMs);
  }

  private advanceStep(): void {
    // 16th note duration = 60 / BPM / 4
    const secondsPer16th = 60.0 / this.bpm / 4.0;

    // Apply swing on off-beat 16ths (odd steps)
    let stepDuration = secondsPer16th;
    if (this.swing > 0) {
      if (this.currentStep % 2 === 0) {
        stepDuration += secondsPer16th * this.swing;
      } else {
        stepDuration -= secondsPer16th * this.swing;
      }
    }

    this.nextStepTime += stepDuration;

    this.currentStep++;
    // 16 steps per bar
    if (this.currentStep >= 16) {
      this.currentStep = 0;
      this.currentChordIndex = (this.currentChordIndex + 1) % this.chords.length;
    }
  }

  private notifyStep(beat: StrumBeat | null): void {
    const state: SequencerState = {
      isPlaying: this.isRunning,
      bpm: this.bpm,
      currentChordIndex: this.currentChordIndex,
      currentStep: this.currentStep,
      currentBeat: beat
    };
    this.onStepListeners.forEach((l) => l(state));
  }
}

export const songSequencer = new SongSequencer();
