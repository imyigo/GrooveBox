import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Undo2,
  Redo2,
} from "lucide-react";
import { padGrid, STEP_DRUM_LANES, midiLabel } from "../config/padGrid";
import { getScaleNotes } from "../config/scales";
import {
  songSequencer,
  RecordedSoloNote,
  SequencerState,
} from "../audio/Sequencer";
import { AcousticInstrumentType } from "../audio/SampledGuitarEngine";
import { SongSection, SoloHarmonyMode } from "../types";

export function HardwarePads({
  root,
  scaleId,
  harmony,
  instrument,
  octave,
  onOctaveChange,
  section,
  state,
  notes,
  held,
  onPress,
  onRelease,
}: {
  root: string;
  scaleId: string;
  harmony: SoloHarmonyMode;
  instrument: AcousticInstrumentType;
  octave: number;
  onOctaveChange: (octave: number) => void;
  section: SongSection;
  state: SequencerState;
  notes: RecordedSoloNote[];
  held: number[];
  onPress: (midi: number, key: string, velocity?: number) => Promise<void>;
  onRelease: (key: string) => void;
}) {
  const [mode, setMode] = useState<"play" | "steps">("play");
  const [page, setPage] = useState(0);
  const [bar, setBar] = useState(0);
  useEffect(() => {
    setBar(0);
  }, [section.id]);
  const currentBar = Math.min(bar, section.chords.length - 1);
  const past = useRef<RecordedSoloNote[][]>([]),
    future = useRef<RecordedSoloNote[][]>([]);
  const expected = useRef("");
  const [historyVersion, setHistoryVersion] = useState(0);
  const inScope = (note: RecordedSoloNote) =>
    note.sectionId === section.id &&
    note.barIndex === currentBar &&
    note.instrument === instrument;
  const signature = (list: RecordedSoloNote[]) =>
    list
      .filter(inScope)
      .map((n) => n.id)
      .sort()
      .join("|");
  useEffect(() => {
    past.current = [];
    future.current = [];
    expected.current = signature(notes);
    setHistoryVersion((v) => v + 1);
  }, [section.id, currentBar, instrument]);
  useEffect(() => {
    if (expected.current !== signature(notes)) {
      past.current = [];
      future.current = [];
      expected.current = signature(notes);
      setHistoryVersion((v) => v + 1);
    }
  }, [notes]);
  const commit = (next: RecordedSoloNote[]) => {
    expected.current = signature(next);
    songSequencer.setRecordedNotes(next);
    setHistoryVersion((v) => v + 1);
  };
  const travel = (undo: boolean) => {
    const from = undo ? past.current : future.current,
      to = undo ? future.current : past.current;
    const snapshot = from.pop();
    if (!snapshot) return;
    const current = songSequencer.getRecordedNotes();
    to.push(current.filter(inScope));
    commit([...current.filter((note) => !inScope(note)), ...snapshot]);
  };
  const pads = padGrid(root, scaleId, octave, harmony === "chromatic");
  const isDrums = instrument === "drums";
  const melodicLanes =
    harmony === "chromatic"
      ? pads
          .slice(56, 64)
          .reverse()
          .map((pad) => ({ midi: pad.midi, name: pad.name, velocity: 0.9 }))
      : getScaleNotes(root, scaleId, 3 + octave)
          .slice(0, 8)
          .reverse()
          .map((note) => ({
            midi: note.midi,
            name: note.noteName,
            velocity: 0.9,
          }));
  const lanes = isDrums ? STEP_DRUM_LANES : melodicLanes;
  const matching = (note: RecordedSoloNote, row: number, step: number) =>
    note.sectionId === section.id &&
    note.barIndex === currentBar &&
    note.step === step &&
    note.instrument === instrument &&
    note.midi === lanes[row].midi &&
    (!isDrums ||
      (note.gridLane === undefined ? row < 6 : note.gridLane === row));
  const toggle = (row: number, step: number) => {
    const current = songSequencer.getRecordedNotes();
    if (
      current.length >= 20000 &&
      !current.some((note) => matching(note, row, step))
    )
      return;
    past.current.push(current.filter(inScope));
    past.current = past.current.slice(-32);
    future.current = [];
    if (current.some((note) => matching(note, row, step)))
      commit(current.filter((note) => !matching(note, row, step)));
    else if (current.length < 20000)
      commit([
        ...current,
        {
          id: crypto.randomUUID(),
          sectionId: section.id,
          sectionIndex: songSequencer
            .getSections()
            .findIndex((s) => s.id === section.id),
          barIndex: currentBar,
          step,
          midi: lanes[row].midi,
          velocity: lanes[row].velocity,
          instrument,
          harmonyMode: harmony,
          gridLane: row,
        },
      ]);
  };
  return (
    <div className="hardware-pad-surface">
      <div className="pad-toolbar">
        <div className="hardware-tabs" aria-label="Pad çalışma modu">
          <button
            className={mode === "play" ? "active" : ""}
            aria-pressed={mode === "play"}
            onClick={() => setMode("play")}
          >
            PADLER
          </button>
          <button
            className={mode === "steps" ? "active" : ""}
            aria-pressed={mode === "steps"}
            onClick={() => setMode("steps")}
          >
            ADIMLAR
          </button>
        </div>
        {mode === "play" ? (
          <div className="hardware-octave">
            <button
              aria-label="Pad oktavını düşür"
              disabled={octave <= -1}
              onClick={() => onOctaveChange(octave - 1)}
            >
              <Minus size={14} />
            </button>
            <span>
              OKTAV {octave > 0 ? "+" : ""}
              {octave}
            </span>
            <button
              aria-label="Pad oktavını yükselt"
              disabled={octave >= 1}
              onClick={() => onOctaveChange(octave + 1)}
            >
              <Plus size={14} />
            </button>
          </div>
        ) : (
          <div className="hardware-octave">
            <button
              aria-label="Önceki ölçüyü düzenle"
              disabled={!currentBar}
              onClick={() => setBar(currentBar - 1)}
            >
              <ChevronLeft size={14} />
            </button>
            <span>
              ÖLÇÜ {currentBar + 1}/{section.chords.length}
            </span>
            <button
              aria-label="Sonraki ölçüyü düzenle"
              disabled={currentBar >= section.chords.length - 1}
              onClick={() => setBar(currentBar + 1)}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
      {mode === "steps" && (
        <div className="step-page" data-history={historyVersion}>
          <span>
            {isDrums ? "DAVUL" : "MELODİ"} · {section.name}
          </span>
          <button
            aria-label="Adım düzenlemesini geri al"
            disabled={!past.current.length}
            onClick={() => travel(true)}
          >
            <Undo2 size={13} />
          </button>
          <button
            aria-label="Adım düzenlemesini yinele"
            disabled={!future.current.length}
            onClick={() => travel(false)}
          >
            <Redo2 size={13} />
          </button>
          <button
            className={page === 0 ? "active" : ""}
            onClick={() => setPage(0)}
            aria-pressed={page === 0}
          >
            1–8
          </button>
          <button
            className={page === 1 ? "active" : ""}
            onClick={() => setPage(1)}
            aria-pressed={page === 1}
          >
            9–16
          </button>
        </div>
      )}
      <div
        className={`hardware-grid ${mode === "steps" ? "step-grid" : ""}`}
        role="group"
        aria-label={
          mode === "play" ? "8×8 performans padleri" : "8×16 adım düzenleyici"
        }
      >
        {Array.from({ length: 64 }, (_, index) => {
          const row = Math.floor(index / 8),
            col = index % 8,
            step = page * 8 + col;
          if (mode === "steps") {
            const active = notes.some((note) => matching(note, row, step));
            const playing =
              state.isPlaying &&
              state.currentChordIndex === currentBar &&
              state.currentStep === step;
            return (
              <button
                key={index}
                className={`hardware-pad step-pad ${active ? "step-on" : ""} ${playing ? "step-playing" : ""}`}
                aria-label={`${lanes[row].name}, adım ${step + 1}`}
                aria-pressed={active}
                onClick={() => toggle(row, step)}
              >
                <span className="pad-corner">
                  {col === 0 ? lanes[row].name : step + 1}
                </span>
                <span className="pad-led" />
              </button>
            );
          }
          const pad = pads[index];
          const drum = STEP_DRUM_LANES[(7 - row) % 8];
          const midi = isDrums ? drum.midi : pad.midi;
          const lit =
            held.includes(midi) ||
            (state.isPlaying &&
              notes.some(
                (note) =>
                  note.sectionId === section.id &&
                  note.barIndex === state.currentChordIndex &&
                  note.step === state.currentStep &&
                  note.midi === midi &&
                  note.instrument === instrument,
              ));
          const key = `hardware-${index}`;
          return (
            <button
              key={index}
              className={`hardware-pad ${isDrums ? "drum-tone" : pad.root ? "root-tone" : ""} ${lit ? "pad-lit" : ""}`}
              aria-label={`Pad ${index + 1}: ${isDrums ? drum.name : midiLabel(midi)}`}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                void onPress(midi, key, isDrums ? drum.velocity : undefined);
              }}
              onPointerUp={() => onRelease(key)}
              onPointerCancel={() => onRelease(key)}
              onLostPointerCapture={() => onRelease(key)}
              onKeyDown={(e) => {
                if ((e.code === "Space" || e.code === "Enter") && !e.repeat) {
                  e.preventDefault();
                  void onPress(midi, key, isDrums ? drum.velocity : undefined);
                }
              }}
              onKeyUp={(e) => {
                if (e.code === "Space" || e.code === "Enter") {
                  e.preventDefault();
                  onRelease(key);
                }
              }}
            >
              <span className="pad-corner">
                {isDrums ? drum.name : pad.name}
              </span>
              <span className="pad-led" />
            </button>
          );
        })}
      </div>
      <div className="pad-caption">
        <span>
          {mode === "play" ? "DOKUN / ÇAL" : "DOKUN / ADIM EKLE"} ·{" "}
          {instrument.toUpperCase()}
        </span>
        <span>
          {mode === "steps"
            ? "16 ADIM · 4/4"
            : harmony === "chromatic"
              ? "12 SES · SERBEST"
              : "GAMA UYUMLU"}
        </span>
      </div>
    </div>
  );
}
