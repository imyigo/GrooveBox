export interface GuitarChord {
  id: string;
  name: string;
  displayName: string;
  root: string;
  type: 'major' | 'minor' | '7' | 'maj7' | 'm7' | 'sus4' | 'add9';
  // 6 strings from low E (6th) to high E (1st).
  // -1 means muted (X), 0 means open string, 1-12 fret number
  frets: [number, number, number, number, number, number];
  // Fingers to use: 0 for open, 1=index, 2=middle, 3=ring, 4=pinky, -1 for mute
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

export interface SongSection {
  id: string;
  name: string; // e.g. "Intro", "Verse", "Chorus", "Riff"
  chords: string[]; // Chord IDs (repeats or progression)
  patternId: string;
  bars: number;
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
  index: number; // 0 (low E) to 5 (high E)
  name: string;
  baseFreq: number;
  currentFreq: number;
  fret: number; // -1 if muted
  isVibrating: boolean;
  amplitude: number;
}
