import React, { useEffect, useState, useCallback } from 'react';
import { MUSICAL_SCALES, ROOT_NOTES, getScaleNotes, KEYBOARD_KEY_MAP } from '../config/scales';
import { audioEngine } from '../audio/AudioEngine';
import { songSequencer } from '../audio/Sequencer';
import { AcousticInstrumentType } from '../audio/SampledGuitarEngine';
import { Circle, Trash2, Wand2, ChevronLeft, ChevronRight, Disc3 } from 'lucide-react';

interface SoloKeyboardProps {
  currentRoot: string;
  onRootChange: (root: string) => void;
  currentScaleId: string;
  onScaleChange: (scaleId: string) => void;
  onApplyRecommendedChords: (chords: string[]) => void;
  isPlaying: boolean;
  percussionOn: boolean;
  onTogglePercussion: () => void;
}

export const SoloKeyboard: React.FC<SoloKeyboardProps> = ({
  currentRoot,
  onRootChange,
  currentScaleId,
  onScaleChange,
  onApplyRecommendedChords,
  isPlaying,
  percussionOn,
  onTogglePercussion
}) => {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [isRecordingSolo, setIsRecordingSolo] = useState(false);
  const [soloCount, setSoloCount] = useState(0);
  const [isSoloMuted, setIsSoloMuted] = useState(false);

  // Solo Instrument & Octave Shift State
  const [soloInstrument, setSoloInstrument] = useState<AcousticInstrumentType>('steel');
  const [octaveShift, setOctaveShift] = useState<number>(0); // -2 to +2

  // Scale notes recalculated on root, scale, or octave shift!
  const baseOctave = 3 + octaveShift;
  const scaleNotes = getScaleNotes(currentRoot, currentScaleId, baseOctave);
  const activeScale = MUSICAL_SCALES[currentScaleId] || MUSICAL_SCALES['minor'];

  // Play a solo note
  const triggerSoloNote = useCallback(
    (midi: number, keyName?: string) => {
      audioEngine.unlock();
      audioEngine.playSoloMidiNote(midi, undefined, 0.95);

      if (keyName) {
        setActiveKey(keyName);
        setTimeout(() => setActiveKey(null), 180);
      }

      if (isRecordingSolo && isPlaying) {
        songSequencer.addSoloNote(midi, 0.9);
        setSoloCount(songSequencer.getSoloCount());
      }
    },
    [isRecordingSolo, isPlaying]
  );

  const handleSoloInstrumentChange = (type: AcousticInstrumentType) => {
    setSoloInstrument(type);
    audioEngine.setSoloInstrument(type);
  };

  const handleOctaveChange = (delta: number) => {
    setOctaveShift((prev) => Math.max(-2, Math.min(2, prev + delta)));
  };

  // Ableton-style Keyboard shortcuts: A-S-D-F-G-H-J-K-L, plus Z (octave down), X (octave up), R (record)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const key = e.key.toLowerCase();
      const keyIndex = KEYBOARD_KEY_MAP.indexOf(key);

      if (keyIndex !== -1 && keyIndex < scaleNotes.length) {
        e.preventDefault();
        const note = scaleNotes[keyIndex];
        triggerSoloNote(note.midi, key);
      } else if (key === 'z') {
        e.preventDefault();
        handleOctaveChange(-1);
      } else if (key === 'x') {
        e.preventDefault();
        handleOctaveChange(1);
      } else if (key === 'r') {
        e.preventDefault();
        setIsRecordingSolo((prev) => {
          const next = !prev;
          songSequencer.setIsRecordingSolo(next);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scaleNotes, triggerSoloNote]);

  const toggleRecording = () => {
    const next = !isRecordingSolo;
    setIsRecordingSolo(next);
    songSequencer.setIsRecordingSolo(next);
  };

  const handleClearSolo = () => {
    songSequencer.clearSolo();
    setSoloCount(0);
  };

  const handleToggleSoloMute = () => {
    const next = !isSoloMuted;
    setIsSoloMuted(next);
    songSequencer.setSoloMuted(next);
  };

  return (
    <div className="bg-[#121316] border-2 border-[#242730] rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 relative overflow-hidden font-mono">
      {/* Groovebox Brushed Metal Texture Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

      {/* GROOVEBOX TOP OLED CONTROL PANEL */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 bg-[#0a0a0d] border border-[#22242c] rounded-xl p-3 shadow-inner">
        {/* Left: Solo Instrument Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
            SOLO ENSTRÜMAN:
          </span>
          <div className="flex bg-[#16171d] border border-[#2a2d38] rounded-lg p-0.5 gap-1">
            <button
              onClick={() => handleSoloInstrumentChange('steel')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                soloInstrument === 'steel'
                  ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Çelik Akustik
            </button>
            <button
              onClick={() => handleSoloInstrumentChange('nylon')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                soloInstrument === 'nylon'
                  ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Sıcak Naylon
            </button>
            <button
              onClick={() => handleSoloInstrumentChange('bass')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                soloInstrument === 'bass'
                  ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Akustik Bas
            </button>
          </div>
        </div>

        {/* Center: Octave Shift Controls (Z / X) */}
        <div className="flex items-center gap-2 bg-[#16171d] border border-[#2a2d38] rounded-lg px-2.5 py-1">
          <span className="text-[10px] uppercase text-neutral-400 font-bold">OKTAV:</span>
          <button
            onClick={() => handleOctaveChange(-1)}
            disabled={octaveShift <= -2}
            className="w-6 h-6 rounded bg-[#20222a] hover:bg-[#2b2e3a] disabled:opacity-30 text-white flex items-center justify-center font-bold text-xs"
            title="Oktav Düşür (Z tuşu)"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-[#0a0a0d] border border-[#333744] text-amber-400 rounded min-w-[54px] text-center">
            {octaveShift === 0 ? 'C3 (Std)' : octaveShift > 0 ? `+${octaveShift} (Tiz)` : `${octaveShift} (Bas)`}
          </span>

          <button
            onClick={() => handleOctaveChange(1)}
            disabled={octaveShift >= 2}
            className="w-6 h-6 rounded bg-[#20222a] hover:bg-[#2b2e3a] disabled:opacity-30 text-white flex items-center justify-center font-bold text-xs"
            title="Oktav Yükselt (X tuşu)"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <span className="text-[9px] text-neutral-400 hidden sm:inline">[Z / X]</span>
        </div>

        {/* Right: Scale & Root Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Root Note */}
          <div className="flex items-center gap-1 bg-[#16171d] border border-[#2a2d38] rounded-lg px-2 py-1">
            <span className="text-[10px] text-neutral-400">KÖK:</span>
            <select
              value={currentRoot}
              onChange={(e) => onRootChange(e.target.value)}
              className="bg-transparent text-amber-400 font-bold text-xs focus:outline-none cursor-pointer font-mono"
            >
              {ROOT_NOTES.map((r) => (
                <option key={r} value={r} className="bg-neutral-900 text-white">
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Gam / Makam */}
          <div className="flex items-center gap-1 bg-[#16171d] border border-[#2a2d38] rounded-lg px-2 py-1">
            <span className="text-[10px] text-neutral-400">GAM:</span>
            <select
              value={currentScaleId}
              onChange={(e) => onScaleChange(e.target.value)}
              className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer font-sans"
            >
              {Object.values(MUSICAL_SCALES).map((s) => (
                <option key={s.id} value={s.id} className="bg-neutral-900 text-white">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => onApplyRecommendedChords(activeScale.recommendedChords.slice(0, 4))}
            className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs transition-all"
            title="Gama uygun akorları aktif kısma diz"
          >
            <Wand2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ELEKTRON / PUSH STYLE RGB SILICONE PERFORMANCE PADS (A S D F G H J K L) */}
      <div className="relative z-10 space-y-2">
        <div className="flex items-center justify-between text-xs text-neutral-400 font-sans">
          <span className="flex items-center gap-2">
            <Disc3 className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
            <strong className="text-white">Ableton Pad Klavyesi:</strong> [A, S, D, F, G, H, J, K, L, ;]
          </span>
          <span className="font-mono text-[11px] text-amber-400/80">
            {currentRoot} {activeScale.name.split(' ')[0]} ({scaleNotes[0]?.noteName} - {scaleNotes[scaleNotes.length - 1]?.noteName})
          </span>
        </div>

        {/* 10 RGB Hardware Silicon Pads */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 select-none">
          {scaleNotes.slice(0, 10).map((note, idx) => {
            const keyChar = KEYBOARD_KEY_MAP[idx].toUpperCase();
            const isPressed = activeKey === KEYBOARD_KEY_MAP[idx];
            const isRoot = idx % 7 === 0;

            return (
              <button
                key={`${note.noteName}-${idx}`}
                onClick={() => triggerSoloNote(note.midi, KEYBOARD_KEY_MAP[idx])}
                className={`relative flex flex-col items-center justify-between p-2.5 rounded-xl border-2 transition-all active:scale-95 min-h-[105px] group shadow-lg ${
                  isPressed
                    ? 'bg-gradient-to-t from-amber-400 to-amber-200 border-amber-100 text-neutral-950 scale-105 shadow-[0_0_25px_rgba(251,191,36,0.8)] z-10'
                    : isRoot
                    ? 'bg-gradient-to-b from-[#241a12] to-[#140e0a] border-amber-600/80 hover:border-amber-400 text-amber-200 shadow-amber-950/40'
                    : 'bg-gradient-to-b from-[#1b1c22] to-[#101115] border-[#2c303c] hover:border-[#42485a] text-neutral-200 hover:text-white'
                }`}
              >
                {/* Silicon Pad Top LED Header */}
                <div className="w-full flex items-center justify-between">
                  <div
                    className={`w-6 h-6 rounded-md font-mono text-xs font-black flex items-center justify-center border shadow-inner ${
                      isPressed
                        ? 'bg-neutral-950 text-amber-400 border-neutral-900'
                        : isRoot
                        ? 'bg-amber-500 text-neutral-950 border-amber-400'
                        : 'bg-[#252834] text-neutral-300 border-[#383d4e] group-hover:bg-[#323646]'
                    }`}
                  >
                    {keyChar}
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isPressed
                        ? 'bg-neutral-950 animate-ping'
                        : isRoot
                        ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                        : 'bg-neutral-600'
                    }`}
                  />
                </div>

                {/* Big Note Name (e.g. A3, C4) */}
                <div className="font-bold text-lg tracking-tight font-mono my-1">
                  {note.noteName}
                </div>

                {/* Degree Display */}
                <div
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                    isPressed
                      ? 'bg-neutral-950/20 text-neutral-950'
                      : isRoot
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-neutral-900 text-neutral-400 group-hover:text-amber-400'
                  }`}
                >
                  {isRoot ? 'KÖK' : `${(idx % 7) + 1}. DER`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* HARDWARE FOOTER: SOLO LOOPER & TRACK MUTES */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#242730]">
        {/* Solo Looper Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleRecording}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border-2 transition-all active:scale-95 ${
              isRecordingSolo
                ? 'bg-red-500/20 text-red-400 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)] animate-pulse'
                : 'bg-[#181920] border-[#2a2d38] text-neutral-300 hover:border-neutral-600'
            }`}
          >
            <Circle className={`w-3.5 h-3.5 ${isRecordingSolo ? 'fill-red-500 text-red-500' : 'text-neutral-500'}`} />
            <span>{isRecordingSolo ? 'OVERDUB KAYDEDİYOR (R)' : 'SOLO KAYDET (R)'}</span>
          </button>

          {soloCount > 0 && (
            <div className="flex items-center gap-1.5 bg-[#0a0a0d] border border-[#2a2d38] rounded-lg px-2.5 py-1 text-xs">
              <span className="text-amber-400 font-mono">Loop: {soloCount} nota</span>
              <button
                onClick={handleToggleSoloMute}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  isSoloMuted ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                }`}
              >
                {isSoloMuted ? 'MUTE' : 'ON'}
              </button>
              <button
                onClick={handleClearSolo}
                className="p-1 hover:text-red-400 text-neutral-500 rounded"
                title="Kaydedilen soloyu temizle"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Quick Percussion Rhythm Indicator & Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePercussion}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              percussionOn
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-sm'
                : 'bg-[#181920] text-neutral-500 border-[#2a2d38]'
            }`}
          >
            {percussionOn ? '🥁 Vurmalı: AÇIK' : '🥁 Vurmalı: KAPALI'}
          </button>
        </div>
      </div>
    </div>
  );
};
