export interface SongProgression {
  id: string;
  title: string;
  artistHint: string;
  category: 'turkish' | 'global';
  scaleRoot: string;
  scaleId: string;
  chords: string[];
  patternId: string;
  bpm: number;
  description: string;
}

export const SONG_PROGRESSIONS: SongProgression[] = [
  // TÜRKİYE'DE EN ÇOK TUTAN AKUSTİK ŞABLONLAR
  {
    id: 'anadolu-rock-manco',
    title: 'Anadolu Rock & Barış Manço Ruhu',
    artistHint: 'Barış Manço, Moğollar, Fikret Kızılok',
    category: 'turkish',
    scaleRoot: 'A',
    scaleId: 'minor',
    chords: ['Am', 'Dm', 'E', 'Am'],
    patternId: 'percussive-groove',
    bpm: 108,
    description: 'Anadolu Rock müziğinin omurgası; derin minör hüznü ve güçlü akustik perküsyon.'
  },
  {
    id: 'duman-morveotesi',
    title: 'Duman & 2000ler Türkçe Rock',
    artistHint: 'Duman, Mor ve Ötesi, Şebnem Ferah',
    category: 'turkish',
    scaleRoot: 'E',
    scaleId: 'minor',
    chords: ['Em', 'C', 'G', 'D'],
    patternId: 'folk-rock',
    bpm: 96,
    description: 'Türkiye gençliğinin marşı haline gelen 4 akorlu efsanevi akustik rock yürüyüşü.'
  },
  {
    id: 'sezen-aksu-nihavend',
    title: 'Sezen Aksu & Nihavend Balad',
    artistHint: 'Sezen Aksu, Levent Yüksel, Sertab Erener',
    category: 'turkish',
    scaleRoot: 'A',
    scaleId: 'minor',
    chords: ['Am', 'Dm', 'G', 'C', 'F', 'Dm', 'E7', 'Am'],
    patternId: 'ballad-arpeggio',
    bpm: 78,
    description: 'Büyük aşk şarkılarının ve derin Türk pop hüzünlerinin 8 ölçülük klasik akor zinciri.'
  },
  {
    id: 'hicaz-anadolu-riff',
    title: 'Hicaz / Akdeniz Akustik Riff',
    artistHint: 'Haluk Levent, Zülfü Livaneli, Ahmet Kaya',
    category: 'turkish',
    scaleRoot: 'E',
    scaleId: 'hicaz',
    chords: ['E', 'F', 'Dm', 'E'],
    patternId: 'rumba-spanish',
    bpm: 114,
    description: 'Karakteristik Türk Hicaz makamı yürüyüşü; E ve F geçişlerindeki yakıcı doğu tınısı.'
  },
  {
    id: 'fikret-kizilok-akdeniz',
    title: 'Fikret Kızılok / Akdeniz & Şiir',
    artistHint: 'Fikret Kızılok, Bülent Ortaçgil',
    category: 'turkish',
    scaleRoot: 'A',
    scaleId: 'minor',
    chords: ['Am', 'Fmaj7', 'Dm', 'E7'],
    patternId: 'fingerpicking-travis',
    bpm: 88,
    description: 'Fmaj7 dokunuşuyla sofistike, şiirsel ve sıcak naylon telli İstanbul tınısı.'
  },
  {
    id: 'teoman-2000s',
    title: 'Teoman & İstanbul Akustik',
    artistHint: 'Teoman, Kaan Tangöze, Yüzyüzeyken Konuşuruz',
    category: 'turkish',
    scaleRoot: 'G',
    scaleId: 'major',
    chords: ['G', 'Cadd9', 'Em7', 'Dsus4'],
    patternId: 'folk-rock',
    bpm: 92,
    description: 'Açık tellerin (Cadd9, Em7) rezonansıyla meşhur modern Türk indie ve akustik sound.'
  },
  {
    id: 'yeni-turku-ege',
    title: 'Yeni Türkü / Ege & Akdeniz Rüzgarı',
    artistHint: 'Yeni Türkü, Ezginin Günlüğü',
    category: 'turkish',
    scaleRoot: 'D',
    scaleId: 'minor',
    chords: ['Dm', 'Gm', 'A7', 'Dm'],
    patternId: 'rumba-spanish',
    bpm: 120,
    description: 'Coşkulu ritim, sıcak Akdeniz rüzgarı ve parmakla çalınan melankolik ritim.'
  },

  // GLOBAL EFSANELER
  {
    id: 'indie-trap-pop',
    title: 'Madrigal / Dolu Kadehi (Modern Indie Pop)',
    artistHint: 'Madrigal, Dolu Kadehi Ters Tut, Köfn',
    category: 'turkish',
    scaleRoot: 'A',
    scaleId: 'minor',
    chords: ['Fmaj7', 'G', 'Em7', 'Am7'],
    patternId: 'percussive-groove',
    bpm: 102,
    description: 'Son yıllarda Türkiye listelerini kasıp kavuran modern yumuşak synth/akustik indie yürüyüşü.'
  },
  {
    id: 'turkce-pop-90lar',
    title: '90lar Türkçe Pop Altın Çağı',
    artistHint: 'Tarkan, Kenan Doğulu, Mustafa Sandal',
    category: 'turkish',
    scaleRoot: 'A',
    scaleId: 'minor',
    chords: ['Am', 'F', 'Dm', 'E7'],
    patternId: 'percussive-groove',
    bpm: 116,
    description: '90ların enerjik, melodik ve akılda kalıcı hit pop şarkı matematiği.'
  },
  {
    id: 'flamenco-andalusia',
    title: 'Endülüs & Akdeniz Tutkusu',
    artistHint: 'Gipsy Kings, Al Di Meola, Paco de Lucia',
    category: 'global',
    scaleRoot: 'A',
    scaleId: 'minor',
    chords: ['Am', 'G', 'F', 'E7'],
    patternId: 'rumba-spanish',
    bpm: 118,
    description: 'Klasik Endülüs kadansı; i - VII - VI - V basamaklarıyla ateşi yükselten rumba ritmi.'
  },
  {
    id: 'wonderwall-style',
    title: 'Wonderwall (Oasis Style)',
    artistHint: 'Oasis, Britpop',
    category: 'global',
    scaleRoot: 'E',
    scaleId: 'minor',
    chords: ['Em7', 'G', 'Dsus4', 'A7'],
    patternId: 'folk-rock',
    bpm: 90,
    description: '1. ve 2. tellerin sabit kaldığı efsanevi açık tel akustik marşı.'
  },
  {
    id: 'pop-hit-axis',
    title: 'Global Pop Hit (I - V - vi - IV)',
    artistHint: 'Ed Sheeran, Taylor Swift',
    category: 'global',
    scaleRoot: 'C',
    scaleId: 'major',
    chords: ['C', 'G', 'Am', 'F'],
    patternId: 'folk-rock',
    bpm: 104,
    description: 'Dünya pop listelerinin en çok dinlenen 4 akorlu şablonu.'
  }
];

/**
 * Müzik teorisini sıfırlayan akıllı hit akor üreticisi:
 * Milyonlar satan hit formüllerinden birini rastgele seçer ve uygulanabilir hale getirir.
 */
export function generateRandomHitProgression(): SongProgression {
  const randomIndex = Math.floor(Math.random() * SONG_PROGRESSIONS.length);
  return SONG_PROGRESSIONS[randomIndex];
}
