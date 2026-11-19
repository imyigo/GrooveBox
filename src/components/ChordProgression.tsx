import React, { useState } from 'react';
import { GUITAR_CHORDS } from '../config/chords';
import { SONG_PROGRESSIONS, SongProgression } from '../config/progressions';
import { GuitarChord } from '../types';
import { Plus, Trash2, ArrowUpDown, Music, Sparkles } from 'lucide-react';
import { strumEngine } from '../audio/StrumEngine';
import { audioEngine } from '../audio/AudioEngine';

interface ChordProgressionProps {
  chords: string[];
  currentChordIndex: number;
  activeChord: GuitarChord;
  onSelectChord: (chord: GuitarChord) => void;
  onChangeChords: (newChords: string[]) => void;
  onLoadProgression: (progression: SongProgression) => void;
}

export const ChordProgression: React.FC<ChordProgressionProps> = ({
  chords,
  currentChordIndex,
  activeChord,
  onSelectChord,
  onChangeChords,
  onLoadProgression
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);

  const handleChordClick = (chordId: string) => {
    const chord = GUITAR_CHORDS[chordId];
    if (chord) {
      onSelectChord(chord);
      audioEngine.unlock();
      strumEngine.strumChord(chord, { stroke: 'down', velocity: 0.85 });
    }
  };

  const handleOpenPicker = (indexToReplace?: number) => {
    setReplaceIndex(indexToReplace !== undefined ? indexToReplace : null);
    setIsPickerOpen(true);
  };

  const handleSelectNewChord = (chordId: string) => {
    if (replaceIndex !== null) {
      const next = [...chords];
      next[replaceIndex] = chordId;
      onChangeChords(next);
    } else {
      onChangeChords([...chords, chordId]);
    }
    const chord = GUITAR_CHORDS[chordId];
    if (chord) {
      onSelectChord(chord);
      audioEngine.unlock();
      strumEngine.strumChord(chord, { stroke: 'down', velocity: 0.85 });
    }
    setIsPickerOpen(false);
    setReplaceIndex(null);
  };

  const handleRemoveChord = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (chords.length <= 1) return; // Keep at least one
    const next = chords.filter((_, i) => i !== index);
    onChangeChords(next);
  };

  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 shadow-lg">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-amber-500" />
          <h2 className="font-semibold text-sm text-neutral-200">
            Beste Akor Dizilimi (Chord Progression)
          </h2>
          <span className="text-xs text-neutral-500">({chords.length} Ölçü / Bar)</span>
        </div>

        {/* Quick Progression Presets Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 hidden sm:inline">Şablonlar:</span>
          <select
            onChange={(e) => {
              const found = SONG_PROGRESSIONS.find((p) => p.id === e.target.value);
              if (found) onLoadProgression(found);
            }}
            defaultValue=""
            className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-300 focus:outline-none focus:border-amber-500"
          >
            <option value="" disabled>Hazır Riff / Şarkı Yükle...</option>
            {SONG_PROGRESSIONS.map((prog) => (
              <option key={prog.id} value={prog.id}>
                {prog.title} ({prog.artistHint})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chord Cards Timeline */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 mb-4">
        {chords.map((chordId, idx) => {
          const chord = GUITAR_CHORDS[chordId] || GUITAR_CHORDS['C'];
          const isCurrentlyPlaying = currentChordIndex === idx;
          const isSelected = activeChord.id === chord.id;

          return (
            <div
              key={`${chordId}-${idx}`}
              onClick={() => handleChordClick(chordId)}
              className={`relative group rounded-xl p-3 border transition-all cursor-pointer flex flex-col items-center justify-center text-center min-h-[90px] select-none ${
                isCurrentlyPlaying
                  ? 'bg-gradient-to-b from-amber-500/20 to-amber-950/40 border-amber-500 shadow-lg shadow-amber-500/20 scale-105 z-10 ring-2 ring-amber-500/30'
                  : isSelected
                  ? 'bg-neutral-800/90 border-amber-600/60 shadow-md'
                  : 'bg-neutral-950/70 border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-900/60'
              }`}
            >
              {/* Measure Number Badge */}
              <div className="absolute top-1.5 left-2 text-[10px] font-mono text-neutral-500">
                #{idx + 1}
              </div>

              {/* Delete / Replace Controls on Hover */}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenPicker(idx);
                  }}
                  className="p-1 hover:text-amber-400 text-neutral-500 rounded"
                  title="Akoru Değiştir"
                >
                  <ArrowUpDown className="w-3 h-3" />
                </button>
                {chords.length > 1 && (
                  <button
                    onClick={(e) => handleRemoveChord(idx, e)}
                    className="p-1 hover:text-red-400 text-neutral-500 rounded"
                    title="Sil"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Chord Name */}
              <div className="font-bold text-xl text-white tracking-tight mt-1">
                {chord.name}
              </div>

              {/* Subtitle */}
              <div className="text-[11px] text-amber-400/90 font-medium truncate max-w-full">
                {chord.type === 'major' ? 'Maj' : chord.type === 'minor' ? 'Min' : chord.type}
              </div>

              {/* Fret overview */}
              <div className="text-[9px] font-mono text-neutral-500 mt-1">
                {chord.frets.map((f) => (f < 0 ? 'x' : f)).join('')}
              </div>
            </div>
          );
        })}

        {/* Add Chord Card */}
        {chords.length < 16 && (
          <button
            onClick={() => handleOpenPicker()}
            className="border-2 border-dashed border-neutral-800 hover:border-amber-500/50 hover:bg-amber-500/5 rounded-xl p-3 flex flex-col items-center justify-center text-neutral-500 hover:text-amber-400 transition-all min-h-[90px]"
          >
            <Plus className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Akor Ekle</span>
          </button>
        )}
      </div>

      {/* Chord Picker Modal / Drawer */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                {replaceIndex !== null ? `#${replaceIndex + 1}. Ölçü Akorunu Seç` : 'Yeni Akor Ekle'}
              </h3>
              <button
                onClick={() => setIsPickerOpen(false)}
                className="text-neutral-400 hover:text-white text-sm"
              >
                ✕ Kapat
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto p-1">
              {Object.values(GUITAR_CHORDS).map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectNewChord(c.id)}
                  className="p-3 bg-neutral-950 border border-neutral-800 hover:border-amber-500 rounded-xl text-center transition-all hover:bg-neutral-800"
                >
                  <div className="font-bold text-lg text-white">{c.name}</div>
                  <div className="text-[11px] text-neutral-400">{c.displayName}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
