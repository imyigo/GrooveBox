import React, { useEffect, useState } from 'react';
import { STRING_NAMES, getFretFrequency } from '../config/chords';
import { GuitarChord } from '../types';
import { audioEngine } from '../audio/AudioEngine';

interface FretboardProps {
  chord: GuitarChord;
  activeStringPluck: { stringIndex: number; fret: number; id: number } | null;
  onPluckNote?: (stringIndex: number, fret: number) => void;
}

const TOTAL_FRETS = 12;
const FRET_MARKERS = [3, 5, 7, 9];
const DOUBLE_MARKER = 12;

// String thicknesses for visual realism (bronze wound to steel plain)
const STRING_GAUGES = ['h-[4px]', 'h-[3.2px]', 'h-[2.6px]', 'h-[2.0px]', 'h-[1.5px]', 'h-[1.2px]'];

export const Fretboard: React.FC<FretboardProps> = ({
  chord,
  activeStringPluck,
  onPluckNote
}) => {
  // Track vibrating strings
  const [vibrating, setVibrating] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (activeStringPluck) {
      setVibrating((prev) => ({ ...prev, [activeStringPluck.stringIndex]: true }));
      const timer = setTimeout(() => {
        setVibrating((prev) => ({ ...prev, [activeStringPluck.stringIndex]: false }));
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [activeStringPluck]);

  const handleStringClick = (stringIndex: number, fret: number) => {
    audioEngine.unlock();
    const freq = getFretFrequency(stringIndex, fret);
    audioEngine.pluckString(stringIndex, fret, freq, undefined, 0.9, false);
    setVibrating((prev) => ({ ...prev, [stringIndex]: true }));
    setTimeout(() => {
      setVibrating((prev) => ({ ...prev, [stringIndex]: false }));
    }, 350);
    onPluckNote?.(stringIndex, fret);
  };

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Background Wood Grain Subtle Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#211b15] via-[#1a1512] to-[#120f0d] opacity-90 pointer-events-none" />

      {/* Header Info */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 font-bold text-sm tracking-wide">
            {chord.displayName}
          </div>
          <span className="text-xs text-neutral-400 font-mono hidden sm:inline">
            Fret Tab:{' '}
            {chord.frets
              .map((f) => (f < 0 ? 'X' : f === 0 ? '0' : f.toString()))
              .join(' ')}
          </span>
        </div>
        <div className="text-xs text-neutral-400 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Tele veya perdeye tıklayarak doğrudan çal</span>
        </div>
      </div>

      {/* Fretboard Container */}
      <div className="relative z-10 overflow-x-auto pb-2 scrollbar-thin">
        <div className="min-w-[720px] select-none">
          {/* Fret Numbers Header */}
          <div className="grid grid-cols-[50px_repeat(12,_1fr)] text-center text-[11px] font-mono text-neutral-400 pb-2">
            <div className="text-left pl-2">Tel</div>
            {Array.from({ length: TOTAL_FRETS }, (_, i) => i + 1).map((fret) => (
              <div key={fret} className="relative">
                <span>{fret}</span>
                {FRET_MARKERS.includes(fret) && (
                  <div className="w-1.5 h-1.5 rounded-full bg-neutral-500/40 mx-auto mt-1" />
                )}
                {fret === DOUBLE_MARKER && (
                  <div className="flex justify-center gap-1 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-500/40" />
                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-500/40" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Rosewood Neck Board */}
          <div className="relative bg-[#2c2017] border-y-2 border-neutral-700 rounded-sm shadow-inner py-1">
            {/* Nut (Kemik Eşik) */}
            <div className="absolute left-[50px] top-0 bottom-0 w-2.5 bg-gradient-to-r from-amber-100 to-amber-200 shadow-md border-r border-amber-300 z-20" />

            {/* Fret Wires (Gümüş Nikel Perdeler) */}
            <div className="absolute inset-0 left-[50px] grid grid-cols-12 pointer-events-none">
              {Array.from({ length: TOTAL_FRETS }, (_, i) => (
                <div
                  key={i}
                  className="border-r border-neutral-400/30 h-full relative"
                >
                  <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-neutral-200 via-neutral-400 to-neutral-200 opacity-60 shadow-[0_0_2px_rgba(255,255,255,0.4)]" />
                </div>
              ))}
            </div>

            {/* Mother of Pearl Inlays inside neck */}
            <div className="absolute inset-0 left-[50px] grid grid-cols-12 pointer-events-none items-center">
              {Array.from({ length: TOTAL_FRETS }, (_, i) => {
                const fret = i + 1;
                return (
                  <div key={fret} className="flex justify-center items-center h-full">
                    {FRET_MARKERS.includes(fret) && (
                      <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-amber-100/30 to-white/40 shadow-sm border border-white/20" />
                    )}
                    {fret === DOUBLE_MARKER && (
                      <div className="flex flex-col gap-5">
                        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-amber-100/40 to-white/50 border border-white/20" />
                        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-amber-100/40 to-white/50 border border-white/20" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 6 Strings */}
            <div className="flex flex-col gap-4 py-2 relative z-10">
              {STRING_NAMES.map((stringName, stringIndex) => {
                const currentFret = chord.frets[stringIndex];
                const isPlucked = vibrating[stringIndex];

                return (
                  <div
                    key={stringIndex}
                    className="relative grid grid-cols-[50px_repeat(12,_1fr)] items-center h-5"
                  >
                    {/* String Head / Open Indicator */}
                    <div className="flex items-center gap-1.5 pl-2 z-30">
                      <button
                        onClick={() => handleStringClick(stringIndex, Math.max(0, currentFret))}
                        className={`w-7 h-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center transition-all ${
                          currentFret < 0
                            ? 'text-red-400/80 bg-red-950/40 border border-red-900/40 hover:bg-red-900/50'
                            : currentFret === 0
                            ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/50 hover:bg-emerald-900/60'
                            : 'text-amber-300 bg-amber-950/40 border border-amber-800/40 hover:bg-amber-900/50'
                        }`}
                        title={`Tel ${6 - stringIndex}: ${stringName}`}
                      >
                        {stringName}
                      </button>
                      <span className="text-[10px] font-mono text-neutral-400">
                        {currentFret < 0 ? '✕' : currentFret === 0 ? '○' : ''}
                      </span>
                    </div>

                    {/* Physical Bronze String Line */}
                    <div
                      className={`absolute left-[50px] right-0 ${
                        STRING_GAUGES[stringIndex]
                      } ${
                        stringIndex <= 2
                          ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
                          : 'bg-gradient-to-r from-neutral-300 via-neutral-100 to-neutral-400 shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
                      } ${isPlucked ? 'animate-string-vibrate' : ''} pointer-events-none transition-transform`}
                    />

                    {/* Frets Cells & Finger Dot */}
                    {Array.from({ length: TOTAL_FRETS }, (_, fretIdx) => {
                      const fretNumber = fretIdx + 1;
                      const hasFinger = currentFret === fretNumber;

                      return (
                        <div
                          key={fretNumber}
                          onClick={() => handleStringClick(stringIndex, fretNumber)}
                          className="h-full flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors relative z-20 group"
                        >
                          {/* Ghost dot on hover */}
                          <div className="w-3.5 h-3.5 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                          {/* Active Finger Marker */}
                          {hasFinger && (
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-neutral-950 shadow-lg transform active:scale-90 transition-all ${
                                isPlucked
                                  ? 'bg-amber-300 scale-125 ring-4 ring-amber-400/50 shadow-amber-500/50'
                                  : 'bg-amber-400 ring-2 ring-amber-500/30'
                              }`}
                            >
                              {chord.fingers && chord.fingers[stringIndex] > 0
                                ? chord.fingers[stringIndex]
                                : '●'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
