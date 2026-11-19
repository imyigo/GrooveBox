import React from 'react';
import { Fretboard } from './Fretboard';
import { SoloKeyboard } from './SoloKeyboard';
import { songSequencer } from '../audio/Sequencer';
import { strumEngine } from '../audio/StrumEngine';
import { audioEngine } from '../audio/AudioEngine';
import { GUITAR_CHORDS } from '../config/chords';
import { GuitarChord, SongSection } from '../types';
import { Play, Radio, Music } from 'lucide-react';

interface LiveViewProps {
  sections: SongSection[];
  currentSectionIndex: number;
  queuedSectionIndex: number | null;
  currentChordIndex: number;
  currentRepeat: number;
  activeChord: GuitarChord;
  onSelectChord: (chord: GuitarChord) => void;
  activeStringPluck: { stringIndex: number; fret: number; id: number } | null;
  onPluckNote: (stringIndex: number, fret: number) => void;
  currentRoot: string;
  onRootChange: (root: string) => void;
  currentScaleId: string;
  onScaleChange: (scaleId: string) => void;
  onApplyRecommendedChords: (chords: string[]) => void;
  isPlaying: boolean;
  percussionOn: boolean;
  onTogglePercussion: () => void;
}

export const LiveView: React.FC<LiveViewProps> = ({
  sections,
  currentSectionIndex,
  queuedSectionIndex,
  currentChordIndex,
  currentRepeat,
  activeChord,
  onSelectChord,
  activeStringPluck,
  onPluckNote,
  currentRoot,
  onRootChange,
  currentScaleId,
  onScaleChange,
  onApplyRecommendedChords,
  isPlaying,
  percussionOn,
  onTogglePercussion
}) => {
  const currentSection = sections[currentSectionIndex] || sections[0];

  const handleLaunchScene = (idx: number) => {
    audioEngine.unlock();
    // Quantized Scene Launch: switches seamlessly at the next bar boundary
    songSequencer.queueSection(idx, false);
  };

  const handleLiveChordStrum = (chordId: string) => {
    const chord = GUITAR_CHORDS[chordId];
    if (chord) {
      onSelectChord(chord);
      audioEngine.unlock();
      strumEngine.strumChord(chord, { stroke: 'down', velocity: 0.95 });
    }
  };

  return (
    <div className="flex flex-col justify-between gap-2 h-full min-h-0 overflow-y-auto scrollbar-thin font-mono text-neutral-200">
      {/* 1. ABLETON LIVE SCENE LAUNCHER MATRIX */}
      <div className="bg-[#0b0c10] border-2 border-[#20222e] rounded-xl p-2.5 sm:p-3 shadow-2xl shrink-0">
        <div className="flex items-center justify-between border-b border-[#1c1e28] pb-1.5 mb-2 text-xs">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-bold text-white uppercase tracking-wider text-xs">
              CANLI SAHNE FIRLATICI (ABLETON LIVE SCENE LAUNCH):
            </span>
            <span className="text-[10px] text-neutral-400">
              1-Bar Kuantize Senkronize Geçiş
            </span>
          </div>

          <div className="text-[11px] font-bold text-amber-400">
            Aktif Kısım: <span className="text-white">{currentSection.name}</span> ({currentRepeat + 1}/{currentSection.repeats})
          </div>
        </div>

        {/* Big Backlit Scene Launch Pads */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {sections.map((sec, idx) => {
            const isPlayingThis = idx === currentSectionIndex;
            const isQueued = idx === queuedSectionIndex;

            return (
              <button
                key={sec.id}
                onClick={() => handleLaunchScene(idx)}
                className={`relative group rounded-xl p-2.5 border-2 transition-all flex flex-col justify-between h-20 select-none text-left active:scale-95 ${
                  isPlayingThis
                    ? 'bg-gradient-to-br from-[#1c2e22] to-[#0c1810] border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                    : isQueued
                    ? 'bg-gradient-to-br from-[#3b2d12] to-[#1a1204] border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-pulse'
                    : 'bg-[#12131a] border-[#222432] hover:border-neutral-500'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-white truncate">{sec.name}</span>
                  {isPlayingThis ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,1)]" />
                  ) : isQueued ? (
                    <span className="text-[9px] font-bold text-amber-300 uppercase px-1 rounded bg-amber-500/20">
                      BEKLENİYOR
                    </span>
                  ) : (
                    <Play className="w-3 h-3 text-neutral-600 group-hover:text-amber-400 transition-colors" />
                  )}
                </div>

                {/* Section Chords */}
                <div className="flex items-center gap-1 overflow-x-hidden">
                  {sec.chords.map((c, cIdx) => (
                    <span
                      key={cIdx}
                      className={`text-[9px] font-bold px-1 rounded ${
                        isPlayingThis && cIdx === currentChordIndex
                          ? 'bg-emerald-500 text-neutral-950 font-black'
                          : 'bg-[#1c1e28] text-neutral-300'
                      }`}
                    >
                      {c}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[9px] text-neutral-400 border-t border-neutral-800/60 pt-0.5">
                  <span className="text-amber-400">{sec.repeats}x Tekrar</span>
                  <span className="text-neutral-500">{sec.drumMode}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. LIVE CHORD TRIGGER PADS & FRETBOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 flex-1 min-h-0">
        {/* Left: Live Touch Chord Trigger Pads (Cols 1-5) */}
        <div className="lg:col-span-5 bg-[#0e0f14] border-2 border-[#20222e] rounded-xl p-2.5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#1c1e28] pb-1 text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-amber-400" />
              Canlı Akor Padleri (Live Trigger):
            </span>
            <span className="text-[10px] text-neutral-400">Elle Telleme & Akor Çalma</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-1">
            {currentSection.chords.map((chordId, idx) => {
              const isPlayingThis = idx === currentChordIndex;
              const isSounding = activeChord.name === chordId;

              return (
                <button
                  key={idx}
                  onClick={() => handleLiveChordStrum(chordId)}
                  className={`rounded-xl p-3 border-2 transition-all flex flex-col items-center justify-between h-20 select-none active:scale-95 ${
                    isPlayingThis
                      ? 'bg-gradient-to-b from-amber-500 to-amber-600 text-neutral-950 border-white shadow-[0_0_20px_rgba(245,158,11,0.8)]'
                      : isSounding
                      ? 'bg-[#1f2230] border-amber-500 text-amber-300'
                      : 'bg-[#12141c] border-[#222534] text-white hover:border-neutral-500'
                  }`}
                >
                  <span className="text-[10px] text-neutral-400 font-bold">{idx + 1}. Bar</span>
                  <span className="text-xl font-black font-mono">{chordId}</span>
                  <span className="text-[9px] text-neutral-400">Vur / Strum</span>
                </button>
              );
            })}
          </div>

          <div className="text-[10px] text-neutral-400 text-center italic">
            Canlı performans sırasında padlere tıklayarak gerçek akustik gitar vuruşları yapabilirsiniz.
          </div>
        </div>

        {/* Right: Fretboard & Real String Vibrations (Cols 6-12) */}
        <div className="lg:col-span-7 bg-[#0e0f14] border-2 border-[#20222e] rounded-xl p-2.5 shadow-xl flex flex-col justify-between min-h-0">
          <Fretboard
            chord={activeChord}
            activeStringPluck={activeStringPluck}
            onPluckNote={onPluckNote}
          />
        </div>
      </div>

      {/* 3. FL STUDIO 3-ROW COMPUTER KEYBOARD SOLO ENGINE (Zero Scroll Compact) */}
      <div className="shrink-0">
        <SoloKeyboard
          currentRoot={currentRoot}
          onRootChange={onRootChange}
          currentScaleId={currentScaleId}
          onScaleChange={onScaleChange}
          onApplyRecommendedChords={onApplyRecommendedChords}
          isPlaying={isPlaying}
          percussionOn={percussionOn}
          onTogglePercussion={onTogglePercussion}
          activeChord={activeChord}
        />
      </div>
    </div>
  );
};
