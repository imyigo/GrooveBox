import React, { useState, useEffect, useCallback } from 'react';
import { Header, AppViewMode } from './components/Header';
import { Fretboard } from './components/Fretboard';
import { ChordProgression } from './components/ChordProgression';
import { StrumMatrix } from './components/StrumMatrix';
import { VirtualStrummer } from './components/VirtualStrummer';
import { ToneRack } from './components/ToneRack';
import { SequencerBar } from './components/SequencerBar';
import { SoloKeyboard } from './components/SoloKeyboard';
import { GUITAR_CHORDS } from './config/chords';
import { GUITAR_PRESETS } from './config/presets';
import { SongProgression } from './config/progressions';
import { songSequencer, SequencerState, DEFAULT_SONG_SECTIONS } from './audio/Sequencer';
import { audioEngine } from './audio/AudioEngine';
import { BodyPreset, GuitarChord, SongSection } from './types';
import { AcousticInstrumentType } from './audio/SampledGuitarEngine';
import { Guitar } from 'lucide-react';

export const App: React.FC = () => {
  // App View Mode (Player vs Solo vs Full Studio)
  const [viewMode, setViewMode] = useState<AppViewMode>('player');

  // Sequencer & Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [bpm, setBpm] = useState<number>(104);
  const [swing, setSwing] = useState<number>(0.0);
  const [humanize, setHumanize] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(0.85);

  // Organic Rhythm (Cajon, Shaker, Tambourine)
  const [percussionOn, setPercussionOn] = useState<boolean>(true);

  // Instruments
  const [chordInstrument, setChordInstrument] = useState<AcousticInstrumentType>('nylon');

  // Musical Scale & Solo System
  const [currentRoot, setCurrentRoot] = useState<string>('A');
  const [currentScaleId, setCurrentScaleId] = useState<string>('minor');

  // Song Sections & Scenes
  const [sections, setSections] = useState<SongSection[]>(DEFAULT_SONG_SECTIONS);
  const [currentSectionIndex, setCurrentSectionIndex] = useState<number>(0);
  const [autoAdvanceSections, setAutoAdvanceSections] = useState<boolean>(true);
  const [currentRepeat, setCurrentRepeat] = useState<number>(0);

  // Active Chord & Pattern
  const currentSection = sections[currentSectionIndex] || sections[0];
  const [currentChordIndex, setCurrentChordIndex] = useState<number>(0);
  const [activeChord, setActiveChord] = useState<GuitarChord>(GUITAR_CHORDS['Am']);
  const [currentPreset, setCurrentPreset] = useState<BodyPreset>(GUITAR_PRESETS[0]);

  // Step playhead & visual plucks
  const [currentStep, setCurrentStep] = useState<number>(0);
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

      // Auto update active chord view during playback
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

  const handleHumanizeToggle = (val: boolean) => {
    setHumanize(val);
    songSequencer.setHumanize(val);
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

  const handleSelectPattern = (patternId: string) => {
    const next = [...sections];
    next[currentSectionIndex] = {
      ...currentSection,
      patternId
    };
    handleUpdateSections(next);
  };

  const handleSelectPreset = (preset: BodyPreset) => {
    setCurrentPreset(preset);
    audioEngine.applyPreset(preset);
  };

  const handleUpdatePreset = (updated: BodyPreset) => {
    setCurrentPreset(updated);
    audioEngine.applyPreset(updated);
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
      title: 'Acoustic Groovebox Song & Solo Session',
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
    a.download = `acoustic-groovebox-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#090a0d] text-neutral-100 flex flex-col font-sans selection:bg-amber-600 selection:text-white">
      {/* Top Groovebox Header */}
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

      {/* Main Groovebox Work Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6 space-y-5">
        {/* Fretboard (Always Visible to monitor chords and notes) */}
        <section>
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
        </section>

        {/* VIEW MODE 1: SOLO MODU (Focused on Ableton ASDFGHJKL pads, Octave, and Solo Instrument) */}
        {viewMode === 'solo' && (
          <section className="space-y-5 animate-in fade-in duration-200">
            <SoloKeyboard
              currentRoot={currentRoot}
              onRootChange={setCurrentRoot}
              currentScaleId={currentScaleId}
              onScaleChange={setCurrentScaleId}
              onApplyRecommendedChords={handleApplyRecommendedChords}
              isPlaying={isPlaying}
              percussionOn={percussionOn}
              onTogglePercussion={handleTogglePercussion}
            />

            {/* Quick Section Arranger in Solo Mode */}
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
          </section>
        )}

        {/* VIEW MODE 2: PLAYER MODU (Focused on Chords, Sections, Strumming, and Rhythm) */}
        {viewMode === 'player' && (
          <section className="space-y-5 animate-in fade-in duration-200">
            {/* Song Sections & Scenes Matrix */}
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

            {/* 16-Step Strum Matrix */}
            <StrumMatrix
              currentPatternId={currentSection.patternId}
              onSelectPattern={handleSelectPattern}
              currentStep={currentStep}
              isPlaying={isPlaying}
            />

            {/* Virtual Strummer & Tone Rack */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <VirtualStrummer
                activeChord={activeChord}
                onStringPlucked={(stringIndex, fret) => {
                  setActiveStringPluck({
                    stringIndex,
                    fret,
                    id: Date.now() + Math.random()
                  });
                }}
              />
              <ToneRack
                preset={currentPreset}
                onUpdatePreset={handleUpdatePreset}
                humanize={humanize}
                onToggleHumanize={handleHumanizeToggle}
              />
            </div>
          </section>
        )}

        {/* VIEW MODE 3: FULL STUDIO (All Panels Open) */}
        {viewMode === 'full' && (
          <section className="space-y-5 animate-in fade-in duration-200">
            <SoloKeyboard
              currentRoot={currentRoot}
              onRootChange={setCurrentRoot}
              currentScaleId={currentScaleId}
              onScaleChange={setCurrentScaleId}
              onApplyRecommendedChords={handleApplyRecommendedChords}
              isPlaying={isPlaying}
              percussionOn={percussionOn}
              onTogglePercussion={handleTogglePercussion}
            />

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

            <StrumMatrix
              currentPatternId={currentSection.patternId}
              onSelectPattern={handleSelectPattern}
              currentStep={currentStep}
              isPlaying={isPlaying}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <VirtualStrummer
                activeChord={activeChord}
                onStringPlucked={(stringIndex, fret) => {
                  setActiveStringPluck({
                    stringIndex,
                    fret,
                    id: Date.now() + Math.random()
                  });
                }}
              />
              <ToneRack
                preset={currentPreset}
                onUpdatePreset={handleUpdatePreset}
                humanize={humanize}
                onToggleHumanize={handleHumanizeToggle}
              />
            </div>
          </section>
        )}

        {/* Bottom Floating/Docked Transport Bar */}
        <section className="sticky bottom-3 z-30">
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
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1e2029] bg-[#0c0d12] py-3.5 px-6 text-center text-xs text-neutral-400 flex flex-wrap items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-2">
          <Guitar className="w-4 h-4 text-amber-500" />
          <span className="font-bold text-neutral-300">Acoustic Groovebox Studio</span>
          <span className="text-[10px] text-neutral-400">v2.0 Elektron/Ableton Edition</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span>Giriş → Söz → Nakarat → Solo</span>
          <span>•</span>
          <span>ASDFGHJKL Padleri</span>
          <span>•</span>
          <span>Oktav Transpose [Z/X]</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
