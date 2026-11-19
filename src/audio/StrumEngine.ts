import { audioEngine } from './AudioEngine';
import { GuitarChord, StrokeType } from '../types';
import { getFretFrequency } from '../config/chords';

export interface StrumOptions {
  stroke: StrokeType;
  velocity?: number;
  time?: number; // Scheduled Web Audio time
  humanize?: boolean;
  onStringPlucked?: (stringIndex: number, fret: number) => void;
}

export class StrumEngine {
  /**
   * Plays a complete guitar chord with realistic strumming physics
   */
  public strumChord(chord: GuitarChord, options: StrumOptions): void {
    const ctx = audioEngine.getContext();
    const startTime = options.time ?? ctx.currentTime;
    const baseVelocity = options.velocity ?? 0.85;
    const humanize = options.humanize ?? true;
    const strumSpeedSec = (audioEngine.preset.strumSpeedMs || 22) / 1000;

    // Handle Percussive Slap / Mute
    if (options.stroke === 'mute') {
      audioEngine.triggerPercussion(startTime, baseVelocity);
      // Play a muted strum across strings
      for (let s = 0; s < 6; s++) {
        const fret = chord.frets[s];
        if (fret >= 0) {
          const freq = getFretFrequency(s, fret);
          const stringDelay = s * 0.006;
          audioEngine.pluckString(s, fret, freq, startTime + stringDelay, baseVelocity * 0.5, true);
          if (options.onStringPlucked) {
            options.onStringPlucked(s, fret);
          }
        }
      }
      return;
    }

    if (options.stroke === 'rest') {
      return;
    }

    // Determine string order based on stroke type
    let stringIndices: number[] = [];
    if (options.stroke === 'down') {
      // Downstroke: Bass string to Treble string (0 -> 5)
      stringIndices = [0, 1, 2, 3, 4, 5];
    } else if (options.stroke === 'up') {
      // Upstroke: Treble string to Bass string (5 -> 0)
      stringIndices = [5, 4, 3, 2, 1, 0];
    } else if (options.stroke === 'bass') {
      // Bass note: Find the lowest played root string
      for (let i = 0; i < 6; i++) {
        if (chord.frets[i] >= 0) {
          stringIndices = [i];
          break;
        }
      }
    } else if (options.stroke === 'treble') {
      // Treble brush: Pluck strings 2, 3, 4, 5 (or upward)
      stringIndices = [2, 3, 4, 5];
    }

    // Filter out muted strings (-1)
    const activeStrings = stringIndices.filter((s) => chord.frets[s] >= 0);
    if (activeStrings.length === 0) return;

    activeStrings.forEach((stringIndex, orderIndex) => {
      const fret = chord.frets[stringIndex];
      const freq = getFretFrequency(stringIndex, fret);

      // Natural Strum Delay
      // On downstroke, string 0 is first; on upstroke, string 5 is first
      let stringTime = startTime + orderIndex * strumSpeedSec;

      // Humanization: slight random micro-delay (±1.5ms)
      if (humanize) {
        const jitter = (Math.random() - 0.5) * 0.003;
        stringTime += jitter;
      }

      // Dynamic velocity curve:
      // In downstrokes, low strings receive more impact.
      // In upstrokes, high strings receive more pick pressure.
      let stringVel = baseVelocity;
      if (options.stroke === 'down') {
        stringVel *= 1.0 - (stringIndex * 0.05);
      } else if (options.stroke === 'up') {
        stringVel *= 0.8 + (stringIndex * 0.05);
      }

      if (humanize) {
        // Random micro dynamics (±4%)
        stringVel *= 0.96 + Math.random() * 0.08;
      }

      stringVel = Math.min(1.0, Math.max(0.1, stringVel));

      audioEngine.pluckString(stringIndex, fret, freq, stringTime, stringVel, false);

      if (options.onStringPlucked) {
        // Schedule callback for UI animation
        const delayMs = Math.max(0, (stringTime - ctx.currentTime) * 1000);
        setTimeout(() => {
          options.onStringPlucked?.(stringIndex, fret);
        }, delayMs);
      }
    });
  }
}

export const strumEngine = new StrumEngine();
