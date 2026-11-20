import { DiatonicChordInfo, CadencePreset } from "../types";
import { CHROMATIC_NOTES, CHORD_SUFFIXES, noteSemitone } from "./chords";

export interface MusicalScale {
  id: string;
  name: string;
  category: "turkish" | "western" | "blues";
  intervals: number[]; // Semitone intervals from root [0, ...]
  description: string;
  recommendedChords: string[];
}

export const MUSICAL_SCALES: Record<string, MusicalScale> = {
  minor: {
    id: "minor",
    name: "Doğal Minör (Nihavend / Eolian)",
    category: "western",
    intervals: [0, 2, 3, 5, 7, 8, 10],
    description:
      "Türkçe pop ve rock şarkılarının vazgeçilmez melankolik gamı (Barış Manço, Duman).",
    recommendedChords: ["Am", "Dm", "Em", "F", "G", "C"],
  },
  hicaz: {
    id: "hicaz",
    name: "Hicaz / Armonik Minör (Phrygian Dominant)",
    category: "turkish",
    intervals: [0, 1, 4, 5, 7, 8, 10],
    description:
      "Anadolu ve Doğu Akdeniz tınısı. Sezen Aksu, Levent Yüksel, Özgün Müzik karakteri.",
    recommendedChords: ["E", "F", "Dm", "Am", "E7"],
  },
  kurdi: {
    id: "kurdi",
    name: "Kürdi / Frigyen (Phrygian)",
    category: "turkish",
    intervals: [0, 1, 3, 5, 7, 8, 10],
    description:
      "Anadolu rock ve türkü aranjmanlarının mistik ve karanlık akustik lezzeti.",
    recommendedChords: ["Am", "Bb", "C", "Dm", "Gm"],
  },
  "pentatonic-minor": {
    id: "pentatonic-minor",
    name: "Minör Pentatonik / Blues (Solo Kralı)",
    category: "blues",
    intervals: [0, 3, 5, 6, 7, 10],
    description:
      "Solo çalarken asla yanlış nota bastırmayan, en lezzetli akustik solo gamı.",
    recommendedChords: ["Am", "C", "D", "E7", "G"],
  },
  major: {
    id: "major",
    name: "Doğal Majör (Neşeli Pop & Folk)",
    category: "western",
    intervals: [0, 2, 4, 5, 7, 9, 11],
    description:
      "Aydınlık, umutlu ve enerjik akustik şarkılar (MFÖ, Nil Karaibrahimgil).",
    recommendedChords: ["C", "Dm", "Em", "F", "G", "Am"],
  },
  dorian: {
    id: "dorian",
    name: "Dorian (Anadolu Rock & Folk)",
    category: "turkish",
    intervals: [0, 2, 3, 5, 7, 9, 10],
    description:
      "Erkin Koray, Moğollar ve Cem Karaca tarzı 60-70ler Anadolu Pop ruhu.",
    recommendedChords: ["Am", "D", "C", "G", "Em"],
  },
};

