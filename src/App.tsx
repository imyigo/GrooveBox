import { useEffect, useRef, useState } from "react";
import { Download, FolderOpen, RotateCcw, Save } from "lucide-react";
import { Header, AppViewMode } from "./components/Header";
import { GrooveboxView } from "./components/GrooveboxView";
import { StudioView } from "./components/StudioView";
import { RecordingPanel } from "./components/RecordingPanel";
import { WavTrackPanel } from "./components/WavTrackPanel";
import { readSavedProject, saveProject } from "./projectStorage";
import { Mixer } from "./components/Mixer";
import { SongIdeaPanel } from "./components/SongIdeaPanel";
import { LyricsPanel } from "./components/LyricsPanel";
import { SongStyle, ideaChords, ideaSections } from "./config/songIdeas";
import { audioEngine } from "./audio/AudioEngine";
import { sampledGuitarEngine } from "./audio/SampledGuitarEngine";
import { songSequencer, SequencerState } from "./audio/Sequencer";
import { GUITAR_CHORDS, noteSemitone } from "./config/chords";
import { MUSICAL_SCALES, ROOT_NOTES } from "./config/scales";
import { changeSongKey, mapMidiToKey } from "./config/harmony";
import { SongSection } from "./types";
import {
  createProject,
  parseProject,
  SongProject,
  STORAGE_KEY,
  downloadBlob,
  MixSettings,
} from "./project";

