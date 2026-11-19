export interface MusicalScale {
  id: string;
  name: string;
  category: 'turkish' | 'western' | 'blues';
  intervals: number[]; // Semitone intervals from root [0, ...]
  description: string;
  recommendedChords: string[];
}

export const MUSICAL_SCALES: Record<string, MusicalScale> = {
  'minor': {
    id: 'minor',
    name: 'Doğal Minör (Nihavend / Eolian)',
    category: 'western',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    description: 'Türkçe pop ve rock şarkılarının vazgeçilmez melankolik gamı (Barış Manço, Duman).',
    recommendedChords: ['Am', 'Dm', 'Em', 'F', 'G', 'C']
  },
  'hicaz': {
    id: 'hicaz',
    name: 'Hicaz / Armonik Minör (Phrygian Dominant)',
    category: 'turkish',
    intervals: [0, 1, 4, 5, 7, 8, 10],
    description: 'Anadolu ve Doğu Akdeniz tınısı. Sezen Aksu, Levent Yüksel, Özgün Müzik karakteri.',
    recommendedChords: ['E', 'F', 'Dm', 'Am', 'E7']
  },
  'kurdi': {
    id: 'kurdi',
    name: 'Kürdi / Frigyen (Phrygian)',
    category: 'turkish',
    intervals: [0, 1, 3, 5, 7, 8, 10],
    description: 'Anadolu rock ve türkü aranjmanlarının mistik ve karanlık akustik lezzeti.',
    recommendedChords: ['Am', 'Bb', 'C', 'Dm', 'Gm']
  },
  'pentatonic-minor': {
    id: 'pentatonic-minor',
    name: 'Minör Pentatonik / Blues (Solo Kralı)',
    category: 'blues',
    intervals: [0, 3, 5, 6, 7, 10],
    description: 'Solo çalarken asla yanlış nota bastırmayan, en lezzetli akustik solo gamı.',
    recommendedChords: ['Am', 'C', 'D', 'E7', 'G']
  },
  'major': {
    id: 'major',
    name: 'Doğal Majör (Neşeli Pop & Folk)',
    category: 'western',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    description: 'Aydınlık, umutlu ve enerjik akustik şarkılar (MFÖ, Nil Karaibrahimgil).',
    recommendedChords: ['C', 'Dm', 'Em', 'F', 'G', 'Am']
  },
  'dorian': {
    id: 'dorian',
    name: 'Dorian (Anadolu Rock & Folk)',
    category: 'turkish',
    intervals: [0, 2, 3, 5, 7, 9, 10],
    description: 'Erkin Koray, Moğollar ve Cem Karaca tarzı 60-70ler Anadolu Pop ruhu.',
    recommendedChords: ['Am', 'D', 'C', 'G', 'Em']
  }
};

export const ROOT_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const NOTE_TO_SEMITONE: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1,
  'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11
};

const SEMITONE_TO_NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Calculates scale notes for given root and scale type
 */
export function getScaleNotes(root: string, scaleId: string, baseOctave: number = 3): { noteName: string; midi: number; degree: number }[] {
  const scale = MUSICAL_SCALES[scaleId] || MUSICAL_SCALES['minor'];
  const rootSemi = NOTE_TO_SEMITONE[root] ?? 9; // Default A
  const rootMidi = 12 * (baseOctave + 1) + rootSemi;

  const notes = [];
  // Generate 2 octaves so user has full solo range on keyboard!
  for (let octave = 0; octave < 2; octave++) {
    for (let i = 0; i < scale.intervals.length; i++) {
      const interval = scale.intervals[i];
      const midi = rootMidi + (octave * 12) + interval;
      const noteName = `${SEMITONE_TO_NOTE[midi % 12]}${Math.floor(midi / 12) - 1}`;
      notes.push({
        noteName,
        midi,
        degree: i + 1 + (octave * 7)
      });
    }
  }
  return notes;
}

export const KEYBOARD_KEY_MAP = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'];
