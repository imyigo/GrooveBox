import React, { useEffect, useState, useCallback } from 'react';
import { MUSICAL_SCALES, ROOT_NOTES, getScaleNotes } from '../config/scales';
import { audioEngine } from '../audio/AudioEngine';
import { songSequencer } from '../audio/Sequencer';
import { AcousticInstrumentType, INSTRUMENT_METAS } from '../audio/SampledGuitarEngine';
import { GuitarChord } from '../types';
import { Circle, Trash2, Wand2, Sparkles } from 'lucide-react';

interface SoloKeyboardProps {
  currentRoot: string;
  onRootChange: (root: string) => void;
  currentScaleId: string;
  onScaleChange: (scaleId: string) => void;
  onApplyRecommendedChords: (chords: string[]) => void;
  isPlaying: boolean;
  percussionOn: boolean;
  onTogglePercussion: () => void;
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
  onApplyRecommendedChords,
  isPlaying,
  percussionOn,
  onTogglePercussion,
  activeChord
}) => {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [isRecordingSolo, setIsRecordingSolo] = useState(false);
  const [soloCount, setSoloCount] = useState(0);
  const [isSoloMuted, setIsSoloMuted] = useState(false);

  // Selected Solo Instrument
  const [soloInstrument, setSoloInstrument] = useState<AcousticInstrumentType>('violin');

  // Octave Shift (-2 to +2)
  const [octaveShift, setOctaveShift] = useState<number>(0);

  // Active Scale
  const activeScale = MUSICAL_SCALES[currentScaleId] || MUSICAL_SCALES['minor'];

  // Base octaves for FL Studio rows
  const homeOctave = 3 + octaveShift;
  const upperNotes = getScaleNotes(currentRoot, currentScaleId, homeOctave + 1);
  const homeNotes = getScaleNotes(currentRoot, currentScaleId, homeOctave);
  const lowerNotes = getScaleNotes(currentRoot, currentScaleId, homeOctave - 1);

  // Active Chord Tones calculation (for "Solo araç akorlara sadıktır" harmonic highlighting)
  const chordRoot = activeChord.root; // e.g. "A", "C", "D"

  // Play a solo note
  const triggerSoloNote = useCallback(
    (midi: number, keyName?: string) => {
      audioEngine.unlock();
      audioEngine.playSoloMidiNote(midi, undefined, 0.95);

      if (keyName) {
        setActiveKey(keyName);
        setTimeout(() => setActiveKey(null), 150);
      }

      if (isRecordingSolo && isPlaying) {
        songSequencer.addSoloNote(midi, 0.95);
        setSoloCount(songSequencer.getSoloCount());
      }
    },
    [isRecordingSolo, isPlaying]
  );

  const handleSelectInstrument = (type: AcousticInstrumentType) => {
    setSoloInstrument(type);
    audioEngine.setSoloInstrument(type);
  };

  // FL Studio 3-Row Keyboard Listener
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

      // Global Solo recording toggle: 'Space' or 'Alt+R'
      if (key === 'r' && e.altKey) {
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
  }, [upperNotes, homeNotes, lowerNotes, triggerSoloNote]);

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
    <div className="bg-[#101116] border-2 border-[#242734] rounded-xl p-3 sm:p-4 shadow-2xl space-y-2.5 font-mono select-none">
      {/* GROOVEBOX HARDWARE TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#08080c] border border-[#20222c] rounded-lg p-2 text-xs">
        {/* Left: Solo Instrument Selector (Keman, Klarnet, Saksafon, Mızıka, Naylon, Çelik, Bas) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
            SOLO ENSTRÜMAN:
          </span>
          <div className="flex flex-wrap gap-1 bg-[#14151c] border border-[#262836] rounded-lg p-0.5">
            {(Object.keys(INSTRUMENT_METAS) as AcousticInstrumentType[]).map((instId) => {
              const meta = INSTRUMENT_METAS[instId];
              const isSelected = soloInstrument === instId;

              return (
                <button
                  key={instId}
                  onClick={() => handleSelectInstrument(instId)}
                  className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-neutral-950 shadow-sm shadow-amber-500/40'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <span>{meta.icon}</span>
                  <span>{meta.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Scale & Root + Harmonic Assistant */}
        <div className="flex flex-wrap items-center gap-2">
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

          <button
            onClick={() => onApplyRecommendedChords(activeScale.recommendedChords.slice(0, 4))}
            className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-[11px] font-bold flex items-center gap-1 transition-all"
            title="Gama uygun akorları aktif kısma aktar"
          >
            <Wand2 className="w-3 h-3" />
            <span>Gama Uygun Akorlar</span>
          </button>
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

          {/* Quick Rhythm Toggle */}
          <button
            onClick={onTogglePercussion}
            className={`px-2.5 py-1 rounded text-xs font-bold border transition-all ${
              percussionOn
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'bg-[#14151c] text-neutral-500 border-[#262836]'
            }`}
          >
            {percussionOn ? '🥁 Ritim: Açık' : '🥁 Ritim: Kapalı'}
          </button>
        </div>
      </div>

      {/* HARMONIC PROMISE: "SOLO ARAÇ AKORLARA SADIKTIR" */}
      <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1">
        <span className="flex items-center gap-1.5 text-neutral-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>
            Aktif Akor: <strong className="text-amber-400 font-bold text-sm">{activeChord.displayName}</strong>
            {' '}(Altın sarısı parlayan tuşlar akorun kök ve renk sesleridir, detone olmak imkansızdır!)
          </span>
        </span>
        <span className="text-[10px] text-neutral-500 hidden sm:inline">
          FL Studio Klavye Düzeni: [Q-Ü: Tiz] • [A-İ: Ana] • [Z-Ç: Bas]
        </span>
      </div>

      {/* FL STUDIO 3-ROW HARDWARE KEYBOARD PADS (Zero Scroll, High Density) */}
      <div className="space-y-1.5">
        {/* ROW 1: TİZ OKTAV (Upper Row: Q W E R T Y U I O P Ğ Ü) */}
        <div className="flex items-center gap-1">
          <div className="w-12 text-[9px] font-bold text-cyan-400/80 uppercase tracking-tighter shrink-0 text-center">
            TİZ +1
          </div>
          <div className="grid grid-cols-12 gap-1 flex-1">
            {upperNotes.slice(0, 12).map((note, idx) => {
              const keyChar = (ROW_UPPER_KEYS[idx] || '').toUpperCase();
              const isPressed = activeKey === ROW_UPPER_KEYS[idx];
              const isChordTone = note.noteName.startsWith(chordRoot);

              return (
                <button
                  key={`upper-${note.noteName}-${idx}`}
                  onClick={() => triggerSoloNote(note.midi, ROW_UPPER_KEYS[idx])}
                  className={`relative flex flex-col items-center justify-between p-1 rounded-lg border transition-all active:scale-95 h-14 ${
                    isPressed
                      ? 'bg-gradient-to-t from-cyan-400 to-white text-neutral-950 scale-105 shadow-[0_0_15px_rgba(34,211,238,0.9)] z-10'
                      : isChordTone
                      ? 'bg-gradient-to-b from-[#1b2a30] to-[#0e181c] border-cyan-500/80 text-cyan-300 shadow-sm'
                      : 'bg-[#14161d] border-[#222634] text-neutral-300 hover:border-neutral-500'
                  }`}
                >
                  <span className="text-[9px] font-mono font-bold text-neutral-400">{keyChar}</span>
                  <span className="font-bold text-xs font-mono">{note.noteName}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${isChordTone ? 'bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.8)]' : 'bg-neutral-600'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* ROW 2: ANA ORTA OKTAV (Home Row: A S D F G H J K L Ş İ) */}
        <div className="flex items-center gap-1">
          <div className="w-12 text-[9px] font-bold text-amber-400 uppercase tracking-tighter shrink-0 text-center">
            ANA 0
          </div>
          <div className="grid grid-cols-12 gap-1 flex-1">
            {homeNotes.slice(0, 12).map((note, idx) => {
              const keyChar = (ROW_HOME_KEYS[idx] || '').toUpperCase();
              const isPressed = activeKey === ROW_HOME_KEYS[idx];
              const isChordTone = note.noteName.startsWith(chordRoot);

              return (
                <button
                  key={`home-${note.noteName}-${idx}`}
                  onClick={() => triggerSoloNote(note.midi, ROW_HOME_KEYS[idx])}
                  className={`relative flex flex-col items-center justify-between p-1 rounded-lg border-2 transition-all active:scale-95 h-16 ${
                    isPressed
                      ? 'bg-gradient-to-t from-amber-400 to-white text-neutral-950 scale-105 shadow-[0_0_20px_rgba(251,191,36,0.9)] z-10'
                      : isChordTone
                      ? 'bg-gradient-to-b from-[#2e1f10] to-[#170e06] border-amber-500 text-amber-200 shadow-md shadow-amber-950/40 ring-1 ring-amber-500/30'
                      : 'bg-[#171822] border-[#282d3d] text-neutral-200 hover:border-neutral-500'
                  }`}
                >
                  <span className="text-[10px] font-mono font-black text-amber-400">{keyChar}</span>
                  <span className="font-bold text-sm font-mono">{note.noteName}</span>
                  <span className={`text-[9px] font-mono ${isChordTone ? 'text-amber-300 font-bold' : 'text-neutral-500'}`}>
                    {isChordTone ? '★ KÖK' : `${(idx % 7) + 1}. DER`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ROW 3: BAS OKTAV (Lower Row: Z X C V B N M Ö Ç) */}
        <div className="flex items-center gap-1">
          <div className="w-12 text-[9px] font-bold text-purple-400/80 uppercase tracking-tighter shrink-0 text-center">
            BAS -1
          </div>
          <div className="grid grid-cols-12 gap-1 flex-1">
            {lowerNotes.slice(0, 12).map((note, idx) => {
              const keyChar = (ROW_LOWER_KEYS[idx] || '').toUpperCase();
              const isPressed = activeKey === ROW_LOWER_KEYS[idx];
              const isChordTone = note.noteName.startsWith(chordRoot);

              return (
                <button
                  key={`lower-${note.noteName}-${idx}`}
                  onClick={() => triggerSoloNote(note.midi, ROW_LOWER_KEYS[idx])}
                  className={`relative flex flex-col items-center justify-between p-1 rounded-lg border transition-all active:scale-95 h-13 ${
                    isPressed
                      ? 'bg-gradient-to-t from-purple-400 to-white text-neutral-950 scale-105 shadow-[0_0_15px_rgba(192,132,252,0.9)] z-10'
                      : isChordTone
                      ? 'bg-gradient-to-b from-[#25152a] to-[#120a14] border-purple-500/80 text-purple-300 shadow-sm'
                      : 'bg-[#12131a] border-[#202330] text-neutral-400 hover:border-neutral-500'
                  }`}
                >
                  <span className="text-[9px] font-mono font-bold text-neutral-500">{keyChar}</span>
                  <span className="font-bold text-xs font-mono">{note.noteName}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${isChordTone ? 'bg-purple-400 shadow-[0_0_4px_rgba(192,132,252,0.8)]' : 'bg-neutral-700'}`} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
