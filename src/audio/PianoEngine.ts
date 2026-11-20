import { trackVoice } from "./voices";

// Original additive piano voice: no external samples or network dependency.
export function playPiano(
  ctx: AudioContext,
  destination: AudioNode,
  midi: number,
  time: number,
  velocity = 0.8,
  duration = 2.8,
): void {
  const now = Math.max(time, ctx.currentTime);
  const fundamental = 440 * 2 ** ((midi - 69) / 12);
  const output = ctx.createGain();
  output.gain.value = 0.22;
  output.connect(destination);
  let remaining = 0;
  [1, 2, 3, 4, 5, 7].forEach((partial, index) => {
    if (fundamental * partial > ctx.sampleRate * 0.45) return;
    remaining++;
    const osc = trackVoice(ctx.createOscillator());
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value =
      fundamental * partial * Math.sqrt(1 + 0.00006 * partial * partial);
    const peak = velocity * [1, 0.42, 0.23, 0.12, 0.07, 0.035][index];
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + duration / (1 + index * 0.32),
    );
    osc.connect(gain);
    gain.connect(output);
    osc.addEventListener("ended", () => {
      gain.disconnect();
      if (--remaining === 0) output.disconnect();
    });
    osc.start(now);
    osc.stop(now + duration + 0.02);
  });
}
