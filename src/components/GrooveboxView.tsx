import { useRef, useState } from "react";
import {
  Circle,
  Play,
  Square,
  RotateCcw,
  Library,
  NotebookPen,
  FolderOpen,
  SlidersHorizontal,
  Music2,
  Repeat2,
} from "lucide-react";
import { SongProject, MixSettings } from "../project";
import { songSequencer, SequencerState } from "../audio/Sequencer";
import { GuitarChord, SongSection } from "../types";
import { STRUM_PATTERNS } from "../config/patterns";
import { SoloKeyboard } from "./SoloKeyboard";
import { RotaryKnob } from "./RotaryKnob";
import { ChordEntry } from "./ChordEntry";

interface Props {
  project: SongProject;
  state: SequencerState;
  selected: number;
  activeChord: GuitarChord;
  onSelectSection: (index: number) => void;
  onUpdateSections: (sections: SongSection[]) => void;
  onUpdate: (changes: Partial<SongProject>) => void;
  onPreviewChord: (id: string) => void;
  onChangeKey: (root: string, scale: string) => void;
  onMixChange: (changes: Partial<MixSettings>) => void;
  onTogglePlay: () => void;
  busy: boolean;
  onOpenPanel: (panel: "presets" | "lyrics" | "project") => void;
}
export function GrooveboxView({
  project,
  state,
  selected,
  activeChord,
  onSelectSection,
  onUpdateSections,
  onUpdate,
  onMixChange,
  onTogglePlay,
  busy,
  onOpenPanel,
}: Props) {
  const section = project.sections[selected];
  const [showChordEditor, setShowChordEditor] = useState(false);
  const [error, setError] = useState("");
  const taps = useRef<number[]>([]);
  const patch = (changes: Partial<SongSection>) =>
    onUpdateSections(
      project.sections.map((s, i) =>
        i === selected ? { ...s, ...changes } : s,
      ),
    );
  const record = async () => {
    try {
      const next = !songSequencer.getIsRecordingSolo();
      if (next && !songSequencer.getIsPlaying()) await songSequencer.start();
      songSequencer.setIsRecordingSolo(next);
    } catch {
      setError("Kayıt için ses başlatılamadı.");
    }
  };
  const tapTempo = () => {
    const now = performance.now();
    taps.current = taps.current.filter((t) => now - t < 2500);
    taps.current.push(now);
    if (taps.current.length > 1) {
      const bpm = Math.round(
        60000 / ((now - taps.current[0]) / (taps.current.length - 1)),
      );
      if (bpm >= 40 && bpm <= 220) onUpdate({ bpm });
    }
  };
  const lanes = ["RIFF", "RİTİM", "SOLO", "DAVUL"];
  return (
    <div className="hardware-workspace">
      <section
        className="groovebox-console"
        aria-label="SongWriter Pro Groovebox cihazı"
      >
        <div className="console-name">
          <span>
            SONGWRITER <strong>PRO</strong>
          </span>
          <span>GROOVEBOX / 64</span>
          <i className={state.isPlaying ? "running" : ""} />
        </div>
        <div className="console-knobs">
          <RotaryKnob
            label="ANA SES"
            value={project.volume}
            onChange={(volume) => onUpdate({ volume })}
          />
          <RotaryKnob
            label="RIFF SESİ"
            value={project.mix.chordVolume}
            max={1.2}
            onChange={(chordVolume) => onMixChange({ chordVolume })}
          />
          <RotaryKnob
            label="SOLO SESİ"
            value={project.mix.soloVolume}
            max={1.2}
            onChange={(soloVolume) => onMixChange({ soloVolume })}
          />
          <RotaryKnob
            label="DAVUL SESİ"
            value={project.mix.drumVolume}
            max={1.2}
            onChange={(drumVolume) => onMixChange({ drumVolume })}
          />
          <RotaryKnob
            label="REVERB"
            value={project.mix.reverbWet}
            max={0.3}
            onChange={(reverbWet) => onMixChange({ reverbWet })}
          />
          <RotaryKnob
            label="PARLAKLIK"
            value={project.mix.brightness}
            min={0.1}
            onChange={(brightness) => onMixChange({ brightness })}
          />
          <RotaryKnob
            label="TELLEME"
            value={project.mix.strumSpeedMs}
            min={8}
            max={60}
            step={1}
            display={`${project.mix.strumSpeedMs} ms`}
            onChange={(strumSpeedMs) => onMixChange({ strumSpeedMs })}
          />
          <RotaryKnob
            label="SWING"
            value={project.swing}
            max={0.4}
            onChange={(swing) => onUpdate({ swing })}
          />
        </div>
        <div className="console-screen-row">
          <div className="console-tempo">
            <span>TEMPO</span>
            <input
              type="number"
              aria-label="Groovebox tempo BPM"
              min="40"
              max="220"
              value={project.bpm}
              onChange={(e) => {
                const bpm = +e.target.value;
                if (bpm >= 40 && bpm <= 220) onUpdate({ bpm });
              }}
            />
            <button onClick={tapTempo}>TAP</button>
          </div>
          <div className="console-screen" aria-label="Canlı aranje ekranı">
            <div className="screen-status">
              <span>{project.name}</span>
              <strong>{section.name}</strong>
              <span>
                {project.root} / {project.scaleId}
              </span>
              <b>
                {state.countInBeat
                  ? `COUNT ${state.countInBeat}`
                  : state.isPlaying
                    ? "PLAY"
                    : "STOP"}{" "}
                · {state.currentRepeat + 1}/{section.repeats}
              </b>
            </div>
            <div className="screen-arrangement">
              <div className="screen-track-names">
                {lanes.map((lane) => (
                  <span key={lane}>{lane}</span>
                ))}
              </div>
              <div className="screen-scenes">
                {project.sections.map((s, index) => {
                  const melodic = project.notes.filter(
                    (n) => n.sectionId === s.id && n.instrument !== "drums",
                  ).length;
                  const drums = project.notes.filter(
                    (n) => n.sectionId === s.id && n.instrument === "drums",
                  ).length;
                  return (
                    <button
                      key={s.id}
                      className={`screen-scene scene-color-${index % 8} ${index === selected ? "selected" : ""} ${state.queuedSectionIndex === index ? "queued" : ""}`}
                      aria-label={`${s.name} sahnesini başlat`}
                      aria-pressed={index === selected}
                      onClick={() => onSelectSection(index)}
                    >
                      <span className="screen-clip riff-clip">
                        {s.chords.join(" ")}
                      </span>
                      <span
                        className={`screen-clip ${s.drumMode === "mute" ? "empty-clip" : ""}`}
                      >
                        {s.drumMode === "mute" ? "—" : "● ● ● ●"}
                      </span>
                      <span
                        className={`screen-clip ${melodic ? "" : "empty-clip"}`}
                      >
                        {melodic ? `${melodic} NOTA` : "—"}
                      </span>
                      <span
                        className={`screen-clip ${drums ? "" : "empty-clip"}`}
                      >
                        {drums ? `${drums} VURUŞ` : "—"}
                      </span>
                      <span className="screen-scene-name">
                        {index + 1} {s.name} · ×{s.repeats}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="screen-step-strip">
              {Array.from({ length: 16 }, (_, i) => (
                <i
                  key={i}
                  className={
                    state.isPlaying && state.currentStep === i ? "current" : ""
                  }
                />
              ))}
              <span>
                ÖLÇÜ {state.currentChordIndex + 1} · {activeChord.name}
              </span>
            </div>
          </div>
          <div className="console-loop">
            <span>DÖNGÜ</span>
            <div>
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  className={section.repeats === n ? "active" : ""}
                  aria-pressed={section.repeats === n}
                  onClick={() => patch({ repeats: n })}
                >
                  ×{n}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="console-bottom">
          <aside
            className="console-left"
            aria-label="Transport ve pad dinamiği"
          >
            <button
              className={`device-key play-key ${state.isPlaying ? "active" : ""}`}
              aria-label="Groovebox çal durdur"
              disabled={busy}
              onClick={onTogglePlay}
            >
              {state.isPlaying ? <Square size={22} /> : <Play size={22} />}
              <span>
                {busy ? "YÜKLENİYOR" : state.isPlaying ? "DURDUR" : "ÇAL"}
              </span>
            </button>
            <button
              className={`device-key record-key ${state.isRecording ? "active" : ""}`}
              aria-pressed={state.isRecording}
              onClick={() => void record()}
            >
              <Circle size={20} />
              <span>KAYIT</span>
            </button>
            <button
              className="device-key"
              aria-label="Groovebox başa sar"
              onClick={() => {
                songSequencer.stop();
                onSelectSection(0);
              }}
            >
              <RotateCcw size={18} />
              <span>BAŞA SAR</span>
            </button>
            <div className="console-aux">
              <button
                className={project.metronomeOn ? "active" : ""}
                aria-label="Metronom"
                aria-pressed={!!project.metronomeOn}
                onClick={() => onUpdate({ metronomeOn: !project.metronomeOn })}
              >
                CLICK
              </button>
              <button
                className={project.countInBars ? "active" : ""}
                aria-label="Bir ölçü ön sayım"
                aria-pressed={!!project.countInBars}
                onClick={() =>
                  onUpdate({ countInBars: project.countInBars ? 0 : 1 })
                }
              >
                1 BAR
              </button>
            </div>
            <label className="console-velocity">
              <span>PAD GÜCÜ</span>
              <input
                aria-label="Pad vuruş gücü"
                type="range"
                min="0.1"
                max="1"
                step="0.01"
                value={project.padVelocity ?? 0.9}
                onChange={(e) => onUpdate({ padVelocity: +e.target.value })}
              />
              <output>{Math.round((project.padVelocity ?? 0.9) * 100)}%</output>
            </label>
            <span className="console-model">
              SWP
              <br />
              64
              <br />
              <small>
                PERFORMANCE
                <br />
                WORKSTATION
              </small>
            </span>
          </aside>
          <SoloKeyboard
            hardware
            section={section}
            state={state}
            currentRoot={project.root}
            currentScaleId={project.scaleId}
            activeChord={activeChord}
            instrument={project.soloInstrument}
            harmonyMode={project.soloMode || "chord-tones"}
            onHarmonyChange={(soloMode) => onUpdate({ soloMode })}
            sectionId={section.id}
            sectionName={section.name}
            onInstrumentChange={(soloInstrument) =>
              onUpdate({ soloInstrument })
            }
            velocity={project.padVelocity ?? 0.9}
            isPlaying={state.isPlaying}
          />
          <aside
            className="console-right"
            aria-label="Groovebox çalışma araçları"
          >
            <div className="device-key-bank">
              <button
                className="device-key"
                onClick={() => onOpenPanel("presets")}
              >
                <Library size={17} />
                <span>PRESET</span>
              </button>
              <button
                className="device-key"
                onClick={() => onOpenPanel("lyrics")}
              >
                <NotebookPen size={17} />
                <span>SÖZLER</span>
              </button>
              <button
                className="device-key"
                onClick={() => onOpenPanel("project")}
              >
                <FolderOpen size={17} />
                <span>PROJE</span>
              </button>
              <button
                className={`device-key ${showChordEditor ? "active" : ""}`}
                aria-pressed={showChordEditor}
                onClick={() => setShowChordEditor(!showChordEditor)}
              >
                <Music2 size={17} />
                <span>AKORLAR</span>
              </button>
            </div>
            <span className="console-side-label">RIFF ENSTRÜMANI</span>
            <div className="device-instruments">
              {(
                [
                  { id: "nylon", name: "Naylon gitar" },
                  { id: "steel", name: "Çelik gitar" },
                  { id: "piano", name: "Piyano" },
                ] as const
              ).map((i) => (
                <button
                  key={i.id}
                  className={project.riffInstrument === i.id ? "active" : ""}
                  aria-pressed={project.riffInstrument === i.id}
                  onClick={() => onUpdate({ riffInstrument: i.id })}
                >
                  {i.name}
                </button>
              ))}
            </div>
            <div className="device-track-switches">
              <button
                className={!project.mix.guitarMuted ? "active" : ""}
                aria-pressed={!project.mix.guitarMuted}
                onClick={() =>
                  onMixChange({ guitarMuted: !project.mix.guitarMuted })
                }
              >
                RIFF
              </button>
              <button
                className={project.percussionOn ? "active" : ""}
                aria-pressed={project.percussionOn}
                onClick={() =>
                  onUpdate({ percussionOn: !project.percussionOn })
                }
              >
                DAVUL
              </button>
              <button
                className={!project.mix.soloMuted ? "active" : ""}
                aria-pressed={!project.mix.soloMuted}
                onClick={() =>
                  onMixChange({ soloMuted: !project.mix.soloMuted })
                }
              >
                SOLO
              </button>
            </div>
            <button
              className={`device-key chain-key ${project.autoAdvance ? "active" : ""}`}
              aria-pressed={project.autoAdvance}
              onClick={() => onUpdate({ autoAdvance: !project.autoAdvance })}
            >
              <Repeat2 size={18} />
              <span>{project.autoAdvance ? "ZİNCİR AÇIK" : "KISIM LOOP"}</span>
            </button>
          </aside>
        </div>
        <div className="console-foot">
          <span>
            <SlidersHorizontal size={12} />
            RIFF + SOLO + ADIMLAR
          </span>
          <span>
            {state.queuedSectionIndex !== null
              ? `${project.sections[state.queuedSectionIndex]?.name} · SONRAKİ ÖLÇÜDE`
              : "SONGWRITER PRO · GROOVEBOX MOD 1"}
          </span>
          <span>4/4 · {project.notes.length} OLAY</span>
        </div>
      </section>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {showChordEditor && (
        <section className="panel console-chord-editor">
          <label>
            Riff deseni
            <select
              aria-label="Riff deseni"
              value={section.patternId}
              onChange={(e) => patch({ patternId: e.target.value })}
            >
              {Object.values(STRUM_PATTERNS).map((pattern) => (
                <option key={pattern.id} value={pattern.id}>
                  {pattern.name}
                </option>
              ))}
            </select>
          </label>
          <ChordEntry
            sectionId={section.id}
            chords={section.chords}
            onChange={(chords) => patch({ chords })}
          />
        </section>
      )}
    </div>
  );
}
