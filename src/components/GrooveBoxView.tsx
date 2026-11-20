import React, { useState } from 'react';
import { SongSection, GuitarChord } from '../types';
import { SONG_PROGRESSIONS, generateRandomHitProgression } from '../config/progressions';
import { GUITAR_CHORDS } from '../config/chords';
import { SoloKeyboard } from './SoloKeyboard';
import { songSequencer } from '../audio/Sequencer';
import {
  Dices,
  Play,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  Flame,
  Radio,
  Repeat
} from 'lucide-react';

interface GrooveBoxViewProps {
  sections: SongSection[];
  currentSectionIndex: number;
  queuedSectionIndex: number | null;
  currentChordIndex: number;
  currentRepeat: number;
  activeChord: GuitarChord;
  onSelectChord: (chord: GuitarChord) => void;
  currentRoot: string;
  onRootChange: (root: string) => void;
  currentScaleId: string;
  onScaleChange: (scaleId: string) => void;
  isPlaying: boolean;
  percussionOn: boolean;
  onTogglePercussion: () => void;
  onUpdateSections: (newSections: SongSection[]) => void;
  lyrics: Record<string, string>;
  onLyricsChange: (sectionId: string, text: string) => void;
}

export const GrooveBoxView: React.FC<GrooveBoxViewProps> = ({
  sections,
  currentSectionIndex,
  queuedSectionIndex,
  currentChordIndex,
  currentRepeat,
  activeChord,
  onSelectChord,
  currentRoot,
  onRootChange,
  currentScaleId,
  onScaleChange,
  isPlaying,
  percussionOn,
  onTogglePercussion,
  onUpdateSections,
  lyrics,
  onLyricsChange
}) => {
  const currentSection = sections[currentSectionIndex] || sections[0];
  const [showLyricsPad, setShowLyricsPad] = useState<boolean>(false);
  const [selectedProgressionId, setSelectedProgressionId] = useState<string>('');

  // Hit Preset Uygulama
  const handleApplyProgression = (progId: string) => {
    const prog = SONG_PROGRESSIONS.find((p) => p.id === progId);
    if (!prog) return;
    setSelectedProgressionId(prog.id);
    onRootChange(prog.scaleRoot);
    onScaleChange(prog.scaleId);

    // Kısımları hit şarkı akorlarına göre dönüştür
    const updated = sections.map((sec, idx) => {
      if (idx === 0) {
        // Intro: İlk 2 akor
        return { ...sec, chords: prog.chords.slice(0, 2), patternId: prog.patternId };
      } else if (idx === 1) {
        // Verse: Tam akor yürüyüşü
        return { ...sec, chords: [...prog.chords], patternId: prog.patternId };
      } else {
        return { ...sec, chords: [...prog.chords] };
      }
    });

    onUpdateSections(updated);
    if (prog.bpm) {
      songSequencer.setBpm(prog.bpm);
    }
  };

  // 🎲 Sihirli Hit Üretici (Zar At)
  const handleMagicHitDice = () => {
    const randomProg = generateRandomHitProgression();
    handleApplyProgression(randomProg.id);
  };

  // Kısım Tekrar Sayısını Değiştirme (1x, 2x, 4x, 8x)
  const handleCycleRepeats = (secIndex: number) => {
    const repeatCycles = [1, 2, 4, 8];
    const sec = sections[secIndex];
    const currentIdx = repeatCycles.indexOf(sec.repeats || 2);
    const nextRepeat = repeatCycles[(currentIdx + 1) % repeatCycles.length];

    const updated = sections.map((s, idx) => (idx === secIndex ? { ...s, repeats: nextRepeat } : s));
    onUpdateSections(updated);
  };

  // Sahne Fırlatma (Scene Launch)
  const handleLaunchScene = (idx: number) => {
    songSequencer.queueSection(idx, !isPlaying);
  };

  return (
    <div className="flex flex-col gap-3 max-w-7xl mx-auto w-full pb-4">
      {/* 1. ÜST PANEL: MÜZİK TEORİSİNİ SIFIRLAYAN HIT ŞABLONLAR & BESTE ARAÇLARI */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3 sm:p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        {/* Hit Akor Presets Dropdown */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>TUTAN HIT TRENDLER:</span>
          </div>

          <select
            value={selectedProgressionId}
            onChange={(e) => handleApplyProgression(e.target.value)}
            className="bg-neutral-950 border border-neutral-700 hover:border-amber-500/50 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
          >
            <option value="" disabled>
              Hit Akor Şablonu Seçin...
            </option>
            <optgroup label="🇹🇷 Türkiye Hit Trendleri">
              {SONG_PROGRESSIONS.filter((p) => p.category === 'turkish').map((p) => (
                <option key={p.id} value={p.id} className="bg-neutral-900 text-white font-medium">
                  {p.title} ({p.artistHint})
                </option>
              ))}
            </optgroup>
            <optgroup label="🌍 Global Hit Formülleri">
              {SONG_PROGRESSIONS.filter((p) => p.category === 'global').map((p) => (
                <option key={p.id} value={p.id} className="bg-neutral-900 text-white font-medium">
                  {p.title} ({p.artistHint})
                </option>
              ))}
            </optgroup>
          </select>

          {/* 🎲 Sihirli Hit Üretici (Magic Hit Dice) */}
          <button
            onClick={handleMagicHitDice}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 text-neutral-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-950/30 active:scale-95 transition-all"
            title="Müzik teorisini sıfırla: Tek tıkla rastgele popüler hit akor dizilimi yükle"
          >
            <Dices className="w-4 h-4" />
            <span>ZAR AT (RASTGELE HIT)</span>
          </button>
        </div>

        {/* Sağ Taraf: Söz & Beste Defteri Aç/Kapat Butonu */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLyricsPad(!showLyricsPad)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all active:scale-95 shadow-md ${
              showLyricsPad
                ? 'bg-purple-600 text-white border-purple-400 shadow-purple-950/40'
                : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-purple-500/50'
            }`}
          >
            <BookOpen className="w-4 h-4 text-purple-400" />
            <span>SÖZ & BESTE DEFTERİ</span>
            {showLyricsPad ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. ENTEGRE SÖZ & BESTE DEFTERİ (Açıldığında Görünür) */}
      {showLyricsPad && (
        <div className="bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-900 border-2 border-purple-500/30 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">Akıllı Beste & Söz Defteri (Lyrics Pad)</h3>
              <span className="text-[10px] text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full font-mono">
                Şu an çalan kısım: {currentSection.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-neutral-400 font-medium">Hızlı Akor Ekle:</span>
              {currentSection.chords.map((ch, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const currentText = lyrics[currentSection.id] || '';
                    onLyricsChange(currentSection.id, `${currentText} [${ch}] `);
                  }}
                  className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-purple-600 text-amber-300 hover:text-white font-mono text-xs font-bold transition-all"
                >
                  [{ch}]
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={lyrics[currentSection.id] || ''}
            onChange={(e) => onLyricsChange(currentSection.id, e.target.value)}
            placeholder={`Bu kısım (${currentSection.name}) için şarkı sözlerinizi buraya yazın veya mırıldandığınız sözleri not edin... Örneğin:\n[${currentSection.chords[0] || 'Am'}] Yollarda bulurum seni...\n[${currentSection.chords[1] || 'Dm'}] Bir şarkı fısıldar gibi...`}
            rows={4}
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-purple-500 rounded-xl p-3 text-sm text-neutral-200 font-sans focus:outline-none focus:ring-1 focus:ring-purple-500 resize-y leading-relaxed"
          />
        </div>
      )}

      {/* 3. ŞARKI KISIMLARI ZİNCİRİ & ABLETON SAHNE FIRLATICI */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3 sm:p-4 shadow-xl flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase">
              Kısım Zinciri & Döngüler (Scene Launcher)
            </h2>
            <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline">
              1-Bar Kuantize Senkronize Geçiş
            </span>
          </div>

          <div className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5 bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>
              Aktif: {currentSection.name} ({currentRepeat + 1}/{currentSection.repeats || 2})
            </span>
          </div>
        </div>

        {/* 4 Sahne Kartı: Giriş, Söz, Nakarat, Solo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {sections.map((section, idx) => {
            const isCurrent = currentSectionIndex === idx;
            const isQueued = queuedSectionIndex === idx;

            return (
              <div
                key={section.id}
                onClick={() => handleLaunchScene(idx)}
                className={`relative group rounded-xl p-3 border-2 transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-md ${
                  isCurrent
                    ? 'bg-neutral-900 border-emerald-500/80 shadow-emerald-950/20'
                    : isQueued
                    ? 'bg-neutral-900 border-amber-400 shadow-amber-950/20 animate-pulse'
                    : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black tracking-tight ${isCurrent ? 'text-white' : 'text-neutral-300'}`}>
                    {section.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCycleRepeats(idx);
                    }}
                    className="flex items-center gap-1 text-[10px] font-mono font-bold bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-amber-300 px-1.5 py-0.5 rounded border border-neutral-800 transition-all"
                    title="Tekrar sayısını döngüle (1x, 2x, 4x, 8x)"
                  >
                    <Repeat className="w-2.5 h-2.5" />
                    <span>{section.repeats || 2}x</span>
                  </button>
                </div>

                {/* Akor Minyatürü */}
                <div className="flex items-center gap-1 flex-wrap">
                  {section.chords.map((ch, cIdx) => (
                    <span
                      key={cIdx}
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        isCurrent && currentChordIndex === cIdx
                          ? 'bg-amber-500 text-neutral-950 shadow-sm'
                          : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      {ch}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono border-t border-neutral-800/80 pt-1.5">
                  <span className="capitalize">{section.drumMode || 'cajon'}</span>
                  {isCurrent && (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Play className="w-2.5 h-2.5 fill-current" /> Çalıyor
                    </span>
                  )}
                  {isQueued && <span className="text-amber-400 font-bold animate-pulse">Sırada...</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. DOKUNSAL CANLI AKOR PADLERİ (LIVE TRIGGER) */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3 sm:p-4 shadow-xl flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-neutral-300 uppercase tracking-wide">
            Canlı Akor Padleri (Dokunarak Strum Çal):
          </span>
          <span className="text-[10px] text-neutral-400 font-mono">
            {currentSection.name} Akorları
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {currentSection.chords.map((chordName, barIdx) => {
            const isPlayingThis = currentChordIndex === barIdx && isPlaying;
            const chordObj = GUITAR_CHORDS[chordName] || GUITAR_CHORDS['Am'];

            return (
              <button
                key={barIdx}
                onClick={() => {
                  onSelectChord(chordObj);
                  songSequencer.setSectionIndex(currentSectionIndex);
                }}
                className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1 border-2 transition-all active:scale-95 shadow-md ${
                  isPlayingThis
                    ? 'bg-gradient-to-b from-amber-500 to-amber-600 text-neutral-950 border-amber-300 shadow-amber-950/40 ring-2 ring-amber-400/50'
                    : 'bg-neutral-950 text-white border-neutral-800 hover:border-amber-500/50 hover:bg-neutral-900'
                }`}
              >
                <span className={`text-[10px] font-mono ${isPlayingThis ? 'text-neutral-900 font-bold' : 'text-neutral-400'}`}>
                  {barIdx + 1}. Bar
                </span>
                <span className="text-base sm:text-lg font-black tracking-tight">{chordName}</span>
                <span className={`text-[9px] uppercase font-mono ${isPlayingThis ? 'text-neutral-900' : 'text-neutral-400'}`}>
                  {isPlayingThis ? 'Vuruyor' : 'Vur / Strum'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. VİRTUOSO SOLO ENSTRÜMAN KLAVYESİ & DAVUL MOTORU */}
      <SoloKeyboard
        currentRoot={currentRoot}
        onRootChange={onRootChange}
        currentScaleId={currentScaleId}
        onScaleChange={onScaleChange}
        isPlaying={isPlaying}
        percussionOn={percussionOn}
        onTogglePercussion={onTogglePercussion}
        activeChord={activeChord}
      />
    </div>
  );
};
