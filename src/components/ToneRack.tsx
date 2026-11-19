import React from 'react';
import { Sliders, Sparkles, Waves, Volume2, Wind } from 'lucide-react';
import { BodyPreset } from '../types';

interface ToneRackProps {
  preset: BodyPreset;
  onUpdatePreset: (updated: BodyPreset) => void;
  humanize: boolean;
  onToggleHumanize: (val: boolean) => void;
}

export const ToneRack: React.FC<ToneRackProps> = ({
  preset,
  onUpdatePreset,
  humanize,
  onToggleHumanize
}) => {
  const handleChange = <K extends keyof BodyPreset>(field: K, value: BodyPreset[K]) => {
    onUpdatePreset({
      ...preset,
      [field]: value
    });
  };

  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
      {/* Title */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-sm text-neutral-200">
            Akustik Gövde & Ton Rafı (Acoustic Tone Rack)
          </h3>
        </div>
        <button
          onClick={() => onToggleHumanize(!humanize)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
            humanize
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-neutral-950 border-neutral-800 text-neutral-500'
          }`}
          title="İnsansı dokunuş ve mikro zamanlama dalgalanmaları"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Humanize: {humanize ? 'Açık' : 'Kapalı'}</span>
        </button>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Brightness / Sheen */}
        <div className="space-y-1.5 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/80">
          <div className="flex justify-between text-xs">
            <span className="text-neutral-400 flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-amber-400" />
              Parlaklık (Bronze Sheen)
            </span>
            <span className="font-mono text-neutral-200">
              {Math.round(preset.brightness * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.2"
            max="1.0"
            step="0.05"
            value={preset.brightness}
            onChange={(e) => handleChange('brightness', parseFloat(e.target.value))}
            className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Body Resonance */}
        <div className="space-y-1.5 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/80">
          <div className="flex justify-between text-xs">
            <span className="text-neutral-400 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-amber-600" />
              Gövde Rezonansı (Wood Body)
            </span>
            <span className="font-mono text-neutral-200">
              {Math.round(preset.bodyResonance * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.2"
            max="1.0"
            step="0.05"
            value={preset.bodyResonance}
            onChange={(e) => handleChange('bodyResonance', parseFloat(e.target.value))}
            className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Reverb Wet */}
        <div className="space-y-1.5 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/80">
          <div className="flex justify-between text-xs">
            <span className="text-neutral-400 flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-blue-400" />
              Stüdyo Akustiği (Reverb)
            </span>
            <span className="font-mono text-neutral-200">
              {Math.round(preset.reverbWet * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="0.8"
            step="0.05"
            value={preset.reverbWet}
            onChange={(e) => handleChange('reverbWet', parseFloat(e.target.value))}
            className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Chorus / 12-String */}
        <div className="space-y-1.5 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/80">
          <div className="flex justify-between text-xs">
            <span className="text-neutral-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              12-Telli Koro (Chorus)
            </span>
            <span className="font-mono text-neutral-200">
              {Math.round(preset.chorusWet * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="0.6"
            step="0.05"
            value={preset.chorusWet}
            onChange={(e) => handleChange('chorusWet', parseFloat(e.target.value))}
            className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Strum Speed (Vuruş Hızı) */}
        <div className="space-y-1.5 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/80 sm:col-span-2">
          <div className="flex justify-between text-xs">
            <span className="text-neutral-400">
              Vuruş Süresi (Tel Gecikmesi / Strum Speed)
            </span>
            <span className="font-mono text-neutral-200">
              {preset.strumSpeedMs} ms / tel
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="45"
            step="1"
            value={preset.strumSpeedMs}
            onChange={(e) => handleChange('strumSpeedMs', parseInt(e.target.value, 10))}
            className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-neutral-400 pt-1">
            <span>Hızlı & Sert (Ska/Rock)</span>
            <span>Doğal Akış (Folk)</span>
            <span>Yavaş & Geniş (Ballad)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
