import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Play, Square, Guitar, CheckCircle2, Drum, Radio, Sliders } from 'lucide-react';
import { GUITAR_PRESETS } from '../config/presets';
import { BodyPreset } from '../types';
import { sampledGuitarEngine, AcousticInstrumentType } from '../audio/SampledGuitarEngine';

export type AppViewMode = 'groovebox' | 'studio';

interface HeaderProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentPreset: BodyPreset;
  onSelectPreset: (preset: BodyPreset) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  chordInstrument: AcousticInstrumentType;
  onChordInstrumentChange: (type: AcousticInstrumentType) => void;
  // 2 Pure Modes: GrooveBox & Stüdyo
  viewMode: AppViewMode;
  onViewModeChange: (mode: AppViewMode) => void;
  // Prominent Rhythm Toggle
  percussionOn: boolean;
  onTogglePercussion: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isPlaying,
  onTogglePlay,
  currentPreset,
  onSelectPreset,
  volume,
  onVolumeChange,
  chordInstrument,
  onChordInstrumentChange,
  viewMode,
  onViewModeChange,
  percussionOn,
  onTogglePercussion
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
    <header className="border-b border-neutral-800/80 bg-neutral-900/80 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800 p-0.5 shadow-lg shadow-amber-950/40 flex items-center justify-center">
          <div className="w-full h-full bg-neutral-950/80 rounded-[10px] flex items-center justify-center text-amber-400">
            <Guitar className="w-5 h-5" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-base sm:text-lg tracking-tight text-white flex items-center gap-2">
              Acoustic Riff Studio
              {samplesReady ? (
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Stüdyo Kayıtlı
                </span>
              ) : (
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold tracking-wider animate-pulse">
                  Kayıtlar (%{sampleProgress})
                </span>
              )}
            </h1>
          </div>
          <p className="text-xs text-neutral-400 hidden sm:block">
            Gerçek Akustik Gitar Riff & Ableton Klavye Solo Stüdyosu
          </p>
        </div>
      </div>

      {/* CENTER: 2-MODE WORKFLOW SWITCHER (GROOVEBOX & STÜDYO) */}
      <div className="flex items-center bg-neutral-950 border-2 border-neutral-800 rounded-xl p-1 gap-1 shadow-inner">
        <button
          onClick={() => onViewModeChange('groovebox')}
          className={`px-4 py-2 rounded-lg text-xs font-extrabold flex items-center gap-2 transition-all ${
            viewMode === 'groovebox'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 shadow-lg shadow-amber-950/40 ring-1 ring-amber-400'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
          title="Mod 1: GrooveBox — Akor Riff Makinesi, Hit Şablonlar, Söz Defteri, Solo ve Canlı Performans"
        >
          <Radio className="w-4 h-4" />
          <span>🎛️ GROOVEBOX MODU</span>
        </button>

        <button
          onClick={() => onViewModeChange('studio')}
          className={`px-4 py-2 rounded-lg text-xs font-extrabold flex items-center gap-2 transition-all ${
            viewMode === 'studio'
              ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-950/40 ring-1 ring-purple-400'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
          title="Mod 2: Stüdyo — Çok Kanallı DAW Zaman Çizelgesi, Vokal / Mikrofon Kaydı ve Aranje"
        >
          <Sliders className="w-4 h-4" />
          <span>🎙️ STÜDYO MODU</span>
        </button>
      </div>

      {/* RIGHT: PROMINENT RHYTHM TOGGLE & TRANSPORT */}
      <div className="flex items-center gap-2.5">
        {/* 🥁 ULTRA-BELİRGİN RİTİM AÇ/KAPA BUTONU */}
        <button
          onClick={onTogglePercussion}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border-2 transition-all active:scale-95 shadow-md ${
            percussionOn
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-emerald-950/30'
              : 'bg-neutral-950 text-neutral-500 border-neutral-800 hover:border-neutral-700'
          }`}
          title="Kahon, Shaker ve Tef ritmini tek tıkla aç veya kapat"
        >
          <Drum className={`w-4 h-4 ${percussionOn ? 'text-emerald-400' : 'text-neutral-600'}`} />
          <div className="flex flex-col text-left leading-tight">
            <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-mono">
              Akustik Ritim
            </span>
            <span className={percussionOn ? 'text-emerald-300' : 'text-neutral-500'}>
              {percussionOn ? 'RİTİM: AÇIK' : 'RİTİM: KAPALI'}
            </span>
          </div>
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              percussionOn && isPlaying
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse'
                : percussionOn
                ? 'bg-emerald-500'
                : 'bg-neutral-700'
            }`}
          />
        </button>

        {/* Kemik Akor Enstrümanı (Naylon / Çelik / Piyano) */}
        <div className="hidden lg:flex items-center bg-neutral-950 border border-neutral-800 rounded-xl p-1 gap-1">
          <button
            onClick={() => onChordInstrumentChange('nylon')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              chordInstrument === 'nylon'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Sıcak naylon telli klasik akustik gitar"
          >
            🎸 Naylon
          </button>
          <button
            onClick={() => onChordInstrumentChange('steel')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              chordInstrument === 'steel'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Parlak çelik telli akustik gitar"
          >
            🎸 Çelik
          </button>
          <button
            onClick={() => onChordInstrumentChange('piano')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              chordInstrument === 'piano'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Konser Kuyruklu Piyanosu"
          >
            🎹 Piyano
          </button>
        </div>

        {/* Body Preset Dropdown */}
        <div className="hidden xl:flex items-center bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1 text-xs">
          <span className="text-[10px] text-neutral-400 font-bold mr-1.5 uppercase">GÖVDE:</span>
          <select
            value={currentPreset.id}
            onChange={(e) => {
              const found = GUITAR_PRESETS.find((p) => p.id === e.target.value);
              if (found) onSelectPreset(found);
            }}
            className="bg-transparent text-amber-400 font-bold focus:outline-none cursor-pointer"
          >
            {GUITAR_PRESETS.map((p) => (
              <option key={p.id} value={p.id} className="bg-neutral-900 text-white">
                {p.name.split(' ')[0]} {p.name.split(' ')[1] || ''}
              </option>
            ))}
          </select>
        </div>

        {/* Master Play/Stop Button */}
        <button
          onClick={onTogglePlay}
          className={`px-4 sm:px-5 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg active:scale-95 ${
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
        <div className="hidden sm:flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5">
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
            className="w-14 sm:w-16 accent-amber-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </header>
  );
};
