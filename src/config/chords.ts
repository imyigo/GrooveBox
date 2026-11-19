import { GuitarChord } from '../types';

export const STANDARD_TUNING_FREQS = [
  82.41,  // E2 (6th string - Low E)
  110.00, // A2 (5th string)
  146.83, // D3 (4th string)
  196.00, // G3 (3rd string)
  246.94, // B3 (2nd string)
  329.63  // E4 (1st string - High E)
];

export const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e'];

export const GUITAR_CHORDS: Record<string, GuitarChord> = {
  // Major Chords
  'C': {
    id: 'C',
    name: 'C',
    displayName: 'C Major',
    root: 'C',
    type: 'major',
    frets: [-1, 3, 2, 0, 1, 0],
    fingers: [-1, 3, 2, 0, 1, 0],
    category: 'open'
  },
  'G': {
    id: 'G',
    name: 'G',
    displayName: 'G Major',
    root: 'G',
    type: 'major',
    frets: [3, 2, 0, 0, 0, 3],
    fingers: [2, 1, 0, 0, 0, 3],
    category: 'open'
  },
  'D': {
    id: 'D',
    name: 'D',
    displayName: 'D Major',
    root: 'D',
    type: 'major',
    frets: [-1, -1, 0, 2, 3, 2],
    fingers: [-1, -1, 0, 1, 3, 2],
    category: 'open'
  },
  'A': {
    id: 'A',
    name: 'A',
    displayName: 'A Major',
    root: 'A',
    type: 'major',
    frets: [-1, 0, 2, 2, 2, 0],
    fingers: [-1, 0, 1, 2, 3, 0],
    category: 'open'
  },
  'E': {
    id: 'E',
    name: 'E',
    displayName: 'E Major',
    root: 'E',
    type: 'major',
    frets: [0, 2, 2, 1, 0, 0],
    fingers: [0, 2, 3, 1, 0, 0],
    category: 'open'
  },
  'F': {
    id: 'F',
    name: 'F',
    displayName: 'F Major (Barre)',
    root: 'F',
    type: 'major',
    frets: [1, 3, 3, 2, 1, 1],
    fingers: [1, 3, 4, 2, 1, 1],
    category: 'barre'
  },

  // Minor Chords
  'Am': {
    id: 'Am',
    name: 'Am',
    displayName: 'A Minor',
    root: 'A',
    type: 'minor',
    frets: [-1, 0, 2, 2, 1, 0],
    fingers: [-1, 0, 2, 3, 1, 0],
    category: 'open'
  },
  'Em': {
    id: 'Em',
    name: 'Em',
    displayName: 'E Minor',
    root: 'E',
    type: 'minor',
    frets: [0, 2, 2, 0, 0, 0],
    fingers: [0, 2, 3, 0, 0, 0],
    category: 'open'
  },
  'Dm': {
    id: 'Dm',
    name: 'Dm',
    displayName: 'D Minor',
    root: 'D',
    type: 'minor',
    frets: [-1, -1, 0, 2, 3, 1],
    fingers: [-1, -1, 0, 2, 3, 1],
    category: 'open'
  },
  'Bm': {
    id: 'Bm',
    name: 'Bm',
    displayName: 'B Minor (Barre)',
    root: 'B',
    type: 'minor',
    frets: [-1, 2, 4, 4, 3, 2],
    fingers: [-1, 1, 3, 4, 2, 1],
    category: 'barre'
  },
  'Fsm': {
    id: 'Fsm',
    name: 'F#m',
    displayName: 'F# Minor',
    root: 'F#',
    type: 'minor',
    frets: [2, 4, 4, 2, 2, 2],
    fingers: [1, 3, 4, 1, 1, 1],
    category: 'barre'
  },

  // 7th & Color Chords
  'G7': {
    id: 'G7',
    name: 'G7',
    displayName: 'G Dominant 7',
    root: 'G',
    type: '7',
    frets: [3, 2, 0, 0, 0, 1],
    category: 'open'
  },
  'E7': {
    id: 'E7',
    name: 'E7',
    displayName: 'E Dominant 7',
    root: 'E',
    type: '7',
    frets: [0, 2, 0, 1, 0, 0],
    category: 'open'
  },
  'A7': {
    id: 'A7',
    name: 'A7',
    displayName: 'A Dominant 7',
    root: 'A',
    type: '7',
    frets: [-1, 0, 2, 0, 2, 0],
    category: 'open'
  },
  'Cadd9': {
    id: 'Cadd9',
    name: 'Cadd9',
    displayName: 'C add9 (Acoustic Pop)',
    root: 'C',
    type: 'add9',
    frets: [-1, 3, 2, 0, 3, 3],
    category: 'extended'
  },
  'Dsus4': {
    id: 'Dsus4',
    name: 'Dsus4',
    displayName: 'D sus4',
    root: 'D',
    type: 'sus4',
    frets: [-1, -1, 0, 2, 3, 3],
    category: 'extended'
  },
  'Em7': {
    id: 'Em7',
    name: 'Em7',
    displayName: 'E Minor 7',
    root: 'E',
    type: 'm7',
    frets: [0, 2, 2, 0, 3, 3],
    category: 'extended'
  },
  'Fmaj7': {
    id: 'Fmaj7',
    name: 'Fmaj7',
    displayName: 'F Major 7 (Dreamy)',
    root: 'F',
    type: 'maj7',
    frets: [-1, -1, 3, 2, 1, 0],
    category: 'extended'
  }
};

/**
 * Calculates the exact frequency for a given string and fret number.
 */
export function getFretFrequency(stringIndex: number, fret: number): number {
  if (fret < 0) return 0; // Muted
  const baseFreq = STANDARD_TUNING_FREQS[stringIndex];
  // Standard equal temperament formula: f = f0 * 2^(fret / 12)
  return baseFreq * Math.pow(2, fret / 12);
}
