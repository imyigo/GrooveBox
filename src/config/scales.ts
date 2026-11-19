import { DiatonicChordInfo, CadencePreset } from '../types';

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

/**
 * Real Music Theory: Calculates the 7 Diatonic Degree Chords
 * based on selected root and scale/mode.
 */
export function getDiatonicChords(root: string, scaleId: string): DiatonicChordInfo[] {
  const rootSemi = NOTE_TO_SEMITONE[root] ?? 9;

  if (scaleId === 'major') {
    // I, ii, iii, IV, V, vi, vii°
    const chordSpecs = [
      { deg: 1, interval: 0, suffix: '', roman: 'I', role: 'tonic' as const, label: 'Tonik (Karar)', color: 'border-emerald-500 text-emerald-400' },
      { deg: 2, interval: 2, suffix: 'm', roman: 'ii', role: 'subdominant' as const, label: 'Subdominant (Köprü)', color: 'border-blue-500 text-blue-400' },
      { deg: 3, interval: 4, suffix: 'm', roman: 'iii', role: 'mediant' as const, label: 'Medyant', color: 'border-indigo-500 text-indigo-400' },
      { deg: 4, interval: 5, suffix: '', roman: 'IV', role: 'subdominant' as const, label: 'Subdominant (Açılım)', color: 'border-cyan-500 text-cyan-400' },
      { deg: 5, interval: 7, suffix: '7', roman: 'V7', role: 'dominant' as const, label: 'Dominant (Çözülüm)', color: 'border-amber-500 text-amber-400' },
      { deg: 6, interval: 9, suffix: 'm', roman: 'vi', role: 'tonic' as const, label: 'Bağıl Minör', color: 'border-purple-500 text-purple-400' },
      { deg: 7, interval: 11, suffix: 'dim', roman: 'vii°', role: 'dominant' as const, label: 'Sensibl', color: 'border-rose-500 text-rose-400' }
    ];

    return chordSpecs.map((s) => {
      const noteName = SEMITONE_TO_NOTE[(rootSemi + s.interval) % 12];
      const chordId = s.suffix === 'dim' ? 'Bdim' : `${noteName}${s.suffix}`;
      return {
        degree: s.deg,
        roman: s.roman,
        chordId,
        displayName: `${noteName} ${s.roman}`,
        role: s.role,
        roleLabel: s.label,
        color: s.color
      };
    });
  }

  // Default Natural Minor / Turkish Minor Modes
  // i, ii°, III, iv, v/V, VI, VII
  const isHicaz = scaleId === 'hicaz';
  const isDorian = scaleId === 'dorian';
  const isKurdi = scaleId === 'kurdi';

  const minorSpecs = [
    { deg: 1, interval: 0, suffix: isHicaz ? '' : 'm', roman: isHicaz ? 'I (Hicaz)' : 'i', role: 'tonic' as const, label: 'Karar (Tonik)', color: 'border-emerald-500 text-emerald-400' },
    { deg: 2, interval: isKurdi || isHicaz ? 1 : 2, suffix: isKurdi ? '' : isHicaz ? '' : 'dim', roman: isKurdi || isHicaz ? 'bII' : 'ii°', role: 'subdominant' as const, label: isKurdi ? 'Kürdi Karakter (bII)' : 'Subdominant', color: 'border-rose-500 text-rose-400' },
    { deg: 3, interval: isHicaz ? 4 : 3, suffix: isHicaz ? 'dim' : '', roman: isHicaz ? 'III' : 'bIII', role: 'mediant' as const, label: 'Medyant', color: 'border-blue-500 text-blue-400' },
    { deg: 4, interval: 5, suffix: isDorian ? '' : 'm', roman: isDorian ? 'IV (Dorian)' : 'iv', role: 'subdominant' as const, label: 'Açılım (Subdominant)', color: 'border-cyan-500 text-cyan-400' },
    { deg: 5, interval: 7, suffix: '7', roman: 'V7', role: 'dominant' as const, label: 'Çözülüm (Dominant 7)', color: 'border-amber-500 text-amber-400' },
    { deg: 6, interval: isDorian ? 9 : 8, suffix: isDorian ? 'dim' : '', roman: isDorian ? 'vi°' : 'bVI', role: 'mediant' as const, label: 'Duygu (Submedyant)', color: 'border-purple-500 text-purple-400' },
    { deg: 7, interval: 10, suffix: '', roman: 'bVII', role: 'dominant' as const, label: 'Dominant / Karara Dönüş', color: 'border-yellow-500 text-yellow-400' }
  ];

  return minorSpecs.map((s) => {
    const noteName = SEMITONE_TO_NOTE[(rootSemi + s.interval) % 12];
    let chordId = `${noteName}${s.suffix}`;
    if (s.suffix === 'dim') chordId = 'Bdim';
    return {
      degree: s.deg,
      roman: s.roman,
      chordId,
      displayName: `${noteName} ${s.roman}`,
      role: s.role,
      roleLabel: s.label,
      color: s.color
    };
  });
}

export const CADENCE_PRESETS: CadencePreset[] = [
  {
    id: 'anadolu-rock',
    name: '🎸 Anadolu Rock & Folk',
    genre: 'Anadolu Rock / Moğollar / Erkin Koray',
    chords: ['Am', 'Dm', 'G', 'Am'],
    description: 'i - iv - VII - i: Anadolu müziğinin en güçlü, epik ve sürükleyici akor yürüyüşü.'
  },
  {
    id: 'andalusian-flamenco',
    name: '💃 Flamenko & İspanyol',
    genre: 'Andalusian Cadence / Paco de Lucía',
    chords: ['Am', 'G', 'F', 'E7'],
    description: 'i - VII - VI - V7: İspanyol ve Akdeniz gitar arpejlerinin efsanevi inişli kadansı.'
  },
  {
    id: 'pop-2000s',
    name: '🎤 Türkçe Pop 2000\'ler',
    genre: 'Duman / Mor ve Ötesi / Şebnem Ferah',
    chords: ['Am', 'F', 'C', 'G'],
    description: 'i - VI - III - VII: En çok hit üreten, duygusal ve akılda kalıcı 4-akor altın şablonu.'
  },
  {
    id: 'jazz-soul',
    name: '🎷 Akustik Caz & Bossa',
    genre: 'Caz / Bossa Nova / Akustik Soul',
    chords: ['Dm7', 'G7', 'Cmaj7', 'Am7'],
    description: 'ii7 - V7 - Imaj7 - vi7: Kusursuz caz çözülümü ve yumuşak akustik renkler.'
  },
  {
    id: 'epic-ballad',
    name: '🌅 Epik Yükseliş Baladı',
    genre: 'Akustik Balad / Film Müziği',
    chords: ['C', 'G', 'Am', 'F'],
    description: 'I - V - vi - IV: Pop ve film müziklerinin en ilham verici, umut dolu yürüyüşü.'
  },
  {
    id: 'hicaz-mystic',
    name: '🌾 Hicaz & Doğu Akdeniz',
    genre: 'Sezen Aksu / Özgün Müzik / Hicaz',
    chords: ['Am', 'Bb', 'Dm', 'E7'],
    description: 'i - bII - iv - V7: Doğu Akdeniz ve Anadolu makamlarının büyüleyici hüznü.'
  }
];
