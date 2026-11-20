import { useState } from "react";
import {
  Copy,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Repeat,
  Music,
  Drum,
  Piano,
} from "lucide-react";
import { GuitarChord, SongSection, DrumMode } from "../types";
import { RecordedSoloNote, songSequencer } from "../audio/Sequencer";
import { GUITAR_CHORDS } from "../config/chords";
import { getDiatonicChords } from "../config/scales";
import { STRUM_PATTERNS } from "../config/patterns";
import { ChordEntry } from "./ChordEntry";
interface Props {
  sections: SongSection[];
  currentSectionIndex: number;
  onSelectSection: (index: number) => void;
  onUpdateSections: (sections: SongSection[]) => void;
  autoAdvanceSections: boolean;
  onToggleAutoAdvance: () => void;
  currentChordIndex: number;
  onSelectChord: (chord: GuitarChord) => void;
  currentRoot: string;
  currentScaleId: string;
  isPlaying: boolean;
  onTogglePlay: () => void;
  bpm: number;
  currentRepeat?: number;
  notes: RecordedSoloNote[];
  currentStep?: number;
}
export function StudioView({
  sections,
  currentSectionIndex,
  onSelectSection,
  onUpdateSections,
  autoAdvanceSections,
  onToggleAutoAdvance,
  currentChordIndex,
  onSelectChord,
  currentRoot,
  currentScaleId,
  isPlaying,
  currentRepeat = 0,
  notes,
  currentStep = 0,
}: Props) {
  const [newType, setNewType] = useState("Söz");
  const section = sections[currentSectionIndex] || sections[0];
  const palette = getDiatonicChords(currentRoot, currentScaleId);
  const patch = (changes: Partial<SongSection>) =>
    onUpdateSections(
      sections.map((s) => (s.id === section.id ? { ...s, ...changes } : s)),
    );
  const add = () => {
    if (sections.length >= 64) return;
    const id = crypto.randomUUID();
    onUpdateSections([
      ...sections,
      {
        id,
        name: newType,
        chords: [
          palette[0].chordId,
          palette[3].chordId,
          palette[4].chordId,
          palette[0].chordId,
        ],
        patternId: "folk-rock",
        repeats: 2,
        drumMode: "cajon-shaker",
        color: "from-blue-600 to-cyan-700",
      },
    ]);
    onSelectSection(sections.length);
  };
  const duplicate = () => {
    const id = crypto.randomUUID();
    const clone = {
      ...section,
      id,
      name: `${section.name} kopya`,
      chords: [...section.chords],
    };
    const next = [...sections];
    next.splice(currentSectionIndex + 1, 0, clone);
    onUpdateSections(next);
    songSequencer.setRecordedNotes([
      ...songSequencer.getRecordedNotes(),
      ...notes
        .filter((n) => n.sectionId === section.id)
        .map((n) => ({
          ...n,
          id: crypto.randomUUID(),
          sectionId: id,
          sectionIndex: currentSectionIndex + 1,
        })),
    ]);
    onSelectSection(currentSectionIndex + 1);
  };
  const remove = () => {
    if (sections.length > 1) {
      onUpdateSections(sections.filter((s) => s.id !== section.id));
      onSelectSection(Math.min(currentSectionIndex, sections.length - 2));
    }
  };
  const move = (offset: number) => {
    const index = currentSectionIndex + offset;
    if (index < 0 || index >= sections.length) return;
    const next = [...sections];
    [next[index], next[currentSectionIndex]] = [
      next[currentSectionIndex],
      next[index],
    ];
    onUpdateSections(next);
    onSelectSection(index);
  };
  let totalBars = 0;
  const spans = sections.map((s) => {
    const start = totalBars + 1;
    totalBars += s.chords.length * s.repeats;
    return { start, end: totalBars };
  });
  const sectionNotes = notes.filter((n) => n.sectionId === section.id);
  return (
    <div className="studio-arranger">
      <section className="panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ARRANGEMENT</span>
            <h3>
              Parçanın akışı <span className="muted">{totalBars} ölçü</span>
            </h3>
          </div>
          <div className="control-row">
            <button
              className={`button ${autoAdvanceSections ? "selected" : ""}`}
              aria-pressed={autoAdvanceSections}
              onClick={onToggleAutoAdvance}
            >
              <Repeat size={16} />
              {autoAdvanceSections
                ? "Kısımları sırayla çal"
                : "Seçili kısmı döndür"}
            </button>
            <select
              aria-label="Yeni kısım türü"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
            >
              {["Giriş", "Söz", "Nakarat", "Köprü", "Solo", "Çıkış"].map(
                (name) => (
                  <option key={name}>{name}</option>
                ),
              )}
            </select>
            <button
              className="button primary"
              onClick={add}
              disabled={sections.length >= 64}
            >
              <Plus size={16} />
              Kısım ekle
            </button>
          </div>
        </div>
        <div className="timeline-scroll">
          <div className="timeline">
            <div className="track-row ruler">
              <div className="track-label">4/4 · ÖLÇÜLER</div>
              <div className="lane-clips">
                {sections.map((s, index) => (
                  <div
                    className="ruler-span"
                    key={s.id}
                    style={{ flex: `${s.chords.length * s.repeats} 0 0` }}
                  >
                    {spans[index].start}–{spans[index].end}
                    <span>{s.repeats}×</span>
                  </div>
                ))}
              </div>
            </div>
            {(["riff", "drums", "recorded-drums", "solo"] as const).map(
              (track) => (
                <div className={`track-row ${track}`} key={track}>
                  <div className="track-label">
                    {track === "riff" ? (
                      <Piano size={18} />
                    ) : track === "drums" || track === "recorded-drums" ? (
                      <Drum size={18} />
                    ) : (
                      <Music size={18} />
                    )}
                    <div>
                      <strong>
                        {track === "riff"
                          ? "Riff & akor"
                          : track === "drums"
                            ? "Ritim"
                            : track === "recorded-drums"
                              ? "Davul kaydı"
                              : "Solo"}
                      </strong>
                      <span>
                        {track === "solo"
                          ? `${notes.filter((n) => n.instrument !== "drums").length} kayıtlı nota`
                          : track === "recorded-drums"
                            ? `${notes.filter((n) => n.instrument === "drums").length} kayıtlı vuruş`
                            : track === "riff"
                              ? "Gitar / piyano"
                              : "Akustik perküsyon"}
                      </span>
                    </div>
                  </div>
                  <div className="lane-clips">
                    {sections.map((s, index) => {
                      const recorded = notes.filter(
                        (n) =>
                          n.sectionId === s.id &&
                          (track === "recorded-drums"
                            ? n.instrument === "drums"
                            : n.instrument !== "drums"),
                      );
                      const progress =
                        ((currentRepeat * s.chords.length +
                          currentChordIndex +
                          currentStep / 16) /
                          (s.chords.length * s.repeats)) *
                        100;
                      return (
                        <button
                          key={s.id}
                          className={`timeline-clip ${index === currentSectionIndex ? "selected-clip" : ""}`}
                          style={{ flex: `${s.chords.length * s.repeats} 0 0` }}
                          onClick={() => onSelectSection(index)}
                          aria-label={`${s.name} ${track} kanalı`}
                        >
                          <span className="clip-title">{s.name}</span>
                          {track === "riff" ? (
                            <span className="clip-chords">
                              {s.chords.join(" · ")}
                            </span>
                          ) : track === "drums" ? (
                            <span className="clip-chords">
                              {s.drumMode === "mute" ? "Kapalı" : s.drumMode}
                            </span>
                          ) : (
                            <>
                              <span className="clip-chords">
                                {recorded.length
                                  ? `${recorded.length} ${track === "recorded-drums" ? "vuruş" : "nota"}`
                                  : track === "recorded-drums"
                                    ? "Henüz davul kaydı yok"
                                    : "Henüz solo yok"}
                              </span>
                              <span className="mini-roll">
                                {recorded.map((n) => (
                                  <i
                                    key={n.id}
                                    style={{
                                      left: `${((n.barIndex * 16 + n.step) / (s.chords.length * 16)) * 96}%`,
                                      bottom: `${((n.midi % 12) / 12) * 70}%`,
                                    }}
                                  />
                                ))}
                              </span>
                            </>
                          )}
                          {isPlaying && index === currentSectionIndex && (
                            <span
                              className="playhead"
                              style={{ left: `${Math.min(100, progress)}%` }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
        <p className="muted timeline-help">
          Kısma tıklayarak seçin. Çalma sırasında geçiş bir sonraki ölçü başında
          yapılır. Solo şeridi kayıtlı notaları gösterir.
        </p>
      </section>
      <section className="panel section-editor">
        <div className="section-heading">
          <div>
            <span className="eyebrow">SECTION EDITOR</span>
            <h3>{section.name}</h3>
          </div>
          <div className="control-row">
            <button
              className="icon-button"
              aria-label="Kısmı öne taşı"
              disabled={currentSectionIndex === 0}
              onClick={() => move(-1)}
            >
              <ChevronUp size={18} />
            </button>
            <button
              className="icon-button"
              aria-label="Kısmı arkaya taşı"
              disabled={currentSectionIndex === sections.length - 1}
              onClick={() => move(1)}
            >
              <ChevronDown size={18} />
            </button>
            <button className="button" onClick={duplicate}>
              <Copy size={15} />
              Kopyala
            </button>
            <button
              className="button danger"
              disabled={sections.length <= 1}
              onClick={remove}
            >
              <Trash2 size={15} />
              Sil
            </button>
          </div>
        </div>
        <div className="section-editor-controls">
          <label>
            Kısım adı
            <input
              aria-label="Kısım adı"
              value={section.name}
              maxLength={120}
              onChange={(e) => patch({ name: e.target.value || "Adsız kısım" })}
            />
          </label>
          <label>
            Döngü tekrarı
            <div className="segmented">
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
          </label>
          <label>
            Riff deseni
            <select
              aria-label="Studio riff deseni"
              value={section.patternId}
              onChange={(e) => patch({ patternId: e.target.value })}
            >
              {Object.values(STRUM_PATTERNS).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ritim
            <select
              aria-label="Kısım ritmi"
              value={section.drumMode}
              onChange={(e) => patch({ drumMode: e.target.value as DrumMode })}
            >
              {[
                { id: "full", label: "Tam ritim" },
                { id: "cajon-shaker", label: "Kahon + shaker" },
                { id: "shaker-only", label: "Shaker" },
                { id: "flamenco", label: "Flamenko" },
                { id: "mute", label: "Kapalı" },
              ].map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="editable-chords">
          {section.chords.map((id, index) => (
            <div className="editable-chord" key={`${id}-${index}`}>
              <button
                className="button"
                onClick={() => onSelectChord(GUITAR_CHORDS[id])}
              >
                {index + 1}. {id}
              </button>
              <button
                aria-label={`${index + 1}. Studio akorunu kaldır`}
                disabled={section.chords.length <= 1}
                onClick={() =>
                  patch({
                    chords: section.chords.filter((_, i) => index !== i),
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
          {palette.map((c) => (
            <button
              className="button"
              key={c.degree}
              disabled={section.chords.length >= 64}
              onClick={() => patch({ chords: [...section.chords, c.chordId] })}
            >
              {c.roman} · {c.chordId}
            </button>
          ))}
        </div>
        <ChordEntry
          sectionId={section.id}
          chords={section.chords}
          onChange={(chords) => patch({ chords })}
        />
        <p className="muted">
          Bu kısımda {sectionNotes.length} solo notası var. Kopyalama solo
          notalarını da taşır.
        </p>
      </section>
    </div>
  );
}
