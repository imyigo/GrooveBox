import { AcousticInstrumentType } from "./SampledGuitarEngine";
import { audioEngine } from "./AudioEngine";
import { strumEngine } from "./StrumEngine";
import { GUITAR_CHORDS } from "../config/chords";
import { STRUM_PATTERNS } from "../config/patterns";
import { StrumBeat, SongSection, SoloHarmonyMode } from "../types";

export interface RecordedSoloNote {
  id: string;
  midi: number;
  sectionIndex: number;
  sectionId?: string;
  instrument?: AcousticInstrumentType;
  harmonyMode?: SoloHarmonyMode;
  gridLane?: number;
  barIndex: number; // bar index in current section
  step: number; // 0 to 15
  velocity: number;
}

export interface SequencerState {
  isPlaying: boolean;
  bpm: number;
  currentSectionIndex: number;
  queuedSectionIndex: number | null;
  currentChordIndex: number;
  currentStep: number;
  currentBeat: StrumBeat | null;
  recordedSoloCount: number;
  currentRepeat: number;
  autoAdvanceSections: boolean;
  isGuitarMuted: boolean;
  isPercussionMuted: boolean;
  isSoloMuted: boolean;
  isRecording: boolean;
  recordingTrack: "solo" | "drums";
  countInBeat: number | null;
}

export const DEFAULT_SONG_SECTIONS: SongSection[] = [
  {
    id: "intro",
    name: "Giriş (Intro)",
    chords: ["Am", "Dm"],
    patternId: "fingerpicking-travis",
    repeats: 2,
    color: "from-blue-600 to-cyan-700",
    drumMode: "shaker-only",
  },
  {
    id: "verse",
    name: "Söz (Verse)",
    chords: ["Am", "Dm", "Em", "Am"],
    patternId: "percussive-groove",
    repeats: 2,
    color: "from-emerald-600 to-teal-700",
    drumMode: "cajon-shaker",
  },
  {
    id: "chorus",
    name: "Nakarat (Chorus)",
    chords: ["F", "G", "C", "Am"],
    patternId: "folk-rock",
    repeats: 4,
    color: "from-amber-600 to-orange-700",
    drumMode: "full",
  },
  {
    id: "solo",
    name: "Solo & Köprü",
    chords: ["Dm", "G", "Em", "Am"],
    patternId: "rumba-spanish",
    repeats: 2,
    color: "from-purple-600 to-pink-700",
    drumMode: "flamenco",
  },
];

export class SongSequencer {
  private isRunning: boolean = false;
  private bpm: number = 104;
  private humanize: boolean = true;
  private swing: number = 0.0;

  // Sections (Kısımlar / Scenes)
  private sections: SongSection[] = [...DEFAULT_SONG_SECTIONS];
  private currentSectionIndex: number = 0;
  private queuedSectionIndex: number | null = null;
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
  private recordingTrack: "solo" | "drums" = "solo";

  // Scheduling state
  private timerId: number | null = null;
  private lookaheadMs: number = 25.0;
  private scheduleAheadSec: number = 0.12;
  private nextStepTime: number = 0.0;
  private currentStep: number = 0; // 0 to 15
  private currentChordIndex: number = 0;
  private backingSeekNeeded = true;
  private metronomeOn = false;
  private countInBars = 0;
  private countInUntil = 0;
  private lastCountBeat = -1;

  public setMetronome(enabled: boolean): void {
    this.metronomeOn = enabled;
  }
  public setCountIn(bars: 0 | 1): void {
    this.countInBars = bars;
  }

  // Listeners
  private generation = 0;
  private uiTimers = new Set<ReturnType<typeof setTimeout>>();
  private audiblePosition = {
    sectionIndex: 0,
    sectionId: "intro",
    barIndex: 0,
    step: 0,
    repeat: 0,
  };
  private noteListeners: (() => void)[] = [];

  public onNotesChanged(listener: () => void): () => void {
    this.noteListeners.push(listener);
    return () => {
      this.noteListeners = this.noteListeners.filter((l) => l !== listener);
    };
  }

  public getRecordedNotes(): RecordedSoloNote[] {
    return this.recordedSoloNotes.map((n) => ({ ...n }));
  }

