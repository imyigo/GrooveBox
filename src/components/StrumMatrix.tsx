import React from 'react';
import { STRUM_PATTERNS } from '../config/patterns';
import { StrokeType } from '../types';
import { Activity } from 'lucide-react';

interface StrumMatrixProps {
  currentPatternId: string;
  onSelectPattern: (patternId: string) => void;
  currentStep: number;
  isPlaying: boolean;
}

const STROKE_LABELS: Record<StrokeType, { label: string; symbol: string; color: string }> = {
  down: { label: 'Downstroke', symbol: '↓', color: 'bg-amber-500 text-neutral-950 font-black' },
  up: { label: 'Upstroke', symbol: '↑', color: 'bg-amber-400/80 text-neutral-950 font-bold' },
  mute: { label: 'Percussion / Slap', symbol: '✕', color: 'bg-red-500 text-white font-black' },
  bass: { label: 'Bass Root', symbol: 'B', color: 'bg-blue-500 text-white font-bold' },
  treble: { label: 'Treble Brush', symbol: 'T', color: 'bg-cyan-500 text-neutral-950 font-bold' },
  rest: { label: 'Es / Rest', symbol: '·', color: 'bg-neutral-800/40 text-neutral-600' }
};

export const StrumMatrix: React.FC<StrumMatrixProps> = ({
  currentPatternId,
  onSelectPattern,
  currentStep,
  isPlaying
}) => {
  const activePattern = STRUM_PATTERNS[currentPatternId] || STRUM_PATTERNS['folk-rock'];

  // Fill all 16 steps for display
  const steps = Array.from({ length: 16 }, (_, i) => {
    const beat = activePattern.beats.find((b) => b.step === i);
    return {
      stepIndex: i,
      stroke: beat ? beat.type : ('rest' as StrokeType),
      accent: beat ? beat.accent : false,
      velocity: beat ? beat.velocity : 0
    };
  });

  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 shadow-lg">
      {/* Pattern Selector Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-sm text-neutral-200">
            Riff & Ritim Şablonu (16-Step Strum Matrix)
          </h3>
        </div>

        {/* Pattern Picker */}
        <div className="flex flex-wrap gap-1.5">
          {Object.values(STRUM_PATTERNS).map((pattern) => (
            <button
              key={pattern.id}
              onClick={() => onSelectPattern(pattern.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activePattern.id === pattern.id
                  ? 'bg-amber-500 text-neutral-950 font-semibold shadow-md shadow-amber-950/30'
                  : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
              }`}
            >
              {pattern.name.split(' ')[0]} {pattern.name.split(' ')[1] || ''}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-neutral-400 mb-3">{activePattern.description}</p>

      {/* 16 Step Visual Matrix */}
      <div className="grid grid-cols-16 gap-1 select-none overflow-x-auto pb-1">
        {steps.map((st) => {
          const isPlayhead = isPlaying && currentStep === st.stepIndex;
          const strokeMeta = STROKE_LABELS[st.stroke];
          const isQuarterBeat = st.stepIndex % 4 === 0;

          return (
            <div
              key={st.stepIndex}
              className={`flex flex-col items-center justify-between rounded-lg p-1.5 min-h-[70px] border transition-all ${
                isPlayhead
                  ? 'border-amber-400 ring-2 ring-amber-400/50 bg-amber-500/20 scale-105 z-10'
                  : isQuarterBeat
                  ? 'border-neutral-700 bg-neutral-950/90'
                  : 'border-neutral-800/80 bg-neutral-950/50'
              }`}
            >
              {/* Step Number */}
              <div className="text-[9px] font-mono text-neutral-500">
                {st.stepIndex + 1}
              </div>

              {/* Stroke Symbol Badge */}
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center text-xs shadow-sm transition-transform ${
                  strokeMeta.color
                } ${isPlayhead ? 'scale-110 shadow-md' : ''}`}
                title={`${strokeMeta.label} (${Math.round(st.velocity * 100)}% güç)`}
              >
                {strokeMeta.symbol}
              </div>

              {/* Velocity Bar / Dot */}
              <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden mt-1">
                {st.stroke !== 'rest' && (
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${Math.round(st.velocity * 100)}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-neutral-800/60 text-[11px] text-neutral-400">
        <span className="font-semibold text-neutral-300">Semboller:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-amber-500 text-neutral-950 font-bold flex items-center justify-center text-[10px]">
            ↓
          </span>
          <span>Aşağı Vuruş (Down)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-amber-400/80 text-neutral-950 font-bold flex items-center justify-center text-[10px]">
            ↑
          </span>
          <span>Yukarı Vuruş (Up)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-red-500 text-white font-bold flex items-center justify-center text-[10px]">
            ✕
          </span>
          <span>Perküsif Susturma (Chuck)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-blue-500 text-white font-bold flex items-center justify-center text-[10px]">
            B
          </span>
          <span>Bas Kök Nota</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-cyan-500 text-neutral-950 font-bold flex items-center justify-center text-[10px]">
            T
          </span>
          <span>Tiz Tel Fırçalama</span>
        </div>
      </div>
    </div>
  );
};
