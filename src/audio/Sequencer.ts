import { audioEngine } from './AudioEngine';
import { strumEngine } from './StrumEngine';
import { GUITAR_CHORDS } from '../config/chords';
import { STRUM_PATTERNS } from '../config/patterns';
import { StrumBeat, SongSection } from '../types';

export interface RecordedSoloNote {
  id: string;
  midi: number;
  sectionIndex: number;
  barIndex: number; // bar index in current section
  step: number;     // 0 to 15
  velocity: number;
}

export interface SequencerState {
  isPlaying: boolean;
  bpm: number;
  currentSectionIndex: number;
  currentChordIndex: number;
  currentStep: number;
  currentBeat: StrumBeat | null;
  recordedSoloCount: number;
  currentRepeat: number;
  autoAdvanceSections: boolean;
  isGuitarMuted: boolean;
  isPercussionMuted: boolean;
  isSoloMuted: boolean;
}

export const DEFAULT_SONG_SECTIONS: SongSection[] = [
  {
    id: 'intro',
    name: 'Giriş (Intro)',
    chords: ['Am', 'Dm'],
    patternId: 'fingerpicking-travis',
    repeats: 2,
    color: 'from-blue-600 to-cyan-700'
  },
  {
    id: 'verse',
    name: 'Söz (Verse)',
    chords: ['Am', 'Dm', 'E', 'Am'],
    patternId: 'percussive-groove',
    repeats: 2,
    color: 'from-emerald-600 to-teal-700'
  },
  {
    id: 'chorus',
    name: 'Nakarat (Chorus)',
    chords: ['F', 'G', 'C', 'Am'],
    patternId: 'folk-rock',
    repeats: 4,
    color: 'from-amber-600 to-orange-700'
  },
  {
    id: 'solo',
    name: 'Solo & Köprü',
    chords: ['Dm', 'G', 'E7', 'Am'],
    patternId: 'rumba-spanish',
    repeats: 2,
    color: 'from-purple-600 to-pink-700'
  }
];

export class SongSequencer {
  private isRunning: boolean = false;
  private bpm: number = 104;
  private humanize: boolean = true;
  private swing: number = 0.0;

  // Sections (Kısımlar / Scenes)
  private sections: SongSection[] = [...DEFAULT_SONG_SECTIONS];
  private currentSectionIndex: number = 0;
  private autoAdvanceSections: boolean = true; // Song Chain mode
  private currentRepeat: number = 0;

  // Track Mute Controls
  private isGuitarMuted: boolean = false;
  private percussionEnabled: boolean = true;
  private percussionVolume: number = 0.8;
  private isSoloMuted: boolean = false;

  // Solo Looper / Recorded Notes
  private recordedSoloNotes: RecordedSoloNote[] = [];
  private isRecordingSolo: boolean = false;

  // Scheduling state
  private timerId: number | null = null;
  private lookaheadMs: number = 25.0;
  private scheduleAheadSec: number = 0.12;
  private nextStepTime: number = 0.0;
  private currentStep: number = 0; // 0 to 15
  private currentChordIndex: number = 0;

  // Listeners
  private onStepListeners: ((state: SequencerState) => void)[] = [];
  private onStringPluckListeners: ((stringIndex: number, fret: number) => void)[] = [];

