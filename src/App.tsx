import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Fretboard } from './components/Fretboard';
import { ChordProgression } from './components/ChordProgression';
import { StrumMatrix } from './components/StrumMatrix';
import { VirtualStrummer } from './components/VirtualStrummer';
import { ToneRack } from './components/ToneRack';
import { SequencerBar } from './components/SequencerBar';
import { GUITAR_CHORDS } from './config/chords';
import { GUITAR_PRESETS } from './config/presets';
import { STRUM_PATTERNS } from './config/patterns';
import { SongProgression } from './config/progressions';
import { songSequencer, SequencerState } from './audio/Sequencer';
import { audioEngine } from './audio/AudioEngine';
import { BodyPreset, GuitarChord } from './types';
import { Guitar } from 'lucide-react';

export const App: React.FC = () => {
  // App & Sequencer State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [bpm, setBpm] = useState<number>(104);
  const [swing, setSwing] = useState<number>(0.0);
  const [humanize, setHumanize] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(0.85);

  // Progression & Active Chord
  const [chords, setChords] = useState<string[]>(['C', 'G', 'Am', 'F']);
  const [currentChordIndex, setCurrentChordIndex] = useState<number>(0);
  const [activeChord, setActiveChord] = useState<GuitarChord>(GUITAR_CHORDS['C']);

  // Pattern & Preset
  const [currentPatternId, setCurrentPatternId] = useState<string>('folk-rock');
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
    songSequencer.setChords(chords);
    songSequencer.setPattern(currentPatternId);
    songSequencer.setSwing(swing);
    songSequencer.setHumanize(humanize);

    const unsubscribeStep = songSequencer.onStep((state: SequencerState) => {
      setIsPlaying(state.isPlaying);
      setCurrentChordIndex(state.currentChordIndex);
      setCurrentStep(state.currentStep);

      // Auto update active chord view during playback
      if (state.isPlaying && chords[state.currentChordIndex]) {
        const chord = GUITAR_CHORDS[chords[state.currentChordIndex]];
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

  const handleChangeChords = (newChords: string[]) => {
    setChords(newChords);
    songSequencer.setChords(newChords);
  };

  const handleSelectPattern = (patternId: string) => {
    setCurrentPatternId(patternId);
    songSequencer.setPattern(patternId);
    const pattern = STRUM_PATTERNS[patternId];
    if (pattern && !isPlaying) {
      handleBpmChange(pattern.defaultBpm);
    }
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
    setChords(prog.chords);
    songSequencer.setChords(prog.chords);
    setCurrentPatternId(prog.patternId);
    songSequencer.setPattern(prog.patternId);
    handleBpmChange(prog.bpm);

    if (prog.chords.length > 0 && GUITAR_CHORDS[prog.chords[0]]) {
      setActiveChord(GUITAR_CHORDS[prog.chords[0]]);
    }
  };

  const handleReset = () => {
    songSequencer.stop();
    setIsPlaying(false);
    setCurrentChordIndex(0);
    setCurrentStep(0);
  };

  const handleExport = () => {
    const exportData = {
      title: 'Acoustic Guitar Riff Composition',
      timestamp: new Date().toISOString(),
      bpm,
      timeSignature: '4/4',
      chords,
      chordDetails: chords.map((c) => GUITAR_CHORDS[c]),
      pattern: STRUM_PATTERNS[currentPatternId],
      guitarPreset: currentPreset
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `acoustic-riff-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0d0e11] text-neutral-100 flex flex-col font-sans selection:bg-amber-600 selection:text-white">
      {/* Top Header */}
      <Header
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        currentPreset={currentPreset}
        onSelectPreset={handleSelectPreset}
        volume={volume}
        onVolumeChange={handleVolumeChange}
      />

      {/* Main Studio Work Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Section: Fretboard (Interactive Guitar Neck) */}
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

        {/* Middle Section 1: Chord Progression Timeline */}
        <section>
          <ChordProgression
            chords={chords}
            currentChordIndex={currentChordIndex}
            activeChord={activeChord}
            onSelectChord={(chord) => setActiveChord(chord)}
            onChangeChords={handleChangeChords}
            onLoadProgression={handleLoadProgression}
          />
        </section>

        {/* Middle Section 2: Strum Pattern Matrix */}
        <section>
          <StrumMatrix
            currentPatternId={currentPatternId}
            onSelectPattern={handleSelectPattern}
            currentStep={currentStep}
            isPlaying={isPlaying}
          />
        </section>

        {/* Bottom Split: Virtual Strummer & Acoustic Tone Rack */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        </section>

        {/* Bottom Floating/Docked Transport Bar */}
        <section className="sticky bottom-4 z-30">
          <SequencerBar
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            bpm={bpm}
            onBpmChange={handleBpmChange}
            swing={swing}
            onSwingChange={handleSwingChange}
            onExport={handleExport}
            onReset={handleReset}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950/80 py-4 px-6 text-center text-xs text-neutral-400 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Guitar className="w-4 h-4 text-amber-500" />
          <span>Acoustic Riff Studio — 100% Web Audio API & React</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Sıfır Gecikme (Low Latency)</span>
          <span>•</span>
          <span>Sample-Accurate Lookahead Clock</span>
          <span>•</span>
          <span>Fiziksel Akustik Modelleme</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