  public setRecordedNotes(notes: RecordedSoloNote[]): void {
    this.recordedSoloNotes = notes.map((n) => ({
      ...n,
      sectionId: n.sectionId || this.sections[n.sectionIndex]?.id,
    }));
    this.noteListeners.forEach((l) => l());
  }

  private onStepListeners: ((state: SequencerState) => void)[] = [];
  private onStringPluckListeners: ((
    stringIndex: number,
    fret: number,
  ) => void)[] = [];

  public async start(): Promise<void> {
    if (this.isRunning) return;
    const generation = this.generation;
    await audioEngine.unlock();
    await audioEngine.ready(
      this.recordedSoloNotes.flatMap((note) =>
        note.instrument ? [note.instrument] : [],
      ),
    );
    if (generation !== this.generation || this.isRunning) return;
    const ctx = audioEngine.getContext();

    this.isRunning = true;
    this.currentStep = 0;
    this.currentChordIndex = 0;
    this.currentRepeat = 0;
    this.nextStepTime = ctx.currentTime + 0.05;
    this.countInUntil = 0;
    this.lastCountBeat = -1;
    if (this.countInBars) {
      for (let beat = 0; beat < 4; beat++)
        audioEngine.playMetronome(
          this.nextStepTime + (beat * 60) / this.bpm,
          beat === 0,
        );
      this.nextStepTime += 240 / this.bpm;
      this.countInUntil = this.nextStepTime;
    }
    this.backingSeekNeeded = true;
    this.audiblePosition = {
      sectionIndex: this.currentSectionIndex,
      sectionId: this.getCurrentSection().id,
      barIndex: 0,
      step: 0,
      repeat: 0,
    };

    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    this.timerId = window.setInterval(() => this.scheduler(), this.lookaheadMs);
    this.notifyStep(null);
  }

  public stop(): void {
    this.countInUntil = 0;
    if (this.isRunning) {
      const audibleSection = this.sections.findIndex(
        (section) => section.id === this.audiblePosition.sectionId,
      );
      if (audibleSection >= 0) this.currentSectionIndex = audibleSection;
    }
    this.generation++;
    this.isRunning = false;
    this.uiTimers.forEach((timer) => clearTimeout(timer));
    this.uiTimers.clear();
    audioEngine.stopAll();
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.currentStep = 0;
    this.currentChordIndex = 0;
    this.currentRepeat = 0;
    this.notifyStep(null);
  }

