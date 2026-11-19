import React, { useState } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { songSequencer } from '../audio/Sequencer';
import { Sliders, Sparkles, Guitar, Waves } from 'lucide-react';

interface MasterDspRackProps {
  swing: number;
  onSwingChange: (val: number) => void;
  percussionOn: boolean;
  onTogglePercussion: () => void;
}

export const MasterDspRack: React.FC<MasterDspRackProps> = ({
  swing,
  onSwingChange,
  percussionOn,
  onTogglePercussion
}) => {
  // Master DSP State (Tuned for dry, crisp studio acoustic sound)
  const [reverbWet, setReverbWet] = useState<number>(0.04); // Default 4% wet (Very clean studio room!)
  const [strumSpeed, setStrumSpeed] = useState<number>(22); // 22ms strum speed
  const [brightness, setBrightness] = useState<number>(0.75); // High Shelf sheen
  const [bodyResonance, setBodyResonance] = useState<number>(0.85); // 108Hz resonance
  const [drumVol, setDrumVol] = useState<number>(0.85);
  const [chordVol, setChordVol] = useState<number>(0.85);
  const [soloVol, setSoloVol] = useState<number>(0.95);

  const [isGuitarMuted, setIsGuitarMuted] = useState(false);
  const [isSoloMuted, setIsSoloMuted] = useState(false);

  const handleReverbChange = (val: number) => {
    setReverbWet(val);
    audioEngine.setReverb(val);
  };

  const handleStrumSpeedChange = (val: number) => {
    setStrumSpeed(val);
    audioEngine.setStrumSpeed(val);
  };

  const handleBrightnessChange = (val: number) => {
    setBrightness(val);
    audioEngine.setBrightness(val);
  };

  const handleBodyResonanceChange = (val: number) => {
    setBodyResonance(val);
    if (audioEngine.preset) {
      audioEngine.preset.bodyResonance = val;
    }
  };

  const handleDrumVolChange = (val: number) => {
    setDrumVol(val);
    audioEngine.setDrumVolume(val);
  };

  const handleChordVolChange = (val: number) => {
    setChordVol(val);
    audioEngine.setChordVolume(val);
  };

  const handleSoloVolChange = (val: number) => {
    setSoloVol(val);
    audioEngine.setSoloVolume(val);
  };

  const toggleGuitarMute = () => {
    const next = !isGuitarMuted;
    setIsGuitarMuted(next);
    songSequencer.setGuitarMuted(next);
  };

  const toggleSoloMute = () => {
    const next = !isSoloMuted;
    setIsSoloMuted(next);
    songSequencer.setSoloMuted(next);
  };

  return (
    <div className="bg-[#0b0c10] border border-[#20222c] rounded-xl p-2 sm:p-2.5 shadow-xl font-mono text-neutral-300">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Title & Badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Sliders className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-bold text-white tracking-wider uppercase">
            MASTER DSP & KANAL MİKSERİ:
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
            Dry Studio Room
          </span>
        </div>

        {/* Sliders Grid */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs flex-1 justify-end">
          {/* 1. Reverb Wet (Kuru / Net Akustik Oda) */}
          <div className="flex items-center gap-1.5 bg-[#12131a] border border-[#232634] rounded-lg px-2 py-1">
            <Waves className="w-3.5 h-3.5 text-blue-400" />
            <div className="flex flex-col">
              <span className="text-[9px] text-neutral-400 leading-none">REVERB (ODA)</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="range"
                  min="0.0"
                  max="0.30"
                  step="0.01"
                  value={reverbWet}
                  onChange={(e) => handleReverbChange(parseFloat(e.target.value))}
                  className="w-16 h-1 accent-blue-500 cursor-pointer bg-neutral-800 rounded-lg"
                  title="Reverb seviyesi (Düşük tutularak stüdyo kuruluğu sağlanır)"
                />
                <span className="text-[10px] text-blue-400 font-bold w-7">
                  %{Math.round(reverbWet * 100)}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Strum Speed */}
          <div className="flex items-center gap-1.5 bg-[#12131a] border border-[#232634] rounded-lg px-2 py-1">
            <Guitar className="w-3.5 h-3.5 text-amber-400" />
            <div className="flex flex-col">
              <span className="text-[9px] text-neutral-400 leading-none">STRUM HIZI</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="range"
                  min="12"
                  max="50"
                  step="2"
                  value={strumSpeed}
                  onChange={(e) => handleStrumSpeedChange(parseInt(e.target.value, 10))}
                  className="w-16 h-1 accent-amber-500 cursor-pointer bg-neutral-800 rounded-lg"
                />
                <span className="text-[10px] text-amber-400 font-bold w-8">
                  {strumSpeed}ms
                </span>
              </div>
            </div>
          </div>

          {/* 3. Tone / Brightness */}
          <div className="flex items-center gap-1.5 bg-[#12131a] border border-[#232634] rounded-lg px-2 py-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <div className="flex flex-col">
              <span className="text-[9px] text-neutral-400 leading-none">PARLAKLIK</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="range"
                  min="0.3"
                  max="1.0"
                  step="0.05"
                  value={brightness}
                  onChange={(e) => handleBrightnessChange(parseFloat(e.target.value))}
                  className="w-14 h-1 accent-emerald-500 cursor-pointer bg-neutral-800 rounded-lg"
                />
                <span className="text-[10px] text-emerald-400 font-bold w-6">
                  {Math.round(brightness * 100)}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Body Bass Resonance */}
          <div className="flex items-center gap-1.5 bg-[#12131a] border border-[#232634] rounded-lg px-2 py-1">
            <span className="text-amber-500 text-xs">🪵</span>
            <div className="flex flex-col">
              <span className="text-[9px] text-neutral-400 leading-none">GÖVDE BASI</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={bodyResonance}
                  onChange={(e) => handleBodyResonanceChange(parseFloat(e.target.value))}
                  className="w-14 h-1 accent-amber-600 cursor-pointer bg-neutral-800 rounded-lg"
                />
                <span className="text-[10px] text-amber-500 font-bold w-6">
                  {Math.round(bodyResonance * 100)}
                </span>
              </div>
            </div>
          </div>

          {/* 5. Submix Faders: Davul, Akor, Solo */}
          <div className="flex items-center gap-2 border-l border-[#242736] pl-2.5">
            {/* Davul */}
            <div className="flex items-center gap-1 bg-[#12131a] border border-[#232634] rounded px-1.5 py-0.5">
              <button
                onClick={onTogglePercussion}
                className={`text-[10px] font-bold px-1 rounded transition-colors ${
                  percussionOn ? 'text-emerald-400 hover:text-emerald-300' : 'text-neutral-500 line-through'
                }`}
                title="Davul Mute / Unmute"
              >
                🥁
              </button>
              <input
                type="range"
                min="0.0"
                max="1.1"
                step="0.05"
                value={percussionOn ? drumVol : 0}
                onChange={(e) => handleDrumVolChange(parseFloat(e.target.value))}
                className="w-12 h-1 accent-emerald-500 cursor-pointer bg-neutral-800 rounded-lg"
              />
            </div>

            {/* Akor */}
            <div className="flex items-center gap-1 bg-[#12131a] border border-[#232634] rounded px-1.5 py-0.5">
              <button
                onClick={toggleGuitarMute}
                className={`text-[10px] font-bold px-1 rounded transition-colors ${
                  !isGuitarMuted ? 'text-amber-400 hover:text-amber-300' : 'text-neutral-500 line-through'
                }`}
                title="Akor Riff Mute / Unmute"
              >
                🎸
              </button>
              <input
                type="range"
                min="0.0"
                max="1.1"
                step="0.05"
                value={!isGuitarMuted ? chordVol : 0}
                onChange={(e) => handleChordVolChange(parseFloat(e.target.value))}
                className="w-12 h-1 accent-amber-500 cursor-pointer bg-neutral-800 rounded-lg"
              />
            </div>

            {/* Solo */}
            <div className="flex items-center gap-1 bg-[#12131a] border border-[#232634] rounded px-1.5 py-0.5">
              <button
                onClick={toggleSoloMute}
                className={`text-[10px] font-bold px-1 rounded transition-colors ${
                  !isSoloMuted ? 'text-purple-400 hover:text-purple-300' : 'text-neutral-500 line-through'
                }`}
                title="Solo Mute / Unmute"
              >
                🎻
              </button>
              <input
                type="range"
                min="0.0"
                max="1.1"
                step="0.05"
                value={!isSoloMuted ? soloVol : 0}
                onChange={(e) => handleSoloVolChange(parseFloat(e.target.value))}
                className="w-12 h-1 accent-purple-500 cursor-pointer bg-neutral-800 rounded-lg"
              />
            </div>

            {/* Swing */}
            <div className="flex items-center gap-1 bg-[#12131a] border border-[#232634] rounded px-1.5 py-0.5">
              <span className="text-[9px] text-neutral-400">GROOVE:</span>
              <input
                type="range"
                min="0.0"
                max="0.5"
                step="0.05"
                value={swing}
                onChange={(e) => onSwingChange(parseFloat(e.target.value))}
                className="w-12 h-1 accent-yellow-500 cursor-pointer bg-neutral-800 rounded-lg"
              />
              <span className="text-[10px] text-yellow-400 font-bold w-6">
                %{Math.round(swing * 100)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
