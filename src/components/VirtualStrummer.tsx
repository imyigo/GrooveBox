import React, { useRef, useState, useEffect } from 'react';
import { GuitarChord } from '../types';
import { strumEngine } from '../audio/StrumEngine';
import { audioEngine } from '../audio/AudioEngine';
import { getFretFrequency } from '../config/chords';
import { ArrowDown, ArrowUp, Hand, Disc3 } from 'lucide-react';

interface VirtualStrummerProps {
  activeChord: GuitarChord;
  onStringPlucked?: (stringIndex: number, fret: number) => void;
}

export const VirtualStrummer: React.FC<VirtualStrummerProps> = ({
  activeChord,
  onStringPlucked
}) => {
  const padRef = useRef<HTMLDivElement>(null);
  const [lastAction, setLastAction] = useState<string>('Hazır');
  const [startY, setStartY] = useState<number | null>(null);

  const triggerStrum = (stroke: 'down' | 'up' | 'mute' | 'bass' | 'treble') => {
    audioEngine.unlock();
    strumEngine.strumChord(activeChord, {
      stroke,
      velocity: 0.9,
      humanize: true,
      onStringPlucked
    });

    const labels: Record<string, string> = {
      down: 'Aşağı Vuruş (Downstroke)',
      up: 'Yukarı Vuruş (Upstroke)',
      mute: 'Gövde Vuruşu / Slap',
      bass: 'Bas Kök Nota',
      treble: 'Tiz Fırçalama'
    };
    setLastAction(labels[stroke] || stroke);
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is in an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        triggerStrum('down');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        triggerStrum('up');
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        triggerStrum('mute');
      } else if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        const stringNum = parseInt(e.key, 10);
        const stringIdx = 6 - stringNum; // 6 is Low E (0), 1 is High E (5)
        const fret = activeChord.frets[stringIdx];
        if (fret >= 0) {
          audioEngine.unlock();
          const freq = getFretFrequency(stringIdx, fret);
          audioEngine.pluckString(stringIdx, fret, freq, undefined, 0.9, false);
          onStringPlucked?.(stringIdx, fret);
          setLastAction(`Tel ${stringNum} çekildi`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeChord]);

  // Mouse/Touch drag strumming gesture
  const handlePointerDown = (e: React.PointerEvent) => {
    setStartY(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (startY !== null) {
      const diffY = e.clientY - startY;
      if (diffY > 15) {
        triggerStrum('down');
      } else if (diffY < -15) {
        triggerStrum('up');
      } else {
        // Simple tap = downstroke
        triggerStrum('down');
      }
      setStartY(null);
    }
  };

  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
      {/* Title */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Disc3 className="w-4 h-4 text-amber-500 animate-spin-slow" />
          <h3 className="font-semibold text-sm text-neutral-200">
            Canlı Telleme Padi (Virtual Strummer)
          </h3>
        </div>
        <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
          {lastAction}
        </span>
      </div>

      {/* Realistic Soundhole Strumming Pad */}
      <div
        ref={padRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className="relative h-44 rounded-2xl bg-gradient-to-b from-[#2a1b12] to-[#120d09] border-2 border-amber-900/40 p-4 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing shadow-inner select-none overflow-hidden group mb-4"
      >
        {/* Rosette & Soundhole Ring */}
        <div className="w-28 h-28 rounded-full border-4 border-amber-800/60 bg-neutral-950 flex items-center justify-center shadow-[inset_0_4px_12px_rgba(0,0,0,0.9)] relative">
          <div className="w-24 h-24 rounded-full border-2 border-dashed border-amber-500/30 flex items-center justify-center">
            <Hand className="w-8 h-8 text-amber-500/60 group-hover:text-amber-400 group-hover:scale-110 transition-all" />
          </div>
        </div>

        {/* 6 Virtual Strings crossing soundhole */}
        <div className="absolute inset-0 flex justify-center gap-4 pointer-events-none">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`h-full ${
                i <= 2 ? 'w-[2px] bg-amber-500/60' : 'w-[1.2px] bg-neutral-300/60'
              } shadow-sm`}
            />
          ))}
        </div>

        {/* Gesture Guide Overlay */}
        <div className="absolute bottom-2 text-[11px] text-neutral-400 font-medium flex items-center gap-2">
          <span>Aşağı / Yukarı kaydır veya tıkla</span>
        </div>
      </div>

      {/* Direct Strum Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <button
          onClick={() => triggerStrum('down')}
          className="px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-500 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
        >
          <ArrowDown className="w-4 h-4 text-amber-500" />
          <span>Aşağı (↓)</span>
        </button>
        <button
          onClick={() => triggerStrum('up')}
          className="px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-500 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
        >
          <ArrowUp className="w-4 h-4 text-amber-400" />
          <span>Yukarı (↑)</span>
        </button>
        <button
          onClick={() => triggerStrum('mute')}
          className="px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-red-500 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
        >
          <span className="text-red-400 font-bold">✕</span>
          <span>Slap / Mute</span>
        </button>
        <button
          onClick={() => triggerStrum('bass')}
          className="px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-blue-500 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
        >
          <span className="text-blue-400 font-bold">B</span>
          <span>Bas Kök</span>
        </button>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="text-[10px] text-neutral-400 flex flex-wrap items-center justify-between gap-1 pt-2 border-t border-neutral-800/60 font-mono">
        <span>Klavye: [↓] Aşağı • [↑] Yukarı • [M] Slap • [1-6] Tek Tel</span>
      </div>
    </div>
  );
};
