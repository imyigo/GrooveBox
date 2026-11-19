/**
 * Generates acoustic body resonance and studio room impulse responses
 * directly in memory using Web Audio API buffers.
 */
export function createAcousticBodyImpulse(
  ctx: AudioContext,
  durationSec: number = 1.2,
  decay: number = 2.5,
  bodyType: 'dreadnought' | 'parlor' | 'jumbo' | 'twelve-string' = 'dreadnought'
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * durationSec;
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  // Body resonance frequencies (Helmholtz soundhole & spruce top plate)
  const soundholeFreq = bodyType === 'jumbo' ? 95 : bodyType === 'parlor' ? 115 : 102;
  const topPlateFreq = bodyType === 'jumbo' ? 180 : bodyType === 'parlor' ? 220 : 196;

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-decay * t);

    // Filtered noise simulating wooden room decay
    const noiseL = (Math.random() * 2 - 1) * env;
    const noiseR = (Math.random() * 2 - 1) * env;

    // Resonant wooden body tone
    const resonance = (
      Math.sin(2 * Math.PI * soundholeFreq * t) * 0.4 +
      Math.sin(2 * Math.PI * topPlateFreq * t) * 0.3
    ) * Math.exp(-6.0 * t);

    left[i] = (noiseL * 0.7 + resonance) * 0.5;
    right[i] = (noiseR * 0.7 + resonance) * 0.5;
  }

  return impulse;
}
