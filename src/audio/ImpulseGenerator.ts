/**
 * Generates acoustic body resonance and tight studio room impulse responses
 * directly in memory using Web Audio API buffers.
 * Tuned for a dry, punchy Nashville studio acoustic room (no muddy wash).
 */
export function createAcousticBodyImpulse(
  ctx: AudioContext,
  durationSec: number = 0.32,
  decay: number = 9.5,
  bodyType: 'dreadnought' | 'parlor' | 'jumbo' | 'twelve-string' = 'dreadnought'
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * durationSec);
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  // Body resonance frequencies (Helmholtz soundhole & spruce top plate)
  const soundholeFreq = bodyType === 'jumbo' ? 95 : bodyType === 'parlor' ? 115 : 102;
  const topPlateFreq = bodyType === 'jumbo' ? 180 : bodyType === 'parlor' ? 220 : 196;

  let sumSquares = 0;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-decay * t);

    // Subtle filtered room early reflections
    const noiseL = (Math.random() * 2 - 1) * env;
    const noiseR = (Math.random() * 2 - 1) * env;

    // Resonant wooden body tone (fast decay)
    const resonance = (
      Math.sin(2 * Math.PI * soundholeFreq * t) * 0.35 +
      Math.sin(2 * Math.PI * topPlateFreq * t) * 0.25
    ) * Math.exp(-12.0 * t);

    const valL = (noiseL * 0.4 + resonance) * 0.35;
    const valR = (noiseR * 0.4 + resonance) * 0.35;

    left[i] = valL;
    right[i] = valR;

    sumSquares += valL * valL + valR * valR;
  }

  // Normalize impulse to prevent volume spikes and muddy reverb wash
  const rms = Math.sqrt(sumSquares / (length * 2));
  if (rms > 0.0001) {
    const targetScale = 0.08 / rms;
    for (let i = 0; i < length; i++) {
      left[i] *= targetScale;
      right[i] *= targetScale;
    }
  }

  return impulse;
}
