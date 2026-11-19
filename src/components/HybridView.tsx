import React from 'react';
import { SoloKeyboard } from './SoloKeyboard';
import { songSequencer } from '../audio/Sequencer';
import { strumEngine } from '../audio/StrumEngine';
import { audioEngine } from '../audio/AudioEngine';
import { GUITAR_CHORDS } from '../config/chords';
import { GuitarChord, SongSection } from '../types';
import { Play, Music, Zap } from 'lucide-react';

interface HybridViewProps {
  sections: SongSection[];
  currentSectionIndex: number;
  queuedSectionIndex: number | null;
  currentChordIndex: number;
  currentRepeat: number;
  activeChord: GuitarChord;
  onSelectChord: (chord: GuitarChord) => void;
  currentRoot: string;
  onRootChange: (root: string) => void;
  currentScaleId: string;
  onScaleChange: (scaleId: string) => void;
  onApplyRecommendedChords: (chords: string[]) => void;
  isPlaying: boolean;
  percussionOn: boolean;
  onTogglePercussion: () => void;
}

export const HybridView: React.FC<HybridViewProps> = ({
  sections,
  currentSectionIndex,
  queuedSectionIndex,
  currentChordIndex,
  currentRepeat,
  activeChord,
  onSelectChord,
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
    <div className="flex flex-col justify-between gap-2.5 h-full min-h-0 overflow-y-auto scrollbar-thin font-mono text-neutral-200">
      {/* 1. SCENE LAUNCH & CHORD PADS COMBINED STRIP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 shrink-0">
        {/* Left: Ableton Scene Launcher (Cols 1-7) */}
        <div className="lg:col-span-7 bg-[#0b0c10] border-2 border-[#20222e] rounded-xl p-2.5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#1c1e28] pb-1.5 mb-2 text-xs">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold text-white uppercase tracking-wider text-xs">
                HİBRİT SAHNE FIRLATICI:
              </span>
            </div>
            <div className="text-[11px] font-bold text-emerald-400">
              {currentSection.name} ({currentRepeat + 1}/{currentSection.repeats})
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {sections.map((sec, idx) => {
              const isPlayingThis = idx === currentSectionIndex;
              const isQueued = idx === queuedSectionIndex;

              return (
                <button
                  key={sec.id}
                  onClick={() => handleLaunchScene(idx)}
                  className={`p-2 rounded-xl border-2 transition-all flex flex-col justify-between h-18 select-none text-left active:scale-95 ${
                    isPlayingThis
                      ? 'bg-gradient-to-br from-[#1c2e22] to-[#0c1810] border-emerald-500 shadow-md'
                      : isQueued
                      ? 'bg-gradient-to-br from-[#3b2d12] to-[#1a1204] border-amber-400 animate-pulse'
                      : 'bg-[#12131a] border-[#222432] hover:border-neutral-500'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-white truncate">{sec.name}</span>
                    {isPlayingThis ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    ) : (
                      <Play className="w-2.5 h-2.5 text-neutral-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 overflow-x-hidden">
                    {sec.chords.map((c, cIdx) => (
                      <span
                        key={cIdx}
                        className={`text-[9px] font-bold px-1 rounded ${
                          isPlayingThis && cIdx === currentChordIndex
                            ? 'bg-emerald-500 text-neutral-950 font-black'
                            : 'bg-[#1c1e28] text-neutral-400'
                        }`}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Touch Chord Trigger Pads (Cols 8-12) */}
        <div className="lg:col-span-5 bg-[#0e0f14] border-2 border-[#20222e] rounded-xl p-2.5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#1c1e28] pb-1.5 mb-2 text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-amber-400" />
              Canlı Akor Padleri:
            </span>
            <span className="text-[10px] text-neutral-400">Elle Telle</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {currentSection.chords.map((chordId, idx) => {
              const isPlayingThis = idx === currentChordIndex;
              const isSounding = activeChord.name === chordId;

              return (
                <button
                  key={idx}
                  onClick={() => handleLiveChordStrum(chordId)}
                  className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-between h-18 select-none active:scale-95 ${
                    isPlayingThis
                      ? 'bg-amber-500 text-neutral-950 border-white shadow-md'
                      : isSounding
                      ? 'bg-[#1f2230] border-amber-500 text-amber-300'
                      : 'bg-[#12141c] border-[#222534] text-white hover:border-neutral-500'
                  }`}
                >
                  <span className="text-[9px] text-neutral-400">{idx + 1}. Bar</span>
                  <span className="text-base font-bold font-mono">{chordId}</span>
                  <span className="text-[8px] text-neutral-400">Strum</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. FL STUDIO 3-ROW COMPUTER KEYBOARD SOLO ENGINE & ACOUSTIC DRUM KIT */}
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
