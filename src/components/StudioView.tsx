import React, { useState } from 'react';
import { GUITAR_CHORDS } from '../config/chords';
import { getDiatonicChords } from '../config/scales';
import { GuitarChord, SongSection, DrumMode } from '../types';
import {
  Layers,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Repeat,
  Music,
  Sliders
} from 'lucide-react';
import { strumEngine } from '../audio/StrumEngine';
import { audioEngine } from '../audio/AudioEngine';

interface StudioViewProps {
  sections: SongSection[];
  currentSectionIndex: number;
  onSelectSection: (index: number) => void;
  onUpdateSections: (sections: SongSection[]) => void;
  autoAdvanceSections: boolean;
  onToggleAutoAdvance: () => void;
  currentChordIndex: number;
  onSelectChord: (chord: GuitarChord) => void;
  currentRoot: string;
  currentScaleId: string;
}

export const StudioView: React.FC<StudioViewProps> = ({
  sections,
  currentSectionIndex,
  onSelectSection,
  onUpdateSections,
  autoAdvanceSections,
  onToggleAutoAdvance,
  currentChordIndex,
  onSelectChord,
  currentRoot,
  currentScaleId
}) => {
  const currentSection = sections[currentSectionIndex] || sections[0];
  const diatonicChords = getDiatonicChords(currentRoot, currentScaleId);

  // Quick section templates
  const [newSectionType, setNewSectionType] = useState<string>('Söz (Verse)');

  const handleAddSection = () => {
    const defaultChords = diatonicChords.slice(0, 4).map((c) => c.chordId);
    const newSection: SongSection = {
      id: `section-${Date.now()}`,
      name: newSectionType,
      chords: defaultChords.length ? defaultChords : ['Am', 'Dm', 'E', 'Am'],
      patternId: 'folk-rock',
      repeats: 2,
      color: 'from-amber-600 to-orange-700',
      drumMode: 'cajon-shaker'
    };
    onUpdateSections([...sections, newSection]);
    onSelectSection(sections.length);
  };

  const handleDuplicateSection = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const source = sections[index];
    const clone: SongSection = {
      ...source,
      id: `section-${Date.now()}`,
      name: `${source.name} (Kopya)`
    };
    const next = [...sections];
    next.splice(index + 1, 0, clone);
    onUpdateSections(next);
    onSelectSection(index + 1);
  };

  const handleRemoveSection = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sections.length <= 1) return;
    const next = sections.filter((_, i) => i !== index);
    onUpdateSections(next);
    if (currentSectionIndex >= next.length) {
      onSelectSection(next.length - 1);
    }
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const next = [...sections];
    const item = next.splice(index, 1)[0];
    next.splice(targetIndex, 0, item);
    onUpdateSections(next);
    onSelectSection(targetIndex);
  };

  const handleUpdateName = (name: string) => {
    const next = [...sections];
    next[currentSectionIndex] = { ...currentSection, name };
    onUpdateSections(next);
  };

  const handleUpdateRepeats = (repeats: number) => {
    const next = [...sections];
    next[currentSectionIndex] = { ...currentSection, repeats };
    onUpdateSections(next);
  };

  const handleUpdateDrumMode = (drumMode: DrumMode) => {
    const next = [...sections];
    next[currentSectionIndex] = { ...currentSection, drumMode };
    onUpdateSections(next);
  };

  const handleAddChord = (chordId: string) => {
    const next = [...sections];
    next[currentSectionIndex] = {
      ...currentSection,
      chords: [...currentSection.chords, chordId]
    };
    onUpdateSections(next);
    const chord = GUITAR_CHORDS[chordId];
    if (chord) {
      onSelectChord(chord);
      audioEngine.unlock();
      strumEngine.strumChord(chord, { stroke: 'down', velocity: 0.85 });
    }
  };

  const handleRemoveChord = (chordIdx: number) => {
    if (currentSection.chords.length <= 1) return;
    const next = [...sections];
    next[currentSectionIndex] = {
      ...currentSection,
      chords: currentSection.chords.filter((_, i) => i !== chordIdx)
    };
    onUpdateSections(next);
  };

  return (
    <div className="flex flex-col gap-2.5 h-full min-h-0 overflow-y-auto scrollbar-thin font-mono text-neutral-200">
      {/* 1. TOP SONGLINE ARRANGEMENT STRIP */}
      <div className="bg-[#0b0c10] border-2 border-[#20222e] rounded-xl p-3 shadow-2xl shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1c1e28] pb-2 mb-2.5 text-xs">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-white uppercase tracking-wider text-xs">
              ŞARKI ZAMAN ÇİZELGESİ (ARRANGEMENT TIMELINE):
            </span>
            <span className="text-[10px] text-neutral-400">
              {sections.length} Kısım | Toplam {sections.reduce((acc, s) => acc + s.chords.length * s.repeats, 0)} Bar
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto advance song toggle */}
            <button
              onClick={onToggleAutoAdvance}
              className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 border transition-all ${
                autoAdvanceSections
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60'
                  : 'bg-[#14151c] border-[#262836] text-neutral-400'
              }`}
            >
              <Repeat className="w-3 h-3" />
              <span>{autoAdvanceSections ? 'ŞARKIYI SIRAYLA ÇAL (AÇIK)' : 'KISIM DÖNGÜSÜ (LOOP)'}</span>
            </button>

            {/* Add Section Controller */}
            <div className="flex items-center gap-1 bg-[#14151c] border border-[#252838] rounded-lg p-0.5">
              <select
                value={newSectionType}
                onChange={(e) => setNewSectionType(e.target.value)}
                className="bg-transparent text-white font-bold text-xs px-2 py-0.5 focus:outline-none cursor-pointer"
              >
                <option value="Giriş (Intro)" className="bg-neutral-900">Giriş (Intro)</option>
                <option value="Söz (Verse)" className="bg-neutral-900">Söz (Verse)</option>
                <option value="Nakarat (Chorus)" className="bg-neutral-900">Nakarat (Chorus)</option>
                <option value="Solo & Köprü" className="bg-neutral-900">Solo & Köprü</option>
                <option value="Çıkış (Outro)" className="bg-neutral-900">Çıkış (Outro)</option>
              </select>
              <button
                onClick={handleAddSection}
                className="px-2.5 py-1 rounded bg-amber-500 text-neutral-950 font-bold text-xs flex items-center gap-1 hover:brightness-110 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Kısım Ekle</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section Cards List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {sections.map((sec, idx) => {
            const isSelected = idx === currentSectionIndex;

            return (
              <div
                key={sec.id}
                onClick={() => onSelectSection(idx)}
                className={`relative cursor-pointer rounded-xl p-3 border-2 transition-all flex flex-col justify-between h-28 select-none ${
                  isSelected
                    ? 'bg-gradient-to-br from-[#1c2234] to-[#0e111a] border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                    : 'bg-[#12141c] border-[#222432] hover:border-neutral-500'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-[10px] font-bold text-neutral-400 font-mono">#{idx + 1}</span>
                    <span className="text-xs font-bold text-white truncate">{sec.name}</span>
                  </div>

                  {/* Actions: Reorder, Duplicate, Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      disabled={idx === 0}
                      onClick={(e) => handleMoveSection(idx, 'up', e)}
                      className="p-0.5 text-neutral-400 hover:text-white disabled:opacity-20"
                      title="Öne Taşı"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={idx === sections.length - 1}
                      onClick={(e) => handleMoveSection(idx, 'down', e)}
                      className="p-0.5 text-neutral-400 hover:text-white disabled:opacity-20"
                      title="Arkaya Taşı"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDuplicateSection(idx, e)}
                      className="p-0.5 text-neutral-400 hover:text-cyan-400"
                      title="Kopyala"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    {sections.length > 1 && (
                      <button
                        onClick={(e) => handleRemoveSection(idx, e)}
                        className="p-0.5 text-neutral-400 hover:text-red-400"
                        title="Sil"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Chords Sequence Preview */}
                <div className="flex items-center gap-1 overflow-x-hidden my-1">
                  {sec.chords.map((chordId, cIdx) => (
                    <span
                      key={cIdx}
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isSelected && cIdx === currentChordIndex
                          ? 'bg-amber-500 text-neutral-950 font-black'
                          : 'bg-[#1d202e] text-neutral-300'
                      }`}
                    >
                      {chordId}
                    </span>
                  ))}
                </div>

                {/* Footer specs */}
                <div className="flex items-center justify-between text-[10px] text-neutral-400 border-t border-[#202334] pt-1">
                  <span className="text-amber-400 font-bold">{sec.repeats}x Tekrar</span>
                  <span className="text-emerald-400 font-semibold">{sec.drumMode}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. SELECTED SECTION INSPECTOR & CHORD BUILDER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 shrink-0">
        {/* Left: Section Properties Editor (Cols 1-5) */}
        <div className="lg:col-span-5 bg-[#0e0f14] border-2 border-[#20222e] rounded-xl p-3 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-[#1c1e28] pb-1.5 text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-amber-400" />
              Kısım Ayarları: {currentSection.name}
            </span>
            <span className="text-[10px] text-amber-400 font-bold">
              Kısım {currentSectionIndex + 1}/{sections.length}
            </span>
          </div>

          {/* Name input */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-neutral-400">Kısım Adı:</label>
            <input
              type="text"
              value={currentSection.name}
              onChange={(e) => handleUpdateName(e.target.value)}
              className="w-full bg-[#151722] border border-[#2a2d40] rounded-lg px-2.5 py-1.5 text-white font-bold text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Repeats selector */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-neutral-400">Tekrar Sayısı (Döngü):</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 2, 4, 8].map((rep) => (
                <button
                  key={rep}
                  onClick={() => handleUpdateRepeats(rep)}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    currentSection.repeats === rep
                      ? 'bg-amber-500 text-neutral-950 border-white'
                      : 'bg-[#151722] border-[#2a2d40] text-neutral-400 hover:text-white'
                  }`}
                >
                  {rep}x Tekrar
                </button>
              ))}
            </div>
          </div>

          {/* Drum Mode Selector */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-neutral-400">Bu Kısımdaki Davul / Ritim:</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { id: 'cajon-shaker', label: '🥁 Kahon + Shaker' },
                  { id: 'shaker-only', label: '🌾 Sadece Shaker' },
                  { id: 'flamenco', label: '💃 Tam Akustik Flamenko' },
                  { id: 'mute', label: '🔇 Kapalı (Davulsuz)' }
                ] as { id: DrumMode; label: string }[]
              ).map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => handleUpdateDrumMode(mode.id)}
                  className={`p-2 rounded-lg text-left text-xs font-bold border transition-all truncate ${
                    currentSection.drumMode === mode.id
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                      : 'bg-[#151722] border-[#2a2d40] text-neutral-400 hover:text-white'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Section Chord Progression Arranger (Cols 6-12) */}
        <div className="lg:col-span-7 bg-[#0e0f14] border-2 border-[#20222e] rounded-xl p-3 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#1c1e28] pb-1.5 text-xs mb-2">
              <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Music className="w-4 h-4 text-emerald-400" />
                Akor Dizilimi ({currentSection.chords.length} Bar):
              </span>
              <span className="text-[10px] text-neutral-400">
                Aşağıdaki akorlara tıklayarak sıraya ekleyin
              </span>
            </div>

            {/* Currently arranged chords */}
            <div className="flex flex-wrap gap-2 my-2">
              {currentSection.chords.map((chordId, idx) => (
                <div
                  key={idx}
                  className="group relative px-3 py-2 rounded-xl border-2 border-[#262838] bg-[#14151e] flex items-center gap-2"
                >
                  <span className="text-[10px] text-neutral-500 font-bold">{idx + 1}. Bar</span>
                  <span className="text-sm font-black font-mono text-white">{chordId}</span>
                  {currentSection.chords.length > 1 && (
                    <button
                      onClick={() => handleRemoveChord(idx)}
                      className="text-neutral-500 hover:text-red-400 transition-colors"
                      title="Akoru kaldır"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Diatonic Add Palette */}
          <div className="border-t border-[#1c1e28] pt-2.5">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1.5">
              Tona Uygun Akor Ekle ({currentRoot} {currentScaleId}):
            </span>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {diatonicChords.map((chord) => (
                <button
                  key={chord.degree}
                  onClick={() => handleAddChord(chord.chordId)}
                  className="p-1.5 rounded-lg border border-[#2a2d40] bg-[#161824] hover:border-amber-500 hover:bg-[#1f2232] text-center transition-all active:scale-95 flex flex-col items-center"
                >
                  <span className="text-[9px] font-mono text-neutral-400">{chord.roman}</span>
                  <span className="text-xs font-bold font-mono text-white">{chord.chordId}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
