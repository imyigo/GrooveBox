import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Play, Square, Guitar, CheckCircle2 } from 'lucide-react';
import { GUITAR_PRESETS } from '../config/presets';
import { BodyPreset } from '../types';
import { sampledGuitarEngine } from '../audio/SampledGuitarEngine';

interface HeaderProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentPreset: BodyPreset;
  onSelectPreset: (preset: BodyPreset) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  isPlaying,
  onTogglePlay,
  currentPreset,
  onSelectPreset,
  volume,
  onVolumeChange
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [prevVol, setPrevVol] = useState(volume);
  const [sampleProgress, setSampleProgress] = useState(0);
  const [samplesReady, setSamplesReady] = useState(false);

  useEffect(() => {
    return sampledGuitarEngine.onProgress((prog, ready) => {
      setSampleProgress(prog);
      setSamplesReady(ready);
    });
  }, []);

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      onVolumeChange(prevVol || 0.85);
    } else {
      setPrevVol(volume);
      setIsMuted(true);
      onVolumeChange(0);
    }
  };

  return (
    <header className="border-b border-neutral-800/80 bg-neutral-900/60 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800 p-0.5 shadow-lg shadow-amber-950/40 flex items-center justify-center">
          <div className="w-full h-full bg-neutral-950/80 rounded-[10px] flex items-center justify-center text-amber-400">
            <Guitar className="w-5 h-5" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg tracking-tight text-white flex items-center gap-2">
              Acoustic Riff Studio
              {samplesReady ? (
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Gerçek Stüdyo Akustik
                </span>
              ) : (
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold tracking-wider animate-pulse">
                  Kayıtlar Yükleniyor (%{sampleProgress})
                </span>
              )}
            </h1>
          </div>
          <p className="text-xs text-neutral-400">
            Fiziksel Akustik Gitar Simülasyonu & Gerçek Riff Beste Yazım Aracı
          </p>
        </div>
      </div>

      {/* Main Transport & Presets */}
      <div className="flex items-center gap-3">
        {/* Preset Selector */}
        <div className="hidden sm:flex items-center bg-neutral-950 border border-neutral-800 rounded-xl p-1 gap-1">
          {GUITAR_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelectPreset(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentPreset.id === p.id
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-950/40'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              {p.name.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Master Play/Stop Button */}
        <button
          onClick={onTogglePlay}
          className={`px-5 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shadow-lg active:scale-95 ${
            isPlaying
              ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 shadow-red-950/20'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 hover:brightness-110 shadow-amber-500/20'
          }`}
        >
          {isPlaying ? (
            <>
              <Square className="w-4 h-4 fill-current" />
              <span>Durdur</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Riff Çal</span>
            </>
          )}
        </button>

        {/* Volume Slider */}
        <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5">
          <button
            onClick={toggleMute}
            className="text-neutral-400 hover:text-amber-400 transition-colors"
            title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setIsMuted(false);
              onVolumeChange(parseFloat(e.target.value));
            }}
            className="w-16 sm:w-20 accent-amber-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </header>
  );
};
