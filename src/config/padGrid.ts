import { MUSICAL_SCALES } from "./scales";
import { noteSemitone } from "./chords";

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export function midiLabel(midi: number): string {
  return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}
export function padGrid(
  root: string,
  scaleId: string,
  octaveShift = 0,
  chromatic = false,
) {
  const intervals = chromatic
    ? Array.from({ length: 12 }, (_, i) => i)
    : MUSICAL_SCALES[scaleId].intervals;
  const base = 36 + noteSemitone(root) + octaveShift * 12;
  return Array.from({ length: 64 }, (_, index) => {
    const row = 7 - Math.floor(index / 8);
    const degree = row * 3 + (index % 8);
    const midi = Math.max(
      0,
      Math.min(
        127,
        base +
          Math.floor(degree / intervals.length) * 12 +
          intervals[degree % intervals.length],
      ),
    );
    return {
      midi,
      name: midiLabel(midi),
      root: midi % 12 === noteSemitone(root),
    };
  });
}
export const STEP_DRUM_LANES = [
  { midi: 36, name: "Kick", velocity: 0.95 },
  { midi: 38, name: "Slap", velocity: 0.9 },
  { midi: 42, name: "Shaker", velocity: 0.7 },
  { midi: 46, name: "Açık shaker", velocity: 0.8 },
  { midi: 49, name: "Tef", velocity: 0.85 },
  { midi: 45, name: "Wood", velocity: 0.85 },
  { midi: 36, name: "Ghost kick", velocity: 0.4 },
  { midi: 38, name: "Ghost slap", velocity: 0.4 },
];
