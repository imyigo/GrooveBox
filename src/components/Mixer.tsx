import { SlidersHorizontal } from "lucide-react";
import { MixSettings } from "../project";
interface Props {
  mix: MixSettings;
  onChange: (changes: Partial<MixSettings>) => void;
  percussionOn: boolean;
  onPercussionChange: (on: boolean) => void;
  swing: number;
  onSwingChange: (swing: number) => void;
}
export function Mixer({
  mix,
  onChange,
  percussionOn,
  onPercussionChange,
  swing,
  onSwingChange,
}: Props) {
  return (
    <section className="panel mixer-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">MASTER MIX</span>
          <h3>
            <SlidersHorizontal size={18} />
            Mikser ve tını
          </h3>
        </div>
        <span className="muted">Her iki mod için ortak</span>
      </div>
      <div className="mixer-grid">
        {(
          [
            {
              key: "chordVolume",
              label: "Riff",
              muted: mix.guitarMuted,
              toggle: () => onChange({ guitarMuted: !mix.guitarMuted }),
            },
            {
              key: "drumVolume",
              label: "Ritim",
              muted: !percussionOn,
              toggle: () => onPercussionChange(!percussionOn),
            },
            {
              key: "soloVolume",
              label: "Solo",
              muted: mix.soloMuted,
              toggle: () => onChange({ soloMuted: !mix.soloMuted }),
            },
          ] as const
        ).map((track) => (
          <div key={track.key} className="mixer-channel">
            <label>
              {track.label}
              <output>{Math.round(mix[track.key] * 100)}%</output>
              <input
                aria-label={`${track.label} ses seviyesi`}
                type="range"
                min="0"
                max="1.2"
                step="0.01"
                value={mix[track.key]}
                onChange={(e) => onChange({ [track.key]: +e.target.value })}
              />
            </label>
            <button
              className={`mute-button ${track.muted ? "muted-track" : ""}`}
              aria-pressed={track.muted}
              onClick={track.toggle}
            >
              {track.muted ? "Sessiz" : "Açık"}
            </button>
          </div>
        ))}
        {(
          [
            {
              key: "reverbWet",
              label: "Oda / Reverb",
              min: 0,
              max: 0.3,
              step: 0.01,
            },
            {
              key: "brightness",
              label: "Parlaklık",
              min: 0.1,
              max: 1,
              step: 0.01,
            },
            {
              key: "bodyResonance",
              label: "Gövde",
              min: 0,
              max: 1,
              step: 0.01,
            },
            {
              key: "strumSpeedMs",
              label: "Telleme (ms)",
              min: 8,
              max: 60,
              step: 1,
            },
          ] as const
        ).map((control) => (
          <label className="mixer-channel" key={control.key}>
            {control.label}
            <output>
              {control.key === "strumSpeedMs"
                ? mix[control.key]
                : `${Math.round(mix[control.key] * 100)}%`}
            </output>
            <input
              aria-label={control.label}
              type="range"
              min={control.min}
              max={control.max}
              step={control.step}
              value={mix[control.key]}
              onChange={(e) => onChange({ [control.key]: +e.target.value })}
            />
          </label>
        ))}
        <label className="mixer-channel">
          Swing<output>{Math.round(swing * 100)}%</output>
          <input
            aria-label="Swing"
            type="range"
            min="0"
            max="0.4"
            step="0.01"
            value={swing}
            onChange={(e) => onSwingChange(+e.target.value)}
          />
        </label>
      </div>
    </section>
  );
}
