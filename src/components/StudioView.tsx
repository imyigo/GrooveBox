import React, { useState, useEffect } from 'react';
import { GUITAR_CHORDS } from '../config/chords';
import { getDiatonicChords } from '../config/scales';
import { STRUM_PATTERNS } from '../config/patterns';
import { GuitarChord, SongSection, DrumMode } from '../types';
import { audioEngine } from '../audio/AudioEngine';
import { songSequencer } from '../audio/Sequencer';
import { strumEngine } from '../audio/StrumEngine';
import { audioRecorder, RecordedVocalTake } from '../audio/AudioRecorderEngine';
import { LogicSmartControls } from './LogicSmartControls';
import {
  Play,
  Square,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Repeat,
  Music,
  Sliders,
  Guitar,
  Drum,
  Disc3,
  Layers,
  Sparkles,
  Mic,
  MicOff,
  FileText
} from 'lucide-react';

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
  isPlaying: boolean;
  onTogglePlay: () => void;
  bpm: number;
  currentRepeat?: number;
  lyrics?: Record<string, string>;
  onLyricsChange?: (sectionId: string, text: string) => void;
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
  currentScaleId,
  isPlaying,
  onTogglePlay,
  bpm,
  currentRepeat = 0,
  lyrics,
  onLyricsChange
}) => {
  const currentSection = sections[currentSectionIndex] || sections[0];
  const diatonicChords = getDiatonicChords(currentRoot, currentScaleId);

  // Track Mute & Solo States (DAW Track Headers)
  const [guitarMuted, setGuitarMuted] = useState(false);
  const [percussionMuted, setPercussionMuted] = useState(false);
  const [soloMuted, setSoloMuted] = useState(false);

  // Track Volumes
  const [guitarVol, setGuitarVol] = useState(0.85);
  const [percussionVol, setPercussionVol] = useState(0.85);
  const [soloVol, setSoloVol] = useState(0.95);

  // Vokal / Mikrofon Kaydı State'leri
  const [vocalTake, setVocalTake] = useState<RecordedVocalTake | null>(null);
  const [isRecordingVocal, setIsRecordingVocal] = useState<boolean>(false);
  const [vocalVol, setVocalVol] = useState<number>(0.95);
  const [vocalMuted, setVocalMuted] = useState<boolean>(false);
  const [showLyricsInStudio, setShowLyricsInStudio] = useState<boolean>(false);
  const [showStudioSmartControls, setShowStudioSmartControls] = useState<boolean>(false);

  useEffect(() => {
    return audioRecorder.subscribe((take, isRec) => {
      setVocalTake(take);
      setIsRecordingVocal(isRec);
    });
  }, []);

  // Vokal Kaydını Başlat / Durdur
  const handleToggleVocalRecord = async () => {
    if (isRecordingVocal) {
      audioRecorder.stopRecording();
    } else {
      if (!isPlaying) {
        onTogglePlay();
      }
      await audioRecorder.startRecording(currentSectionIndex);
    }
  };

  const handleToggleVocalMute = () => {
    const next = !vocalMuted;
    setVocalMuted(next);
    audioRecorder.setVocalMuted(next);
  };

  const handleVocalVolChange = (val: number) => {
    setVocalVol(val);
    audioRecorder.setVocalVolume(val);
  };

  const handleDeleteVocalTake = () => {
    audioRecorder.deleteTake();
  };

  // Quick section type template
  const [newSectionType, setNewSectionType] = useState<string>('Söz (Verse)');

  // Track Header Actions
  const handleToggleGuitarMute = () => {
    const next = !guitarMuted;
    setGuitarMuted(next);
    songSequencer.setGuitarMuted(next);
  };

  const handleTogglePercussionMute = () => {
    const next = !percussionMuted;
    setPercussionMuted(next);
    songSequencer.setPercussionEnabled(!next);
  };

  const handleToggleSoloMute = () => {
    const next = !soloMuted;
    setSoloMuted(next);
    songSequencer.setSoloMuted(next);
  };

  const handleGuitarVolChange = (val: number) => {
    setGuitarVol(val);
    audioEngine.setChordVolume(val);
  };

  const handlePercussionVolChange = (val: number) => {
    setPercussionVol(val);
    audioEngine.setDrumVolume(val);
  };

  const handleSoloVolChange = (val: number) => {
    setSoloVol(val);
    audioEngine.setSoloVolume(val);
  };

  // Timeline / Section Management
  const handleAddSection = () => {
    const defaultChords = diatonicChords.slice(0, 4).map((c) => c.chordId);
    const colorPalette = [
      'from-amber-600 to-orange-700',
      'from-emerald-600 to-teal-700',
      'from-blue-600 to-cyan-700',
      'from-purple-600 to-pink-700',
      'from-rose-600 to-red-700'
    ];
    const newSection: SongSection = {
      id: `section-${Date.now()}`,
      name: newSectionType,
      chords: defaultChords.length ? defaultChords : ['Am', 'Dm', 'E', 'Am'],
      patternId: 'folk-rock',
      repeats: 2,
      color: colorPalette[sections.length % colorPalette.length],
      drumMode: 'cajon-shaker'
    };
    const next = [...sections, newSection];
    onUpdateSections(next);
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

  const handleUpdatePattern = (patternId: string) => {
    const next = [...sections];
    next[currentSectionIndex] = { ...currentSection, patternId };
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

  // Calculate cumulative bar counts for timeline ruler
  let accumulatedBars = 0;
  const sectionBarSpans = sections.map((sec) => {
    const totalBars = sec.chords.length * sec.repeats;
    const startBar = accumulatedBars + 1;
    accumulatedBars += totalBars;
    const endBar = accumulatedBars;
    return { section: sec, totalBars, startBar, endBar };
  });

  return (
    <div className="flex flex-col gap-2 h-full min-h-0 overflow-y-auto scrollbar-thin font-mono text-neutral-200">
      {/* 1. PROFESSIONAL DAW TRANSPORT & TIMELINE HEADER (BandLab / Logic Pro / Ableton style) */}
      <div className="bg-[#090a0e] border-2 border-[#1c1e28] rounded-xl p-2.5 sm:p-3 shadow-2xl shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: DAW Branding & Playhead Status */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-700 p-0.5 shadow-md flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs tracking-wider uppercase">
                  STÜDYO ZAMAN ÇİZELGESİ (ARRANGER TIMELINE)
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono font-bold">
                  DAW MULTI-TRACK
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                <span className="text-white font-mono font-bold">
                  BAR {String(currentSectionIndex + 1).padStart(2, '0')} : {String(currentChordIndex + 1).padStart(2, '0')} : {String(currentRepeat + 1).padStart(2, '0')}
                </span>
                <span>•</span>
                <span className="text-amber-400 font-bold">{bpm} BPM</span>
                <span>•</span>
                <span className="text-emerald-400 font-bold">4/4</span>
                <span>•</span>
                <span className="text-neutral-300">Toplam: {accumulatedBars} Bar</span>
              </div>
            </div>
          </div>

          {/* Center/Right: Riff Play/Stop & Song Chain Mode */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Riff Playback Button */}
            <button
              onClick={onTogglePlay}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg active:scale-95 ${
                isPlaying
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-red-950/40 animate-pulse'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 hover:brightness-110 shadow-amber-500/30'
              }`}
            >
              {isPlaying ? (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  <span>DURDUR</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>RIFF ÇAL (DÖNGÜ)</span>
                </>
              )}
            </button>

            {/* Song Chain vs Section Loop */}
            <button
              onClick={onToggleAutoAdvance}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                autoAdvanceSections
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-sm shadow-emerald-950/40'
                  : 'bg-[#12131c] border-[#222534] text-neutral-400 hover:text-white'
              }`}
              title="Açıkken şarkı kısımları baştan sona sırayla çalar; kapalıyken seçili kısım döngüye girer."
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>{autoAdvanceSections ? 'ŞARKIYI SIRAYLA ÇAL' : 'KISIM DÖNGÜSÜ (LOOP)'}</span>
            </button>

            {/* 🔴 VOKAL / MİKROFON KAYIT BUTONU */}
            <button
              onClick={handleToggleVocalRecord}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 border-2 transition-all active:scale-95 shadow-md ${
                isRecordingVocal
                  ? 'bg-red-600 text-white border-red-400 animate-pulse shadow-red-950/50'
                  : 'bg-red-500/15 text-red-300 border-red-500/40 hover:bg-red-500/25'
              }`}
              title="Tarayıcı mikrofonuyla şarkı üzerine vokal veya enstrüman kaydet"
            >
              {isRecordingVocal ? <MicOff className="w-4 h-4 animate-bounce" /> : <Mic className="w-4 h-4" />}
              <span>{isRecordingVocal ? 'KAYDI BİTİR' : '🔴 VOKAL KAYDET'}</span>
            </button>

            {/* Şarkı Sözleri Göster/Gizle */}
            {lyrics && (
              <button
                onClick={() => setShowLyricsInStudio(!showLyricsInStudio)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                  showLyricsInStudio
                    ? 'bg-purple-600 text-white border-purple-400 shadow-purple-950/40'
                    : 'bg-[#12131c] border-[#222534] text-purple-300 hover:text-white'
                }`}
                title="GrooveBox'ta yazılan sözleri timeline üzerinde aç/kapat"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>SÖZLER</span>
              </button>
            )}

            {/* Add Section dropdown & button */}
            <div className="flex items-center gap-1 bg-[#12141c] border border-[#222534] rounded-xl p-0.5">
              <select
                value={newSectionType}
                onChange={(e) => setNewSectionType(e.target.value)}
                className="bg-transparent text-white font-bold text-xs px-2 py-1 focus:outline-none cursor-pointer"
              >
                <option value="Giriş (Intro)" className="bg-neutral-900">Giriş (Intro)</option>
                <option value="Söz (Verse)" className="bg-neutral-900">Söz (Verse)</option>
                <option value="Nakarat (Chorus)" className="bg-neutral-900">Nakarat (Chorus)</option>
                <option value="Solo & Köprü" className="bg-neutral-900">Solo & Köprü</option>
                <option value="Çıkış (Outro)" className="bg-neutral-900">Çıkış (Outro)</option>
              </select>
              <button
                onClick={handleAddSection}
                className="px-2.5 py-1 rounded-lg bg-amber-500 text-neutral-950 font-bold text-xs flex items-center gap-1 hover:brightness-110 active:scale-95 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Kısım Ekle</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. LOGIC PRO / ABLETON LIVE MULTI-TRACK TIMELINE MATRIX */}
      <div className="bg-[#0b0c10] border-2 border-[#1c1e28] rounded-xl p-2.5 shadow-2xl flex flex-col gap-1.5 shrink-0 select-none">
        {/* TIMELINE RULER BAR */}
        <div className="grid grid-cols-[160px_1fr] sm:grid-cols-[200px_1fr] items-center border-b border-[#1c1e28] pb-1.5 text-[10px] text-neutral-400">
          <div className="font-bold text-neutral-500 uppercase tracking-wider pl-2 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-neutral-400" />
            <span>KANALLAR (TRACKS)</span>
          </div>

          {/* Time Ruler: Bar Numbers */}
          <div className="flex items-center gap-1 overflow-x-hidden">
            {sectionBarSpans.map((span, sIdx) => (
              <div
                key={sIdx}
                style={{ flex: span.totalBars }}
                className="text-center font-mono border-l border-[#242738] pl-1 truncate"
              >
                <span className="text-white font-bold">Bar {span.startBar} - {span.endBar}</span>
                <span className="text-[9px] text-neutral-500 ml-1">({span.section.name})</span>
              </div>
            ))}
          </div>
        </div>

        {/* TRACK 1: AKUSTİK GİTAR (CHORDS & RIFF TRACK) */}
        <div className="grid grid-cols-[160px_1fr] sm:grid-cols-[200px_1fr] items-center bg-[#0e0f14] border border-[#20222e] rounded-lg p-1.5 gap-2">
          {/* Track Header (Logic Pro style) */}
          <div className="flex items-center justify-between bg-[#14151e] border border-[#252838] rounded-lg p-1.5">
            <div className="flex items-center gap-1.5 truncate">
              <Guitar className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="truncate">
                <span className="text-xs font-bold text-white block truncate leading-none">Akustik Gitar</span>
                <span className="text-[9px] text-amber-400/80 font-mono">Riff & Akor</span>
              </div>
            </div>

            {/* Mute & Solo Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleToggleGuitarMute}
                className={`w-5 h-5 rounded text-[10px] font-bold border transition-colors ${
                  guitarMuted
                    ? 'bg-red-500 text-white border-red-400'
                    : 'bg-[#1e202c] border-[#303448] text-neutral-400 hover:text-white'
                }`}
                title="Gitarı Sustur (Mute)"
              >
                M
              </button>
              <input
                type="range"
                min="0"
                max="1.2"
                step="0.05"
                value={guitarVol}
                onChange={(e) => handleGuitarVolChange(parseFloat(e.target.value))}
                className="w-10 accent-amber-500 h-1 bg-neutral-800 rounded cursor-pointer hidden sm:block"
                title="Gitar Sesi"
              />
            </div>
          </div>

          {/* Track Lane: Section Clips */}
          <div className="flex items-center gap-1.5 h-14 overflow-x-hidden">
            {sections.map((sec, idx) => {
              const isSelected = idx === currentSectionIndex;
              const isPlayingThis = isPlaying && idx === currentSectionIndex;

              return (
                <div
                  key={sec.id}
                  onClick={() => onSelectSection(idx)}
                  style={{ flex: sec.chords.length * sec.repeats }}
                  className={`group relative h-full rounded-lg border-2 cursor-pointer p-1.5 flex flex-col justify-between transition-all select-none overflow-hidden ${
                    isPlayingThis
                      ? 'bg-gradient-to-r from-[#2e1d0f] to-[#1a1007] border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                      : isSelected
                      ? 'bg-[#181a24] border-neutral-400 shadow-md'
                      : 'bg-[#11131a] border-[#222534] hover:border-neutral-500 opacity-90'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[11px] font-bold text-white truncate">{sec.name}</span>
                    <span className="text-[9px] text-amber-400 font-bold">{sec.repeats}x</span>
                  </div>

                  {/* Chord blocks preview */}
                  <div className="flex items-center gap-1 overflow-x-hidden">
                    {sec.chords.map((c, cIdx) => (
                      <span
                        key={cIdx}
                        className={`text-[9px] font-bold px-1 rounded ${
                          isPlayingThis && cIdx === currentChordIndex
                            ? 'bg-amber-500 text-neutral-950 font-black'
                            : 'bg-black/40 text-neutral-300'
                        }`}
                      >
                        {c}
                      </span>
                    ))}
                  </div>

                  {/* Stylized wave / strum lines */}
                  <div className="w-full h-1 bg-neutral-800/80 rounded-full overflow-hidden flex items-center">
                    <div className="w-full h-full bg-gradient-to-r from-amber-500 to-amber-600 opacity-60" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* TRACK 2: AKUSTİK PERKÜSYON (DRUMS & RHYTHM TRACK) */}
        <div className="grid grid-cols-[160px_1fr] sm:grid-cols-[200px_1fr] items-center bg-[#0e0f14] border border-[#20222e] rounded-lg p-1.5 gap-2">
          {/* Track Header */}
          <div className="flex items-center justify-between bg-[#14151e] border border-[#252838] rounded-lg p-1.5">
            <div className="flex items-center gap-1.5 truncate">
              <Drum className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="truncate">
                <span className="text-xs font-bold text-white block truncate leading-none">Akustik Davul</span>
                <span className="text-[9px] text-emerald-400/80 font-mono">Kahon & Shaker</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleTogglePercussionMute}
                className={`w-5 h-5 rounded text-[10px] font-bold border transition-colors ${
                  percussionMuted
                    ? 'bg-red-500 text-white border-red-400'
                    : 'bg-[#1e202c] border-[#303448] text-neutral-400 hover:text-white'
                }`}
                title="Davulu Sustur (Mute)"
              >
                M
              </button>
              <input
                type="range"
                min="0"
                max="1.2"
                step="0.05"
                value={percussionVol}
                onChange={(e) => handlePercussionVolChange(parseFloat(e.target.value))}
                className="w-10 accent-emerald-500 h-1 bg-neutral-800 rounded cursor-pointer hidden sm:block"
                title="Davul Sesi"
              />
            </div>
          </div>

          {/* Track Lane: Drum Pattern Clips */}
          <div className="flex items-center gap-1.5 h-12 overflow-x-hidden">
            {sections.map((sec, idx) => {
              const isSelected = idx === currentSectionIndex;
              const isPlayingThis = isPlaying && idx === currentSectionIndex;

              return (
                <div
                  key={`drum-${sec.id}`}
                  onClick={() => onSelectSection(idx)}
                  style={{ flex: sec.chords.length * sec.repeats }}
                  className={`h-full rounded-lg border cursor-pointer p-1.5 flex flex-col justify-between transition-all select-none overflow-hidden ${
                    isPlayingThis
                      ? 'bg-gradient-to-r from-[#0d2616] to-[#08170d] border-emerald-500'
                      : isSelected
                      ? 'bg-[#141c18] border-neutral-500'
                      : 'bg-[#0f1411] border-[#1e2a22] opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-emerald-400 font-bold truncate">🥁 {sec.drumMode}</span>
                  </div>
                  {/* Visual beat markers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 8 }).map((_, bIdx) => (
                      <span
                        key={bIdx}
                        className={`h-1.5 flex-1 rounded-full ${
                          sec.drumMode === 'mute'
                            ? 'bg-neutral-800'
                            : bIdx % 2 === 0
                            ? 'bg-emerald-400'
                            : 'bg-emerald-700/60'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* TRACK 3: USTA SOLO & LEAD (MELODY TRACK) */}
        <div className="grid grid-cols-[160px_1fr] sm:grid-cols-[200px_1fr] items-center bg-[#0e0f14] border border-[#20222e] rounded-lg p-1.5 gap-2">
          {/* Track Header */}
          <div className="flex items-center justify-between bg-[#14151e] border border-[#252838] rounded-lg p-1.5">
            <div className="flex items-center gap-1.5 truncate">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="truncate">
                <span className="text-xs font-bold text-white block truncate leading-none">Usta Solo</span>
                <span className="text-[9px] text-cyan-400/80 font-mono">Melodi & Lead</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleToggleSoloMute}
                className={`w-5 h-5 rounded text-[10px] font-bold border transition-colors ${
                  soloMuted
                    ? 'bg-red-500 text-white border-red-400'
                    : 'bg-[#1e202c] border-[#303448] text-neutral-400 hover:text-white'
                }`}
                title="Soloyu Sustur (Mute)"
              >
                M
              </button>
              <input
                type="range"
                min="0"
                max="1.2"
                step="0.05"
                value={soloVol}
                onChange={(e) => handleSoloVolChange(parseFloat(e.target.value))}
                className="w-10 accent-cyan-500 h-1 bg-neutral-800 rounded cursor-pointer hidden sm:block"
                title="Solo Sesi"
              />
            </div>
          </div>

          {/* Track Lane: Solo Notes / Piano Roll Preview */}
          <div className="flex items-center gap-1.5 h-12 overflow-x-hidden">
            {sections.map((sec, idx) => {
              const isSelected = idx === currentSectionIndex;

              return (
                <div
                  key={`solo-${sec.id}`}
                  onClick={() => onSelectSection(idx)}
                  style={{ flex: sec.chords.length * sec.repeats }}
                  className={`h-full rounded-lg border cursor-pointer p-1.5 flex flex-col justify-between transition-all select-none overflow-hidden ${
                    isSelected
                      ? 'bg-[#121926] border-cyan-500'
                      : 'bg-[#0f141e] border-[#1d2738] opacity-80'
                  }`}
                >
                  <span className="text-[10px] text-cyan-300 font-bold truncate">🎵 Canlı Klavyeye Sadık</span>
                  <div className="w-full flex items-center gap-0.5">
                    {Array.from({ length: 12 }).map((_, mIdx) => (
                      <span
                        key={mIdx}
                        className="h-1 flex-1 bg-cyan-500/40 rounded-full"
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* TRACK 4: VOKAL & MİKROFON SES KAYDI (VOCAL AUDIO TRACK) */}
        <div className="grid grid-cols-[160px_1fr] sm:grid-cols-[200px_1fr] items-center bg-[#0e0f14] border border-[#20222e] rounded-lg p-1.5 gap-2">
          {/* Track Header */}
          <div className="flex items-center justify-between bg-[#14151e] border border-[#252838] rounded-lg p-1.5">
            <div className="flex items-center gap-1.5 truncate">
              <Mic className={`w-4 h-4 shrink-0 ${isRecordingVocal ? 'text-red-500 animate-pulse' : 'text-rose-400'}`} />
              <div className="truncate">
                <span className="text-xs font-bold text-white block truncate leading-none">Vokal / Mikrofon</span>
                <span className="text-[9px] text-rose-400/80 font-mono">
                  {isRecordingVocal ? '🔴 Kaydediliyor...' : vocalTake ? `${vocalTake.durationSec.toFixed(1)}s Kayıt` : 'Hazır'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {vocalTake && (
                <>
                  <button
                    onClick={handleToggleVocalMute}
                    className={`w-5 h-5 rounded text-[10px] font-bold border transition-colors ${
                      vocalMuted
                        ? 'bg-red-500 text-white border-red-400'
                        : 'bg-[#1e202c] border-[#303448] text-neutral-400 hover:text-white'
                    }`}
                    title="Vokali Sustur (Mute)"
                  >
                    M
                  </button>
                  <button
                    onClick={handleDeleteVocalTake}
                    className="w-5 h-5 rounded text-[10px] bg-neutral-900 hover:bg-red-950 text-neutral-400 hover:text-red-400 border border-neutral-800 flex items-center justify-center transition-colors"
                    title="Vokal Kaydını Sil"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              )}
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={vocalVol}
                onChange={(e) => handleVocalVolChange(parseFloat(e.target.value))}
                className="w-10 accent-rose-500 h-1 bg-neutral-800 rounded cursor-pointer hidden sm:block"
                title="Vokal Sesi"
              />
            </div>
          </div>

          {/* Track Lane: Vocal Audio Waveform / Take Representation */}
          <div className="flex items-center gap-1.5 h-12 overflow-x-hidden">
            {vocalTake ? (
              <div className="w-full h-full bg-gradient-to-r from-rose-950/60 to-purple-950/40 border border-rose-500/50 rounded-lg p-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-xs font-bold text-rose-200">
                    🎤 Canlı Vokal Kaydı ({vocalTake.durationSec.toFixed(1)} sn)
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 32 }).map((_, wIdx) => {
                    const h = Math.sin(wIdx * 0.4) * 12 + 14;
                    return (
                      <span
                        key={wIdx}
                        style={{ height: `${h}px` }}
                        className="w-1 bg-rose-400/70 rounded-full"
                      />
                    );
                  })}
                </div>
              </div>
            ) : isRecordingVocal ? (
              <div className="w-full h-full bg-red-950/40 border-2 border-red-500 border-dashed rounded-lg flex items-center justify-center gap-2 animate-pulse">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs font-bold text-red-300">Mikrofondan Şarkı Kaydediliyor...</span>
              </div>
            ) : (
              <div
                onClick={handleToggleVocalRecord}
                className="w-full h-full bg-[#10121a]/60 border border-dashed border-[#242738] hover:border-rose-500/50 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all group"
              >
                <Mic className="w-4 h-4 text-neutral-500 group-hover:text-rose-400 transition-colors" />
                <span className="text-xs text-neutral-400 group-hover:text-rose-300 font-medium">
                  Vokal veya enstrüman kaydetmek için buraya veya üstteki 'Vokal Kaydet' butonuna tıklayın
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2.5 STÜDYO ENTEGRE SÖZ PANELİ */}
      {showLyricsInStudio && lyrics && (
        <div className="bg-[#0e0f14] border-2 border-purple-500/30 rounded-xl p-3 shadow-xl flex flex-col gap-2 shrink-0 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-[#1c1e28] pb-1.5 text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-purple-400" />
              Şarkı Sözleri: {currentSection.name}
            </span>
            <span className="text-[10px] text-purple-300 font-mono">
              GrooveBox Senkronize Sözler
            </span>
          </div>
          <textarea
            value={lyrics[currentSection.id] || ''}
            onChange={(e) => onLyricsChange && onLyricsChange(currentSection.id, e.target.value)}
            placeholder="Bu kısım için şarkı sözü yazın..."
            rows={3}
            className="w-full text-sm font-sans text-neutral-200 bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 leading-relaxed resize-y"
          />
        </div>
      )}

      {/* 2.8 LOGIC PRO SMART CONTROLS (Studio Master Strip) */}
      <LogicSmartControls
        currentInstrument={audioEngine.getSoloInstrument()}
        isOpen={showStudioSmartControls}
        onToggle={() => setShowStudioSmartControls(!showStudioSmartControls)}
      />

      {/* 3. CLIP & SECTION DETAIL INSPECTOR (Ableton / Studio One Bottom Drawer) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 shrink-0">
        {/* Left: Section Properties & Arrangement Controls (Cols 1-5) */}
        <div className="lg:col-span-5 bg-[#0e0f14] border-2 border-[#20222e] rounded-xl p-3 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#1c1e28] pb-1.5 text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Disc3 className="w-4 h-4 text-amber-400" />
              Kısım Özellikleri: {currentSection.name}
            </span>
            <span className="text-[10px] text-amber-400 font-bold font-mono">
              #{currentSectionIndex + 1} / {sections.length}
            </span>
          </div>

          {/* Section Name & Quick Reorder Controls */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold text-neutral-400">Kısım Adı:</label>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentSectionIndex === 0}
                  onClick={(e) => handleMoveSection(currentSectionIndex, 'up', e)}
                  className="px-1.5 py-0.5 rounded bg-[#1c1e28] hover:bg-[#252838] text-[10px] text-neutral-300 disabled:opacity-20"
                  title="Öne Taşı"
                >
                  <ChevronUp className="w-3 h-3 inline" /> Öne
                </button>
                <button
                  disabled={currentSectionIndex === sections.length - 1}
                  onClick={(e) => handleMoveSection(currentSectionIndex, 'down', e)}
                  className="px-1.5 py-0.5 rounded bg-[#1c1e28] hover:bg-[#252838] text-[10px] text-neutral-300 disabled:opacity-20"
                  title="Arkaya Taşı"
                >
                  <ChevronDown className="w-3 h-3 inline" /> Arkaya
                </button>
                <button
                  onClick={(e) => handleDuplicateSection(currentSectionIndex, e)}
                  className="px-1.5 py-0.5 rounded bg-[#1c1e28] hover:bg-[#252838] text-[10px] text-cyan-300"
                  title="Kopyala"
                >
                  <Copy className="w-3 h-3 inline" /> Kopyala
                </button>
                {sections.length > 1 && (
                  <button
                    onClick={(e) => handleRemoveSection(currentSectionIndex, e)}
                    className="px-1.5 py-0.5 rounded bg-red-950/40 hover:bg-red-900/60 text-[10px] text-red-400"
                    title="Sil"
                  >
                    <Trash2 className="w-3 h-3 inline" /> Sil
                  </button>
                )}
              </div>
            </div>
            <input
              type="text"
              value={currentSection.name}
              onChange={(e) => handleUpdateName(e.target.value)}
              className="w-full bg-[#14151e] border border-[#262838] rounded-lg px-2.5 py-1 text-white font-bold text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Repeats & Pattern Selector */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                Döngü Tekrarı:
              </label>
              <div className="grid grid-cols-4 gap-1">
                {[1, 2, 4, 8].map((rep) => (
                  <button
                    key={rep}
                    onClick={() => handleUpdateRepeats(rep)}
                    className={`py-1 rounded text-xs font-bold border transition-all ${
                      currentSection.repeats === rep
                        ? 'bg-amber-500 text-neutral-950 border-white'
                        : 'bg-[#14151e] border-[#262838] text-neutral-400 hover:text-white'
                    }`}
                  >
                    {rep}x
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                Riff Stili:
              </label>
              <select
                value={currentSection.patternId}
                onChange={(e) => handleUpdatePattern(e.target.value)}
                className="w-full bg-[#14151e] border border-[#262838] rounded px-2 py-1 text-xs text-white font-bold focus:outline-none cursor-pointer"
              >
                {Object.values(STRUM_PATTERNS).map((p) => (
                  <option key={p.id} value={p.id} className="bg-neutral-900 text-white">
                    {p.name.split(' ')[0]} {p.name.split(' ')[1] || ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Drum Groove Selector */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-neutral-400">
              Bu Kısma Özel Davul Ritim Modu:
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { id: 'cajon-shaker', label: '🥁 Kahon + Shaker' },
                  { id: 'shaker-only', label: '🌾 Sadece Shaker' },
                  { id: 'flamenco', label: '💃 Tam Flamenko' },
                  { id: 'mute', label: '🔇 Kapalı (Davulsuz)' }
                ] as { id: DrumMode; label: string }[]
              ).map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => handleUpdateDrumMode(mode.id)}
                  className={`p-1.5 rounded-lg text-left text-xs font-bold border transition-all truncate ${
                    currentSection.drumMode === mode.id
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                      : 'bg-[#14151e] border-[#262838] text-neutral-400 hover:text-white'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Section Chord Arranger & Diatonic Quick Palette (Cols 6-12) */}
        <div className="lg:col-span-7 bg-[#0e0f14] border-2 border-[#20222e] rounded-xl p-3 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#1c1e28] pb-1.5 text-xs mb-2">
              <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Music className="w-4 h-4 text-emerald-400" />
                Akor Sıralaması ({currentSection.chords.length} Bar):
              </span>
              <span className="text-[10px] text-neutral-400">
                Aşağıdaki akorlara tıklayarak bölüme yeni barlar ekleyin
              </span>
            </div>

            {/* Current chord blocks in this section */}
            <div className="flex flex-wrap gap-2 my-2">
              {currentSection.chords.map((chordId, idx) => (
                <div
                  key={idx}
                  className="group relative px-3 py-1.5 rounded-xl border-2 border-[#262838] bg-[#14151e] flex items-center gap-2 select-none"
                >
                  <span className="text-[10px] text-neutral-500 font-bold">{idx + 1}. Bar</span>
                  <span className="text-sm font-black font-mono text-white">{chordId}</span>
                  {currentSection.chords.length > 1 && (
                    <button
                      onClick={() => handleRemoveChord(idx)}
                      className="text-neutral-500 hover:text-red-400 transition-colors ml-1"
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
          <div className="border-t border-[#1c1e28] pt-2">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
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
