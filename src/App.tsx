import React, { useState, useEffect, useCallback } from 'react';
import { Header, AppViewMode } from './components/Header';
import { Fretboard } from './components/Fretboard';
import { ChordProgression } from './components/ChordProgression';
import { SequencerBar } from './components/SequencerBar';
import { SoloKeyboard } from './components/SoloKeyboard';
import { GUITAR_CHORDS } from './config/chords';
import { GUITAR_PRESETS } from './config/presets';
import { SongProgression } from './config/progressions';
import { songSequencer, SequencerState, DEFAULT_SONG_SECTIONS } from './audio/Sequencer';
import { audioEngine } from './audio/AudioEngine';
import { BodyPreset, GuitarChord, SongSection } from './types';
import { AcousticInstrumentType } from './audio/SampledGuitarEngine';

export const App: React.FC = () => {
  // Tam Stüdyo (Full Studio) is the DEFAULT experience!
  const [viewMode, setViewMode] = useState<AppViewMode>('full');

  // Sequencer & Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [bpm, setBpm] = useState<number>(104);
  const [swing, setSwing] = useState<number>(0.0);
  const [humanize] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(0.85);

  // Organic Rhythm (Cajon, Shaker, Tambourine)
  const [percussionOn, setPercussionOn] = useState<boolean>(true);

  // Chord Instrument (Nylon / Steel / Violin / Clarinet etc.)
  const [chordInstrument, setChordInstrument] = useState<AcousticInstrumentType>('nylon');

  // Musical Scale & Solo System
  const [currentRoot, setCurrentRoot] = useState<string>('A');
  const [currentScaleId, setCurrentScaleId] = useState<string>('minor');

  // Song Sections & Scenes
  const [sections, setSections] = useState<SongSection[]>(DEFAULT_SONG_SECTIONS);
  const [currentSectionIndex, setCurrentSectionIndex] = useState<number>(0);
  const [autoAdvanceSections, setAutoAdvanceSections] = useState<boolean>(true);
  const [currentRepeat, setCurrentRepeat] = useState<number>(0);

  // Active Chord & Preset
  const currentSection = sections[currentSectionIndex] || sections[0];
  const [currentChordIndex, setCurrentChordIndex] = useState<number>(0);
  const [activeChord, setActiveChord] = useState<GuitarChord>(GUITAR_CHORDS['Am']);
  const [currentPreset, setCurrentPreset] = useState<BodyPreset>(GUITAR_PRESETS[0]);

  // Step playhead & visual plucks
  const [, setCurrentStep] = useState<number>(0);
  const [activeStringPluck, setActiveStringPluck] = useState<{
    stringIndex: number;
    fret: number;
    id: number;
  } | null>(null);

  // Initialize Sequencer listeners
  useEffect(() => {
    songSequencer.setBpm(bpm);
    songSequencer.setSwing(swing);
    songSequencer.setHumanize(humanize);
    songSequencer.setPercussionEnabled(percussionOn);
    songSequencer.setAutoAdvanceSections(autoAdvanceSections);

    const unsubscribeStep = songSequencer.onStep((state: SequencerState) => {
      setIsPlaying(state.isPlaying);
      setCurrentSectionIndex(state.currentSectionIndex);
      setCurrentChordIndex(state.currentChordIndex);
      setCurrentStep(state.currentStep);
      setCurrentRepeat(state.currentRepeat);

      const sec = songSequencer.getCurrentSection();
      if (state.isPlaying && sec && sec.chords[state.currentChordIndex]) {
        const chord = GUITAR_CHORDS[sec.chords[state.currentChordIndex]];
        if (chord) {
          setActiveChord(chord);
        }
      }
    });

    const unsubscribePluck = songSequencer.onStringPluck((stringIndex, fret) => {
      setActiveStringPluck({ stringIndex, fret, id: Date.now() + Math.random() });
    });

    return () => {
      unsubscribeStep();
      unsubscribePluck();
      songSequencer.stop();
    };
  }, []);

  // Handlers
  const handleTogglePlay = useCallback(() => {
    audioEngine.unlock();
    const playing = songSequencer.toggle();
    setIsPlaying(playing);
  }, []);

  const handleBpmChange = (newBpm: number) => {
    setBpm(newBpm);
    songSequencer.setBpm(newBpm);
  };

  const handleSwingChange = (newSwing: number) => {
    setSwing(newSwing);
    songSequencer.setSwing(newSwing);
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    audioEngine.setMasterVolume(vol);
  };

  const handleChordInstrumentChange = (type: AcousticInstrumentType) => {
    setChordInstrument(type);
    audioEngine.setChordInstrument(type);
  };

  const handleTogglePercussion = () => {
    const next = !percussionOn;
    setPercussionOn(next);
    songSequencer.setPercussionEnabled(next);
  };

  const handleSelectSection = (index: number) => {
    setCurrentSectionIndex(index);
    songSequencer.setSectionIndex(index);
    const sec = sections[index];
    if (sec && sec.chords.length > 0 && GUITAR_CHORDS[sec.chords[0]]) {
      setActiveChord(GUITAR_CHORDS[sec.chords[0]]);
    }
  };

  const handleUpdateSections = (newSections: SongSection[]) => {
    setSections(newSections);
    songSequencer.setSections(newSections);
  };

  const handleToggleAutoAdvance = () => {
    const next = !autoAdvanceSections;
    setAutoAdvanceSections(next);
    songSequencer.setAutoAdvanceSections(next);
  };

  const handleSelectPreset = (preset: BodyPreset) => {
    setCurrentPreset(preset);
    audioEngine.applyPreset(preset);
  };

  const handleLoadProgression = (prog: SongProgression) => {
    audioEngine.unlock();
    const next = [...sections];
    next[currentSectionIndex] = {
      ...currentSection,
      chords: prog.chords,
      patternId: prog.patternId
    };
    handleUpdateSections(next);
    handleBpmChange(prog.bpm);

    if (prog.scaleRoot) setCurrentRoot(prog.scaleRoot);
    if (prog.scaleId) setCurrentScaleId(prog.scaleId);

    if (prog.chords.length > 0 && GUITAR_CHORDS[prog.chords[0]]) {
      setActiveChord(GUITAR_CHORDS[prog.chords[0]]);
    }
  };

  const handleApplyRecommendedChords = (newChords: string[]) => {
    audioEngine.unlock();
    const next = [...sections];
    next[currentSectionIndex] = {
      ...currentSection,
      chords: newChords
    };
    handleUpdateSections(next);

    if (newChords.length > 0 && GUITAR_CHORDS[newChords[0]]) {
      setActiveChord(GUITAR_CHORDS[newChords[0]]);
    }
  };

  const handleReset = () => {
    songSequencer.stop();
    setIsPlaying(false);
    setCurrentSectionIndex(0);
    setCurrentChordIndex(0);
    setCurrentStep(0);
    setCurrentRepeat(0);
  };

  const handleExport = () => {
    const exportData = {
      title: 'Acoustic Groovebox Beatmaker Session',
      timestamp: new Date().toISOString(),
      bpm,
      timeSignature: '4/4',
      scale: { root: currentRoot, id: currentScaleId },
      chordInstrument,
      sections,
      guitarPreset: currentPreset
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `groovebox-session-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-[#07080b] text-neutral-100 flex flex-col font-sans select-none">
      {/* 1. TOP HARDWARE OLED HEADER (Compact, Fixed) */}
      <Header
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        currentPreset={currentPreset}
        onSelectPreset={handleSelectPreset}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        chordInstrument={chordInstrument}
        onChordInstrumentChange={handleChordInstrumentChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        percussionOn={percussionOn}
        onTogglePercussion={handleTogglePercussion}
      />

      {/* 2. MAIN HARDWARE WORKSPACE (Zero Scroll Grid, 100% Viewport Bound) */}
      <main className="flex-1 overflow-hidden p-2 sm:p-3 flex flex-col justify-between gap-2.5">
        {/* UPPER ROW: Sections & Chords (Left) + Fretboard & Strumming (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 flex-1 min-h-0 overflow-hidden">
          {/* LEFT: Song Sections & Chords Matrix (Cols 1-7) */}
          <div className="lg:col-span-7 flex flex-col min-h-0 overflow-y-auto scrollbar-thin">
            <ChordProgression
              sections={sections}
              currentSectionIndex={currentSectionIndex}
              onSelectSection={handleSelectSection}
              onUpdateSections={handleUpdateSections}
              autoAdvanceSections={autoAdvanceSections}
              onToggleAutoAdvance={handleToggleAutoAdvance}
              currentChordIndex={currentChordIndex}
              activeChord={activeChord}
              onSelectChord={(chord) => setActiveChord(chord)}
              onLoadProgression={handleLoadProgression}
              currentRoot={currentRoot}
              currentScaleId={currentScaleId}
              currentRepeat={currentRepeat}
            />
          </div>

          {/* RIGHT: Fretboard & Real String Vibration (Cols 8-12) */}
          <div className="lg:col-span-5 flex flex-col justify-between min-h-0 overflow-y-auto scrollbar-thin">
            <Fretboard
              chord={activeChord}
              activeStringPluck={activeStringPluck}
              onPluckNote={(stringIndex, fret) => {
                setActiveStringPluck({
                  stringIndex,
                  fret,
                  id: Date.now() + Math.random()
                });
              }}
            />
          </div>
        </div>

        {/* LOWER ROW: FL Studio 3-Row Computer Keyboard Solo Engine (Full Width, Zero Scroll) */}
        <div className="shrink-0">
          <SoloKeyboard
            currentRoot={currentRoot}
            onRootChange={setCurrentRoot}
            currentScaleId={currentScaleId}
            onScaleChange={setCurrentScaleId}
            onApplyRecommendedChords={handleApplyRecommendedChords}
            isPlaying={isPlaying}
            percussionOn={percussionOn}
            onTogglePercussion={handleTogglePercussion}
            activeChord={activeChord}
          />
        </div>

        {/* BOTTOM FIXED TRANSPORT & SEQUENCER BAR */}
        <div className="shrink-0">
          <SequencerBar
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            bpm={bpm}
            onBpmChange={handleBpmChange}
            swing={swing}
            onSwingChange={handleSwingChange}
            onExport={handleExport}
            onReset={handleReset}
            percussionOn={percussionOn}
            onTogglePercussion={handleTogglePercussion}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
