import { SongSection, SoloHarmonyMode } from "./types";
import { RecordedSoloNote, DEFAULT_SONG_SECTIONS } from "./audio/Sequencer";
import {
  AcousticInstrumentType,
  INSTRUMENT_METAS,
} from "./audio/SampledGuitarEngine";
import { GUITAR_CHORDS } from "./config/chords";
import { MUSICAL_SCALES, ROOT_NOTES } from "./config/scales";
import { STRUM_PATTERNS } from "./config/patterns";

export interface MixSettings {
  chordVolume: number;
  drumVolume: number;
  soloVolume: number;
  guitarMuted: boolean;
  soloMuted: boolean;
  reverbWet: number;
  brightness: number;
  bodyResonance: number;
  strumSpeedMs: number;
}
export interface SongProject {
  version: 1;
  name: string;
  bpm: number;
  swing: number;
  volume: number;
  root: string;
  scaleId: string;
  riffInstrument: AcousticInstrumentType;
  soloInstrument: AcousticInstrumentType;
  soloMode?: SoloHarmonyMode;
  percussionOn: boolean;
  autoAdvance: boolean;
  sections: SongSection[];
  notes: RecordedSoloNote[];
  mix: MixSettings;
  audioTrack?: WavTrack;
}
export interface WavTrack {
  id: string;
  name: string;
  dataUrl: string;
  duration: number;
  peaks: number[];
  volume: number;
  muted: boolean;
  offsetSeconds: number;
}
export const STORAGE_KEY = "songwriter-pro.project.v1";
export function createProject(): SongProject {
  return {
    version: 1,
    name: "İlk bestem",
    bpm: 104,
    swing: 0,
    volume: 0.85,
    root: "A",
    scaleId: "minor",
    riffInstrument: "nylon",
    soloInstrument: "violin",
    soloMode: "chord-tones",
    percussionOn: true,
    autoAdvance: true,
    sections: DEFAULT_SONG_SECTIONS.map((s) => ({
      ...s,
      chords: [...s.chords],
    })),
    notes: [],
    mix: {
      chordVolume: 0.85,
      drumVolume: 0.85,
      soloVolume: 0.95,
      guitarMuted: false,
      soloMuted: false,
      reverbWet: 0.04,
      brightness: 0.75,
      bodyResonance: 0.85,
      strumSpeedMs: 22,
    },
  };
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const number = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const instrument = (v: unknown): v is AcousticInstrumentType =>
  typeof v === "string" &&
  Object.prototype.hasOwnProperty.call(INSTRUMENT_METAS, v);
const text = (v: unknown, max: number): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= max;
const member = (v: unknown, values: string[]): v is string =>
  typeof v === "string" && values.includes(v);

export function parseProject(json: string): SongProject {
  const p: unknown = JSON.parse(json);
  if (
    !object(p) ||
    p.version !== 1 ||
    !text(p.name, 120) ||
    !number(p.bpm, 40, 220) ||
    !number(p.swing, 0, 0.4) ||
    !number(p.volume, 0, 1) ||
    !member(p.root, ROOT_NOTES) ||
    !member(p.scaleId, Object.keys(MUSICAL_SCALES)) ||
    !instrument(p.riffInstrument) ||
    !member(p.riffInstrument, ["nylon", "steel", "piano"]) ||
    !instrument(p.soloInstrument) ||
    (p.soloMode !== undefined &&
      !member(p.soloMode, [
        "chord-tones",
        "free-scale",
        "chromatic",
        "pentatonic",
        "smart-lick",
      ])) ||
    typeof p.percussionOn !== "boolean" ||
    typeof p.autoAdvance !== "boolean" ||
    !object(p.mix) ||
    !Array.isArray(p.sections) ||
    !p.sections.length ||
    p.sections.length > 64 ||
    !Array.isArray(p.notes) ||
    p.notes.length > 20000
  ) {
    throw new Error("Geçerli bir SongWriter Pro projesi seçin.");
  }
  const ids = new Set<string>();
  for (const s of p.sections) {
    if (
      !object(s) ||
      !text(s.id, 100) ||
      ids.has(s.id) ||
      !text(s.name, 120) ||
      !Array.isArray(s.chords) ||
      !s.chords.length ||
      s.chords.length > 64 ||
      !s.chords.every(
        (c) =>
          typeof c === "string" &&
          Object.prototype.hasOwnProperty.call(GUITAR_CHORDS, c),
      ) ||
      !member(s.patternId, Object.keys(STRUM_PATTERNS)) ||
      !number(s.repeats, 1, 8) ||
      !Number.isInteger(s.repeats) ||
      !member(s.drumMode, [
        "full",
        "cajon-shaker",
        "shaker-only",
        "flamenco",
        "mute",
      ]) ||
      !text(s.color, 100) ||
      (s.lyrics !== undefined &&
        (typeof s.lyrics !== "string" || s.lyrics.length > 20000))
    ) {
      throw new Error("Projedeki kısım veya akor bilgisi geçersiz.");
    }
    ids.add(s.id);
  }
  for (const n of p.notes) {
    if (
      !object(n) ||
      !text(n.id, 100) ||
      !number(n.midi, 0, 127) ||
      !Number.isInteger(n.midi) ||
      !number(n.velocity, 0, 1) ||
      !number(n.step, 0, 15) ||
      !Number.isInteger(n.step) ||
      !number(n.barIndex, 0, 63) ||
      !Number.isInteger(n.barIndex) ||
      !text(n.sectionId, 100) ||
      !ids.has(n.sectionId) ||
      !instrument(n.instrument) ||
      !number(n.sectionIndex, 0, 63) ||
      !Number.isInteger(n.sectionIndex) ||
      (n.harmonyMode !== undefined &&
        !member(n.harmonyMode, [
          "chord-tones",
          "free-scale",
          "chromatic",
          "pentatonic",
          "smart-lick",
        ]))
    ) {
      throw new Error("Projedeki solo kaydı geçersiz.");
    }
    const section = p.sections.find((s) => s.id === n.sectionId);
    if (!section || n.barIndex >= section.chords.length)
      throw new Error("Solo kaydının ölçüsü geçersiz.");
  }
  for (const key of ["chordVolume", "drumVolume", "soloVolume"]) {
    if (!number(p.mix[key], 0, 1.2))
      throw new Error("Mikser seviyesi geçersiz.");
  }
  if (
    !number(p.mix.reverbWet, 0, 0.3) ||
    !number(p.mix.brightness, 0.1, 1) ||
    !number(p.mix.bodyResonance, 0, 1) ||
    !number(p.mix.strumSpeedMs, 8, 60) ||
    typeof p.mix.guitarMuted !== "boolean" ||
    typeof p.mix.soloMuted !== "boolean"
  )
    throw new Error("Ses ayarları geçersiz.");
  if (p.audioTrack !== undefined) {
    const track = p.audioTrack;
    if (
      !object(track) ||
      !text(track.id, 100) ||
      !text(track.name, 200) ||
      !number(track.duration, 0.001, 86400) ||
      !number(track.volume, 0, 1.2) ||
      typeof track.muted !== "boolean" ||
      !number(track.offsetSeconds, 0, 86400) ||
      !Array.isArray(track.peaks) ||
      track.peaks.length > 128 ||
      !track.peaks.every((n) => number(n, 0, 1)) ||
      typeof track.dataUrl !== "string" ||
      track.dataUrl.length > 29_000_000 ||
      !/^data:audio\/wav;base64,[A-Za-z0-9+/]+={0,2}$/.test(track.dataUrl)
    ) {
      throw new Error("Projedeki WAV kanalı geçersiz.");
    }
  }
  // Reconstruct through JSON to keep imported project objects independent.
  return JSON.parse(JSON.stringify(p)) as SongProject;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
