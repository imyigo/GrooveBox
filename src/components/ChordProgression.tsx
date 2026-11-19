import React, { useState } from 'react';
import { GUITAR_CHORDS } from '../config/chords';
import { SONG_PROGRESSIONS, SongProgression } from '../config/progressions';
import { MUSICAL_SCALES } from '../config/scales';
import { GuitarChord, SongSection } from '../types';
import { Plus, Trash2, ArrowUpDown, Music, Sparkles, Dices, Repeat, RefreshCw, PlayCircle, Layers } from 'lucide-react';
import { strumEngine } from '../audio/StrumEngine';
import { audioEngine } from '../audio/AudioEngine';

interface ChordProgressionProps {
  sections: SongSection[];
  currentSectionIndex: number;
  onSelectSection: (index: number) => void;
  onUpdateSections: (sections: SongSection[]) => void;
  autoAdvanceSections: boolean;
  onToggleAutoAdvance: () => void;
  currentChordIndex: number;
  activeChord: GuitarChord;
  onSelectChord: (chord: GuitarChord) => void;
  onLoadProgression: (progression: SongProgression) => void;
  currentRoot: string;
  currentScaleId: string;
  currentRepeat: number;
}

export const ChordProgression: React.FC<ChordProgressionProps> = ({
  sections,
  currentSectionIndex,
  onSelectSection,
  onUpdateSections,
  autoAdvanceSections,
  onToggleAutoAdvance,
  currentChordIndex,
  activeChord,
  onSelectChord,
  onLoadProgression,
  currentRoot,
  currentScaleId,
  currentRepeat
}) => {
  const currentSection = sections[currentSectionIndex] || sections[0];
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);

  // Random Mode Configuration State
  const [randomBars, setRandomBars] = useState<number>(4); // 4, 8, 12, 16
  const [randomStyle, setRandomStyle] = useState<'scale' | 'anadolu' | 'pop' | 'spicy'>('scale');

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
    const nextSections = [...sections];
    const sec = { ...nextSections[currentSectionIndex] };

    if (replaceIndex !== null) {
      const nextChords = [...sec.chords];
      nextChords[replaceIndex] = chordId;
      sec.chords = nextChords;
    } else {
      sec.chords = [...sec.chords, chordId];
    }

    nextSections[currentSectionIndex] = sec;
    onUpdateSections(nextSections);

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
    const sec = { ...currentSection };
    if (sec.chords.length <= 1) return;
    sec.chords = sec.chords.filter((_, i) => i !== index);

    const nextSections = [...sections];
    nextSections[currentSectionIndex] = sec;
    onUpdateSections(nextSections);
  };

  const handleSectionRepeatsChange = (repeats: number) => {
    const nextSections = [...sections];
    nextSections[currentSectionIndex] = {
      ...currentSection,
      repeats
    };
    onUpdateSections(nextSections);
  };

  const handleAddNewSection = () => {
    const newId = `sec-${Date.now()}`;
    const names = ['Köprü (Bridge)', 'Outro (Bitiş)', 'Nakarat B', 'Solo 2'];
    const newName = names[sections.length % names.length] || `Kısım ${sections.length + 1}`;

    const newSec: SongSection = {
      id: newId,
      name: newName,
      chords: ['Am', 'Dm', 'E', 'Am'],
      patternId: 'folk-rock',
      repeats: 2,
      color: 'from-amber-600 to-rose-700'
    };

    onUpdateSections([...sections, newSec]);
    onSelectSection(sections.length);
  };

  const handleRemoveSection = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sections.length <= 1) return;
    const next = sections.filter((_, i) => i !== idx);
    onUpdateSections(next);
    if (currentSectionIndex >= next.length) {
      onSelectSection(0);
    }
  };

  // Smart Scale-Aware Random Chord Progression Generator
  const handleGenerateRandom = () => {
    audioEngine.unlock();
    const scale = MUSICAL_SCALES[currentScaleId] || MUSICAL_SCALES['minor'];
    const chordPool = [...scale.recommendedChords];

    if (randomStyle === 'spicy') {
      chordPool.push('Cadd9', 'Dsus4', 'Em7', 'Fmaj7', 'A7');
    } else if (randomStyle === 'anadolu') {
      chordPool.push('Am', 'Dm', 'E', 'E7', 'F');
    }

    const available = chordPool.filter((c) => GUITAR_CHORDS[c]);
    if (available.length === 0) return;

    const newChords: string[] = [];
    const rootChord = available[0] || 'Am';

    for (let i = 0; i < randomBars; i++) {
      if (i === 0) {
        newChords.push(rootChord);
      } else if (i === randomBars - 1) {
        const dominants = available.filter((c) => c.includes('7') || c === 'E' || c === 'G');
        const endChord = dominants.length > 0
          ? dominants[Math.floor(Math.random() * dominants.length)]
          : available[Math.floor(Math.random() * available.length)];
        newChords.push(endChord);
      } else {
        const prev = newChords[i - 1];
        const candidates = available.filter((c) => c !== prev);
        const pick = candidates[Math.floor(Math.random() * candidates.length)] || available[0];
        newChords.push(pick);
      }
    }

    const nextSections = [...sections];
    nextSections[currentSectionIndex] = {
      ...currentSection,
      chords: newChords
    };
    onUpdateSections(nextSections);

    if (newChords.length > 0 && GUITAR_CHORDS[newChords[0]]) {
      onSelectChord(GUITAR_CHORDS[newChords[0]]);
      strumEngine.strumChord(GUITAR_CHORDS[newChords[0]], { stroke: 'down', velocity: 0.9 });
    }
  };

  return (
    <div className="bg-[#121316] border-2 border-[#242730] rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 font-mono">
      {/* 🎛️ GROOVEBOX SCENE & SECTION ARRANGER BAR (Intro, Verse, Chorus, Solo) */}
      <div className="bg-[#0a0a0d] border border-[#22242c] rounded-xl p-3 shadow-inner space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Section Mode Toggle (Döngü vs İlerlet) */}
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Şarkı Kısımları (Scenes):
            </span>
            <button
              onClick={onToggleAutoAdvance}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all ${
                autoAdvanceSections
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                  : 'bg-[#181920] text-cyan-400 border-cyan-800'
              }`}
              title={
                autoAdvanceSections
                  ? 'Kısımları sırayla otomatik çalar (Intro -> Verse -> Chorus -> Solo)'
                  : 'Sadece seçili kısmı döngüye sokarak çalar'
              }
            >
              {autoAdvanceSections ? (
                <>
                  <PlayCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Kısımları İlerlet (Song Chain)</span>
                </>
              ) : (
                <>
                  <Repeat className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Kısmı Döngüye Sok (Loop Scene)</span>
                </>
              )}
            </button>
          </div>

          {/* Current Section Repeats & Counter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-neutral-400">Bu Kısım Tekrarı:</span>
            <select
              value={currentSection.repeats}
              onChange={(e) => handleSectionRepeatsChange(parseInt(e.target.value, 10))}
              className="bg-[#16171d] border border-[#2a2d38] rounded-md px-2 py-0.5 text-amber-400 font-bold focus:outline-none cursor-pointer"
            >
              <option value={1}>1x Tekrar</option>
              <option value={2}>2x Tekrar</option>
              <option value={4}>4x Tekrar</option>
              <option value={8}>8x Tekrar</option>
            </select>
            <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-400 font-bold text-[11px]">
              {currentRepeat + 1} / {currentSection.repeats}
            </span>
          </div>
        </div>

        {/* Section Launch Pads (Ableton Clip / Scene Launchers) */}
        <div className="flex flex-wrap items-center gap-2">
          {sections.map((sec, idx) => {
            const isActive = currentSectionIndex === idx;

            return (
              <div
                key={sec.id}
                onClick={() => onSelectSection(idx)}
                className={`group relative flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 transition-all cursor-pointer select-none ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/25 to-amber-900/30 border-amber-500 text-white shadow-lg shadow-amber-500/20 scale-102 ring-2 ring-amber-500/30'
                    : 'bg-[#15161c] border-[#252834] text-neutral-400 hover:text-neutral-200 hover:border-[#383d4e]'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isActive ? 'bg-amber-400 animate-ping shadow-[0_0_8px_rgba(251,191,36,0.9)]' : 'bg-neutral-600'
                  }`}
                />
                <span className="font-bold text-xs">{sec.name}</span>
                <span className="text-[10px] opacity-75 font-mono">({sec.repeats}x)</span>

                {/* Delete button if more than 1 section */}
                {sections.length > 1 && (
                  <button
                    onClick={(e) => handleRemoveSection(idx, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 text-neutral-500 ml-1 p-0.5 transition-opacity"
                    title="Kısmı Sil"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}

          {/* Add New Section Button */}
          {sections.length < 8 && (
            <button
              onClick={handleAddNewSection}
              className="px-3 py-2 rounded-xl border-2 border-dashed border-[#2b2e3a] hover:border-amber-500/60 hover:bg-amber-500/5 text-neutral-400 hover:text-amber-400 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Yeni Kısım Ekle</span>
            </button>
          )}
        </div>
      </div>

      {/* 🎲 RANDOM MOD BÖLÜMÜ (Akıllı Dörtlük & Karakter Üretici) */}
      <div className="bg-[#0d0e12] border border-[#22242c] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Dices className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white uppercase">
              Random Beste ({currentRoot}):
            </span>
          </div>

          {/* Kaç Dörtlük (Kaç Ölçü / Bar) */}
          <div className="flex items-center gap-1 bg-[#16171d] border border-[#2a2d38] rounded-lg px-2.5 py-1 text-xs">
            <span className="text-neutral-400">Ölçü (Dörtlük):</span>
            <select
              value={randomBars}
              onChange={(e) => setRandomBars(parseInt(e.target.value, 10))}
              className="bg-transparent text-amber-400 font-bold focus:outline-none cursor-pointer"
            >
              <option value={4} className="bg-neutral-900">4 Ölçü</option>
              <option value={8} className="bg-neutral-900">8 Ölçü</option>
              <option value={12} className="bg-neutral-900">12 Ölçü (Blues)</option>
              <option value={16} className="bg-neutral-900">16 Ölçü (Tam Bölüm)</option>
            </select>
          </div>

          {/* Karakter */}
          <div className="flex items-center gap-1 bg-[#16171d] border border-[#2a2d38] rounded-lg px-2.5 py-1 text-xs">
            <span className="text-neutral-400">Karakter:</span>
            <select
              value={randomStyle}
              onChange={(e) => setRandomStyle(e.target.value as any)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer font-sans"
            >
              <option value="scale" className="bg-neutral-900">Gama Sadık (Klasik)</option>
              <option value="anadolu" className="bg-neutral-900">Anadolu & Minör</option>
              <option value="pop" className="bg-neutral-900">Pop Hit Yürüyüşü</option>
              <option value="spicy" className="bg-neutral-900">Zengin & 7\'li Akorlar</option>
            </select>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerateRandom}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-950/40 transition-all active:scale-95"
            title="Seçili ölçü ve gama göre bu kısma yeni bir beste akor dizisi ata"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Rastgele Beste Üret (Zar At)</span>
          </button>
        </div>

        {/* Quick Progression Presets Dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <select
            onChange={(e) => {
              const found = SONG_PROGRESSIONS.find((p) => p.id === e.target.value);
              if (found) onLoadProgression(found);
            }}
            defaultValue=""
            className="bg-[#16171d] border border-[#2a2d38] rounded-lg px-2.5 py-1 text-xs text-neutral-300 focus:outline-none focus:border-amber-500"
          >
            <option value="" disabled>Hazır Riff / Şarkı Yükle...</option>
            <optgroup label="🇹🇷 Türkiye Hit Şablonları">
              {SONG_PROGRESSIONS.filter((p) => p.category === 'turkish').map((prog) => (
                <option key={prog.id} value={prog.id}>
                  {prog.title} ({prog.artistHint})
                </option>
              ))}
            </optgroup>
            <optgroup label="🌍 Global Efsaneler">
              {SONG_PROGRESSIONS.filter((p) => p.category === 'global').map((prog) => (
                <option key={prog.id} value={prog.id}>
                  {prog.title} ({prog.artistHint})
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* CHORD CARDS MATRIX FOR ACTIVE SECTION */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="flex items-center gap-2">
            <Music className="w-3.5 h-3.5 text-amber-500" />
            <span>{currentSection.name} Akorları: ({currentSection.chords.length} Ölçü)</span>
          </span>
          <span>Akor kartına tıklayarak önizle</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
          {currentSection.chords.map((chordId, idx) => {
            const chord = GUITAR_CHORDS[chordId] || GUITAR_CHORDS['C'];
            const isCurrentlyPlaying = currentChordIndex === idx;
            const isSelected = activeChord.id === chord.id;

            return (
              <div
                key={`${chordId}-${idx}`}
                onClick={() => handleChordClick(chordId)}
                className={`relative group rounded-xl p-3 border-2 transition-all cursor-pointer flex flex-col items-center justify-center text-center min-h-[95px] select-none shadow-md ${
                  isCurrentlyPlaying
                    ? 'bg-gradient-to-b from-amber-500/25 to-amber-950/50 border-amber-500 shadow-[0_0_20px_rgba(251,191,36,0.4)] scale-105 z-10 ring-2 ring-amber-500/50'
                    : isSelected
                    ? 'bg-[#1b1c23] border-amber-600/70'
                    : 'bg-[#14151a] border-[#252834] hover:border-[#3a3f52] hover:bg-[#1a1b22]'
                }`}
              >
                {/* Measure Number Badge */}
                <div className="absolute top-1.5 left-2 text-[10px] font-mono text-neutral-500 font-bold">
                  BAR #{idx + 1}
                </div>

                {/* Edit Controls on Hover */}
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
                  {currentSection.chords.length > 1 && (
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
                <div className="font-bold text-xl text-white tracking-tight mt-1 font-mono">
                  {chord.name}
                </div>

                {/* Subtitle */}
                <div className="text-[11px] text-amber-400/90 font-medium truncate max-w-full font-sans">
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
          {currentSection.chords.length < 16 && (
            <button
              onClick={() => handleOpenPicker()}
              className="border-2 border-dashed border-[#272a36] hover:border-amber-500/50 hover:bg-amber-500/5 rounded-xl p-3 flex flex-col items-center justify-center text-neutral-500 hover:text-amber-400 transition-all min-h-[95px]"
            >
              <Plus className="w-5 h-5 mb-1" />
              <span className="text-xs font-bold">Akor Ekle</span>
            </button>
          )}
        </div>
      </div>

      {/* Chord Picker Modal */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="bg-[#121316] border-2 border-[#2b2e3a] rounded-2xl max-w-lg w-full p-5 shadow-2xl animate-in fade-in duration-200">
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

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto p-1 font-mono">
              {Object.values(GUITAR_CHORDS).map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectNewChord(c.id)}
                  className="p-3 bg-[#181920] border border-[#2b2e3a] hover:border-amber-500 rounded-xl text-center transition-all hover:bg-[#20222a]"
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
