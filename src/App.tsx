import React, { useState, useEffect, useCallback } from 'react';
import { Header, AppViewMode } from './components/Header';
import { GrooveBoxView } from './components/GrooveBoxView';
import { StudioView } from './components/StudioView';
import { MasterDspRack } from './components/MasterDspRack';
import { SequencerBar } from './components/SequencerBar';
import { GUITAR_CHORDS } from './config/chords';
import { GUITAR_PRESETS } from './config/presets';
import { songSequencer, SequencerState, DEFAULT_SONG_SECTIONS } from './audio/Sequencer';
import { audioEngine } from './audio/AudioEngine';
import { BodyPreset, GuitarChord, SongSection } from './types';
import { AcousticInstrumentType } from './audio/SampledGuitarEngine';

export const App: React.FC = () => {
  // Sadece 2 Saf Mod: GrooveBox (Mod 1) ve Stüdyo (Mod 2)
  const [viewMode, setViewMode] = useState<AppViewMode>('groovebox');

  // Sequencer & Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [bpm, setBpm] = useState<number>(104);
  const [swing, setSwing] = useState<number>(0.0);
  const [humanize] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(0.85);

  // Organic Rhythm (Cajon, Shaker, Tambourine)
  const [percussionOn, setPercussionOn] = useState<boolean>(true);

  // Chord Instrument (Nylon / Steel / Piano)
  const [chordInstrument, setChordInstrument] = useState<AcousticInstrumentType>('nylon');

  // Musical Scale & Solo System
  const [currentRoot, setCurrentRoot] = useState<string>('A');
  const [currentScaleId, setCurrentScaleId] = useState<string>('minor');

  // Song Sections & Scenes
  const [sections, setSections] = useState<SongSection[]>(DEFAULT_SONG_SECTIONS);
  const [currentSectionIndex, setCurrentSectionIndex] = useState<number>(0);
  const [queuedSectionIndex, setQueuedSectionIndex] = useState<number | null>(null);
  const [autoAdvanceSections, setAutoAdvanceSections] = useState<boolean>(true);
  const [currentRepeat, setCurrentRepeat] = useState<number>(0);

  // Active Chord & Preset
  const [currentChordIndex, setCurrentChordIndex] = useState<number>(0);
  const [activeChord, setActiveChord] = useState<GuitarChord>(GUITAR_CHORDS['Am']);
  const [currentPreset, setCurrentPreset] = useState<BodyPreset>(GUITAR_PRESETS[0]);

  // Beste & Şarkı Sözleri (Lyrics Pad State)
  const [lyrics, setLyrics] = useState<Record<string, string>>({
    intro: '',
    verse: 'Yollarda bulurum seni...\nBir şarkı fısıldar gibi rüzgar.',
    chorus: 'Dön bana, dön bana yeniden...\nSensiz geçen günlerin acısı bitmiyor.',
    solo: ''
  });

  const handleLyricsChange = (sectionId: string, text: string) => {
    setLyrics((prev) => ({ ...prev, [sectionId]: text }));
  };

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
      setQueuedSectionIndex(state.queuedSectionIndex);
      setCurrentChordIndex(state.currentChordIndex);
      setCurrentRepeat(state.currentRepeat);

      const sec = songSequencer.getCurrentSection();
      if (state.isPlaying && sec && sec.chords[state.currentChordIndex]) {
        const chord = GUITAR_CHORDS[sec.chords[state.currentChordIndex]];
        if (chord) {
          setActiveChord(chord);
        }
      }
    });

    const unsubscribePluck = songSequencer.onStringPluck((_stringIndex, _fret) => {
      // String pluck visual event listener
    });

    return () => {
      unsubscribeStep();
      unsubscribePluck();
      songSequencer.stop();
    };
  }, []);

  // Handlers
  const handleTogglePlay = useCallback(async () => {
    await audioEngine.unlock();
    const playing = await songSequencer.toggle();
    setIsPlaying(playing);
  }, []);

  // Global Spacebar Transport (Play / Stop) DAW Standard
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleTogglePlay();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleTogglePlay]);

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

  const handleReset = () => {
    songSequencer.stop();
    setIsPlaying(false);
    setCurrentSectionIndex(0);
    setQueuedSectionIndex(null);
    setCurrentChordIndex(0);
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

      {/* 2. MAIN WORKSPACE (Mod 1: GrooveBox & Mod 2: Stüdyo) */}
      <main className="flex-1 overflow-hidden p-2 sm:p-2.5 flex flex-col justify-between gap-2 min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          {viewMode === 'groovebox' ? (
            <GrooveBoxView
              sections={sections}
              currentSectionIndex={currentSectionIndex}
              queuedSectionIndex={queuedSectionIndex}
              currentChordIndex={currentChordIndex}
              currentRepeat={currentRepeat}
              activeChord={activeChord}
              onSelectChord={setActiveChord}
              currentRoot={currentRoot}
              onRootChange={setCurrentRoot}
              currentScaleId={currentScaleId}
              onScaleChange={setCurrentScaleId}
              isPlaying={isPlaying}
              percussionOn={percussionOn}
              onTogglePercussion={handleTogglePercussion}
              onUpdateSections={handleUpdateSections}
              lyrics={lyrics}
              onLyricsChange={handleLyricsChange}
            />
          ) : (
            <StudioView
              sections={sections}
              currentSectionIndex={currentSectionIndex}
              onSelectSection={handleSelectSection}
              onUpdateSections={handleUpdateSections}
              autoAdvanceSections={autoAdvanceSections}
              onToggleAutoAdvance={handleToggleAutoAdvance}
              currentChordIndex={currentChordIndex}
              onSelectChord={setActiveChord}
              currentRoot={currentRoot}
              currentScaleId={currentScaleId}
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
              bpm={bpm}
              currentRepeat={currentRepeat}
              lyrics={lyrics}
              onLyricsChange={handleLyricsChange}
            />
          )}
        </div>

        {/* 3. HARDWARE MASTER DSP & MIXER STRIP (Direct Reverb, Tone, Speed, Submixes) */}
        <div className="shrink-0">
          <MasterDspRack
            swing={swing}
            onSwingChange={handleSwingChange}
            percussionOn={percussionOn}
            onTogglePercussion={handleTogglePercussion}
          />
        </div>

        {/* 4. BOTTOM FIXED TRANSPORT BAR */}
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
