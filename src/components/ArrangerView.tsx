import React, { useState } from 'react';
import { GUITAR_CHORDS } from '../config/chords';
import { MUSICAL_SCALES, ROOT_NOTES, getDiatonicChords, CADENCE_PRESETS } from '../config/scales';
import { GuitarChord, SongSection, DrumMode } from '../types';
import {
  Layers,
  Plus,
  Trash2,
  Copy,
  Sparkles,
  Dices,
  PlayCircle,
  Repeat,
  Music,
  BookOpen
} from 'lucide-react';
import { strumEngine } from '../audio/StrumEngine';
import { audioEngine } from '../audio/AudioEngine';

interface ArrangerViewProps {
  sections: SongSection[];
  currentSectionIndex: number;
  onSelectSection: (index: number) => void;
  onUpdateSections: (sections: SongSection[]) => void;
  autoAdvanceSections: boolean;
  onToggleAutoAdvance: () => void;
  currentChordIndex: number;
  activeChord: GuitarChord;
  onSelectChord: (chord: GuitarChord) => void;
  currentRoot: string;
  onRootChange: (root: string) => void;
  currentScaleId: string;
  onScaleChange: (scaleId: string) => void;
  currentRepeat?: number;
}

export const ArrangerView: React.FC<ArrangerViewProps> = ({
  sections,
  currentSectionIndex,
  onSelectSection,
  onUpdateSections,
  autoAdvanceSections,
  onToggleAutoAdvance,
  currentChordIndex,
  activeChord,
  onSelectChord,
  currentRoot,
  onRootChange,
  currentScaleId,
  onScaleChange
}) => {
  const currentSection = sections[currentSectionIndex] || sections[0];

  // Random Mode Bars
  const [randomBars, setRandomBars] = useState<number>(4);

  // Real Music Theory: Diatonic Chords (7 degrees)
  const diatonicChords = getDiatonicChords(currentRoot, currentScaleId);

  const handleChordClick = (chordId: string) => {
    const chord = GUITAR_CHORDS[chordId];
    if (chord) {
      onSelectChord(chord);
      audioEngine.unlock();
      strumEngine.strumChord(chord, { stroke: 'down', velocity: 0.85 });
    }
  };

  const handleAddChordToSection = (chordId: string) => {
    const nextSections = [...sections];
    const sec = { ...nextSections[currentSectionIndex] };
    sec.chords = [...sec.chords, chordId];
    nextSections[currentSectionIndex] = sec;
    onUpdateSections(nextSections);
    handleChordClick(chordId);
  };

  const handleRemoveChordFromSection = (index: number, e: React.MouseEvent) => {
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

  const handleSectionDrumModeChange = (drumMode: DrumMode) => {
    const nextSections = [...sections];
    nextSections[currentSectionIndex] = {
      ...currentSection,
      drumMode
    };
    onUpdateSections(nextSections);
  };

  const handleAddNewSection = () => {
    const names = ['Köprü (Bridge)', 'Outro (Bitiş)', 'Nakarat B', 'Solo 2', 'C-Part'];
    const newName = names[sections.length % names.length] || `Kısım ${sections.length + 1}`;
    const newSec: SongSection = {
      id: `sec-${Date.now()}`,
      name: newName,
      chords: ['Am', 'Dm', 'E7', 'Am'],
      patternId: 'folk-rock',
      repeats: 2,
      color: 'from-amber-600 to-rose-700',
      drumMode: 'cajon-shaker'
    };
    onUpdateSections([...sections, newSec]);
    onSelectSection(sections.length);
  };

  const handleDuplicateSection = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = sections[index];
    if (!target) return;
    const duplicated: SongSection = {
      ...target,
      id: `sec-${Date.now()}`,
      name: `${target.name} (Kopya)`
    };
    const next = [...sections];
    next.splice(index + 1, 0, duplicated);
    onUpdateSections(next);
    onSelectSection(index + 1);
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

  const handleApplyCadence = (chords: string[]) => {
    audioEngine.unlock();
    const nextSections = [...sections];
    nextSections[currentSectionIndex] = {
      ...currentSection,
      chords: [...chords]
    };
    onUpdateSections(nextSections);
    if (chords.length > 0 && GUITAR_CHORDS[chords[0]]) {
      onSelectChord(GUITAR_CHORDS[chords[0]]);
      strumEngine.strumChord(GUITAR_CHORDS[chords[0]], { stroke: 'down', velocity: 0.9 });
    }
  };

  const handleGenerateSmartChords = () => {
    audioEngine.unlock();
    const pool = diatonicChords.map((d) => d.chordId).filter((c) => GUITAR_CHORDS[c]);
    if (pool.length === 0) return;

    const tonicChord = pool[0] || 'Am';
    const subdominantChords = diatonicChords.filter((d) => d.role === 'subdominant').map((d) => d.chordId);
    const dominantChords = diatonicChords.filter((d) => d.role === 'dominant').map((d) => d.chordId);

    const generated: string[] = [];

    for (let i = 0; i < randomBars; i++) {
      if (i === 0) {
        generated.push(tonicChord);
      } else if (i === randomBars - 1) {
        // Resolve on dominant or back to tonic
        const endPick = dominantChords.length > 0 ? dominantChords[Math.floor(Math.random() * dominantChords.length)] : pool[0];
        generated.push(endPick);
      } else if (i === 1 && subdominantChords.length > 0) {
        generated.push(subdominantChords[Math.floor(Math.random() * subdominantChords.length)]);
      } else {
        const prev = generated[i - 1];
        const candidates = pool.filter((c) => c !== prev);
        const pick = candidates[Math.floor(Math.random() * candidates.length)] || pool[0];
        generated.push(pick);
      }
    }

    const nextSections = [...sections];
    nextSections[currentSectionIndex] = {
      ...currentSection,
      chords: generated
    };
    onUpdateSections(nextSections);

    if (generated.length > 0 && GUITAR_CHORDS[generated[0]]) {
      onSelectChord(GUITAR_CHORDS[generated[0]]);
      strumEngine.strumChord(GUITAR_CHORDS[generated[0]], { stroke: 'down', velocity: 0.9 });
    }
  };

  return (
    <div className="flex flex-col gap-2.5 h-full min-h-0 overflow-y-auto scrollbar-thin font-mono text-neutral-200">
      {/* 1. SONG STRUCTURE TIMELINE (Zaman Çizelgesi & Bölüm Blokları) */}
      <div className="bg-[#0e0f14] border-2 border-[#222432] rounded-xl p-3 shadow-xl space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1f222e] pb-2 text-xs">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-500" />
            <span className="font-bold text-white uppercase tracking-wider text-sm">
              Şarkı Zaman Çizelgesi (Song Structure):
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
                  ? 'Bölümleri sırayla otomatik çalar (Intro -> Verse -> Chorus -> Solo)'
                  : 'Sadece seçili kısmı döngüye sokarak çalar'
              }
            >
              {autoAdvanceSections ? (
                <>
                  <PlayCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Şarkı Zinciri (Song Chain)</span>
                </>
              ) : (
                <>
                  <Repeat className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Kısım Döngüsü (Loop Section)</span>
                </>
              )}
            </button>
          </div>

          <button
            onClick={handleAddNewSection}
            className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 font-bold flex items-center gap-1 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Yeni Bölüm Ekle</span>
          </button>
        </div>

        {/* Horizontal Section Blocks (Ableton Arranger Timeline) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {sections.map((sec, idx) => {
            const isSelected = idx === currentSectionIndex;

            return (
              <div
                key={sec.id}
                onClick={() => onSelectSection(idx)}
                className={`relative cursor-pointer rounded-xl p-2.5 border-2 transition-all flex flex-col justify-between h-22 select-none ${
                  isSelected
                    ? 'bg-[#191c28] border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                    : 'bg-[#101116] border-[#222534] hover:border-neutral-600'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-white truncate">{sec.name}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleDuplicateSection(idx, e)}
                      title="Bölümü Çoğalt"
                      className="text-neutral-500 hover:text-cyan-400"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    {sections.length > 1 && (
                      <button
                        onClick={(e) => handleRemoveSection(idx, e)}
                        title="Bölümü Sil"
                        className="text-neutral-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Section Chords Preview */}
                <div className="flex flex-wrap gap-1 my-1">
                  {sec.chords.map((chordId, cIdx) => (
                    <span
                      key={cIdx}
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isSelected && cIdx === currentChordIndex
                          ? 'bg-amber-500 text-neutral-950 font-black'
                          : 'bg-[#1a1c26] text-neutral-300'
                      }`}
                    >
                      {chordId}
                    </span>
                  ))}
                </div>

                {/* Footer info: Repeats & Drum Mode */}
                <div className="flex items-center justify-between text-[10px] text-neutral-400 border-t border-[#222536] pt-1">
                  <span className="text-amber-400 font-bold">{sec.repeats}x Tekrar</span>
                  <span className="text-emerald-400 truncate max-w-[80px]">
                    {sec.drumMode === 'mute' ? 'Davulsuz' : '🥁 Davullu'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. REAL MUSIC THEORY: DIATONIC CHORDS & CADENCES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        {/* LEFT: 7 Diatonic Degree Chords (Roman Numerals) */}
        <div className="lg:col-span-7 bg-[#0e0f14] border-2 border-[#222432] rounded-xl p-3 shadow-xl space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1f222e] pb-2 text-xs">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-white uppercase tracking-wider">
                Müzik Teorisi: Tona Uygun 7 Derece Akorları
              </span>
            </div>

            {/* Root & Scale Selector */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-[#151720] border border-[#2a2d3d] rounded px-2 py-0.5">
                <span className="text-[10px] text-neutral-400">TON:</span>
                <select
                  value={currentRoot}
                  onChange={(e) => onRootChange(e.target.value)}
                  className="bg-transparent text-amber-400 font-bold text-xs focus:outline-none cursor-pointer"
                >
                  {ROOT_NOTES.map((r) => (
                    <option key={r} value={r} className="bg-neutral-900 text-white">
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 bg-[#151720] border border-[#2a2d3d] rounded px-2 py-0.5">
                <span className="text-[10px] text-neutral-400">GAM:</span>
                <select
                  value={currentScaleId}
                  onChange={(e) => onScaleChange(e.target.value)}
                  className="bg-transparent text-emerald-400 font-bold text-xs focus:outline-none cursor-pointer"
                >
                  {Object.values(MUSICAL_SCALES).map((s) => (
                    <option key={s.id} value={s.id} className="bg-neutral-900 text-white">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 7 Diatonic Degree Pads (Roman Numerals: i, ii°, III, iv, V, VI, VII) */}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
            {diatonicChords.map((chord) => {
              const isSounding = activeChord.name === chord.chordId;

              return (
                <button
                  key={chord.degree}
                  onClick={() => handleAddChordToSection(chord.chordId)}
                  className={`flex flex-col items-center justify-between p-2 rounded-xl border-2 transition-all active:scale-95 text-center ${
                    isSounding
                      ? 'bg-amber-500 text-neutral-950 border-white shadow-[0_0_15px_rgba(245,158,11,0.7)]'
                      : 'bg-[#141620] border-[#252838] hover:border-amber-500/60'
                  }`}
                  title={`${chord.displayName} - ${chord.roleLabel}. Tıklayarak bölüme ekle`}
                >
                  <span className="text-[10px] font-mono text-neutral-400 font-bold">{chord.roman}</span>
                  <span className="text-sm font-bold font-mono tracking-tight my-0.5">{chord.chordId}</span>
                  <span className="text-[8px] text-neutral-400 truncate w-full">{chord.roleLabel}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-neutral-400 italic">
            💡 Tıkladığınız derece akoru doğrudan çalar ve aktif aranje kısmına eklenir. Tonik (Karar), Subdominant (Açılım) ve Dominant (Çözülüm) dengesiyle profesyonel beste yapın.
          </p>
        </div>

        {/* RIGHT: CADENCE PRESETS & SMART COMPOSER */}
        <div className="lg:col-span-5 bg-[#0e0f14] border-2 border-[#222432] rounded-xl p-3 shadow-xl space-y-2.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#1f222e] pb-1.5 text-xs">
              <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                İkonik Kadans Şablonları:
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
              {CADENCE_PRESETS.map((cadence) => (
                <button
                  key={cadence.id}
                  onClick={() => handleApplyCadence(cadence.chords)}
                  className="bg-[#141620] hover:bg-[#1a1d2c] border border-[#252838] hover:border-amber-500/50 rounded-lg p-2 text-left transition-all flex flex-col justify-between"
                  title={cadence.description}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{cadence.name}</span>
                  </div>
                  <div className="flex items-center gap-1 my-1">
                    {cadence.chords.map((c, i) => (
                      <span key={i} className="text-[10px] font-bold text-amber-400 bg-black/40 px-1 rounded">
                        {c}
                      </span>
                    ))}
                  </div>
                  <span className="text-[9px] text-neutral-400 truncate">{cadence.genre}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Random Stochastic Composer */}
          <div className="bg-[#141620] border border-[#26293a] rounded-lg p-2 text-xs flex flex-wrap items-center justify-between gap-2 mt-2">
            <div className="flex items-center gap-1.5">
              <Dices className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold text-neutral-300">Stokastik Besteleyici:</span>
              <select
                value={randomBars}
                onChange={(e) => setRandomBars(parseInt(e.target.value, 10))}
                className="bg-[#1e2130] text-amber-400 font-bold rounded px-1.5 py-0.5 border border-[#303448] focus:outline-none"
              >
                <option value={4}>4 Bar</option>
                <option value={8}>8 Bar</option>
                <option value={12}>12 Bar</option>
                <option value={16}>16 Bar</option>
              </select>
            </div>

            <button
              onClick={handleGenerateSmartChords}
              className="px-3 py-1 rounded bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold flex items-center gap-1 shadow-md transition-all active:scale-95"
            >
              <Dices className="w-3 h-3" />
              <span>Beste Oluştur</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. CURRENT SECTION CHORDS & PERFORMANCE CONTROLS */}
      <div className="bg-[#0e0f14] border-2 border-[#222432] rounded-xl p-3 shadow-xl space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1f222e] pb-1.5 text-xs">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-white text-xs uppercase tracking-wider">
              {currentSection.name} — Akor Dizilimi ({currentSection.chords.length} Akor):
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Drum Mode */}
            <div className="flex items-center gap-1 bg-[#161720] border border-[#2a2d3c] rounded px-2 py-0.5">
              <span className="text-[10px] text-neutral-400">🥁 Kısım Davulu:</span>
              <select
                value={currentSection.drumMode || 'cajon-shaker'}
                onChange={(e) => handleSectionDrumModeChange(e.target.value as DrumMode)}
                className="bg-transparent text-emerald-400 font-bold text-xs focus:outline-none cursor-pointer"
              >
                <option value="full" className="bg-neutral-900">Tam Akustik Davul</option>
                <option value="cajon-shaker" className="bg-neutral-900">Kahon & Shaker</option>
                <option value="shaker-only" className="bg-neutral-900">Sadece Shaker/Tef</option>
                <option value="flamenco" className="bg-neutral-900">Flamenko Vuruş</option>
                <option value="mute" className="bg-neutral-900">Davulsuz (Mute)</option>
              </select>
            </div>

            {/* Repeats */}
            <div className="flex items-center gap-1 bg-[#161720] border border-[#2a2d3c] rounded px-2 py-0.5">
              <span className="text-[10px] text-neutral-400">Tekrar:</span>
              <select
                value={currentSection.repeats}
                onChange={(e) => handleSectionRepeatsChange(parseInt(e.target.value, 10))}
                className="bg-transparent text-amber-400 font-bold text-xs focus:outline-none cursor-pointer"
              >
                <option value={1} className="bg-neutral-900">1x Tekrar</option>
                <option value={2} className="bg-neutral-900">2x Tekrar</option>
                <option value={4} className="bg-neutral-900">4x Tekrar</option>
                <option value={8} className="bg-neutral-900">8x Tekrar</option>
              </select>
            </div>
          </div>
        </div>

        {/* Chord Pads in Current Section */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {currentSection.chords.map((chordId, idx) => {
            const isPlayingThis = idx === currentChordIndex;
            const isSoundingChord = activeChord.name === chordId;

            return (
              <div
                key={idx}
                onClick={() => handleChordClick(chordId)}
                className={`relative group cursor-pointer rounded-xl p-2.5 border-2 transition-all flex flex-col items-center justify-between h-20 select-none ${
                  isPlayingThis
                    ? 'bg-gradient-to-b from-amber-500 to-amber-600 text-neutral-950 border-white shadow-[0_0_20px_rgba(245,158,11,0.8)] scale-105 z-10'
                    : isSoundingChord
                    ? 'bg-[#202332] border-amber-500/80 text-amber-300'
                    : 'bg-[#12141c] border-[#222534] hover:border-neutral-500 text-neutral-200'
                }`}
              >
                <span className="text-[10px] font-mono text-neutral-400 font-bold">{idx + 1}. Bar</span>
                <span className="text-lg font-black font-mono tracking-tight">{chordId}</span>
                <span className="text-[9px] text-neutral-400">Tıkla & Dinle</span>

                {currentSection.chords.length > 1 && (
                  <button
                    onClick={(e) => handleRemoveChordFromSection(idx, e)}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-400 transition-opacity"
                    title="Akoru Kaldır"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