  public start(): void {
    if (this.isRunning) return;
    const ctx = audioEngine.getContext();
    audioEngine.unlock();

    this.isRunning = true;
    this.currentStep = 0;
    this.currentChordIndex = 0;
    this.currentRepeat = 0;
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
    this.currentRepeat = 0;
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

  public getIsPlaying(): boolean {
    return this.isRunning;
  }

  public setBpm(newBpm: number): void {
    this.bpm = Math.max(40, Math.min(220, newBpm));
  }

  public getBpm(): number {
    return this.bpm;
  }

  public setSwing(val: number): void {
    this.swing = Math.max(0, Math.min(0.4, val));
  }

  public setHumanize(val: boolean): void {
    this.humanize = val;
  }

  // Sections management
  public getSections(): SongSection[] {
    return this.sections;
  }

  public setSections(sections: SongSection[]): void {
    if (sections.length > 0) {
      this.sections = [...sections];
      if (this.currentSectionIndex >= this.sections.length) {
        this.currentSectionIndex = 0;
      }
    }
  }

  public getCurrentSection(): SongSection {
    return this.sections[this.currentSectionIndex] || this.sections[0];
  }

  public setSectionIndex(index: number): void {
    if (index >= 0 && index < this.sections.length) {
      this.currentSectionIndex = index;
      this.currentChordIndex = 0;
      this.currentRepeat = 0;
    }
  }

  public setAutoAdvanceSections(advance: boolean): void {
    this.autoAdvanceSections = advance;
  }

  public getAutoAdvanceSections(): boolean {
    return this.autoAdvanceSections;
  }

  public updateCurrentSectionChords(newChords: string[]): void {
    if (newChords.length > 0) {
      const section = this.getCurrentSection();
      section.chords = [...newChords];
      if (this.currentChordIndex >= section.chords.length) {
        this.currentChordIndex = 0;
      }
    }
  }

  // Track Mutes
  public setGuitarMuted(muted: boolean): void {
    this.isGuitarMuted = muted;
  }

  public getGuitarMuted(): boolean {
    return this.isGuitarMuted;
  }

  public setPercussionEnabled(enabled: boolean): void {
    this.percussionEnabled = enabled;
  }

  public getPercussionEnabled(): boolean {
    return this.percussionEnabled;
  }

  public setPercussionVolume(vol: number): void {
    this.percussionVolume = vol;
    audioEngine.percussion?.setVolume(vol);
  }

  public getPercussionVolume(): number {
    return this.percussionVolume;
  }

  public setSoloMuted(muted: boolean): void {
    this.isSoloMuted = muted;
  }

  public getSoloMuted(): boolean {
    return this.isSoloMuted;
  }

  // Solo Looper
  public setIsRecordingSolo(recording: boolean): void {
    this.isRecordingSolo = recording;
  }

  public getIsRecordingSolo(): boolean {
    return this.isRecordingSolo;
  }

  public addSoloNote(midi: number, velocity: number = 0.9): void {
    if (!this.isRunning || !this.isRecordingSolo) return;
    this.recordedSoloNotes.push({
      id: `${Date.now()}-${Math.random()}`,
      midi,
      sectionIndex: this.currentSectionIndex,
      barIndex: this.currentChordIndex,
      step: this.currentStep,
      velocity
    });
  }

  public clearSolo(): void {
    this.recordedSoloNotes = [];
  }

  public getSoloCount(): number {
    return this.recordedSoloNotes.length;
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
    while (this.nextStepTime < ctx.currentTime + this.scheduleAheadSec) {
      this.scheduleStep(this.currentSectionIndex, this.currentChordIndex, this.currentStep, this.nextStepTime);
      this.advanceStep();
    }
  }

  private scheduleStep(sectionIdx: number, barIdx: number, step: number, time: number): void {
    const section = this.sections[sectionIdx] || this.sections[0];
    const pattern = STRUM_PATTERNS[section.patternId] || STRUM_PATTERNS['folk-rock'];
    const beat = pattern.beats.find((b) => b.step === step);

    // 1. Acoustic Guitar Riff & Strumming
    if (!this.isGuitarMuted && beat && beat.type !== 'rest') {
      const chordId = section.chords[barIdx] || 'Am';
      const chord = GUITAR_CHORDS[chordId] || GUITAR_CHORDS['Am'];

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

    // 2. 100% Organic Acoustic Percussion
    if (this.percussionEnabled && audioEngine.percussion) {
      if (step === 0) {
        audioEngine.percussion.playCajonBass(time, 0.95);
      } else if (step === 4) {
        audioEngine.percussion.playCajonSlap(time, 0.85);
        audioEngine.percussion.playTambourine(time, 0.65);
      } else if (step === 8) {
        audioEngine.percussion.playCajonBass(time, 0.85);
      } else if (step === 12) {
        audioEngine.percussion.playCajonSlap(time, 0.9);
        audioEngine.percussion.playTambourine(time, 0.75);
      }

      if (step % 2 === 0) {
        const isAccent = step % 4 === 0;
        audioEngine.percussion.playShaker(time, isAccent ? 0.45 : 0.25, isAccent);
      }
    }

    // 3. Playback of Recorded Solo Loop Notes
    if (!this.isSoloMuted && this.recordedSoloNotes.length > 0) {
      const matchingNotes = this.recordedSoloNotes.filter(
        (n) => n.sectionIndex === sectionIdx && n.barIndex === barIdx && n.step === step
      );
      matchingNotes.forEach((n) => {
        audioEngine.playSoloMidiNote(n.midi, time, n.velocity);
      });
    }

    // UI sync
    const ctx = audioEngine.getContext();
    const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
    setTimeout(() => {
      if (this.isRunning) {
        this.notifyStep(beat || null);
      }
    }, delayMs);
  }

  private advanceStep(): void {
    const secondsPer16th = 60.0 / this.bpm / 4.0;
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
    if (this.currentStep >= 16) {
      this.currentStep = 0;
      const section = this.getCurrentSection();
      const nextChordIdx = this.currentChordIndex + 1;

      if (nextChordIdx >= section.chords.length) {
        this.currentRepeat++;

        // Check if section repeats completed
        if (this.autoAdvanceSections && this.currentRepeat >= section.repeats) {
          // Advance to NEXT SECTION (Song Chain Mode)
          this.currentRepeat = 0;
          this.currentChordIndex = 0;
          this.currentSectionIndex = (this.currentSectionIndex + 1) % this.sections.length;
        } else {
          // Loop current section
          this.currentChordIndex = 0;
        }
      } else {
        this.currentChordIndex = nextChordIdx;
      }
    }
  }

  private notifyStep(beat: StrumBeat | null): void {
    const state: SequencerState = {
      isPlaying: this.isRunning,
      bpm: this.bpm,
      currentSectionIndex: this.currentSectionIndex,
      currentChordIndex: this.currentChordIndex,
      currentStep: this.currentStep,
      currentBeat: beat,
      recordedSoloCount: this.recordedSoloNotes.length,
      currentRepeat: this.currentRepeat,
      autoAdvanceSections: this.autoAdvanceSections,
      isGuitarMuted: this.isGuitarMuted,
      isPercussionMuted: !this.percussionEnabled,
      isSoloMuted: this.isSoloMuted
    };
    this.onStepListeners.forEach((l) => l(state));
  }
}

export const songSequencer = new SongSequencer();
