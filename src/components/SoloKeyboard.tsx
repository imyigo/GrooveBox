import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Trash2, KeyboardMusic } from "lucide-react";
import { getScaleNotes } from "../config/scales";
import {
  getChordPitchClasses,
  snapMidiToChord,
  noteSemitone,
} from "../config/chords";
import { MUSICAL_SCALES } from "../config/scales";
import { audioEngine } from "../audio/AudioEngine";
import { songSequencer } from "../audio/Sequencer";
import {
  AcousticInstrumentType,
  INSTRUMENT_METAS,
} from "../audio/SampledGuitarEngine";
import { GuitarChord, SoloHarmonyMode } from "../types";

interface Props {
  currentRoot: string;
  currentScaleId: string;
  activeChord: GuitarChord;
  isPlaying: boolean;
  instrument?: AcousticInstrumentType;
  onInstrumentChange?: (instrument: AcousticInstrumentType) => void;
  onRootChange?: (root: string) => void;
  onScaleChange?: (scale: string) => void;
  onApplyRecommendedChords?: (chords: string[]) => void;
  percussionOn?: boolean;
  onTogglePercussion?: () => void;
}
const ROWS = [
  {
    name: "Tiz",
    octave: 1,
    codes: [
      "KeyQ",
      "KeyW",
      "KeyE",
      "KeyR",
      "KeyT",
      "KeyY",
      "KeyU",
      "KeyI",
      "KeyO",
      "KeyP",
      "BracketLeft",
      "BracketRight",
    ],
    labels: ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "Ğ", "Ü"],
  },
  {
    name: "Orta",
    octave: 0,
    codes: [
      "KeyA",
      "KeyS",
      "KeyD",
      "KeyF",
      "KeyG",
      "KeyH",
      "KeyJ",
      "KeyK",
      "KeyL",
      "Semicolon",
      "Quote",
    ],
    labels: ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ş", "İ"],
  },
  {
    name: "Bas",
    octave: -1,
    codes: [
      "KeyZ",
      "KeyX",
      "KeyC",
      "KeyV",
      "KeyB",
      "KeyN",
      "KeyM",
      "Comma",
      "Period",
      "Slash",
    ],
    labels: ["Z", "X", "C", "V", "B", "N", "M", "Ö", "Ç", "."],
  },
];
export const ACOUSTIC_DRUM_PADS = [
  { midi: 36, name: "Kick / Kahon", key: "A", code: "KeyA" },
  { midi: 38, name: "Snare / Slap", key: "S", code: "KeyS" },
  { midi: 42, name: "Kapalı shaker", key: "D", code: "KeyD" },
  { midi: 46, name: "Açık shaker", key: "F", code: "KeyF" },
  { midi: 49, name: "Tef", key: "G", code: "KeyG" },
  { midi: 45, name: "Woodblock", key: "H", code: "KeyH" },
];
export function SoloKeyboard({
  currentRoot,
  currentScaleId,
  activeChord,
  instrument = "violin",
  onInstrumentChange,
  isPlaying,
}: Props) {
  const [octave, setOctave] = useState(0);
  const [harmony, setHarmony] = useState<SoloHarmonyMode>("chord-tones");
  const [recording, setRecording] = useState(
    songSequencer.getIsRecordingSolo(),
  );
  const [count, setCount] = useState(songSequencer.getSoloCount());
  const [pressed, setPressed] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const held = useRef(new Map<string, number>());
  const mounted = useRef(true);
  const pitches = getChordPitchClasses(activeChord);
  const updatePressed = () => setPressed(new Set(held.current.keys()));
  useEffect(() => {
    mounted.current = true;
    const off = songSequencer.onNotesChanged(() =>
      setCount(songSequencer.getSoloCount()),
    );
    return () => {
      mounted.current = false;
      off();
      songSequencer.setIsRecordingSolo(false);
      audioEngine.stopSoloNote();
      held.current.clear();
    };
  }, []);
  const trigger = useCallback(
    async (midi: number, key: string) => {
      if (held.current.has(key)) return;
      let finalMidi =
        instrument === "drums"
          ? midi
          : snapMidiToChord(midi, activeChord, harmony);
      if (instrument !== "drums") {
        const pitches = MUSICAL_SCALES[currentScaleId].intervals.map(
          (n) => (n + noteSemitone(currentRoot)) % 12,
        );
        for (let distance = 0; distance <= 6; distance++) {
          const candidate = [finalMidi - distance, finalMidi + distance].find(
            (n) => n >= 0 && n <= 127 && pitches.includes(n % 12),
          );
          if (candidate !== undefined) {
            finalMidi = candidate;
            break;
          }
        }
      }
      held.current.set(key, finalMidi);
      updatePressed();
      await audioEngine.unlock();
      await audioEngine.ready();
      if (!mounted.current || !held.current.has(key)) return;
      audioEngine.playSoloMidiNote(
        finalMidi,
        undefined,
        0.9,
        harmony === "smart-lick" && instrument !== "drums",
      );
      songSequencer.addSoloNote(finalMidi, 0.9);
    },
    [activeChord, harmony, instrument, currentRoot, currentScaleId],
  );
  const release = useCallback(
    (key: string) => {
      const midi = held.current.get(key);
      if (midi !== undefined && instrument !== "drums")
        audioEngine.stopSoloNote(midi);
      held.current.delete(key);
      updatePressed();
    },
    [instrument],
  );
  const toggleRecording = useCallback(async () => {
    try {
      const next = !songSequencer.getIsRecordingSolo();
      if (next && !songSequencer.getIsPlaying()) await songSequencer.start();
      songSequencer.setIsRecordingSolo(next);
      setRecording(next);
    } catch {
      setError("Solo kaydını başlatmak için ses erişimini kontrol edin.");
    }
  }, []);
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (
        (event.target as HTMLElement).closest(
          'input, select, textarea, [contenteditable="true"], audio',
        )
      )
        return;
      if (event.altKey && event.code === "KeyR" && !event.repeat) {
        event.preventDefault();
        void toggleRecording();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat)
        return;
      if (instrument === "drums") {
        const pad = ACOUSTIC_DRUM_PADS.find((p) => p.code === event.code);
        if (pad) {
          event.preventDefault();
          void trigger(pad.midi, event.code);
        }
        return;
      }
      for (const row of ROWS) {
        const index = row.codes.indexOf(event.code);
        const notes = getScaleNotes(
          currentRoot,
          currentScaleId,
          3 + octave + row.octave,
        );
        if (index >= 0 && notes[index]) {
          event.preventDefault();
          void trigger(notes[index].midi, event.code);
          return;
        }
      }
    };
    const up = (event: KeyboardEvent) => {
      if (held.current.has(event.code)) release(event.code);
    };
    const blur = () => {
      held.current.forEach((_, key) => release(key));
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [
    trigger,
    release,
    currentRoot,
    currentScaleId,
    octave,
    instrument,
    toggleRecording,
  ]);
  return (
    <section className="panel solo-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">LEAD / MELODY</span>
          <h3>
            <KeyboardMusic size={19} />
            Üzerine çal
          </h3>
        </div>
        <div className="control-row">
          <button
            className={`button ${recording ? "danger" : ""}`}
            aria-pressed={recording}
            onClick={() => void toggleRecording()}
          >
            <Circle size={15} />
            {recording ? "Solo kaydını bitir" : "Solo döngüsü kaydet"}
          </button>
          <span className="muted">{count} nota</span>
          <button
            className="icon-button"
            aria-label="Solo notalarını temizle"
            disabled={!count}
            onClick={() => songSequencer.clearSolo()}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>
      <div className="solo-controls">
        <label>
          Solo enstrümanı
          <select
            aria-label="Solo enstrümanı"
            value={instrument}
            onChange={(e) => {
              held.current.forEach((_, key) => release(key));
              const type = e.target.value as AcousticInstrumentType;
              audioEngine.setSoloInstrument(type);
              onInstrumentChange?.(type);
            }}
          >
            {Object.values(INSTRUMENT_METAS).map((meta) => (
              <option key={meta.id} value={meta.id}>
                {meta.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nota yardımı
          <select
            aria-label="Nota yardımı"
            value={harmony}
            onChange={(e) => setHarmony(e.target.value as SoloHarmonyMode)}
          >
            <option value="chord-tones">Akor seslerine uyarla</option>
            <option value="free-scale">Global gamda serbest</option>
            <option value="pentatonic">Pentatonik</option>
            <option value="smart-lick">Akor + süsleme</option>
          </select>
        </label>
        <label>
          Oktav
          <select
            aria-label="Solo oktavı"
            value={octave}
            onChange={(e) => setOctave(+e.target.value)}
          >
            {[-2, -1, 0, 1, 2].map((n) => (
              <option key={n} value={n}>
                {n > 0 ? "+" : ""}
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="harmony-readout">
          <span className="muted">Aktif akor</span>
          <strong>{activeChord.name}</strong>
          <span>
            {currentRoot} · {currentScaleId}
          </span>
        </div>
      </div>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {instrument === "drums" ? (
        <div className="drum-pads">
          {ACOUSTIC_DRUM_PADS.map((pad) => (
            <button
              key={pad.midi}
              className={`drum-pad ${pressed.has(pad.code) ? "pressed" : ""}`}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                void trigger(pad.midi, pad.code);
              }}
              onPointerUp={() => release(pad.code)}
              onPointerCancel={() => release(pad.code)}
            >
              <kbd>{pad.key}</kbd>
              <strong>{pad.name}</strong>
            </button>
          ))}
        </div>
      ) : (
        <div className="keyboard-rows">
          {ROWS.map((row) => (
            <div key={row.name} className="keyboard-row">
              <span>{row.name}</span>
              <div className="note-keys">
                {getScaleNotes(
                  currentRoot,
                  currentScaleId,
                  3 + octave + row.octave,
                )
                  .slice(0, row.codes.length)
                  .map((note, index) => (
                    <button
                      key={`${note.midi}-${index}`}
                      className={`note-key ${pitches.includes(note.midi % 12) ? "chord-tone" : ""} ${pressed.has(row.codes[index]) ? "pressed" : ""}`}
                      aria-label={`${note.noteName} (${row.labels[index]})`}
                      onPointerDown={(e) => {
                        e.currentTarget.setPointerCapture(e.pointerId);
                        void trigger(note.midi, row.codes[index]);
                      }}
                      onPointerUp={() => release(row.codes[index])}
                      onPointerCancel={() => release(row.codes[index])}
                      onLostPointerCapture={() => release(row.codes[index])}
                    >
                      <kbd>{row.labels[index]}</kbd>
                      <strong>{note.noteName}</strong>
                      <span>
                        {pitches.includes(note.midi % 12) ? "akor" : "gam"}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="muted keyboard-help">
        Bilgisayar klavyesi veya dokunarak çalın. Alt+R solo döngüsü kaydını
        açar.{" "}
        {recording && !isPlaying
          ? "Kayıt için çalmayı başlatın."
          : "Solo döngüsü proje dosyasına dahildir."}
      </p>
    </section>
  );
}
