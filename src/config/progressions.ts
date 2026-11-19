export interface SongProgression {
  id: string;
  title: string;
  artistHint: string;
  key: string;
  chords: string[];
  patternId: string;
  bpm: number;
  description: string;
}

export const SONG_PROGRESSIONS: SongProgression[] = [
  {
    id: 'wonderwall-style',
    title: 'Acoustic Anthem (Wonderwall Style)',
    artistHint: 'Oasis / 90s Britpop',
    key: 'Em / G',
    chords: ['Em7', 'G', 'Dsus4', 'A7'],
    patternId: 'folk-rock',
    bpm: 90,
    description: '1. ve 2. tellerin sabit kaldığı, açık tellerin rezonansıyla meşhur efsanevi akustik kalıp.'
  },
  {
    id: 'pop-hit-axis',
    title: 'Hit Maker (I - V - vi - IV)',
    artistHint: 'Ed Sheeran, Taylor Swift, Green Day',
    key: 'C Major',
    chords: ['C', 'G', 'Am', 'F'],
    patternId: 'folk-rock',
    bpm: 105,
    description: 'Dünya müzik tarihinin en çok dinlenen 4 akorlu popüler beste şablonu.'
  },
  {
    id: 'indie-melancholy',
    title: 'Indie Folk & Melancholy',
    artistHint: 'Bon Iver, Passenger, Damien Rice',
    key: 'C Major',
    chords: ['Am', 'Fmaj7', 'C', 'G'],
    patternId: 'fingerpicking-travis',
    bpm: 84,
    description: 'Derin, duygusal ve parmakla çalınan arpejli melankoli yürüyüşü.'
  },
  {
    id: 'anatolian-rock',
    title: 'Anadolu Rock / Akustik Riff',
    artistHint: 'Barış Manço, Fikret Kızılok, Haluk Levent',
    key: 'A Minor',
    chords: ['Am', 'Dm', 'E', 'Am'],
    patternId: 'percussive-groove',
    bpm: 110,
    description: 'Türk rock ve özgün müziğin vazgeçilmez minör hüznü ve güçlü akustik vuruşları.'
  },
  {
    id: 'spanish-flamenco',
    title: 'Akdeniz & Flamenko Kadansı',
    artistHint: 'Paco de Lucía, Gipsy Kings',
    key: 'A Phrygian',
    chords: ['Am', 'G', 'F', 'E'],
    patternId: 'rumba-spanish',
    bpm: 118,
    description: 'Aşağı inen İspanyol bas yürüyüşü ve tutkulu flamenko vuruşları.'
  },
  {
    id: 'acoustic-soul',
    title: 'Acoustic Neo-Soul & Ballad',
    artistHint: 'John Mayer, Norah Jones',
    key: 'G Major',
    chords: ['G', 'Cadd9', 'Em7', 'Dsus4'],
    patternId: 'ballad-arpeggio',
    bpm: 78,
    description: 'Kadife gibi zengin, 9\'lu ve 7\'li uzantılı zengin akustik armoniler.'
  }
];
