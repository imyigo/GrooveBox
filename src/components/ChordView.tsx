import React from 'react';
import { GUITAR_CHORDS } from '../config/chords';
import { MUSICAL_SCALES, ROOT_NOTES, getDiatonicChords, CADENCE_PRESETS } from '../config/scales';
import { GuitarChord, SongSection } from '../types';
import { Fretboard } from './Fretboard';
import { BookOpen, Sparkles, Trash2, Music } from 'lucide-react';
import { strumEngine } from '../audio/StrumEngine';
import { audioEngine } from '../audio/AudioEngine';

interface ChordViewProps {
  sections: SongSection[];
  currentSectionIndex: number;
  onUpdateSections: (sections: SongSection[]) => void;
  activeChord: GuitarChord;
  onSelectChord: (chord: GuitarChord) => void;
  currentRoot: string;
  onRootChange: (root: string) => void;
  currentScaleId: string;
  onScaleChange: (scaleId: string) => void;
  activeStringPluck: { stringIndex: number; fret: number; id: number } | null;
  onPluckNote: (stringIndex: number, fret: number) => void;
}

export const ChordView: React.FC<ChordViewProps> = ({
  sections,
  currentSectionIndex,
  onUpdateSections,
  activeChord,
  onSelectChord,
  currentRoot,
  onRootChange,
  currentScaleId,
  onScaleChange,
  activeStringPluck,
  onPluckNote
}) => {
  const currentSection = sections[currentSectionIndex] || sections[0];
  const diatonicChords = getDiatonicChords(currentRoot, currentScaleId);

  const handleChordClick = (chordId: string) => {
    const chord = GUITAR_CHORDS[chordId];
    if (chord) {
      onSelectChord(chord);
      audioEngine.unlock();
      strumEngine.strumChord(chord, { stroke: 'down', velocity: 0.9 });
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

  const handleRemoveChordFromSection = (index: number) => {
    const sec = { ...currentSection };
    if (sec.chords.length <= 1) return;
    sec.chords = sec.chords.filter((_, i) => i !== index);
    const nextSections = [...sections];
    nextSections[currentSectionIndex] = sec;
    onUpdateSections(nextSections);
  };

  const handleApplyCadence = (chords: string[]) => {
    const nextSections = [...sections];
    nextSections[currentSectionIndex] = {
      ...currentSection,
      chords: [...chords]
    };
    onUpdateSections(nextSections);
    if (chords.length > 0 && GUITAR_CHORDS[chords[0]]) {
      handleChordClick(chords[0]);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 h-full min-h-0 overflow-y-auto scrollbar-thin font-mono text-neutral-200">
      {/* 1. MÜZİK TEORİSİ: 7 DERECE DİATONİK AKOR MATRİSİ & TON/GAM SEÇİCİ */}
      <div className="bg-[#0b0c10] border-2 border-[#20222e] rounded-xl p-3 shadow-xl shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1c1e28] pb-2 mb-2.5 text-xs">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white uppercase tracking-wider text-xs">
              MÜZİK TEORİSİ: TONA UYGUN 7 DERECE AKOR MATRİSİ
            </span>
          </div>

          {/* Root & Scale Selector */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#14151c] border border-[#252838] rounded-lg px-2.5 py-1">
              <span className="text-[10px] text-neutral-400 font-bold">KÖK TON:</span>
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

            <div className="flex items-center gap-1.5 bg-[#14151c] border border-[#252838] rounded-lg px-2.5 py-1">
              <span className="text-[10px] text-neutral-400 font-bold">GAM TÜRÜ:</span>
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

        {/* 7 Diatonic Degree Pads */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {diatonicChords.map((chord) => {
            const isSounding = activeChord.name === chord.chordId;

            return (
              <button
                key={chord.degree}
                onClick={() => handleAddChordToSection(chord.chordId)}
                className={`flex flex-col items-center justify-between p-2.5 rounded-xl border-2 transition-all active:scale-95 text-center h-20 select-none ${
                  isSounding
                    ? 'bg-gradient-to-b from-amber-500 to-amber-600 text-neutral-950 border-white shadow-[0_0_20px_rgba(245,158,11,0.8)] scale-102'
                    : 'bg-[#12141c] border-[#222534] hover:border-amber-500/70 text-white'
                }`}
              >
                <span className="text-[11px] font-mono text-neutral-400 font-bold">{chord.roman}</span>
                <span className="text-lg font-black font-mono tracking-tight">{chord.chordId}</span>
                <span className="text-[9px] text-neutral-400 truncate w-full">{chord.roleLabel}</span>
              </button>
            );
          })}
        </div>

        <div className="text-[11px] text-neutral-400 mt-2 flex items-center justify-between">
          <span className="italic">💡 Dereceye tıklayarak akoru çalıp mevcut bölüme ekleyebilirsiniz.</span>
          <span className="text-amber-400 font-bold">Aktif Bölüm: {currentSection.name}</span>
        </div>
      </div>

      {/* 2. AKTİF AKOR FRETBOARD & TEL TİTREŞİMİ */}
      <div className="bg-[#0e0f14] border-2 border-[#20222e] rounded-xl p-2.5 shadow-xl shrink-0">
        <Fretboard
          chord={activeChord}
          activeStringPluck={activeStringPluck}
          onPluckNote={onPluckNote}
        />
      </div>

      {/* 3. KADANSLAR (POPÜLER AKOR YÜRÜYÜŞLERİ) & BÖLÜM AKOR DİZİLİMİ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 shrink-0">
        {/* Left: Popular Cadences */}
        <div className="lg:col-span-6 bg-[#0e0f14] border-2 border-[#20222e] rounded-xl p-3 shadow-xl space-y-2">
          <div className="flex items-center gap-2 border-b border-[#1c1e28] pb-1.5 text-xs">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white uppercase tracking-wider">
              Popüler Kadanslar & Akor Yürüyüşleri
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CADENCE_PRESETS.map((cadence) => (
              <button
                key={cadence.name}
                onClick={() => handleApplyCadence(cadence.chords)}
                className="p-2.5 rounded-xl border border-[#222432] bg-[#12131a] hover:border-cyan-400/80 hover:bg-[#161822] text-left transition-all active:scale-95 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{cadence.name}</span>
                  <span className="text-[9px] text-cyan-400 font-mono">{cadence.description}</span>
                </div>
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  {cadence.chords.map((c, i) => (
                    <span key={i} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
                      {c}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Current Section Chord Progression */}
        <div className="lg:col-span-6 bg-[#0e0f14] border-2 border-[#20222e] rounded-xl p-3 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#1c1e28] pb-1.5 text-xs mb-2">
              <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Music className="w-4 h-4 text-amber-400" />
                {currentSection.name} - Akor Sıralaması:
              </span>
              <span className="text-[10px] text-neutral-400">
                {currentSection.chords.length} Bar / Ölçü
              </span>
            </div>

            <div className="flex flex-wrap gap-2 my-2">
              {currentSection.chords.map((chordId, idx) => (
                <div
                  key={idx}
                  onClick={() => handleChordClick(chordId)}
                  className={`group relative px-3 py-2 rounded-xl border-2 cursor-pointer flex items-center gap-2 transition-all active:scale-95 ${
                    activeChord.name === chordId
                      ? 'bg-amber-500 text-neutral-950 border-white font-bold shadow-md'
                      : 'bg-[#151722] border-[#262938] text-white hover:border-neutral-500'
                  }`}
                >
                  <span className="text-sm font-mono font-bold">{chordId}</span>
                  {currentSection.chords.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveChordFromSection(idx);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-400 text-neutral-400 transition-opacity"
                      title="Akoru kaldır"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-neutral-400 border-t border-[#1c1e28] pt-2">
            İpucu: Yukarıdaki 7 Derece Akor Matrisinden dilediğiniz akora tıklayarak listeye yeni barlar ekleyebilirsiniz.
          </div>
        </div>
      </div>
    </div>
  );
};
