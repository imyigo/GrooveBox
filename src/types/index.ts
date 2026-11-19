export interface GuitarChord {
  id: string;
  name: string;
  displayName: string;
  root: string;
  type: 'major' | 'minor' | '7' | 'maj7' | 'm7' | 'sus4' | 'add9';
  frets: [number, number, number, number, number, number];
  fingers?: [number, number, number, number, number, number];
  category: 'open' | 'barre' | 'extended';
}

export type StrokeType = 'down' | 'up' | 'mute' | 'bass' | 'treble' | 'rest';

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
  timeSignature: '4/4' | '3/4' | '6/8';
  description: string;
  beats: StrumBeat[];
  defaultBpm: number;
}

export type DrumMode = 'full' | 'cajon-shaker' | 'shaker-only' | 'flamenco' | 'mute';

export interface SongSection {
  id: string;
  name: string; // e.g. "Intro (Giriş)", "Verse (Söz)", "Chorus (Nakarat)", "Solo (Köprü)"
  chords: string[]; // Chord IDs
  patternId: string;
  repeats: number; // 1, 2, 4, 8 (or 0 for infinite loop)
  color: string;
  drumMode: DrumMode;
}

export interface BodyPreset {
  id: string;
  name: string;
  description: string;
  bodySize: 'dreadnought' | 'parlor' | 'jumbo' | 'twelve-string';
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
