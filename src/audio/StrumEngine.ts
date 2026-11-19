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
   * Plays a complete guitar chord with realistic hand strumming physics.
   * Total strum sweep is tightly concentrated (~18ms-30ms) just like a real acoustic hand.
   */
  public strumChord(chord: GuitarChord, options: StrumOptions): void {
    const ctx = audioEngine.getContext();
    const startTime = options.time ?? ctx.currentTime;
    const baseVelocity = options.velocity ?? 0.85;
    const humanize = options.humanize ?? true;

    // Total strum sweep duration in seconds (20ms - 32ms total across all strings)
    const totalSweepSec = Math.max(0.015, Math.min(0.045, (audioEngine.preset.strumSpeedMs || 22) / 1000));

    // Handle Percussive Slap / Palm Mute
    if (options.stroke === 'mute') {
      audioEngine.triggerPercussion(startTime, baseVelocity);
      // Play a quick dry muted chop across strings
      for (let s = 0; s < 6; s++) {
        const fret = chord.frets[s];
        if (fret >= 0) {
          const freq = getFretFrequency(s, fret);
          const stringDelay = s * 0.0035;
          audioEngine.pluckString(s, fret, freq, startTime + stringDelay, baseVelocity * 0.45, true);
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
      // Upstroke: Treble string to Bass string (5 -> 0), lighter brushing
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
      // Treble brush: Pluck high strings (2, 3, 4, 5)
      stringIndices = [2, 3, 4, 5];
    }

    // Filter out muted strings (-1)
    const activeStrings = stringIndices.filter((s) => chord.frets[s] >= 0);
    if (activeStrings.length === 0) return;

    activeStrings.forEach((stringIndex, orderIndex) => {
      const fret = chord.frets[stringIndex];
      const freq = getFretFrequency(stringIndex, fret);

      // Natural Human Strum Delay: Non-linear wrist acceleration
      // The wrist speeds up as it swings through the strings!
      const nonLinearFactor = Math.pow(orderIndex / Math.max(1, activeStrings.length - 1), 1.15);
      let stringTime = startTime + nonLinearFactor * totalSweepSec;

      // Humanization: slight organic micro-rubato (±1.2ms)
      if (humanize) {
        const microJitter = (Math.random() - 0.5) * 0.0024;
        stringTime += microJitter;
      }

      // Dynamic velocity curve:
      // In downstrokes, low strings receive more impact from wrist weight.
      // In upstrokes, high strings receive more pick pressure.
      let stringVel = baseVelocity;
      if (options.stroke === 'down') {
        stringVel *= 1.05 - (orderIndex * 0.04);
      } else if (options.stroke === 'up') {
        stringVel *= 0.85 + (orderIndex * 0.04);
      }

      if (humanize) {
        // Random human finger strength fluctuation (±6%)
        stringVel *= 0.94 + Math.random() * 0.12;
      }

      stringVel = Math.min(1.0, Math.max(0.15, stringVel));

      audioEngine.pluckString(stringIndex, fret, freq, stringTime, stringVel, false);

      if (options.onStringPlucked) {
        const delayMs = Math.max(0, (stringTime - ctx.currentTime) * 1000);
        setTimeout(() => {
          options.onStringPlucked?.(stringIndex, fret);
        }, delayMs);
      }
    });
  }
}

export const strumEngine = new StrumEngine();