export const ROOT_NOTES = [
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

const NOTE_TO_SEMITONE: Record<string, number> = {
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

const SEMITONE_TO_NOTE = [
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

/**
 * Calculates scale notes for given root and scale type
 */
export function getScaleNotes(
  root: string,
  scaleId: string,
  baseOctave: number = 3,
): { noteName: string; midi: number; degree: number }[] {
  const scale = MUSICAL_SCALES[scaleId] || MUSICAL_SCALES["minor"];
  const rootSemi = NOTE_TO_SEMITONE[root] ?? 9; // Default A
  const rootMidi = 12 * (baseOctave + 1) + rootSemi;

  const notes = [];
  // Generate 2 octaves so user has full solo range on keyboard!
  for (let octave = 0; octave < 2; octave++) {
    for (let i = 0; i < scale.intervals.length; i++) {
      const interval = scale.intervals[i];
      const midi = rootMidi + octave * 12 + interval;
      const noteName = `${SEMITONE_TO_NOTE[midi % 12]}${Math.floor(midi / 12) - 1}`;
      notes.push({
        noteName,
        midi,
        degree: i + 1 + octave * 7,
      });
    }
  }
  return notes;
}

export const KEYBOARD_KEY_MAP = [
  "a",
  "s",
  "d",
  "f",
  "g",
  "h",
  "j",
  "k",
  "l",
  ";",
];

/**
 * Real Music Theory: Calculates the 7 Diatonic Degree Chords
 * based on selected root and scale/mode.
 */
export function getDiatonicChords(
  root: string,
  scaleId: string,
): DiatonicChordInfo[] {
  const rootSemi = noteSemitone(root);
  const selected = MUSICAL_SCALES[scaleId] || MUSICAL_SCALES.minor;
  const intervals =
    selected.intervals.length === 7
      ? selected.intervals
      : MUSICAL_SCALES.minor.intervals;
  const roman = ["I", "II", "III", "IV", "V", "VI", "VII"];
  return intervals.map((interval, degree) => {
    const third = (intervals[(degree + 2) % 7] - interval + 12) % 12;
    const fifth = (intervals[(degree + 4) % 7] - interval + 12) % 12;
    const type =
      third === 3
        ? fifth === 6
          ? "dim"
          : "minor"
        : fifth === 8
          ? "aug"
          : "major";
    const rootName = CHROMATIC_NOTES[(rootSemi + interval) % 12];
    const chordId = rootName + CHORD_SUFFIXES[type];
    const role =
      degree === 0
        ? "tonic"
        : degree === 3 || degree === 1
          ? "subdominant"
          : degree === 4 || degree === 6
            ? "dominant"
            : "mediant";
    return {
      degree: degree + 1,
      roman:
        type === "minor" || type === "dim"
          ? roman[degree].toLowerCase() + (type === "dim" ? "°" : "")
          : roman[degree],
      chordId,
      displayName: chordId,
      role,
      roleLabel: [
        "Karar",
        "Köprü",
        "Renk",
        "Açılım",
        "Çözülüm",
        "Renk",
        "Dönüş",
      ][degree],
      color: "border-amber-500 text-amber-300",
    };
  });
}

export const CADENCE_PRESETS: CadencePreset[] = [
  {
    id: "anadolu-rock",
    name: "🎸 Anadolu Rock & Folk",
    genre: "Anadolu Rock / Moğollar / Erkin Koray",
    chords: ["Am", "Dm", "G", "Am"],
    description:
      "i - iv - VII - i: Anadolu müziğinin en güçlü, epik ve sürükleyici akor yürüyüşü.",
  },
  {
    id: "andalusian-flamenco",
    name: "💃 Flamenko & İspanyol",
    genre: "Andalusian Cadence / Paco de Lucía",
    chords: ["Am", "G", "F", "E7"],
    description:
      "i - VII - VI - V7: İspanyol ve Akdeniz gitar arpejlerinin efsanevi inişli kadansı.",
  },
  {
    id: "pop-2000s",
    name: "🎤 Türkçe Pop 2000'ler",
    genre: "Duman / Mor ve Ötesi / Şebnem Ferah",
    chords: ["Am", "F", "C", "G"],
    description:
      "i - VI - III - VII: En çok hit üreten, duygusal ve akılda kalıcı 4-akor altın şablonu.",
  },
  {
    id: "jazz-soul",
    name: "🎷 Akustik Caz & Bossa",
    genre: "Caz / Bossa Nova / Akustik Soul",
    chords: ["Dm7", "G7", "Cmaj7", "Am7"],
    description:
      "ii7 - V7 - Imaj7 - vi7: Kusursuz caz çözülümü ve yumuşak akustik renkler.",
  },
  {
    id: "epic-ballad",
    name: "🌅 Epik Yükseliş Baladı",
    genre: "Akustik Balad / Film Müziği",
    chords: ["C", "G", "Am", "F"],
    description:
      "I - V - vi - IV: Pop ve film müziklerinin en ilham verici, umut dolu yürüyüşü.",
  },
  {
    id: "hicaz-mystic",
    name: "🌾 Hicaz & Doğu Akdeniz",
    genre: "Sezen Aksu / Özgün Müzik / Hicaz",
    chords: ["Am", "Bb", "Dm", "E7"],
    description:
      "i - bII - iv - V7: Doğu Akdeniz ve Anadolu makamlarının büyüleyici hüznü.",
  },
];
