import React, { useEffect, useState, useCallback } from 'react';
import { MUSICAL_SCALES, ROOT_NOTES, getScaleNotes } from '../config/scales';
import { snapMidiToChord, getChordPitchClasses } from '../config/chords';
import { audioEngine } from '../audio/AudioEngine';
import { songSequencer } from '../audio/Sequencer';
import { AcousticInstrumentType, INSTRUMENT_METAS } from '../audio/SampledGuitarEngine';
import { GuitarChord, SoloHarmonyMode } from '../types';
import { Circle, Trash2, Magnet } from 'lucide-react';

interface SoloKeyboardProps {
  currentRoot: string;
  onRootChange: (root: string) => void;
  currentScaleId: string;
  onScaleChange: (scaleId: string) => void;
  onApplyRecommendedChords?: (chords: string[]) => void;
  isPlaying: boolean;
  percussionOn?: boolean;
  onTogglePercussion?: () => void;
  activeChord: GuitarChord;
}

// FL Studio 3-Row Computer Keyboard Mapping
// Upper Row: Octave +1 (High register)
const ROW_UPPER_KEYS = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'ğ', 'ü', '[', ']'];
// Home Row: Octave 0 (Main register)
const ROW_HOME_KEYS = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ş', 'i', ';', "'"];
// Lower Row: Octave -1 (Bass register)
const ROW_LOWER_KEYS = ['z', 'x', 'c', 'v', 'b', 'n', 'm', 'ö', 'ç', ',', '.'];