  public async toggle(): Promise<boolean> {
    if (this.isRunning) {
      this.stop();
      return false;
    } else {
      await this.start();
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
    if (sections.length === 0) return;
    const selectedId = this.getCurrentSection().id;
    this.sections = sections.map((section) => ({
      ...section,
      chords: [...section.chords],
    }));
    this.currentSectionIndex = Math.max(
      0,
      this.sections.findIndex((section) => section.id === selectedId),
    );
    this.currentChordIndex = Math.min(
      this.currentChordIndex,
      this.getCurrentSection().chords.length - 1,
    );
    this.queuedSectionIndex = null;
    this.recordedSoloNotes = this.recordedSoloNotes
      .filter((n) =>
        this.sections.some(
          (section) =>
            section.id === n.sectionId && n.barIndex < section.chords.length,
        ),
      )
      .map((n) => ({
        ...n,
        sectionIndex: this.sections.findIndex((s) => s.id === n.sectionId),
      }));
    this.noteListeners.forEach((l) => l());
    this.notifyStep(null);
  }

  public getCurrentSection(): SongSection {
    return this.sections[this.currentSectionIndex] || this.sections[0];
  }

  public setSectionIndex(index: number): void {
    if (index >= 0 && index < this.sections.length) {
      this.currentSectionIndex = index;
      this.queuedSectionIndex = null;
      this.currentChordIndex = 0;
      this.currentRepeat = 0;
      this.notifyStep(null);
    }
  }

  /**
   * Live Scene Launch: Queues the scene to launch cleanly at the next 1st beat of the bar.
   * If instant is true, transitions immediately.
   */
  public queueSection(index: number, instant: boolean = false): void {
    if (index < 0 || index >= this.sections.length) return;
    if (instant || !this.isRunning) {
      this.setSectionIndex(index);
      this.notifyStep(null);
    } else {
      this.queuedSectionIndex = index;
      this.notifyStep(null);
    }
  }

  public getQueuedSectionIndex(): number | null {
    return this.queuedSectionIndex;
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
    if (recording)
      this.recordingTrack =
        audioEngine.getSoloInstrument() === "drums" ? "drums" : "solo";
    this.notifyStep(null);
  }

  public getIsRecordingSolo(): boolean {
    return this.isRecordingSolo;
  }

  public addSoloNote(
    midi: number,
    velocity: number = 0.9,
    harmonyMode?: SoloHarmonyMode,
  ): void {
    if (
      !this.isRunning ||
      !this.isRecordingSolo ||
      this.recordedSoloNotes.length >= 20000
    )
      return;
    if (
      this.countInUntil &&
      audioEngine.getContext().currentTime < this.countInUntil
    )
      return;
    if (
      (audioEngine.getSoloInstrument() === "drums" ? "drums" : "solo") !==
      this.recordingTrack
    )
      return;
    const sectionIndex = this.sections.findIndex(
      (section) => section.id === this.audiblePosition.sectionId,
    );
    if (
      sectionIndex < 0 ||
      this.audiblePosition.barIndex >= this.sections[sectionIndex].chords.length
    )
      return;
    this.recordedSoloNotes.push({
      id: `${Date.now()}-${Math.random()}`,
      midi,
      sectionIndex,
      sectionId: this.audiblePosition.sectionId,
      instrument: audioEngine.getSoloInstrument(),
      barIndex: this.audiblePosition.barIndex,
      step: this.audiblePosition.step,
      velocity,
      ...(harmonyMode ? { harmonyMode } : {}),
    });
    this.noteListeners.forEach((l) => l());
  }

  public clearSolo(scope?: {
    sectionId?: string;
    track: "solo" | "drums";
  }): void {
    this.recordedSoloNotes = scope
      ? this.recordedSoloNotes.filter(
          (note) =>
            (scope.sectionId && note.sectionId !== scope.sectionId) ||
            (note.instrument === "drums" ? "drums" : "solo") !== scope.track,
        )
      : [];
    this.noteListeners.forEach((l) => l());
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

  public onStringPluck(
    listener: (stringIndex: number, fret: number) => void,
  ): () => void {
    this.onStringPluckListeners.push(listener);
    return () => {
      this.onStringPluckListeners = this.onStringPluckListeners.filter(
        (l) => l !== listener,
      );
    };
  }

  private scheduler(): void {
    if (!this.isRunning) return;
    const ctx = audioEngine.getContext();
    if (this.countInUntil && ctx.currentTime < this.countInUntil) {
      const beat = Math.max(
        0,
        Math.min(
          3,
          4 -
            Math.ceil((this.countInUntil - ctx.currentTime) / (60 / this.bpm)),
        ),
      );
      if (beat !== this.lastCountBeat) {
        this.lastCountBeat = beat;
        this.notifyStep(null);
      }
    }

    // Context check: If context is suspended or closed, do not schedule past timestamps
    if (ctx.state !== "running") {
      return;
    }

    // Critical Clock Drift Guard:
    // If nextStepTime has fallen behind currentTime (e.g. browser tab unfocused, context resume delay)
    // resync nextStepTime immediately so we never spam hundreds of steps in a single tick!
    if (this.nextStepTime < ctx.currentTime - 0.05) {
      this.nextStepTime = ctx.currentTime + 0.01;
    }

    while (this.nextStepTime < ctx.currentTime + this.scheduleAheadSec) {
      this.scheduleStep(
        this.currentSectionIndex,
        this.currentChordIndex,
        this.currentStep,
        this.nextStepTime,
      );
      this.advanceStep();
    }
  }

  private scheduleStep(
    sectionIdx: number,
    barIdx: number,
    step: number,
    time: number,
  ): void {
    if (this.metronomeOn && step % 4 === 0)
      audioEngine.playMetronome(time, step === 0);
    if (this.backingSeekNeeded) {
      const precedingBars = this.sections
        .slice(0, sectionIdx)
        .reduce(
          (total, section) => total + section.chords.length * section.repeats,
          0,
        );
      audioEngine.seekWav(
        ((precedingBars +
          barIdx +
          this.currentRepeat * this.sections[sectionIdx].chords.length +
          step / 16) *
          240) /
          this.bpm,
        time,
      );
      this.backingSeekNeeded = false;
    }
    const section = this.sections[sectionIdx] || this.sections[0];
    const pattern =
      STRUM_PATTERNS[section.patternId] || STRUM_PATTERNS["folk-rock"];
    const beat = pattern.beats.find((b) => b.step === step);

    // 1. Acoustic Guitar Riff & Strumming
    if (!this.isGuitarMuted && beat && beat.type !== "rest") {
      const chordId = section.chords[barIdx] || "Am";
      const chord = GUITAR_CHORDS[chordId] || GUITAR_CHORDS["Am"];

      strumEngine.strumChord(chord, {
        stroke: beat.type,
        velocity: beat.velocity,
        time: time,
        humanize: this.humanize,
        onStringPlucked: (s, f) => {
          this.onStringPluckListeners.forEach((l) => l(s, f));
        },
      });
    }

    // 2. Section-Aware Organic Acoustic Percussion
    if (
      this.percussionEnabled &&
      audioEngine.percussion &&
      section.drumMode !== "mute"
    ) {
      const mode = section.drumMode || "cajon-shaker";

      if (mode === "shaker-only") {
        if (step % 2 === 0) {
          const isAccent = step % 4 === 0;
          audioEngine.percussion.playShaker(
            time,
            isAccent ? 0.45 : 0.25,
            isAccent,
            !isAccent,
          );
        }
        if (step === 4 || step === 12) {
          audioEngine.percussion.playTambourine(time, 0.4);
        }
      } else if (mode === "cajon-shaker") {
        if (step === 0) audioEngine.percussion.playCajonBass(time, 0.95);
        else if (step === 4) {
          audioEngine.percussion.playCajonSlap(time, 0.85);
          audioEngine.percussion.playTambourine(time, 0.6);
        } else if (step === 8) audioEngine.percussion.playCajonBass(time, 0.85);
        else if (step === 12) {
          audioEngine.percussion.playCajonSlap(time, 0.9);
          audioEngine.percussion.playTambourine(time, 0.65);
        }
        if (step % 2 === 0) {
          const isAccent = step % 4 === 0;
          audioEngine.percussion.playShaker(
            time,
            isAccent ? 0.4 : 0.22,
            isAccent,
            !isAccent,
          );
        }
      } else if (mode === "full") {
        // Full acoustic beat: syncopated kick/bass + slap + jingle
        if (step === 0 || step === 10)
          audioEngine.percussion.playCajonBass(time, 1.0);
        else if (step === 4 || step === 12) {
          audioEngine.percussion.playCajonSlap(time, 0.95);
          audioEngine.percussion.playTambourine(time, 0.8);
        } else if (step === 8) audioEngine.percussion.playCajonBass(time, 0.85);

        if (step % 2 === 0) {
          const isAccent = step % 4 === 0;
          audioEngine.percussion.playShaker(
            time,
            isAccent ? 0.38 : 0.22,
            isAccent,
            !isAccent,
          );
        }
      } else if (mode === "flamenco") {
        // Energetic Flamenco / Rumba
        if (step === 0 || step === 8)
          audioEngine.percussion.playCajonBass(time, 0.95);
        if (step === 3 || step === 11)
          audioEngine.percussion.playCajonSlap(time, 0.85);
        if (step === 6 || step === 14) {
          audioEngine.percussion.playTambourine(time, 0.7);
          audioEngine.percussion.playCajonSlap(time, 0.7);
        }
        audioEngine.percussion.playShaker(time, 0.3, false, step % 4 !== 0);
      }
    }

    // 3. Playback of Recorded Solo Loop Notes
    if (this.recordedSoloNotes.length > 0) {
      const matchingNotes = this.recordedSoloNotes.filter(
        (n) =>
          n.sectionId === section.id &&
          n.barIndex === barIdx &&
          n.step === step,
      );
      matchingNotes.forEach((n) => {
        if (
          n.instrument === "drums" ? !this.percussionEnabled : this.isSoloMuted
        )
          return;
        audioEngine.playRecordedNote(n.midi, time, n.velocity, n.instrument);
      });
    }

    // UI sync
    const ctx = audioEngine.getContext();
    const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
    const snapshot = this.getState(beat || null);
    const generation = this.generation;
    const timer = setTimeout(() => {
      this.uiTimers.delete(timer);
      if (this.isRunning && generation === this.generation) {
        this.audiblePosition = {
          sectionIndex: sectionIdx,
          sectionId: section.id,
          barIndex: barIdx,
          step,
          repeat: snapshot.currentRepeat,
        };
        this.onStepListeners.forEach((l) =>
          l({
            ...snapshot,
            isRecording: this.isRecordingSolo,
            recordingTrack: this.recordingTrack,
            countInBeat: this.getState().countInBeat,
          }),
        );
      }
    }, delayMs);
    this.uiTimers.add(timer);
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

      // Ableton Live style Quantized Scene Launch:
      // If a new scene is queued, cleanly transition at the exact 1st beat of the bar!
      if (this.queuedSectionIndex !== null) {
        this.backingSeekNeeded = true;
        this.currentSectionIndex = this.queuedSectionIndex;
        this.queuedSectionIndex = null;
        this.currentChordIndex = 0;
        this.currentRepeat = 0;
        return;
      }

      const section = this.getCurrentSection();
      const nextChordIdx = this.currentChordIndex + 1;

      if (nextChordIdx >= section.chords.length) {
        this.currentRepeat++;

        // Check if section repeats completed
        if (
          this.autoAdvanceSections &&
          section.repeats > 0 &&
          this.currentRepeat >= section.repeats
        ) {
          // Advance to NEXT SECTION (Song Chain Mode)
          this.currentRepeat = 0;
          this.currentChordIndex = 0;
          this.currentSectionIndex =
            (this.currentSectionIndex + 1) % this.sections.length;
          if (this.currentSectionIndex === 0) this.backingSeekNeeded = true;
        } else {
          // Loop current section
          this.currentChordIndex = 0;
          if (
            !this.autoAdvanceSections &&
            this.currentRepeat >= section.repeats
          ) {
            this.currentRepeat = 0;
            this.backingSeekNeeded = true;
          }
        }
      } else {
        this.currentChordIndex = nextChordIdx;
      }
    }
  }

  public getState(beat: StrumBeat | null = null): SequencerState {
    return {
      isPlaying: this.isRunning,
      bpm: this.bpm,
      currentSectionIndex: this.currentSectionIndex,
      queuedSectionIndex: this.queuedSectionIndex,
      currentChordIndex: this.currentChordIndex,
      currentStep: this.currentStep,
      currentBeat: beat,
      recordedSoloCount: this.recordedSoloNotes.length,
      currentRepeat: this.currentRepeat,
      autoAdvanceSections: this.autoAdvanceSections,
      isGuitarMuted: this.isGuitarMuted,
      isPercussionMuted: !this.percussionEnabled,
      isSoloMuted: this.isSoloMuted,
      isRecording: this.isRecordingSolo,
      recordingTrack: this.recordingTrack,
      countInBeat:
        this.isRunning &&
        this.countInUntil &&
        audioEngine.getContext().currentTime < this.countInUntil
          ? Math.max(
              1,
              4 -
                Math.ceil(
                  (this.countInUntil - audioEngine.getContext().currentTime) /
                    (60 / this.bpm),
                ) +
                1,
            )
          : null,
    };
  }

  private notifyStep(beat: StrumBeat | null): void {
    const state = this.getState(beat);
    if (this.isRunning) {
      const audibleSection = this.sections.findIndex(
        (section) => section.id === this.audiblePosition.sectionId,
      );
      if (audibleSection >= 0) {
        state.currentSectionIndex = audibleSection;
        state.currentChordIndex = Math.min(
          this.audiblePosition.barIndex,
          this.sections[audibleSection].chords.length - 1,
        );
        state.currentStep = this.audiblePosition.step;
        state.currentRepeat = this.audiblePosition.repeat;
      }
    }
    this.onStepListeners.forEach((l) => l(state));
  }
}

export const songSequencer = new SongSequencer();
