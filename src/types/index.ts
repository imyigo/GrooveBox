export interface GuitarChord {
  id: string;
  name: string;
  displayName: string;
  root: string;
  type:
    "major" | "minor" | "7" | "maj7" | "m7" | "sus4" | "add9" | "dim" | "aug";
  midiNotes?: number[];
  frets: [number, number, number, number, number, number];
  fingers?: [number, number, number, number, number, number];
  category: "open" | "barre" | "extended";
}

export type StrokeType = "down" | "up" | "mute" | "bass" | "treble" | "rest";

export interface StrumBeat {
  id: string;
  step: number; // 0 to 15 (16th notes in a 4/4 bar)
  type: StrokeType;
  accent: boolean;
  velocity: number; // 0.0 to 1.0
}

export interface StrumPattern {
  id: string;
  name: string;
  timeSignature: "4/4" | "3/4" | "6/8";
  description: string;
  beats: StrumBeat[];
  defaultBpm: number;
}

export type DrumMode =
  "full" | "cajon-shaker" | "shaker-only" | "flamenco" | "mute";

export interface SongSection {
  id: string;
  name: string; // e.g. "Intro (Giriş)", "Verse (Söz)", "Chorus (Nakarat)", "Solo (Köprü)"
  chords: string[]; // Chord IDs
  patternId: string;
  repeats: number; // 1, 2, 4, 8 (or 0 for infinite loop)
  color: string;
  drumMode: DrumMode;
  lyrics?: string;
}

export interface BodyPreset {
  id: string;
  name: string;
  description: string;
  bodySize: "dreadnought" | "parlor" | "jumbo" | "twelve-string";
  brightness: number; // 0.0 to 1.0
  bodyResonance: number; // 0.0 to 1.0
  reverbWet: number; // 0.0 to 1.0
  chorusWet: number; // 0.0 to 1.0
  strumSpeedMs: number; // 10 to 60ms
}

export interface StringState {
  index: number;
  name: string;
  baseFreq: number;
  currentFreq: number;
  fret: number;
  isVibrating: boolean;
  amplitude: number;
}

export type AppGrooveboxMode = "arranger" | "live";

export type SoloHarmonyMode =
  "chord-tones" | "pentatonic" | "smart-lick" | "free-scale" | "chromatic";

export interface MasterDspSettings {
  reverbWet: number; // 0.0 to 0.5 (default 0.04)
  reverbDecay: number; // 0.1 to 10.0 (default 8.0)
  strumSpeedMs: number; // 10 to 60ms (default 22)
  brightness: number; // 0.1 to 1.0 (default 0.75)
  bodyResonance: number; // 0.1 to 1.0 (default 0.85)
  drumVolume: number; // 0.0 to 1.2 (default 0.85)
  chordVolume: number; // 0.0 to 1.2 (default 0.85)
  soloVolume: number; // 0.0 to 1.2 (default 0.95)
}

export interface DiatonicChordInfo {
  degree: number; // 1 to 7
  roman: string; // e.g. "i", "ii°", "III", "iv", "V", "VI", "VII"
  chordId: string; // e.g. "Am"
  displayName: string;
  role: "tonic" | "subdominant" | "dominant" | "mediant";
  roleLabel: string; // e.g. "Tonik (Karar)", "Subdominant (Ayrılış)", "Dominant (Çözülüm)"
  color: string;
}

export interface CadencePreset {
  id: string;
  name: string;
  genre: string;
  chords: string[];
  description: string;
}
