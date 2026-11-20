import { useRef } from "react";

export function RotaryKnob({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  display?: string;
  onChange: (value: number) => void;
}) {
  const drag = useRef<{ y: number; value: number } | null>(null);
  const fraction = (value - min) / (max - min);
  const set = (next: number) =>
    onChange(Math.max(min, Math.min(max, Math.round(next / step) * step)));
  return (
    <label className="hardware-knob">
      <span className="knob-label">{label}</span>
      <span className="knob-well">
        <span className="knob-ring" />
        <span
          className="knob-cap"
          style={{ transform: `rotate(${-135 + fraction * 270}deg)` }}
        >
          <i />
        </span>
        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => set(+e.target.value)}
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { y: e.clientY, value };
          }}
          onPointerMove={(e) => {
            if (drag.current)
              set(
                drag.current.value +
                  ((drag.current.y - e.clientY) / 130) * (max - min),
              );
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onLostPointerCapture={() => {
            drag.current = null;
          }}
        />
      </span>
      <output>{display || `${Math.round(value * 100)}%`}</output>
    </label>
  );
}
