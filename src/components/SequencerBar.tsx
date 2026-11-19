import React, { useState, useRef } from 'react';
import { Play, Square, RotateCcw, Download, Drum } from 'lucide-react';

interface SequencerBarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  swing: number;
  onSwingChange: (swing: number) => void;
  onExport: () => void;
  onReset: () => void;
  percussionOn: boolean;
  onTogglePercussion: () => void;
}

export const SequencerBar: React.FC<SequencerBarProps> = ({
  isPlaying,
  onTogglePlay,
  bpm,
  onBpmChange,
  swing,
  onSwingChange,
  onExport,
  onReset,
  percussionOn,
  onTogglePercussion
}) => {
  // Tap tempo logic
  const tapTimes = useRef<number[]>([]);
  const [tapActive, setTapActive] = useState(false);

  const handleTapTempo = () => {
    const now = performance.now();
    setTapActive(true);
    setTimeout(() => setTapActive(false), 150);

    // Keep taps within last 2 seconds
    tapTimes.current = tapTimes.current.filter((t) => now - t < 2000);
    tapTimes.current.push(now);

    if (tapTimes.current.length >= 2) {
      const intervals = [];
      for (let i = 1; i < tapTimes.current.length; i++) {
        intervals.push(tapTimes.current[i] - tapTimes.current[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      if (calculatedBpm >= 40 && calculatedBpm <= 220) {
        onBpmChange(calculatedBpm);
      }
    }
  };

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
      {/* Play / Transport Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={onTogglePlay}
          className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2.5 transition-all shadow-lg active:scale-95 ${
            isPlaying
              ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
              : 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-neutral-950 hover:brightness-110 shadow-amber-500/20'
          }`}
        >
          {isPlaying ? (
            <>
              <Square className="w-5 h-5 fill-current" />
              <span>DURDUR</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>RIFF ÇAL (DÖNGÜ)</span>
            </>
          )}
        </button>

        <button
          onClick={onReset}
          className="p-3 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded-xl text-neutral-400 hover:text-white transition-all"
          title="Başa Sar"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Akustik Ritim Aç / Kapat Butonu */}
        <button
          onClick={onTogglePercussion}
          className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
            percussionOn
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
              : 'bg-neutral-950 text-neutral-500 border-neutral-800'
          }`}
          title="Kahon & Shaker ritmini aç veya kapat"
        >
          <Drum className="w-4 h-4" />
          <span>{percussionOn ? 'Ritim: Açık' : 'Ritim: Kapalı'}</span>
        </button>
      </div>

      {/* BPM & Tap Tempo */}
      <div className="flex items-center gap-4 bg-neutral-950/80 border border-neutral-800 rounded-xl px-4 py-2">
        <div className="flex flex-col">
          <span className="text-[10px] text-neutral-400 font-semibold tracking-wider uppercase">
            Tempo (BPM)
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-bold text-amber-400 w-12">
              {bpm}
            </span>
            <input
              type="range"
              min="50"
              max="180"
              value={bpm}
              onChange={(e) => onBpmChange(parseInt(e.target.value, 10))}
              className="w-24 sm:w-32 accent-amber-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Tap Tempo Button */}
        <button
          onClick={handleTapTempo}
          className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all active:scale-95 ${
            tapActive
              ? 'bg-amber-500 text-neutral-950 border-amber-400'
              : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
          }`}
          title="Ritme göre tıklayarak tempoyu ayarla"
        >
          TAP TEMPO
        </button>
      </div>

      {/* Swing / Groove */}
      <div className="flex items-center gap-3 bg-neutral-950/80 border border-neutral-800 rounded-xl px-4 py-2">
        <div className="flex flex-col">
          <div className="flex justify-between items-center gap-2">
            <span className="text-[10px] text-neutral-400 font-semibold tracking-wider uppercase">
              Swing Hissi
            </span>
            <span className="font-mono text-xs text-neutral-300">
              {Math.round(swing * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="0.4"
            step="0.05"
            value={swing}
            onChange={(e) => onSwingChange(parseFloat(e.target.value))}
            className="w-24 sm:w-28 accent-amber-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={onExport}
        className="px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-500/50 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
      >
        <Download className="w-4 h-4 text-amber-500" />
        <span>Besteyi Dışa Aktar</span>
      </button>
    </div>
  );
};