export const SoloKeyboard: React.FC<SoloKeyboardProps> = ({
  currentRoot,
  onRootChange,
  currentScaleId,
  onScaleChange,
  isPlaying,
  activeChord
}) => {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [isRecordingSolo, setIsRecordingSolo] = useState(false);
  const [soloCount, setSoloCount] = useState(0);
  const [isSoloMuted, setIsSoloMuted] = useState(false);

  // Selected Solo Instrument (Violin default for expressive acoustics)
  const [soloInstrument, setSoloInstrument] = useState<AcousticInstrumentType>('violin');

  // Octave Shift (-2 to +2)
  const [octaveShift, setOctaveShift] = useState<number>(0);

  // Virtuoso Solo Harmony Mode (Default: chord-tones so even random keys fit 100%!)
  const [soloHarmonyMode, setSoloHarmonyMode] = useState<SoloHarmonyMode>('chord-tones');

  // Base octaves for FL Studio rows
  const homeOctave = 3 + octaveShift;
  const upperNotes = getScaleNotes(currentRoot, currentScaleId, homeOctave + 1);
  const homeNotes = getScaleNotes(currentRoot, currentScaleId, homeOctave);
  const lowerNotes = getScaleNotes(currentRoot, currentScaleId, homeOctave - 1);

  // Active Chord Pitch Classes (0-11)
  const chordPitchClasses = getChordPitchClasses(activeChord);

  // Play a solo note with Virtuoso Solocu Algoritması
  const triggerSoloNote = useCallback(
    (rawMidi: number, keyName?: string) => {
      audioEngine.unlock();

      // Grace note / Çarpma süslemesi for 'smart-lick' mode
      const withGraceNote = soloHarmonyMode === 'smart-lick' && Math.random() > 0.40;
      const finalMidi = snapMidiToChord(rawMidi, activeChord, soloHarmonyMode);

      audioEngine.playSoloMidiNote(finalMidi, undefined, 0.95, withGraceNote);

      if (keyName) {
        setActiveKey(keyName);
        setTimeout(() => setActiveKey(null), 140);
      }

      if (isRecordingSolo && isPlaying) {
        songSequencer.addSoloNote(finalMidi, 0.95);
        setSoloCount(songSequencer.getSoloCount());
      }
    },
    [soloHarmonyMode, activeChord, isRecordingSolo, isPlaying]
  );

  const releaseSoloNote = useCallback((midi?: number) => {
    audioEngine.stopSoloNote(midi);
  }, []);

  const handleSelectInstrument = (type: AcousticInstrumentType) => {
    setSoloInstrument(type);
    audioEngine.setSoloInstrument(type);
  };

  // FL Studio 3-Row Keyboard Listener (KeyDown & KeyUp for authentic note release)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const key = e.key.toLowerCase();

      // Check Upper Row (Octave +1)
      const upperIdx = ROW_UPPER_KEYS.indexOf(key);
      if (upperIdx !== -1 && upperIdx < upperNotes.length) {
        e.preventDefault();
        triggerSoloNote(upperNotes[upperIdx].midi, key);
        return;
      }

      // Check Home Row (Octave 0)
      const homeIdx = ROW_HOME_KEYS.indexOf(key);
      if (homeIdx !== -1 && homeIdx < homeNotes.length) {
        e.preventDefault();
        triggerSoloNote(homeNotes[homeIdx].midi, key);
        return;
      }

      // Check Lower Row (Octave -1)
      const lowerIdx = ROW_LOWER_KEYS.indexOf(key);
      if (lowerIdx !== -1 && lowerIdx < lowerNotes.length) {
        e.preventDefault();
        triggerSoloNote(lowerNotes[lowerIdx].midi, key);
        return;
      }

      // Global Solo recording toggle: 'Alt+R'
      if (key === 'r' && e.altKey) {
        e.preventDefault();
        setIsRecordingSolo((prev) => {
          const next = !prev;
          songSequencer.setIsRecordingSolo(next);
          return next;
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      releaseSoloNote();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [upperNotes, homeNotes, lowerNotes, triggerSoloNote, releaseSoloNote]);

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
    <div className="bg-[#101116] border-2 border-[#242734] rounded-xl p-2 sm:p-2.5 shadow-2xl space-y-1.5 font-mono select-none">
      {/* GROOVEBOX HARDWARE TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#08080c] border border-[#20222c] rounded-lg p-2 text-xs">
        {/* Left: Solo Instrument Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
            USTA ENSTRÜMAN:
          </span>
          <div className="flex flex-wrap gap-1 bg-[#14151c] border border-[#262836] rounded-lg p-0.5">
            {(Object.keys(INSTRUMENT_METAS) as AcousticInstrumentType[]).map((instId) => {
              const meta = INSTRUMENT_METAS[instId];
              const isSelected = soloInstrument === instId;

              return (
                <button
                  key={instId}
                  onClick={() => handleSelectInstrument(instId)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-neutral-950 shadow-sm shadow-amber-500/40'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                  title={`${meta.name} - Gerçek stüdyo kaydı ve doğal enstrüman sönümü`}
                >
                  <span>{meta.icon}</span>
                  <span>{meta.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Virtuoso Solo Mode Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 🧲 SOLO ALGORİTMASI SEÇİCİ */}
          <div className="flex items-center gap-1 bg-[#14151c] border border-[#262836] rounded-lg p-0.5">
            <span className="text-[10px] text-amber-400 font-bold px-1.5 flex items-center gap-1">
              <Magnet className="w-3 h-3 text-amber-400" />
              SOLOCU ALGORİTMASI:
            </span>
            <select
              value={soloHarmonyMode}
              onChange={(e) => setSoloHarmonyMode(e.target.value as SoloHarmonyMode)}
              className="bg-[#1e202c] text-white font-bold text-xs rounded px-2 py-0.5 border border-[#303448] focus:outline-none cursor-pointer"
            >
              <option value="chord-tones">🎯 Akor Sesleri (Sıfır Hata / %100 Uyum)</option>
              <option value="smart-lick">🪄 Virtüöz Doğaçlama (Süsleme & Çarpma)</option>
              <option value="pentatonic">🎵 Akustik Pentatonik & Blues</option>
              <option value="free-scale">🎼 Diatonik Gam (Tüm Notalar)</option>
            </select>
          </div>

          {/* Root */}
          <div className="flex items-center gap-1 bg-[#14151c] border border-[#262836] rounded px-2 py-0.5">
            <span className="text-[10px] text-neutral-400">KÖK:</span>
            <select
              value={currentRoot}
              onChange={(e) => onRootChange(e.target.value)}
              className="bg-transparent text-amber-400 font-bold focus:outline-none cursor-pointer"
            >
              {ROOT_NOTES.map((r) => (
                <option key={r} value={r} className="bg-neutral-900 text-white">
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Scale */}
          <div className="flex items-center gap-1 bg-[#14151c] border border-[#262836] rounded px-2 py-0.5">
            <span className="text-[10px] text-neutral-400">GAM:</span>
            <select
              value={currentScaleId}
              onChange={(e) => onScaleChange(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer font-sans"
            >
              {Object.values(MUSICAL_SCALES).map((s) => (
                <option key={s.id} value={s.id} className="bg-neutral-900 text-white">
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Octave Transpose & Solo Looper */}
        <div className="flex items-center gap-2">
          {/* Octave Shift */}
          <div className="flex items-center gap-1 bg-[#14151c] border border-[#262836] rounded px-2 py-0.5">
            <span className="text-[10px] text-neutral-400 font-bold">OKTAV:</span>
            <button
              onClick={() => setOctaveShift((prev) => Math.max(-2, prev - 1))}
              disabled={octaveShift <= -2}
              className="w-5 h-5 rounded bg-[#20222e] hover:bg-[#2c3040] disabled:opacity-30 text-white font-bold text-xs"
            >
              -
            </button>
            <span className="text-amber-400 font-bold text-xs px-1">
              {octaveShift === 0 ? '0' : octaveShift > 0 ? `+${octaveShift}` : `${octaveShift}`}
            </span>
            <button
              onClick={() => setOctaveShift((prev) => Math.min(2, prev + 1))}
              disabled={octaveShift >= 2}
              className="w-5 h-5 rounded bg-[#20222e] hover:bg-[#2c3040] disabled:opacity-30 text-white font-bold text-xs"
            >
              +
            </button>
          </div>

          {/* Record Solo Button */}
          <button
            onClick={toggleRecording}
            className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 border transition-all ${
              isRecordingSolo
                ? 'bg-red-500/20 text-red-400 border-red-500 animate-pulse'
                : 'bg-[#14151c] border-[#262836] text-neutral-300 hover:border-neutral-500'
            }`}
          >
            <Circle className={`w-2.5 h-2.5 ${isRecordingSolo ? 'fill-red-500 text-red-500' : 'text-neutral-500'}`} />
            <span>{isRecordingSolo ? 'REC' : 'SOLO KAYDET'}</span>
          </button>

          {soloCount > 0 && (
            <div className="flex items-center gap-1 bg-[#08080c] border border-[#262836] rounded px-1.5 py-0.5 text-[10px]">
              <span className="text-amber-400">{soloCount} nota</span>
              <button
                onClick={handleToggleSoloMute}
                className={`px-1 rounded ${isSoloMuted ? 'text-red-400 line-through' : 'text-emerald-400 font-bold'}`}
              >
                {isSoloMuted ? 'MUTE' : 'ON'}
              </button>
              <button onClick={handleClearSolo} className="text-neutral-500 hover:text-red-400">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FL STUDIO 3-ROW PHYSICAL KEYBOARD MATRIX (Zero Scroll Compact) */}
      <div className="space-y-1 bg-[#0b0c10] border border-[#1e202a] rounded-lg p-1.5 shadow-inner">
        {/* ROW 1: UPPER ROW (Tiz Oktav - Q, W, E, R, T...) */}
        <div className="flex items-center gap-1 justify-between">
          <div className="w-14 shrink-0 text-[10px] text-cyan-400 font-bold uppercase tracking-wider pl-1">
            TİZ [Q-Ü]
          </div>
          <div className="grid grid-cols-12 sm:grid-cols-14 gap-1 flex-1">
            {upperNotes.slice(0, 14).map((note, idx) => {
              const isPressed = activeKey === ROW_UPPER_KEYS[idx];
              const isChordTone = chordPitchClasses.includes(note.midi % 12);

              return (
                <button
                  key={`upper-${note.noteName}-${idx}`}
                  onMouseDown={() => triggerSoloNote(note.midi, ROW_UPPER_KEYS[idx])}
                  onMouseUp={() => releaseSoloNote(note.midi)}
                  onTouchStart={() => triggerSoloNote(note.midi, ROW_UPPER_KEYS[idx])}
                  onTouchEnd={() => releaseSoloNote(note.midi)}
                  className={`relative flex flex-col items-center justify-between p-0.5 rounded-lg border transition-all active:scale-95 h-10 ${
                    isPressed
                      ? 'bg-gradient-to-t from-cyan-400 to-white text-neutral-950 scale-105 shadow-[0_0_15px_rgba(34,211,238,0.9)] z-10'
                      : isChordTone
                      ? 'bg-gradient-to-b from-[#142838] to-[#0a141c] border-cyan-500/80 text-cyan-300 shadow-sm'
                      : 'bg-[#12131a] border-[#202330] text-neutral-400 hover:border-neutral-500'
                  }`}
                >
                  <span className="text-[9px] uppercase font-bold text-neutral-500">{ROW_UPPER_KEYS[idx]}</span>
                  <span className="text-xs font-bold font-mono tracking-tight">{note.noteName}</span>
                  <div className="w-full flex justify-center">
                    {isChordTone ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                    ) : (
                      <span className="w-1 h-1 rounded-full bg-neutral-700" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ROW 2: HOME ROW (Ana Oktav - A, S, D, F, G...) */}
        <div className="flex items-center gap-1 justify-between">
          <div className="w-14 shrink-0 text-[10px] text-amber-400 font-bold uppercase tracking-wider pl-1">
            ORTA [A-İ]
          </div>
          <div className="grid grid-cols-12 sm:grid-cols-13 gap-1 flex-1">
            {homeNotes.slice(0, 13).map((note, idx) => {
              const isPressed = activeKey === ROW_HOME_KEYS[idx];
              const isChordTone = chordPitchClasses.includes(note.midi % 12);

              return (
                <button
                  key={`home-${note.noteName}-${idx}`}
                  onMouseDown={() => triggerSoloNote(note.midi, ROW_HOME_KEYS[idx])}
                  onMouseUp={() => releaseSoloNote(note.midi)}
                  onTouchStart={() => triggerSoloNote(note.midi, ROW_HOME_KEYS[idx])}
                  onTouchEnd={() => releaseSoloNote(note.midi)}
                  className={`relative flex flex-col items-center justify-between p-0.5 rounded-lg border transition-all active:scale-95 h-10 ${
                    isPressed
                      ? 'bg-gradient-to-t from-amber-400 to-white text-neutral-950 scale-105 shadow-[0_0_15px_rgba(245,158,11,0.9)] z-10'
                      : isChordTone
                      ? 'bg-gradient-to-b from-[#2e1d0f] to-[#140c06] border-amber-500 text-amber-300 shadow-sm'
                      : 'bg-[#12131a] border-[#202330] text-neutral-400 hover:border-neutral-500'
                  }`}
                >
                  <span className="text-[9px] uppercase font-bold text-neutral-500">{ROW_HOME_KEYS[idx]}</span>
                  <span className="text-xs font-bold font-mono tracking-tight">{note.noteName}</span>
                  <div className="w-full flex justify-center">
                    {isChordTone ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                    ) : (
                      <span className="w-1 h-1 rounded-full bg-neutral-700" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ROW 3: LOWER ROW (Bas Oktav - Z, X, C, V, B...) */}
        <div className="flex items-center gap-1 justify-between">
          <div className="w-14 shrink-0 text-[10px] text-purple-400 font-bold uppercase tracking-wider pl-1">
            BAS [Z-Ç]
          </div>
          <div className="grid grid-cols-10 sm:grid-cols-11 gap-1 flex-1">
            {lowerNotes.slice(0, 11).map((note, idx) => {
              const isPressed = activeKey === ROW_LOWER_KEYS[idx];
              const isChordTone = chordPitchClasses.includes(note.midi % 12);

              return (
                <button
                  key={`lower-${note.noteName}-${idx}`}
                  onMouseDown={() => triggerSoloNote(note.midi, ROW_LOWER_KEYS[idx])}
                  onMouseUp={() => releaseSoloNote(note.midi)}
                  onTouchStart={() => triggerSoloNote(note.midi, ROW_LOWER_KEYS[idx])}
                  onTouchEnd={() => releaseSoloNote(note.midi)}
                  className={`relative flex flex-col items-center justify-between p-0.5 rounded-lg border transition-all active:scale-95 h-10 ${
                    isPressed
                      ? 'bg-gradient-to-t from-purple-400 to-white text-neutral-950 scale-105 shadow-[0_0_15px_rgba(192,132,252,0.9)] z-10'
                      : isChordTone
                      ? 'bg-gradient-to-b from-[#231427] to-[#100912] border-purple-500 text-purple-300 shadow-sm'
                      : 'bg-[#12131a] border-[#202330] text-neutral-400 hover:border-neutral-500'
                  }`}
                >
                  <span className="text-[9px] uppercase font-bold text-neutral-500">{ROW_LOWER_KEYS[idx]}</span>
                  <span className="text-xs font-bold font-mono tracking-tight">{note.noteName}</span>
                  <div className="w-full flex justify-center">
                    {isChordTone ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.8)]" />
                    ) : (
                      <span className="w-1 h-1 rounded-full bg-neutral-700" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