function loadProject(): SongProject {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return parseProject(saved);
  } catch {
    /* A damaged or unavailable cache must not prevent startup. */
  }
  return createProject();
}
export default function App() {
  const [project, setProject] = useState<SongProject>(loadProject);
  const [mode, setMode] = useState<AppViewMode>("groovebox");
  const [transport, setTransport] = useState<SequencerState>(() =>
    songSequencer.getState(),
  );
  const [selected, setSelected] = useState(0);
  const [previewChord, setPreviewChord] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [drawer, setDrawer] = useState<"project" | "presets" | "lyrics" | null>(
    null,
  );
  const [undoIdea, setUndoIdea] = useState<{
    project: SongProject;
    selected: number;
  } | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const projectRef = useRef(project);
  const busyRef = useRef(false);
  projectRef.current = project;

  useEffect(() => {
    let cancelled = false;
    void readSavedProject()
      .then((saved) => {
        if (cancelled || !saved) return;
        songSequencer.setSections(saved.sections);
        songSequencer.setRecordedNotes(saved.notes);
        songSequencer.setSectionIndex(0);
        setProject(saved);
      })
      .catch(() => {
        if (!cancelled)
          setMessage(
            "Önceki proje okunamadı. İndirdiğiniz proje dosyasını açabilirsiniz.",
          );
      })
      .finally(() => {
        if (!cancelled) setStorageReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    audioEngine.setWavTrack(project.audioTrack);
  }, [project.audioTrack]);

  useEffect(() => {
    sampledGuitarEngine.allowedPitchClasses = MUSICAL_SCALES[
      project.scaleId
    ].intervals.map((n) => (n + noteSemitone(project.root)) % 12);
  }, [project.root, project.scaleId]);

  useEffect(() => {
    const initial = projectRef.current;
    songSequencer.setSections(initial.sections);
    songSequencer.setRecordedNotes(initial.notes);
    const offStep = songSequencer.onStep((state) => {
      setTransport(state);
      if (state.isPlaying) {
        setSelected(state.currentSectionIndex);
        setPreviewChord(null);
      }
    });
    const offNotes = songSequencer.onNotesChanged(() => {
      if (songSequencer.getIsRecordingSolo()) setUndoIdea(null);
      setProject((p) => ({ ...p, notes: songSequencer.getRecordedNotes() }));
    });
    return () => {
      offStep();
      offNotes();
      songSequencer.stop();
    };
  }, []);

  useEffect(() => {
    audioEngine.configure(project.mix, project.volume);
    audioEngine.setChordInstrument(project.riffInstrument);
    audioEngine.setSoloInstrument(project.soloInstrument);
    songSequencer.setBpm(project.bpm);
    songSequencer.setSwing(project.swing);
    songSequencer.setAutoAdvanceSections(project.autoAdvance);
    songSequencer.setPercussionEnabled(project.percussionOn);
    songSequencer.setGuitarMuted(project.mix.guitarMuted);
    songSequencer.setSoloMuted(project.mix.soloMuted);
    songSequencer.setMetronome(project.metronomeOn ?? false);
    songSequencer.setCountIn(project.countInBars ?? 0);
  }, [
    project.mix,
    project.volume,
    project.riffInstrument,
    project.soloInstrument,
    project.bpm,
    project.swing,
    project.autoAdvance,
    project.percussionOn,
    project.metronomeOn,
    project.countInBars,
  ]);

  useEffect(() => {
    if (!storageReady) return;
    const timer = setTimeout(() => {
      void saveProject(project)
        .then(() => setSaveStatus("Bu tarayıcıda kaydedildi"))
        .catch(() =>
          setSaveStatus(
            "Otomatik kayıt kullanılamıyor; proje dosyasını indirin.",
          ),
        );
    }, 400);
    return () => clearTimeout(timer);
  }, [project, storageReady]);

  const togglePlay = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setMessage("");
    try {
      await songSequencer.toggle();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Ses başlatılamadı.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.closest(
          'input, select, textarea, button, [contenteditable="true"], audio',
        ) ||
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return;
      if (event.code === "Space") {
        event.preventDefault();
        void togglePlay();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);

  const update = (changes: Partial<SongProject>) => {
    setUndoIdea(null);
    setProject((p) => ({ ...p, ...changes }));
  };
  const updateSections = (sections: SongSection[]) => {
    setUndoIdea(null);
    songSequencer.setSections(sections);
    setProject((p) => ({
      ...p,
      sections,
      notes: songSequencer.getRecordedNotes(),
    }));
    setSelected(Math.min(selected, sections.length - 1));
  };
  const selectSection = (index: number) => {
    if (transport.isPlaying) songSequencer.queueSection(index);
    else {
      songSequencer.setSectionIndex(index);
      setSelected(index);
      setPreviewChord(null);
    }
  };
  const changeKey = (root: string, scaleId: string) => {
    setUndoIdea(null);
    const p = projectRef.current;
    const wasPlaying = songSequencer.getIsPlaying();
    songSequencer.stop();
    const sections = changeSongKey(
      p.sections,
      p.root,
      p.scaleId,
      root,
      scaleId,
    );
    const notes = p.notes.map((note) => ({
      ...note,
      midi:
        note.instrument === "drums" || note.harmonyMode === "chromatic"
          ? note.midi
          : mapMidiToKey(note.midi, p.root, p.scaleId, root, scaleId),
    }));
    songSequencer.setSections(sections);
    songSequencer.setRecordedNotes(notes);
    songSequencer.setSectionIndex(Math.min(selected, sections.length - 1));
    setProject({ ...p, root, scaleId, sections, notes });
    setPreviewChord(null);
    if (wasPlaying)
      void songSequencer
        .start()
        .catch(() =>
          setMessage("Yeni tonda çalmayı başlatmak için Çal düğmesine basın."),
        );
  };
  const exportProject = () =>
    downloadBlob(
      new Blob([JSON.stringify(projectRef.current, null, 2)], {
        type: "application/json",
      }),
      `songwriter-pro-${Date.now()}.json`,
    );
  const restoreProject = (next: SongProject, index = 0) => {
    songSequencer.stop();
    songSequencer.setIsRecordingSolo(false);
    songSequencer.setSections(next.sections);
    songSequencer.setRecordedNotes(next.notes);
    songSequencer.setSectionIndex(index);
    setProject(next);
    setSelected(index);
    setPreviewChord(null);
  };
  const applyIdea = (
    style: SongStyle,
    variation: number,
    wholeSong: boolean,
  ) => {
    const current = projectRef.current;
    setUndoIdea({ project: current, selected });
    const mappedSections = changeSongKey(
      current.sections,
      current.root,
      current.scaleId,
      current.root,
      style.scaleId,
    );
    const sections = wholeSong
      ? ideaSections(style, current.root, variation)
      : mappedSections.map((s, index) =>
          index === selected
            ? {
                ...s,
                chords: ideaChords(style, current.root, variation),
                patternId: style.patternId,
              }
            : s,
        );
    const notes = wholeSong
      ? []
      : current.notes
          .map((note) => ({
            ...note,
            midi:
              note.instrument === "drums" || note.harmonyMode === "chromatic"
                ? note.midi
                : mapMidiToKey(
                    note.midi,
                    current.root,
                    current.scaleId,
                    current.root,
                    style.scaleId,
                  ),
          }))
          .filter((note) =>
            sections.some(
              (s) => s.id === note.sectionId && note.barIndex < s.chords.length,
            ),
          );
    restoreProject(
      {
        ...current,
        scaleId: style.scaleId,
        bpm: style.bpm,
        riffInstrument: style.instrument,
        sections,
        notes,
      },
      wholeSong ? 0 : selected,
    );
    setMessage(
      `${style.name} eşliği hazır. Çal düğmesine basıp söz veya melodi deneyebilirsin.`,
    );
  };
  const importProject = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > 32 * 1024 * 1024)
        throw new Error("Proje dosyası 32 MB sınırını aşıyor.");
      const loaded = parseProject(await file.text());
      songSequencer.stop();
      songSequencer.setIsRecordingSolo(false);
      songSequencer.setSections(loaded.sections);
      songSequencer.setRecordedNotes(loaded.notes);
      songSequencer.setSectionIndex(0);
      setProject(loaded);
      setUndoIdea(null);
      setSelected(0);
      setPreviewChord(null);
      setMessage("Proje açıldı.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Proje açılamadı.");
    }
    if (importInput.current) importInput.current.value = "";
  };
  const section = project.sections[selected] || project.sections[0];
  const chordId =
    previewChord ||
    section.chords[
      transport.isPlaying && transport.currentSectionIndex === selected
        ? transport.currentChordIndex
        : 0
    ];
  const activeChord = GUITAR_CHORDS[chordId] || GUITAR_CHORDS.Am;
  const changeMix = (changes: Partial<MixSettings>) =>
    setProject((p) => ({ ...p, mix: { ...p.mix, ...changes } }));
  if (!storageReady)
    return (
      <main className="workspace">
        <section className="panel" role="status">
          SongWriter Pro · Proje açılıyor…
        </section>
      </main>
    );

  return (
    <div className="songwriter-app" data-mode={mode}>
      <Header
        mode={mode}
        onModeChange={setMode}
        isPlaying={transport.isPlaying}
        onTogglePlay={() => void togglePlay()}
        busy={busy}
        volume={project.volume}
        onVolumeChange={(volume) => update({ volume })}
        recording={recording}
      />
      <main className="workspace">
        <details
          className="project-drawer"
          open={mode === "studio" || drawer === "project"}
        >
          <summary
            onClick={(e) => {
              if (mode === "groovebox") {
                e.preventDefault();
                setDrawer(drawer === "project" ? null : "project");
              }
            }}
          >
            {project.name}
            <span>
              {project.bpm} BPM · {project.root} · PROJE / DOSYALAR
            </span>
          </summary>
          <section
            className="project-bar panel"
            aria-label="Proje ve global müzik ayarları"
          >
            <label className="project-name">
              <span className="eyebrow">PROJE</span>
              <input
                aria-label="Proje adı"
                maxLength={120}
                value={project.name}
                onChange={(e) =>
                  update({ name: e.target.value || "Adsız beste" })
                }
              />
              <span className="save-status" role="status">
                <Save size={12} />
                {saveStatus}
              </span>
            </label>
            <div className="control-row global-controls">
              <details className="global-harmony">
                <summary>Ton / gam · isteğe bağlı</summary>
                <div className="control-row">
                  <label>
                    Global ton
                    <select
                      aria-label="Global ton"
                      value={project.root}
                      onChange={(e) =>
                        changeKey(e.target.value, project.scaleId)
                      }
                    >
                      {ROOT_NOTES.map((root) => (
                        <option key={root}>{root}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Global gam
                    <select
                      aria-label="Global gam"
                      value={project.scaleId}
                      onChange={(e) => changeKey(project.root, e.target.value)}
                    >
                      {Object.values(MUSICAL_SCALES).map((scale) => (
                        <option key={scale.id} value={scale.id}>
                          {scale.name.split(" (")[0]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </details>
              <label>
                Tempo
                <input
                  aria-label="Tempo BPM"
                  type="number"
                  min={40}
                  max={220}
                  value={project.bpm}
                  onChange={(e) => {
                    const value = +e.target.value;
                    if (value >= 40 && value <= 220) update({ bpm: value });
                  }}
                />
              </label>
            </div>
            <div className="control-row project-actions">
              <input
                className="sr-only"
                ref={importInput}
                type="file"
                accept=".json,application/json"
                onChange={(e) => void importProject(e.target.files?.[0])}
              />
              <button
                className="button"
                onClick={() => importInput.current?.click()}
              >
                <FolderOpen size={16} />
                Proje aç
              </button>
              <button className="button" onClick={exportProject}>
                <Download size={16} />
                Proje indir
              </button>
            </div>
          </section>
        </details>
        <p className="global-note">
          Ton ve gam bütün kısımlar için ortaktır. Değişiklik akorları ve
          kayıtlı melodiyi birlikte uyarlar.
        </p>
        {message && (
          <div className="notice" role="status">
            {message}
            <button aria-label="Bildirimi kapat" onClick={() => setMessage("")}>
              ×
            </button>
          </div>
        )}
        <div className="workspace-heading">
          <div>
            <span className="eyebrow">
              {mode === "groovebox"
                ? "PLAY / WRITE / EXPLORE"
                : "ARRANGE / MIX / RECORD"}
            </span>
            <h2>{mode === "groovebox" ? "Groovebox" : "Studio"}</h2>
            <p>
              {mode === "groovebox"
                ? "Riff’ini kur. Enstrümanını seç. Birlikte çal."
                : "Kısımları düzenle, parçanı kur ve sesini kaydet."}
            </p>
          </div>
          <div className="transport-position">
            <span
              className={transport.isPlaying ? "playing-dot" : "stopped-dot"}
            />
            {section.name}
            <strong>
              {transport.currentChordIndex + 1} :{" "}
              {String(transport.currentStep + 1).padStart(2, "0")}
            </strong>
            <button
              className="icon-button"
              aria-label="Başa sar"
              onClick={() => {
                songSequencer.stop();
                songSequencer.setSectionIndex(0);
                setSelected(0);
              }}
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
        {mode === "groovebox" && (
          <GrooveboxView
            project={project}
            state={transport}
            selected={selected}
            activeChord={activeChord}
            onSelectSection={selectSection}
            onUpdateSections={updateSections}
            onUpdate={update}
            onPreviewChord={setPreviewChord}
            onChangeKey={changeKey}
            onMixChange={changeMix}
            onTogglePlay={() => void togglePlay()}
            busy={busy}
            onOpenPanel={(panel) =>
              setDrawer((current) => (current === panel ? null : panel))
            }
          />
        )}
        {mode === "groovebox" && (
          <details className="console-drawer" open={drawer === "presets"}>
            <summary
              onClick={(e) => {
                e.preventDefault();
                setDrawer(drawer === "presets" ? null : "presets");
              }}
            >
              PRESET KÜTÜPHANESİ
            </summary>
            <SongIdeaPanel
              root={project.root}
              onApply={applyIdea}
              canUndo={!!undoIdea}
              onUndo={() => {
                if (undoIdea)
                  restoreProject(undoIdea.project, undoIdea.selected);
                setUndoIdea(null);
                setMessage("Son preset değişikliği geri alındı.");
              }}
            />
          </details>
        )}
        <div hidden={mode !== "studio"} className="studio-space">
          {mode === "studio" && (
            <StudioView
              sections={project.sections}
              currentSectionIndex={selected}
              onSelectSection={selectSection}
              onUpdateSections={updateSections}
              autoAdvanceSections={project.autoAdvance}
              onToggleAutoAdvance={() =>
                update({ autoAdvance: !project.autoAdvance })
              }
              currentChordIndex={transport.currentChordIndex}
              onSelectChord={(chord) => setPreviewChord(chord.id)}
              currentRoot={project.root}
              currentScaleId={project.scaleId}
              isPlaying={transport.isPlaying}
              onTogglePlay={() => void togglePlay()}
              bpm={project.bpm}
              currentRepeat={transport.currentRepeat}
              currentStep={transport.currentStep}
              notes={project.notes}
            />
          )}
          <RecordingPanel onRecordingChange={setRecording} />
          <WavTrackPanel
            track={project.audioTrack}
            onChange={(audioTrack) => update({ audioTrack })}
          />
        </div>
        <details
          className="console-drawer lyrics-drawer"
          open={mode === "studio" || drawer === "lyrics"}
        >
          <summary
            onClick={(e) => {
              if (mode === "groovebox") {
                e.preventDefault();
                setDrawer(drawer === "lyrics" ? null : "lyrics");
              }
            }}
          >
            SÖZ DEFTERİ · {section.name}
          </summary>
          <LyricsPanel
            section={section}
            onChange={(lyrics) => {
              setUndoIdea(null);
              setProject((p) => ({
                ...p,
                sections: p.sections.map((s) =>
                  s.id === section.id ? { ...s, lyrics } : s,
                ),
              }));
            }}
          />
        </details>
        <div hidden={mode === "groovebox"}>
          <Mixer
            mix={project.mix}
            onChange={changeMix}
            percussionOn={project.percussionOn}
            onPercussionChange={(percussionOn) => update({ percussionOn })}
            swing={project.swing}
            onSwingChange={(swing) => update({ swing })}
          />
        </div>
        <footer className="workspace-footer">
          <span>
            SongWriter Pro · {project.sections.length} kısım ·{" "}
            {project.notes.length} solo notası
          </span>
          <span>Boşluk: çal / durdur · Alt+R: solo kaydı · 4/4</span>
        </footer>
      </main>
    </div>
  );
}
