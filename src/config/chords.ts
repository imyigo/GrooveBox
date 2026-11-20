import { GuitarChord, SoloHarmonyMode } from "../types";

export const STANDARD_TUNING_FREQS = [
  82.41, // E2 (6th string - Low E)
  110.0, // A2 (5th string)
  146.83, // D3 (4th string)
  196.0, // G3 (3rd string)
  246.94, // B3 (2nd string)
  329.63, // E4 (1st string - High E)
];

export const STRING_NAMES = ["E", "A", "D", "G", "B", "e"];

export const GUITAR_CHORDS: Record<string, GuitarChord> = {
  // Major Chords
  C: {
    id: "C",
    name: "C",
    displayName: "C Major",
    root: "C",
    type: "major",
    frets: [-1, 3, 2, 0, 1, 0],
    fingers: [-1, 3, 2, 0, 1, 0],
    category: "open",
  },
  G: {
    id: "G",
    name: "G",
    displayName: "G Major",
    root: "G",
    type: "major",
    frets: [3, 2, 0, 0, 0, 3],
    fingers: [2, 1, 0, 0, 0, 3],
    category: "open",
  },
  D: {
    id: "D",
    name: "D",
    displayName: "D Major",
    root: "D",
    type: "major",
    frets: [-1, -1, 0, 2, 3, 2],
    fingers: [-1, -1, 0, 1, 3, 2],
    category: "open",
  },
  A: {
    id: "A",
    name: "A",
    displayName: "A Major",
    root: "A",
    type: "major",
    frets: [-1, 0, 2, 2, 2, 0],
    fingers: [-1, 0, 1, 2, 3, 0],
    category: "open",
  },
  E: {
    id: "E",
    name: "E",
    displayName: "E Major",
    root: "E",
    type: "major",
    frets: [0, 2, 2, 1, 0, 0],
    fingers: [0, 2, 3, 1, 0, 0],
    category: "open",
  },
  F: {
    id: "F",
    name: "F",
    displayName: "F Major (Barre)",
    root: "F",
    type: "major",
    frets: [1, 3, 3, 2, 1, 1],
    fingers: [1, 3, 4, 2, 1, 1],
    category: "barre",
  },

  // Minor Chords
  Am: {
    id: "Am",
    name: "Am",
    displayName: "A Minor",
    root: "A",
    type: "minor",
    frets: [-1, 0, 2, 2, 1, 0],
    fingers: [-1, 0, 2, 3, 1, 0],
    category: "open",
  },
  Em: {
    id: "Em",
    name: "Em",
    displayName: "E Minor",
    root: "E",
    type: "minor",
    frets: [0, 2, 2, 0, 0, 0],
    fingers: [0, 2, 3, 0, 0, 0],
    category: "open",
  },
  Dm: {
    id: "Dm",
    name: "Dm",
    displayName: "D Minor",
    root: "D",
    type: "minor",
    frets: [-1, -1, 0, 2, 3, 1],
    fingers: [-1, -1, 0, 2, 3, 1],
    category: "open",
  },
  Bm: {
    id: "Bm",
    name: "Bm",
    displayName: "B Minor (Barre)",
    root: "B",
    type: "minor",
    frets: [-1, 2, 4, 4, 3, 2],
    fingers: [-1, 1, 3, 4, 2, 1],
    category: "barre",
  },
  Fsm: {
    id: "Fsm",
    name: "F#m",
    displayName: "F# Minor",
    root: "F#",
    type: "minor",
    frets: [2, 4, 4, 2, 2, 2],
    fingers: [1, 3, 4, 1, 1, 1],
    category: "barre",
  },

  // 7th & Color Chords
  G7: {
    id: "G7",
    name: "G7",
    displayName: "G Dominant 7",
    root: "G",
    type: "7",
    frets: [3, 2, 0, 0, 0, 1],
    category: "open",
  },
  E7: {
    id: "E7",
    name: "E7",
    displayName: "E Dominant 7",
    root: "E",
    type: "7",
    frets: [0, 2, 0, 1, 0, 0],
    category: "open",
  },
  A7: {
    id: "A7",
    name: "A7",
    displayName: "A Dominant 7",
    root: "A",
    type: "7",
    frets: [-1, 0, 2, 0, 2, 0],
    category: "open",
  },
  B7: {
    id: "B7",
    name: "B7",
    displayName: "B Dominant 7",
    root: "B",
    type: "7",
    frets: [-1, 2, 1, 2, 0, 2],
    category: "open",
  },
  D7: {
    id: "D7",
    name: "D7",
    displayName: "D Dominant 7",
    root: "D",
    type: "7",
    frets: [-1, -1, 0, 2, 1, 2],
    category: "open",
  },
  Bb: {
    id: "Bb",
    name: "Bb",
    displayName: "Bb Major (Kürdi Karakter)",
    root: "Bb",
    type: "major",
    frets: [-1, 1, 3, 3, 3, 1],
    category: "barre",
  },
  Gm: {
    id: "Gm",
    name: "Gm",
    displayName: "G Minor",
    root: "G",
    type: "minor",
    frets: [3, 5, 5, 3, 3, 3],
    category: "barre",
  },
  Cm: {
    id: "Cm",
    name: "Cm",
    displayName: "C Minor",
    root: "C",
    type: "minor",
    frets: [-1, 3, 5, 5, 4, 3],
    category: "barre",
  },
  Bdim: {
    id: "Bdim",
    name: "Bdim",
    displayName: "B Diminished (ii° Eksik)",
    root: "B",
    type: "minor",
    frets: [-1, 2, 3, 4, 3, -1],
    category: "open",
  },
  Am7: {
    id: "Am7",
    name: "Am7",
    displayName: "A Minor 7",
    root: "A",
    type: "m7",
    frets: [-1, 0, 2, 0, 1, 0],
    category: "open",
  },
  Dm7: {
    id: "Dm7",
    name: "Dm7",
    displayName: "D Minor 7",
    root: "D",
    type: "m7",
    frets: [-1, -1, 0, 2, 1, 1],
    category: "open",
  },
  Cmaj7: {
    id: "Cmaj7",
    name: "Cmaj7",
    displayName: "C Major 7",
    root: "C",
    type: "maj7",
    frets: [-1, 3, 2, 0, 0, 0],
    category: "open",
  },
  Cadd9: {
    id: "Cadd9",
    name: "Cadd9",
    displayName: "C add9 (Acoustic Pop)",
    root: "C",
    type: "add9",
    frets: [-1, 3, 2, 0, 3, 3],
    category: "extended",
  },
  Dsus4: {
    id: "Dsus4",
    name: "Dsus4",
    displayName: "D sus4",
    root: "D",
    type: "sus4",
    frets: [-1, -1, 0, 2, 3, 3],
    category: "extended",
  },
  Em7: {
    id: "Em7",
    name: "Em7",
    displayName: "E Minor 7",
    root: "E",
    type: "m7",
    frets: [0, 2, 2, 0, 3, 3],
    category: "extended",
  },
  Fmaj7: {
    id: "Fmaj7",
    name: "Fmaj7",
    displayName: "F Major 7 (Dreamy)",
    root: "F",
    type: "maj7",
    frets: [-1, -1, 3, 2, 1, 0],
    category: "extended",
  },
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

const ROOT_SEMITONES: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

const CHORD_INTERVALS: Record<GuitarChord["type"], number[]> = {
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  major: [0, 4, 7],
  minor: [0, 3, 7],
  "7": [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  sus4: [0, 5, 7],
  add9: [0, 2, 4, 7],
};

/**
 * Returns pitch classes (0-11) for any chord
 */
export function getChordPitchClasses(chord: GuitarChord): number[] {
  const rootSemi = ROOT_SEMITONES[chord.root] ?? 0;
  const intervals = CHORD_INTERVALS[chord.type] || [0, 4, 7];
  return intervals.map((int) => (rootSemi + int) % 12);
}

/**
 * Smart Harmonic Snapping (Zero-Mistake Solo Engine):
 * Snaps any played MIDI note to the nearest chord tone or harmonic pitch
 * based on the active chord and selected harmony mode!
 */
export function snapMidiToChord(
  midi: number,
  chord: GuitarChord,
  mode: SoloHarmonyMode = "chord-tones",
): number {
  if (mode === "free-scale" || mode === "chromatic") {
    return midi;
  }

  const rootSemi = ROOT_SEMITONES[chord.root] ?? 0;

  let targetPitches: number[];
  if (mode === "pentatonic") {
    // Relative pentatonic tones
    const intervals =
      chord.type === "minor" || chord.type === "m7"
        ? [0, 3, 5, 7, 10] // Minor pentatonic
        : [0, 2, 4, 7, 9]; // Major pentatonic
    targetPitches = intervals.map((i) => (rootSemi + i) % 12);
  } else {
    // Chord mode stays strictly inside the current chord.
    const baseIntervals = CHORD_INTERVALS[chord.type] || [0, 4, 7];
    // Add sweet 9th (2 semitones up) and 7th
    const extensions = [...baseIntervals];
    targetPitches = extensions.map((i) => (rootSemi + i) % 12);
  }

  const notePitch = midi % 12;
  if (targetPitches.includes(notePitch)) {
    return midi;
  }

  // Find closest target pitch across full semitone distance [-6 to +6]
  let bestMidi = midi;
  let minDiff = 999;

  for (let offset = -6; offset <= 6; offset++) {
    if (offset === 0) continue;
    const candidateMidi = midi + offset;
    const candidatePitch = ((candidateMidi % 12) + 12) % 12;
    if (targetPitches.includes(candidatePitch)) {
      const diff = Math.abs(offset);
      if (diff < minDiff) {
        minDiff = diff;
        bestMidi = candidateMidi;
      }
    }
  }

  return bestMidi;
}

export const CHROMATIC_NOTES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];
export const CHORD_SUFFIXES: Record<GuitarChord["type"], string> = {
  major: "",
  minor: "m",
  dim: "dim",
  aug: "aug",
  "7": "7",
  maj7: "maj7",
  m7: "m7",
  sus4: "sus4",
  add9: "add9",
};

// Complete the library for every global key; keep the hand-authored open voicings.
for (let root = 0; root < 12; root++) {
  for (const type of Object.keys(CHORD_INTERVALS) as GuitarChord["type"][]) {
    const id = CHROMATIC_NOTES[root] + CHORD_SUFFIXES[type];
    const pitches = CHORD_INTERVALS[type].map((n) => (root + n) % 12);
    if (!GUITAR_CHORDS[id]) {
      const fret = (root - 4 + 12) % 12;
      const shape =
        type === "major"
          ? [0, 2, 2, 1, 0, 0]
          : type === "minor"
            ? [0, 2, 2, 0, 0, 0]
            : type === "7"
              ? [0, 2, 0, 1, 0, 0]
              : null;
      const frets = shape
        ? shape.map((n) => n + fret)
        : [40, 45, 50, 55, 59, 64].map((base) => {
            for (let f = fret; f <= fret + 11; f++)
              if (pitches.includes((base + f) % 12)) return f;
            return -1;
          });
      GUITAR_CHORDS[id] = {
        id,
        name: id,
        displayName: id,
        root: CHROMATIC_NOTES[root],
        type,
        frets: frets as GuitarChord["frets"],
        category: "barre",
      };
    }
    const chord = GUITAR_CHORDS[id];
    if (type === "dim") chord.type = "dim";
    chord.midiNotes = CHORD_INTERVALS[type].map((n) => 48 + root + n);
  }
}
GUITAR_CHORDS["Fsm"] = GUITAR_CHORDS["F#m"];
for (const chord of Object.values(GUITAR_CHORDS)) {
  chord.midiNotes = CHORD_INTERVALS[chord.type].map(
    (n) => 48 + (ROOT_SEMITONES[chord.root] ?? 0) + n,
  );
}

export function noteSemitone(note: string): number {
  return ROOT_SEMITONES[note] ?? 0;
}
