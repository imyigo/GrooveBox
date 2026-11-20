import { Guitar, Piano, Repeat } from "lucide-react";
import { SongProject } from "../project";
import { SequencerState } from "../audio/Sequencer";
import { GuitarChord, SongSection } from "../types";
import { STRUM_PATTERNS } from "../config/patterns";
import { GUITAR_CHORDS } from "../config/chords";
import { getDiatonicChords } from "../config/scales";
import { SoloKeyboard } from "./SoloKeyboard";
import { audioEngine } from "../audio/AudioEngine";
import { strumEngine } from "../audio/StrumEngine";
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
}
export function GrooveboxView({
  project,
  state,
  selected,
  activeChord,
  onSelectSection,
  onUpdateSections,
  onUpdate,
  onPreviewChord,
}: Props) {
  const section = project.sections[selected];
  const palette = getDiatonicChords(project.root, project.scaleId);
  const updateSection = (changes: Partial<SongSection>) =>
    onUpdateSections(
      project.sections.map((s, index) =>
        index === selected ? { ...s, ...changes } : s,
      ),
    );
  const preview = async (id: string) => {
    onPreviewChord(id);
    await audioEngine.unlock();
    await audioEngine.ready();
    strumEngine.strumChord(GUITAR_CHORDS[id], { stroke: "down" });
  };
  return (
    <div className="groovebox-space">
      <section className="panel arrangement-bar">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ARRANJE BAR</span>
            <h3>Kısımlar ve döngüler</h3>
          </div>
          <button
            className={`button ${project.autoAdvance ? "selected" : ""}`}
            aria-pressed={project.autoAdvance}
            onClick={() => onUpdate({ autoAdvance: !project.autoAdvance })}
          >
            <Repeat size={16} />
            {project.autoAdvance ? "Sırayla geçiş" : "Seçili kısmı döndür"}
          </button>
        </div>
        <div className="scene-grid">
          {project.sections.map((s, index) => (
            <button
              key={s.id}
              className={`scene-card ${index === selected ? "active" : ""} ${state.queuedSectionIndex === index ? "queued" : ""}`}
              onClick={() => onSelectSection(index)}
              aria-pressed={index === selected}
            >
              <span className="scene-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <strong>{s.name}</strong>
              <span>{s.chords.join(" · ")}</span>
              <span className="scene-meta">
                {s.repeats}× döngü{" "}
                <span>
                  {state.queuedSectionIndex === index
                    ? "Sonraki ölçüde"
                    : state.isPlaying && index === selected
                      ? `${state.currentRepeat + 1}/${s.repeats} çalıyor`
                      : `${s.chords.length * s.repeats} ölçü`}
                </span>
              </span>
            </button>
          ))}
        </div>
        <div className="control-row section-controls">
          <span className="muted">{section.name} tekrar:</span>
          <div className="segmented">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                aria-pressed={section.repeats === n}
                className={section.repeats === n ? "active" : ""}
                onClick={() => updateSection({ repeats: n })}
              >
                ×{n}
              </button>
            ))}
          </div>
          <label>
            Riff deseni
            <select
              aria-label="Riff deseni"
              value={section.patternId}
              onChange={(e) => updateSection({ patternId: e.target.value })}
            >
              {Object.values(STRUM_PATTERNS).map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <p className="muted">Geçişler ölçü başında yapılır.</p>
        </div>
      </section>
      <section className="panel riff-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">RIFF ENGINE</span>
            <h3>Eşliğini oluştur</h3>
          </div>
          <div className="segmented" aria-label="Riff enstrümanı">
            {(
              [
                { id: "nylon", name: "Naylon gitar", icon: Guitar },
                { id: "steel", name: "Çelik gitar", icon: Guitar },
                { id: "piano", name: "Piyano", icon: Piano },
              ] as const
            ).map(({ id, name, icon: Icon }) => (
              <button
                className={project.riffInstrument === id ? "active" : ""}
                aria-pressed={project.riffInstrument === id}
                key={id}
                onClick={() => onUpdate({ riffInstrument: id })}
              >
                <Icon size={16} />
                {name}
              </button>
            ))}
          </div>
        </div>
        <div className="chord-pads">
          {section.chords.map((id, index) => (
            <div className="chord-slot" key={`${id}-${index}`}>
              <button
                className={`chord-pad ${state.isPlaying && state.currentChordIndex === index ? "sounding" : ""}`}
                onClick={() => void preview(id)}
              >
                <span>{index + 1}. ölçü</span>
                <strong>{id}</strong>
                <span>Çal</span>
              </button>
              <button
                className="remove-chord"
                disabled={section.chords.length <= 1}
                aria-label={`${index + 1}. akoru kaldır`}
                onClick={() =>
                  updateSection({
                    chords: section.chords.filter((_, i) => i !== index),
                  })
                }
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="chord-palette">
          <span className="muted">Tona uygun akor ekle</span>
          {palette.map((chord) => (
            <button
              className="button"
              key={chord.degree}
              onClick={() => {
                if (section.chords.length >= 64) return;
                updateSection({ chords: [...section.chords, chord.chordId] });
                void preview(chord.chordId);
              }}
            >
              <span className="muted">{chord.roman}</span>
              {chord.chordId}
            </button>
          ))}
        </div>
        <ChordEntry
          sectionId={section.id}
          chords={section.chords}
          onChange={(chords) => updateSection({ chords })}
        />
      </section>
      <SoloKeyboard
        currentRoot={project.root}
        currentScaleId={project.scaleId}
        activeChord={activeChord}
        instrument={project.soloInstrument}
        harmonyMode={project.soloMode || "chord-tones"}
        onHarmonyChange={(soloMode) => onUpdate({ soloMode })}
        sectionId={section.id}
        sectionName={section.name}
        onInstrumentChange={(soloInstrument) => onUpdate({ soloInstrument })}
        isPlaying={state.isPlaying}
      />
    </div>
  );
}
