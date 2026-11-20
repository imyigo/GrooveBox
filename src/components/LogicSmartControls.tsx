import React, { useState } from 'react';
import { AcousticInstrumentType, INSTRUMENT_METAS } from '../audio/SampledGuitarEngine';
import { audioEngine } from '../audio/AudioEngine';
import {
  Sparkles,
  Waves,
  Wind,
  Disc3,
  Compass,
  Cpu,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface LogicSmartControlsProps {
  currentInstrument: AcousticInstrumentType;
  isOpen: boolean;
  onToggle: () => void;
}

export const LogicSmartControls: React.FC<LogicSmartControlsProps> = ({
  currentInstrument,
  isOpen,
  onToggle
}) => {
  const meta = INSTRUMENT_METAS[currentInstrument] || INSTRUMENT_METAS.nylon;

  // Logic Smart Knobs State
  const [knob1, setKnob1] = useState<number>(0.65); // Warmth / Body
  const [knob2, setKnob2] = useState<number>(0.75); // Air / Presence / Brightness
  const [knob3, setKnob3] = useState<number>(0.50); // Attack / Bite / Punch
  const [knob4, setKnob4] = useState<number>(0.40); // Vibrato / Modulation / Resonance
  const [spacePreset, setSpacePreset] = useState<'dry-room' | 'warm-chamber' | 'concert-hall' | 'plate'>('warm-chamber');

  // Enstrümana Göre Logic Smart Knobs Etiketleri
  const getKnobLabels = () => {
    switch (currentInstrument) {
      case 'piano':
        return {
          k1: { name: 'Damper Res', icon: Waves, hint: 'Pedal ve gövde tel rezonansı' },
          k2: { name: 'Tone / Air', icon: Sparkles, hint: 'Piyano parlaklığı ve tınısı' },
          k3: { name: 'Hammer Hit', icon: Disc3, hint: 'Keçe çekiç vuruş sertliği' },
          k4: { name: 'Lid Open', icon: Compass, hint: 'Kuyruk kapak açıklığı' }
        };
      case 'violin':
        return {
          k1: { name: 'Body Warmth', icon: Waves, hint: 'Stradivarius sedir gövde rezonansı' },
          k2: { name: 'String Sheen', icon: Sparkles, hint: 'Bağırsak/çelik tel parlaklığı' },
          k3: { name: 'Bow Attack', icon: Disc3, hint: 'Reçineli yay baskı kuvveti' },
          k4: { name: 'Vibrato Depth', icon: Wind, hint: 'Doğal parmak vibrato genişliği' }
        };
      case 'clarinet':
      case 'alto_sax':
      case 'harmonica':
        return {
          k1: { name: 'Wood Res', icon: Waves, hint: 'Akustik kamış ve boru rezonansı' },
          k2: { name: 'Air / Breath', icon: Wind, hint: 'Hava akışı ve nefes rengi' },
          k3: { name: 'Reed Bite', icon: Disc3, hint: 'Kamış ısırığı ve artikülasyon' },
          k4: { name: 'Exp Vibrato', icon: Sparkles, hint: 'Nefes dalgalanması ve vibrato' }
        };
      case 'drums':
        return {
          k1: { name: 'Cajon Punch', icon: Disc3, hint: 'Kahon bas gövde vuruş gücü' },
          k2: { name: 'Snare Snap', icon: Sparkles, hint: 'Kahon slap ve tokmak çıtırlığı' },
          k3: { name: 'Shaker Crisp', icon: Wind, hint: 'Shaker ve tef zil parlaklığı' },
          k4: { name: 'Human Feel', icon: Compass, hint: 'Doğal insan salınımı ve tuşe' }
        };
      case 'nylon':
      case 'steel':
      case 'bass':
      default:
        return {
          k1: { name: 'Warmth', icon: Waves, hint: 'Gitar gövde rezonansı ve alt frekanslar' },
          k2: { name: 'Air Sheen', icon: Sparkles, hint: '12kHz fosfor bronz tel parıltısı' },
          k3: { name: 'Pick Attack', icon: Disc3, hint: 'Pena transient darbe sertliği' },
          k4: { name: 'Strum Spread', icon: Compass, hint: 'Tel geçiş hızı ve stereo genişlik' }
        };
    }
  };

  const labels = getKnobLabels();

  const handleKnob1 = (val: number) => {
    setKnob1(val);
    audioEngine.setWarmth(val);
  };

  const handleKnob2 = (val: number) => {
    setKnob2(val);
    audioEngine.setAirPresence(val);
    audioEngine.setBrightness(val);
  };

  const handleKnob3 = (val: number) => {
    setKnob3(val);
    // Dynamic attack / transient punch
  };

  const handleKnob4 = (val: number) => {
    setKnob4(val);
    audioEngine.setStrumSpeed(Math.round(40 - val * 25));
  };

  const handleSpacePreset = (p: 'dry-room' | 'warm-chamber' | 'concert-hall' | 'plate') => {
    setSpacePreset(p);
    audioEngine.setSpaceDesigner(p);
  };

  return (
    <div className="bg-gradient-to-r from-[#111219] via-[#0d0e14] to-[#111219] border-2 border-[#222536] rounded-2xl p-3 shadow-2xl flex flex-col gap-2 transition-all">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-[#1c1e2c] pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-indigo-600 p-0.5 flex items-center justify-center shadow-md">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white tracking-wider uppercase font-mono">
                LOGIC PRO SMART CONTROLS
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                {meta.icon} {meta.name}
              </span>
            </div>
            <span className="text-[10px] text-neutral-400 font-sans hidden sm:block">
              Apple Logic Pro tarzı enstrümana özel parametre kontrolü & Space Designer DSP
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Space Designer Reverb Presets */}
          <div className="hidden md:flex items-center bg-[#171924] border border-[#2b2e42] rounded-xl p-0.5 gap-1">
            <span className="text-[9px] font-mono uppercase text-neutral-400 font-bold px-1.5">
              Space Designer:
            </span>
            {(
              [
                { id: 'dry-room', label: 'Dry Studio' },
                { id: 'warm-chamber', label: 'Warm Wood' },
                { id: 'concert-hall', label: 'Concert Hall' },
                { id: 'plate', label: 'Vintage Plate' }
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => handleSpacePreset(item.id)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all ${
                  spacePreset === item.id
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            onClick={onToggle}
            className="p-1.5 rounded-xl bg-[#171924] hover:bg-[#202332] text-neutral-400 hover:text-white border border-[#2b2e42] transition-all"
            title={isOpen ? 'Paneli Küçült' : 'Paneli Genişlet'}
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 4 DÖNER DÜĞME (SMART KNOBS) */}
      {isOpen && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1.5 animate-in fade-in duration-200">
          {/* Knob 1 */}
          <div className="bg-[#151722]/80 border border-[#25283a] rounded-xl p-2.5 flex flex-col items-center justify-between gap-1 shadow-inner group hover:border-amber-500/40 transition-all">
            <div className="flex items-center gap-1.5 text-neutral-300 text-xs font-bold font-mono">
              <labels.k1.icon className="w-3.5 h-3.5 text-amber-400" />
              <span>{labels.k1.name}</span>
            </div>
            <div className="relative flex items-center justify-center my-1">
              <div
                className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2a2d40] to-[#161722] border-2 border-[#3d425c] flex items-center justify-center shadow-lg relative cursor-pointer"
                style={{
                  transform: `rotate(${(knob1 - 0.5) * 260}deg)`
                }}
              >
                <span className="w-1.5 h-3 bg-amber-400 rounded-full absolute top-1" />
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={knob1}
              onChange={(e) => handleKnob1(parseFloat(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
            />
            <span className="text-[10px] text-amber-300 font-mono font-bold">
              %{Math.round(knob1 * 100)}
            </span>
          </div>

          {/* Knob 2 */}
          <div className="bg-[#151722]/80 border border-[#25283a] rounded-xl p-2.5 flex flex-col items-center justify-between gap-1 shadow-inner group hover:border-cyan-500/40 transition-all">
            <div className="flex items-center gap-1.5 text-neutral-300 text-xs font-bold font-mono">
              <labels.k2.icon className="w-3.5 h-3.5 text-cyan-400" />
              <span>{labels.k2.name}</span>
            </div>
            <div className="relative flex items-center justify-center my-1">
              <div
                className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2a2d40] to-[#161722] border-2 border-[#3d425c] flex items-center justify-center shadow-lg relative cursor-pointer"
                style={{
                  transform: `rotate(${(knob2 - 0.5) * 260}deg)`
                }}
              >
                <span className="w-1.5 h-3 bg-cyan-400 rounded-full absolute top-1" />
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={knob2}
              onChange={(e) => handleKnob2(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
            />
            <span className="text-[10px] text-cyan-300 font-mono font-bold">
              %{Math.round(knob2 * 100)}
            </span>
          </div>

          {/* Knob 3 */}
          <div className="bg-[#151722]/80 border border-[#25283a] rounded-xl p-2.5 flex flex-col items-center justify-between gap-1 shadow-inner group hover:border-emerald-500/40 transition-all">
            <div className="flex items-center gap-1.5 text-neutral-300 text-xs font-bold font-mono">
              <labels.k3.icon className="w-3.5 h-3.5 text-emerald-400" />
              <span>{labels.k3.name}</span>
            </div>
            <div className="relative flex items-center justify-center my-1">
              <div
                className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2a2d40] to-[#161722] border-2 border-[#3d425c] flex items-center justify-center shadow-lg relative cursor-pointer"
                style={{
                  transform: `rotate(${(knob3 - 0.5) * 260}deg)`
                }}
              >
                <span className="w-1.5 h-3 bg-emerald-400 rounded-full absolute top-1" />
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={knob3}
              onChange={(e) => handleKnob3(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
            />
            <span className="text-[10px] text-emerald-300 font-mono font-bold">
              %{Math.round(knob3 * 100)}
            </span>
          </div>

          {/* Knob 4 */}
          <div className="bg-[#151722]/80 border border-[#25283a] rounded-xl p-2.5 flex flex-col items-center justify-between gap-1 shadow-inner group hover:border-purple-500/40 transition-all">
            <div className="flex items-center gap-1.5 text-neutral-300 text-xs font-bold font-mono">
              <labels.k4.icon className="w-3.5 h-3.5 text-purple-400" />
              <span>{labels.k4.name}</span>
            </div>
            <div className="relative flex items-center justify-center my-1">
              <div
                className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2a2d40] to-[#161722] border-2 border-[#3d425c] flex items-center justify-center shadow-lg relative cursor-pointer"
                style={{
                  transform: `rotate(${(knob4 - 0.5) * 260}deg)`
                }}
              >
                <span className="w-1.5 h-3 bg-purple-400 rounded-full absolute top-1" />
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={knob4}
              onChange={(e) => handleKnob4(parseFloat(e.target.value))}
              className="w-full accent-purple-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
            />
            <span className="text-[10px] text-purple-300 font-mono font-bold">
              %{Math.round(knob4 * 100)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
