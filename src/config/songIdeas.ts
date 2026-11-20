import { getDiatonicChords } from "./scales";
import { GUITAR_CHORDS, CHROMATIC_NOTES, noteSemitone } from "./chords";
import type { SongSection } from "../types";

export interface SongStyle {
  id: string;
  name: string;
  mood: string;
  description: string;
  scaleId: string;
  bpm: number;
  instrument: "nylon" | "steel" | "piano";
  patternId: string;
}

// Original genre-based starting points, not transcriptions or live chart data.
export const SONG_STYLES: SongStyle[] = [
  {
    id: "pop",
    name: "Türkçe Pop",
    mood: "Aydınlık",
    description: "Akılda kalan, açık ve hareketli bir eşlik.",
    scaleId: "major",
    bpm: 108,
    instrument: "piano",
    patternId: "folk-rock",
  },
  {
    id: "ballad",
    name: "Duygusal Pop",
    mood: "İçten",
    description: "Vokal ve sözler için boşluk bırakan yavaş piyano.",
    scaleId: "minor",
    bpm: 78,
    instrument: "piano",
    patternId: "ballad-arpeggio",
  },
  {
    id: "anadolu",
    name: "Anadolu Rock",
    mood: "Güçlü",
    description: "Akustik gitar ve vurgulu ritimlerle güçlü bir temel.",
    scaleId: "minor",
    bpm: 104,
    instrument: "steel",
    patternId: "percussive-groove",
  },
  {
    id: "indie",
    name: "İndie Akustik",
    mood: "Samimi",
    description: "Yalın gitar, konuşur gibi söylenen sözler.",
    scaleId: "major",
    bpm: 92,
    instrument: "steel",
    patternId: "fingerpicking-travis",
  },
  {
    id: "arabesk",
    name: "Arabesk Pop",
    mood: "Yoğun",
    description: "Doğu tınılı eşlikle uzun vokal cümleleri.",
    scaleId: "hicaz",
    bpm: 88,
    instrument: "nylon",
    patternId: "ballad-arpeggio",
  },
  {
    id: "ege",
    name: "Ege / Akdeniz",
    mood: "Akıcı",
    description: "Hafif perküsyon ve sıcak naylon gitar.",
    scaleId: "dorian",
    bpm: 116,
    instrument: "nylon",
    patternId: "rumba-spanish",
  },
  {
    id: "folk",
    name: "Modern Türkü",
    mood: "Anlatan",
    description: "Hikâyeye ve söze yer açan sakin bir arpej.",
    scaleId: "kurdi",
    bpm: 84,
    instrument: "nylon",
    patternId: "fingerpicking-travis",
  },
  {
    id: "rock",
    name: "Alternatif Rock",
    mood: "Karanlık",
    description: "Tekrarlanan gitar cümleleriyle geniş bir nakarat.",
    scaleId: "minor",
    bpm: 98,
    instrument: "steel",
    patternId: "folk-rock",
  },
  {
    id: "dance",
    name: "Dans Pop",
    mood: "Enerjik",
    description: "Kısa akor döngüsü ve belirgin vuruşlar.",
    scaleId: "minor",
    bpm: 124,
    instrument: "piano",
    patternId: "percussive-groove",
  },
  {
    id: "lofi",
    name: "Gece Piyanosu",
    mood: "Sakin",
    description: "Yavaş piyano üzerine melodi ve söz denemeleri.",
    scaleId: "minor",
    bpm: 72,
    instrument: "piano",
    patternId: "ballad-arpeggio",
  },
  {
    id: "summer",
    name: "Yaz Akustiği",
    mood: "Hafif",
    description: "Açık renkli, akıcı bir gitar yürüyüşü.",
    scaleId: "major",
    bpm: 112,
    instrument: "nylon",
    patternId: "rumba-spanish",
  },
  {
    id: "cinematic",
    name: "Sinematik Balad",
    mood: "Geniş",
    description: "Sakin girişten yükselen nakarata bir piyano fikri.",
    scaleId: "minor",
    bpm: 82,
    instrument: "piano",
    patternId: "fingerpicking-travis",
  },
];

const PATHS = [
  [0, 4, 5, 3],
  [0, 5, 3, 4],
  [0, 3, 4, 0],
  [0, 3, 5, 4],
  [0, 5, 2, 6],
  [0, 3, 6, 0],
  [0, 2, 3, 4],
  [0, 6, 3, 4],
];
export function ideaChords(
  style: SongStyle,
  root: string,
  variation = 0,
): string[] {
  const palette = getDiatonicChords(root, style.scaleId);
  const path =
    PATHS[
      ((Math.floor(variation) % PATHS.length) + PATHS.length) % PATHS.length
    ];
  return path.map((degree) => palette[degree].chordId);
}
export function ideaSections(
  style: SongStyle,
  root: string,
  variation = 0,
): SongSection[] {
  const verse = ideaChords(style, root, variation);
  const chorus = ideaChords(style, root, variation + 3);
  return [
    {
      id: crypto.randomUUID(),
      name: "Giriş",
      chords: verse.slice(0, 2),
      repeats: 1,
      patternId: "fingerpicking-travis",
      drumMode: "shaker-only",
    },
    {
      id: crypto.randomUUID(),
      name: "Söz",
      chords: verse,
      repeats: 2,
      patternId: style.patternId,
      drumMode: "cajon-shaker",
    },
    {
      id: crypto.randomUUID(),
      name: "Nakarat",
      chords: chorus,
      repeats: 2,
      patternId: style.patternId,
      drumMode: "full",
    },
    {
      id: crypto.randomUUID(),
      name: "Köprü / Solo",
      chords: ideaChords(style, root, variation + 5),
      repeats: 1,
      patternId: "ballad-arpeggio",
      drumMode: "shaker-only",
    },
  ].map(
    (section) =>
      ({
        ...section,
        color: "from-blue-600 to-cyan-700",
        lyrics: "",
      }) as SongSection,
  );
}

export function parseChordSequence(input: string): string[] {
  const tokens = input
    .trim()
    .split(/[\s,;|]+/)
    .filter(Boolean);
  if (!tokens.length || tokens.length > 64)
    throw new Error("1 ile 64 arasında akor yazın.");
  return tokens.map((token) => {
    const normalized = token
      .replace(/♯/g, "#")
      .replace(/♭/g, "b")
      .replace(/^[a-g]/, (root) => root.toUpperCase());
    const match = /^([A-G](?:#|b)?)(.*)$/.exec(normalized);
    const id = Object.prototype.hasOwnProperty.call(GUITAR_CHORDS, normalized)
      ? normalized
      : match
        ? CHROMATIC_NOTES[noteSemitone(match[1])] + match[2]
        : "";
    if (!Object.prototype.hasOwnProperty.call(GUITAR_CHORDS, id))
      throw new Error(`“${token}” akoru tanınmadı. Örnek: Am Dm E7 Am`);
    return GUITAR_CHORDS[id].name;
  });
}
