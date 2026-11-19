/**
 * Acoustic String Physical Modeling Synth
 * Simulates real acoustic steel/bronze string vibration, pick transient attack,
 * and natural wood damping.
 */
export class AcousticStringVoice {
  private ctx: AudioContext;
  private outputNode: GainNode;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.outputNode = ctx.createGain();
    this.outputNode.connect(destination);
  }

  /**
   * Plucks or strums a string at the given frequency
   * @param freq Frequency in Hz
   * @param time AudioContext schedule timestamp
   * @param velocity 0.0 to 1.0 (pick attack force)
   * @param stringIndex 0 (low E) to 5 (high E)
   * @param isMuted Whether to play as a palm mute / chop
   * @param brightness Tone brightness multiplier
   */
  public trigger(
    freq: number,
    time: number,
    velocity: number = 0.8,
    stringIndex: number = 0,
    isMuted: boolean = false,
    brightness: number = 0.8
  ): void {
    if (freq <= 20 || freq > 4000) return;

    const ctx = this.ctx;
    const now = Math.max(time, ctx.currentTime);

    // 1. String Envelope & Volume
    const stringGain = ctx.createGain();

    // Bass strings have longer sustain, treble strings decay faster
    const baseDecay = isMuted 
      ? 0.12 
      : (3.6 - (stringIndex * 0.35)); // 3.6s on Low E down to ~1.8s on High E
    const attackTime = 0.003; // Instant mechanical pick hit

    const peakVolume = Math.min(1.0, velocity * (isMuted ? 0.45 : 0.85));

    stringGain.gain.setValueAtTime(0.0001, now);
    stringGain.gain.linearRampToValueAtTime(peakVolume, now + attackTime);
    stringGain.gain.exponentialRampToValueAtTime(0.0001, now + baseDecay);

    // Auto cleanup nodes after note finishes
    setTimeout(() => {
      try {
        stringGain.disconnect();
      } catch {
        // Ignored
      }
    }, (baseDecay + 0.2) * 1000);

    // 2. Pick Attack Transient (The crisp "click" of the plectrum hitting the bronze wrap)
    const pickBufferLength = Math.floor(ctx.sampleRate * 0.025); // 25ms pick noise
    const pickBuffer = ctx.createBuffer(1, pickBufferLength, ctx.sampleRate);
    const pickData = pickBuffer.getChannelData(0);
    for (let i = 0; i < pickBufferLength; i++) {
      const decay = Math.exp(-i / (ctx.sampleRate * 0.005));
      pickData[i] = (Math.random() * 2 - 1) * decay;
    }

    const pickSource = ctx.createBufferSource();
    pickSource.buffer = pickBuffer;

    const pickFilter = ctx.createBiquadFilter();
    pickFilter.type = 'bandpass';
    // Pick click is brighter on higher strings
    pickFilter.frequency.setValueAtTime(1800 + (stringIndex * 500) * brightness, now);
    pickFilter.Q.setValueAtTime(2.5, now);

    const pickGain = ctx.createGain();
    pickGain.gain.setValueAtTime(velocity * (isMuted ? 0.6 : 0.35), now);
    pickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    pickSource.connect(pickFilter);
    pickFilter.connect(pickGain);
    pickGain.connect(stringGain);

    pickSource.start(now);
    pickSource.stop(now + 0.03);

    // 3. String Body Tone Generators (Harmonic additive modeling with Karplus decay)
    // Acoustic bronze strings have a rich fundamental and specific harmonic spectrum
    const harmonics = [
      { ratio: 1.0, gain: 1.0, decayMult: 1.0 },     // Fundamental
      { ratio: 2.0, gain: 0.65, decayMult: 0.8 },    // 1st Octave (rich body)
      { ratio: 3.0, gain: 0.35, decayMult: 0.6 },    // 5th (metallic shimmer)
      { ratio: 4.0, gain: 0.2, decayMult: 0.45 },    // 2nd Octave
      { ratio: 5.0, gain: 0.12, decayMult: 0.35 },   // Major 3rd
      { ratio: 6.0, gain: 0.08, decayMult: 0.25 },   // 5th shimmer
    ];

    harmonics.forEach((h) => {
      const osc = ctx.createOscillator();
      // Use triangle or sawtooth blended for acoustic wood character
      osc.type = h.ratio === 1.0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq * h.ratio, now);

      const hGain = ctx.createGain();
      const hDecay = isMuted ? 0.08 : (baseDecay * h.decayMult);
      const hVol = h.gain * (0.8 + brightness * 0.4);

      hGain.gain.setValueAtTime(0.0001, now);
      hGain.gain.linearRampToValueAtTime(hVol, now + attackTime);
      hGain.gain.exponentialRampToValueAtTime(0.0001, now + hDecay);

      osc.connect(hGain);
      hGain.connect(stringGain);

      osc.start(now);
      osc.stop(now + hDecay + 0.05);
    });

    // 4. Acoustic Steel String Filter (Dynamic Lowpass that opens on strike and closes as string dies)
    const toneFilter = ctx.createBiquadFilter();
    toneFilter.type = 'lowpass';
    const cutoff = isMuted 
      ? 800 
      : Math.min(12000, freq * 14 * brightness);

    toneFilter.frequency.setValueAtTime(cutoff, now);
    toneFilter.frequency.exponentialRampToValueAtTime(
      Math.max(200, freq * 2.2),
      now + (isMuted ? 0.1 : 1.2)
    );
    toneFilter.Q.setValueAtTime(1.8, now);

    stringGain.connect(toneFilter);
    toneFilter.connect(this.outputNode);
  }

  /**
   * Generates a percussive hand slap or mute "chuck" on the acoustic guitar body/strings
   */
  public triggerPerccusion(time: number, velocity: number = 0.9): void {
    const ctx = this.ctx;
    const now = Math.max(time, ctx.currentTime);

    // Body Thump (Low frequency wood hit)
    const thumpOsc = ctx.createOscillator();
    thumpOsc.type = 'sine';
    thumpOsc.frequency.setValueAtTime(130, now);
    thumpOsc.frequency.exponentialRampToValueAtTime(45, now + 0.08);

    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(velocity * 0.9, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    thumpOsc.connect(thumpGain);
    thumpGain.connect(this.outputNode);

    thumpOsc.start(now);
    thumpOsc.stop(now + 0.15);

    // String Slap / Chuck (Filtered Noise)
    const noiseLength = Math.floor(ctx.sampleRate * 0.06);
    const noiseBuffer = ctx.createBuffer(1, noiseLength, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseLength; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.012));
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1200, now);
    noiseFilter.Q.setValueAtTime(1.5, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(velocity * 0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.outputNode);

    noiseSource.start(now);
    noiseSource.stop(now + 0.07);
  }
}
