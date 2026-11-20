import Foundation
import AVFoundation
import Accelerate

// MARK: - Deterministic PRNG (Thread-Safe, Zero Lock Contention)

struct DeterministicRNG: Sendable {
    private var state: UInt64

    init(seed: UInt64) {
        self.state = seed == 0 ? 0x9E37_79B9_7F4A_7C15 : seed
    }

    mutating func nextUInt64() -> UInt64 {
        state &+= 0x9E37_79B9_7F4A_7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58_476D_1CE4_E5B9
        z = (z ^ (z >> 27)) &* 0x94D0_49BB_1331_11EB
        return z ^ (z >> 31)
    }

    /// Returns uniform Double in [-1.0, 1.0]
    mutating func nextSigned() -> Double {
        let bits = nextUInt64() >> 11
        let unit = Double(bits) / Double(1 << 53)
        return unit * 2.0 - 1.0
    }
}

// MARK: - RBJ Biquad Filter (Shared Real-Time Model & Offline DSP)

struct BiquadFilter: Sendable {
    private let b0: Double
    private let b1: Double
    private let b2: Double
    private let a1: Double
    private let a2: Double

    private var x1: Double = 0.0
    private var x2: Double = 0.0
    private var y1: Double = 0.0
    private var y2: Double = 0.0

    init(b0: Double, b1: Double, b2: Double, a0: Double, a1: Double, a2: Double) {
        let invA0 = abs(a0) > 1e-12 ? (1.0 / a0) : 1.0
        self.b0 = b0 * invA0
        self.b1 = b1 * invA0
        self.b2 = b2 * invA0
        self.a1 = a1 * invA0
        self.a2 = a2 * invA0
    }

    mutating func reset() {
        x1 = 0.0
        x2 = 0.0
        y1 = 0.0
        y2 = 0.0
    }

    @inline(__always)
    mutating func process(_ input: Double) -> Double {
        let y = b0 * input + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2 = x1
        x1 = input
        y2 = y1
        y1 = y
        return y.isFinite ? y : 0.0
    }

    static func lowShelf(sampleRate: Double, frequency: Double, gainDb: Double, slope: Double = 0.85) -> BiquadFilter {
        let safeFreq = max(20.0, min(sampleRate * 0.45, frequency))
        let a = pow(10.0, gainDb / 40.0)
        let w0 = 2.0 * Double.pi * safeFreq / sampleRate
        let cosW = cos(w0)
        let sinW = sin(w0)
        let alpha = sinW / 2.0 * sqrt((a + 1.0 / a) * (1.0 / max(0.1, slope) - 1.0) + 2.0)
        let twoSqrtAAlpha = 2.0 * sqrt(a) * alpha

        let b0 = a * ((a + 1.0) - (a - 1.0) * cosW + twoSqrtAAlpha)
        let b1 = 2.0 * a * ((a - 1.0) - (a + 1.0) * cosW)
        let b2 = a * ((a + 1.0) - (a - 1.0) * cosW - twoSqrtAAlpha)
        let a0 = (a + 1.0) + (a - 1.0) * cosW + twoSqrtAAlpha
        let a1 = -2.0 * ((a - 1.0) + (a + 1.0) * cosW)
        let a2 = (a + 1.0) + (a - 1.0) * cosW - twoSqrtAAlpha
        return BiquadFilter(b0: b0, b1: b1, b2: b2, a0: a0, a1: a1, a2: a2)
    }

    static func highShelf(sampleRate: Double, frequency: Double, gainDb: Double, slope: Double = 0.85) -> BiquadFilter {
        let safeFreq = max(20.0, min(sampleRate * 0.45, frequency))
        let a = pow(10.0, gainDb / 40.0)
        let w0 = 2.0 * Double.pi * safeFreq / sampleRate
        let cosW = cos(w0)
        let sinW = sin(w0)
        let alpha = sinW / 2.0 * sqrt((a + 1.0 / a) * (1.0 / max(0.1, slope) - 1.0) + 2.0)
        let twoSqrtAAlpha = 2.0 * sqrt(a) * alpha

        let b0 = a * ((a + 1.0) + (a - 1.0) * cosW + twoSqrtAAlpha)
        let b1 = -2.0 * a * ((a - 1.0) + (a + 1.0) * cosW)
        let b2 = a * ((a + 1.0) + (a - 1.0) * cosW - twoSqrtAAlpha)
        let a0 = (a + 1.0) - (a - 1.0) * cosW + twoSqrtAAlpha
        let a1 = 2.0 * ((a - 1.0) - (a + 1.0) * cosW)
        let a2 = (a + 1.0) - (a - 1.0) * cosW - twoSqrtAAlpha
        return BiquadFilter(b0: b0, b1: b1, b2: b2, a0: a0, a1: a1, a2: a2)
    }

    static func peaking(sampleRate: Double, frequency: Double, q: Double, gainDb: Double) -> BiquadFilter {
        let safeFreq = max(20.0, min(sampleRate * 0.45, frequency))
        let a = pow(10.0, gainDb / 40.0)
        let w0 = 2.0 * Double.pi * safeFreq / sampleRate
        let cosW = cos(w0)
        let sinW = sin(w0)
        let alpha = sinW / (2.0 * max(0.1, q))

        let b0 = 1.0 + alpha * a
        let b1 = -2.0 * cosW
        let b2 = 1.0 - alpha * a
        let a0 = 1.0 + alpha / a
        let a1 = -2.0 * cosW
        let a2 = 1.0 - alpha / a
        return BiquadFilter(b0: b0, b1: b1, b2: b2, a0: a0, a1: a1, a2: a2)
    }

    static func bandpass(sampleRate: Double, frequency: Double, q: Double) -> BiquadFilter {
        let safeFreq = max(20.0, min(sampleRate * 0.45, frequency))
        let w0 = 2.0 * Double.pi * safeFreq / sampleRate
        let cosW = cos(w0)
        let sinW = sin(w0)
        let alpha = sinW / (2.0 * max(0.1, q))

        let b0 = alpha
        let b1 = 0.0
        let b2 = -alpha
        let a0 = 1.0 + alpha
        let a1 = -2.0 * cosW
        let a2 = 1.0 - alpha
        return BiquadFilter(b0: b0, b1: b1, b2: b2, a0: a0, a1: a1, a2: a2)
    }

    static func lowpass(sampleRate: Double, frequency: Double, q: Double = 0.707) -> BiquadFilter {
        let safeFreq = max(20.0, min(sampleRate * 0.45, frequency))
        let w0 = 2.0 * Double.pi * safeFreq / sampleRate
        let cosW = cos(w0)
        let sinW = sin(w0)
        let alpha = sinW / (2.0 * max(0.1, q))

        let b0 = (1.0 - cosW) * 0.5
        let b1 = 1.0 - cosW
        let b2 = (1.0 - cosW) * 0.5
        let a0 = 1.0 + alpha
        let a1 = -2.0 * cosW
        let a2 = 1.0 - alpha
        return BiquadFilter(b0: b0, b1: b1, b2: b2, a0: a0, a1: a1, a2: a2)
    }

    static func highpass(sampleRate: Double, frequency: Double, q: Double = 0.707) -> BiquadFilter {
        let safeFreq = max(20.0, min(sampleRate * 0.45, frequency))
        let w0 = 2.0 * Double.pi * safeFreq / sampleRate
        let cosW = cos(w0)
        let sinW = sin(w0)
        let alpha = sinW / (2.0 * max(0.1, q))

        let b0 = (1.0 + cosW) * 0.5
        let b1 = -(1.0 + cosW)
        let b2 = (1.0 + cosW) * 0.5
        let a0 = 1.0 + alpha
        let a1 = -2.0 * cosW
        let a2 = 1.0 - alpha
        return BiquadFilter(b0: b0, b1: b1, b2: b2, a0: a0, a1: a1, a2: a2)
    }
}

// MARK: - Quadrature Oscillator Bank (Zero Per-Sample sin() Calls)

struct QuadratureOscillator: Sendable {
    private var cosVal: Double = 1.0
    private var sinVal: Double = 0.0
    private var cosStep: Double
    private var sinStep: Double

    init(freq: Double, sampleRate: Double, initialPhase: Double = 0.0) {
        let omega = 2.0 * Double.pi * freq / sampleRate
        self.cosStep = cos(omega)
        self.sinStep = sin(omega)
        self.cosVal = cos(initialPhase)
        self.sinVal = sin(initialPhase)
    }

    mutating func setFrequency(_ freq: Double, sampleRate: Double) {
        let omega = 2.0 * Double.pi * freq / sampleRate
        self.cosStep = cos(omega)
        self.sinStep = sin(omega)
    }

    @inline(__always)
    mutating func next() -> Double {
        let out = sinVal
        let nextC = cosVal * cosStep - sinVal * sinStep
        let nextS = sinVal * cosStep + cosVal * sinStep
        cosVal = nextC
        sinVal = nextS
        return out
    }
}

// MARK: - Stereo Audio Buffer (Pure Sendable Float Arrays)

struct StereoSamples: Sendable {
    var left: [Float]
    var right: [Float]
    let sampleRate: Double

    var frameCount: Int { left.count }

    func toPCMBuffer(format: AVAudioFormat) -> AVAudioPCMBuffer? {
        let count = AVAudioFrameCount(left.count)
        guard count > 0, let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: count) else {
            return nil
        }
        buffer.frameLength = count
        guard let channelData = buffer.floatChannelData else { return nil }

        left.withUnsafeBufferPointer { srcL in
            if let base = srcL.baseAddress {
                channelData[0].update(from: base, count: left.count)
            }
        }
        if format.channelCount > 1 {
            right.withUnsafeBufferPointer { srcR in
                if let base = srcR.baseAddress {
                    channelData[1].update(from: base, count: right.count)
                }
            }
        }
        return buffer
    }
}

// MARK: - Drum Mode Sequencer Grid

struct ScheduledDrumTrigger: @unchecked Sendable {
    let hit: DrumHitType
    let velocity: Double
}

enum DrumModeGrid {
    static func triggers(for mode: DrumMode, step: Int) -> [ScheduledDrumTrigger] {
        switch mode {
        case .mute:
            return []

        case .shakerOnly:
            if step == 14 {
                return [ScheduledDrumTrigger(hit: .shakerOpen, velocity: 0.65)]
            } else if step % 2 == 0 {
                let accent = (step % 4 == 0) ? 0.58 : 0.36
                return [ScheduledDrumTrigger(hit: .shakerClosed, velocity: accent)]
            }
            return []

        case .cajonShaker:
            var out: [ScheduledDrumTrigger] = []
            if step == 0 || step == 8 {
                out.append(ScheduledDrumTrigger(hit: .cajonBass, velocity: 0.90))
            } else if step == 10 {
                out.append(ScheduledDrumTrigger(hit: .cajonBass, velocity: 0.55))
            }
            if step == 4 || step == 12 {
                out.append(ScheduledDrumTrigger(hit: .cajonSlap, velocity: 0.85))
            }
            if step == 14 {
                out.append(ScheduledDrumTrigger(hit: .shakerOpen, velocity: 0.55))
            } else if step % 2 == 0 {
                out.append(ScheduledDrumTrigger(hit: .shakerClosed, velocity: step % 4 == 0 ? 0.52 : 0.34))
            }
            return out

        case .full:
            var out: [ScheduledDrumTrigger] = []
            if step == 0 || step == 8 {
                out.append(ScheduledDrumTrigger(hit: .cajonBass, velocity: 0.96))
            } else if step == 6 || step == 10 {
                out.append(ScheduledDrumTrigger(hit: .cajonBass, velocity: 0.58))
            }
            if step == 4 || step == 12 {
                out.append(ScheduledDrumTrigger(hit: .cajonSlap, velocity: 0.92))
                out.append(ScheduledDrumTrigger(hit: .tambourine, velocity: 0.72))
            }
            if step == 14 {
                out.append(ScheduledDrumTrigger(hit: .shakerOpen, velocity: 0.68))
            } else if step % 2 == 0 {
                out.append(ScheduledDrumTrigger(hit: .shakerClosed, velocity: step % 4 == 0 ? 0.60 : 0.42))
            }
            return out

        case .flamenco:
            var out: [ScheduledDrumTrigger] = []
            if step == 0 || step == 6 || step == 8 {
                out.append(ScheduledDrumTrigger(hit: .cajonBass, velocity: step == 0 ? 0.92 : 0.72))
            }
            if step == 4 || step == 12 {
                out.append(ScheduledDrumTrigger(hit: .cajonSlap, velocity: 0.88))
            }
            if step == 0 || step == 3 || step == 6 || step == 10 || step == 12 || step == 14 {
                out.append(ScheduledDrumTrigger(hit: .woodblock, velocity: (step == 0 || step == 12) ? 0.78 : 0.58))
            }
            if step == 8 || step == 15 {
                out.append(ScheduledDrumTrigger(hit: .tambourine, velocity: 0.55))
            }
            return out
        }
    }
}

// MARK: - Space Designer Offline Reverb (Shared Preset Parameters)

struct SpaceDesignerOfflineProcessor: Sendable {
    private struct CombFilter: Sendable {
        var buffer: [Double]
        var index: Int = 0
        var filterStore: Double = 0.0
        var feedback: Double
        var damp1: Double
        var damp2: Double

        init(length: Int, feedback: Double, damp: Double) {
            self.buffer = [Double](repeating: 0.0, count: max(8, length))
            self.feedback = feedback
            self.damp1 = damp
            self.damp2 = 1.0 - damp
        }

        @inline(__always)
        mutating func process(_ input: Double) -> Double {
            let output = buffer[index]
            filterStore = output * damp2 + filterStore * damp1
            buffer[index] = input + filterStore * feedback
            index += 1
            if index >= buffer.count { index = 0 }
            return output
        }
    }

    private struct AllpassFilter: Sendable {
        var buffer: [Double]
        var index: Int = 0
        let feedback: Double = 0.5

        init(length: Int) {
            self.buffer = [Double](repeating: 0.0, count: max(8, length))
        }

        @inline(__always)
        mutating func process(_ input: Double) -> Double {
            let bufOut = buffer[index]
            let output = -input + bufOut
            buffer[index] = input + bufOut * feedback
            index += 1
            if index >= buffer.count { index = 0 }
            return output
        }
    }

    static func processStereo(
        left: inout [Float],
        right: inout [Float],
        sampleRate: Double,
        preset: SpaceDesignerPreset,
        wet: Double
    ) {
        let clampedWet = max(0.0, min(1.0, wet))
        guard clampedWet > 0.0001, !left.isEmpty, left.count == right.count else { return }

        let srScale = sampleRate / 44100.0
        let preDelayFrames = max(0, Int((preset.preDelayMs / 1000.0) * sampleRate))
        var preDelayL = [Double](repeating: 0.0, count: max(1, preDelayFrames))
        var preDelayR = [Double](repeating: 0.0, count: max(1, preDelayFrames))
        var preIdx = 0

        // Derive comb feedback from preset decaySeconds
        let baseCombLen = 1557.0 * srScale
        let targetRT60Samples = max(0.15, preset.decaySeconds) * sampleRate
        let feedbackBase = min(0.94, max(0.55, pow(10.0, -3.0 * baseCombLen / targetRT60Samples)))
        let damp = min(0.75, max(0.08, 1.0 - (preset.highShelfCutHz / 12000.0)))

        let combLengthsL = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map { Int(Double($0) * srScale) }
        let combLengthsR = combLengthsL.map { $0 + Int(23.0 * srScale) }

        var combsL = combLengthsL.map { CombFilter(length: $0, feedback: feedbackBase, damp: damp) }
        var combsR = combLengthsR.map { CombFilter(length: $0, feedback: feedbackBase, damp: damp) }

        let apLengthsL = [556, 441, 341, 225].map { Int(Double($0) * srScale) }
        let apLengthsR = apLengthsL.map { $0 + Int(23.0 * srScale) }
        var allpassesL = apLengthsL.map { AllpassFilter(length: $0) }
        var allpassesR = apLengthsR.map { AllpassFilter(length: $0) }

        var lowShelfL = BiquadFilter.lowShelf(sampleRate: sampleRate, frequency: 220.0, gainDb: preset.lowShelfGainDb)
        var lowShelfR = BiquadFilter.lowShelf(sampleRate: sampleRate, frequency: 220.0, gainDb: preset.lowShelfGainDb)
        var highCutL = BiquadFilter.lowpass(sampleRate: sampleRate, frequency: preset.highShelfCutHz)
        var highCutR = BiquadFilter.lowpass(sampleRate: sampleRate, frequency: preset.highShelfCutHz)
        var resL = BiquadFilter.peaking(sampleRate: sampleRate, frequency: 340.0, q: 1.4, gainDb: preset.resonanceDb)
        var resR = BiquadFilter.peaking(sampleRate: sampleRate, frequency: 340.0, q: 1.4, gainDb: preset.resonanceDb)

        let wetScale = clampedWet * 0.42

        for i in 0..<left.count {
            let dryL = Double(left[i])
            let dryR = Double(right[i])
            let monoIn = (dryL + dryR) * 0.5

            let delayedL: Double
            let delayedR: Double
            if preDelayFrames > 0 {
                delayedL = preDelayL[preIdx]
                delayedR = preDelayR[preIdx]
                preDelayL[preIdx] = monoIn * 0.8 + dryL * 0.2
                preDelayR[preIdx] = monoIn * 0.8 + dryR * 0.2
                preIdx += 1
                if preIdx >= preDelayFrames { preIdx = 0 }
            } else {
                delayedL = monoIn * 0.8 + dryL * 0.2
                delayedR = monoIn * 0.8 + dryR * 0.2
            }

            var sumL = 0.0
            var sumR = 0.0
            for c in 0..<combsL.count {
                sumL += combsL[c].process(delayedL)
                sumR += combsR[c].process(delayedR)
            }
            sumL *= 0.125
            sumR *= 0.125

            for a in 0..<allpassesL.count {
                sumL = allpassesL[a].process(sumL)
                sumR = allpassesR[a].process(sumR)
            }

            sumL = resL.process(highCutL.process(lowShelfL.process(sumL)))
            sumR = resR.process(highCutR.process(lowShelfR.process(sumR)))

            let outL = dryL + sumL * wetScale
            let outR = dryR + sumR * wetScale
            left[i] = Float(outL.isFinite ? outL : 0.0)
            right[i] = Float(outR.isFinite ? outR : 0.0)
        }
    }
}

// MARK: - Pure Acoustic Synthesizer (9 Instruments, 6 Drum Hits, Palm-Mute Chop)

enum AcousticSynthesizer {

    static func synthesizeNote(
        freq: Double,
        duration: Double,
        velocity: Double,
        sampleRate: Double,
        instrument: AcousticInstrumentType,
        bodyPreset: GuitarBodyPreset,
        pickAttack: Double,
        pan: Double = 0.0,
        seed: UInt64 = 1
    ) -> StereoSamples {
        let clampedSR = max(8000.0, min(192000.0, sampleRate))
        let safeDuration = max(0.05, min(6.0, duration))
        let numFrames = max(64, Int((clampedSR * safeDuration).rounded()))
        let vel = max(0.0, min(1.0, velocity))
        let atk = max(0.0, min(1.0, pickAttack))
        let clampedPan = max(-1.0, min(1.0, pan))

        if instrument == .drums {
            let drumIndex = max(0, Int(freq.rounded())) % DrumHitType.allCases.count
            return synthesizeDrum(
                hit: DrumHitType.allCases[drumIndex],
                velocity: vel,
                sampleRate: clampedSR,
                pickAttack: atk,
                pan: clampedPan,
                seed: seed
            )
        }

        let safeFreq = max(27.5, min(min(4800.0, clampedSR * 0.42), freq))
        var mono = [Double](repeating: 0.0, count: numFrames)
        var rng = DeterministicRNG(seed: seed ^ UInt64(safeFreq * 100.0))

        switch instrument {
        case .nylon:
            renderKarplusStrong(
                into: &mono,
                freq: safeFreq,
                sampleRate: clampedSR,
                velocity: vel,
                pickAttack: atk,
                brightness: 0.55 * bodyPreset.brightness,
                damping: 0.9960,
                loopAlpha: 0.58 + 0.14 * bodyPreset.brightness,
                pickPosition: 0.24,
                dispersion: 0.02,
                bodyResonance: bodyPreset.bodyResonance,
                shimmerWet: bodyPreset.chorusWet * 0.5,
                isNylon: true,
                rng: &rng
            )

        case .steel:
            renderKarplusStrong(
                into: &mono,
                freq: safeFreq,
                sampleRate: clampedSR,
                velocity: vel,
                pickAttack: atk,
                brightness: 0.92 * bodyPreset.brightness,
                damping: 0.9978,
                loopAlpha: 0.84 + 0.10 * bodyPreset.brightness,
                pickPosition: 0.13,
                dispersion: 0.09,
                bodyResonance: bodyPreset.bodyResonance,
                shimmerWet: bodyPreset.chorusWet,
                isNylon: false,
                rng: &rng
            )

        case .piano:
            renderPiano(into: &mono, freq: safeFreq, sampleRate: clampedSR, velocity: vel, pickAttack: atk, rng: &rng)

        case .violin:
            renderViolin(into: &mono, freq: safeFreq, sampleRate: clampedSR, velocity: vel, pickAttack: atk, rng: &rng)

        case .clarinet:
            renderClarinet(into: &mono, freq: safeFreq, sampleRate: clampedSR, velocity: vel, pickAttack: atk, rng: &rng)

        case .altoSax:
            renderAltoSax(into: &mono, freq: safeFreq, sampleRate: clampedSR, velocity: vel, pickAttack: atk, rng: &rng)

        case .harmonica:
            renderHarmonica(into: &mono, freq: safeFreq, sampleRate: clampedSR, velocity: vel, pickAttack: atk, rng: &rng)

        case .bass:
            renderAcousticBass(into: &mono, freq: safeFreq, sampleRate: clampedSR, velocity: vel, pickAttack: atk, rng: &rng)

        case .drums:
            break
        }

        // Apply Pick Attack transient shaper strictly on 0...25ms attack window
        applyPickAttackTransientShaper(
            samples: &mono,
            sampleRate: clampedSR,
            pickAttack: atk,
            velocity: vel,
            instrument: instrument,
            rng: &rng
        )

        return panMonoToStereo(mono: mono, pan: clampedPan, sampleRate: clampedSR)
    }

    static func synthesizeMuteChop(
        sampleRate: Double,
        velocity: Double,
        bodyPreset: GuitarBodyPreset,
        pickAttack: Double,
        pan: Double = 0.0,
        seed: UInt64 = 77
    ) -> StereoSamples {
        let clampedSR = max(8000.0, min(192000.0, sampleRate))
        let numFrames = max(64, Int(clampedSR * 0.085))
        let vel = max(0.0, min(1.0, velocity))
        let atk = max(0.0, min(1.0, pickAttack))
        var rng = DeterministicRNG(seed: seed)
        var mono = [Double](repeating: 0.0, count: numFrames)

        var bodyFilter = BiquadFilter.bandpass(sampleRate: clampedSR, frequency: 145.0, q: 1.6)
        var stringFilter = BiquadFilter.lowpass(sampleRate: clampedSR, frequency: 520.0 + 950.0 * atk, q: 0.9)
        var scratchFilter = BiquadFilter.highpass(sampleRate: clampedSR, frequency: 1600.0)
        var thumpOsc = QuadratureOscillator(freq: 140.0, sampleRate: clampedSR)

        for i in 0..<numFrames {
            let t = Double(i) / clampedSR
            let env = exp(-t * 46.0)
            let noise = rng.nextSigned()
            let dampedStrings = stringFilter.process(noise) * 0.55
            let bodyKnock = bodyFilter.process(thumpOsc.next() * 0.6 + noise * 0.25) * 0.85 * bodyPreset.bodyResonance
            let scratch = (t < 0.012) ? scratchFilter.process(noise) * (0.12 + 0.45 * atk) * (1.0 - t / 0.012) : 0.0
            mono[i] = (dampedStrings + bodyKnock + scratch) * env * vel * 0.55
        }

        return panMonoToStereo(mono: mono, pan: pan, sampleRate: clampedSR)
    }

    static func synthesizeDrum(
        hit: DrumHitType,
        velocity: Double,
        sampleRate: Double,
        pickAttack: Double = 0.5,
        pan: Double = 0.0,
        seed: UInt64 = 33
    ) -> StereoSamples {
        let clampedSR = max(8000.0, min(192000.0, sampleRate))
        let vel = max(0.0, min(1.0, velocity))
        let atk = max(0.0, min(1.0, pickAttack))
        var rng = DeterministicRNG(seed: seed ^ UInt64(hit.midiNote))

        let duration: Double
        switch hit {
        case .cajonBass: duration = 0.34
        case .cajonSlap: duration = 0.26
        case .shakerClosed: duration = 0.11
        case .shakerOpen: duration = 0.26
        case .tambourine: duration = 0.36
        case .woodblock: duration = 0.14
        }

        let numFrames = max(64, Int(clampedSR * duration))
        var mono = [Double](repeating: 0.0, count: numFrames)

        switch hit {
        case .cajonBass:
            var phase = 0.0
            var thudLP = BiquadFilter.lowpass(sampleRate: clampedSR, frequency: 320.0)
            var cavity = BiquadFilter.peaking(sampleRate: clampedSR, frequency: 92.0, q: 2.0, gainDb: 5.0)
            for i in 0..<numFrames {
                let t = Double(i) / clampedSR
                let pitchEnv = exp(-t / 0.028)
                let freq = 52.0 + (115.0 - 52.0) * pitchEnv
                phase += 2.0 * Double.pi * freq / clampedSR
                let body = sin(phase) * exp(-t * 10.0)
                let slap = t < 0.018 ? thudLP.process(rng.nextSigned()) * (1.0 - t / 0.018) * (0.20 + 0.22 * atk) : 0.0
                let sample = cavity.process(body * 0.82 + slap)
                mono[i] = sample * vel * 0.78
            }

        case .cajonSlap:
            var wood1 = QuadratureOscillator(freq: 240.0, sampleRate: clampedSR)
            var wood2 = QuadratureOscillator(freq: 410.0, sampleRate: clampedSR)
            var snareBP = BiquadFilter.bandpass(sampleRate: clampedSR, frequency: 3400.0, q: 0.8)
            for i in 0..<numFrames {
                let t = Double(i) / clampedSR
                let wood = (wood1.next() * 0.65 + wood2.next() * 0.45) * exp(-t * 45.0)
                let snareNoise = snareBP.process(rng.nextSigned()) * exp(-t * 22.0) * (0.85 + 0.45 * atk)
                let palmClick = t < 0.004 ? rng.nextSigned() * (1.0 - t / 0.004) * 0.45 : 0.0
                mono[i] = (wood * 0.50 + snareNoise * 0.72 + palmClick) * vel * 0.65
            }

        case .shakerClosed:
            var bp = BiquadFilter.bandpass(sampleRate: clampedSR, frequency: 6800.0, q: 1.1)
            for i in 0..<numFrames {
                let t = Double(i) / clampedSR
                let env = min(1.0, t / 0.008) * exp(-t * 48.0)
                let sample = bp.process(rng.nextSigned()) * env
                mono[i] = sample * vel * 0.55
            }

        case .shakerOpen:
            var bp1 = BiquadFilter.bandpass(sampleRate: clampedSR, frequency: 4900.0, q: 1.0)
            var bp2 = BiquadFilter.bandpass(sampleRate: clampedSR, frequency: 8800.0, q: 1.2)
            for i in 0..<numFrames {
                let t = Double(i) / clampedSR
                let env = min(1.0, t / 0.022) * exp(-t * 15.0)
                let n = rng.nextSigned()
                let sample = (bp1.process(n) * 0.6 + bp2.process(n) * 0.65) * env
                mono[i] = sample * vel * 0.52
            }

        case .tambourine:
            let modes: [Double] = [3120.0, 4480.0, 5890.0, 7210.0, 8640.0, 10200.0]
                .filter { $0 < clampedSR * 0.45 }
            var oscs = modes.map { QuadratureOscillator(freq: $0, sampleRate: clampedSR) }
            var rattleLFO = QuadratureOscillator(freq: 28.0, sampleRate: clampedSR)
            var hp = BiquadFilter.highpass(sampleRate: clampedSR, frequency: 5800.0)
            var frameOsc = QuadratureOscillator(freq: 210.0, sampleRate: clampedSR)
            for i in 0..<numFrames {
                let t = Double(i) / clampedSR
                var jingles = 0.0
                for idx in oscs.indices {
                    jingles += oscs[idx].next() * (1.0 / Double(idx + 1))
                }
                let rattleMod = 0.65 + 0.35 * rattleLFO.next()
                let metallicNoise = hp.process(rng.nextSigned()) * 0.55
                let frame = t < 0.030 ? frameOsc.next() * exp(-t * 85.0) * 0.38 : 0.0
                let env = min(1.0, t / 0.004) * exp(-t * 11.5)
                mono[i] = ((jingles * 0.35 + metallicNoise) * rattleMod * env + frame) * vel * 0.50
            }

        case .woodblock:
            var m1 = QuadratureOscillator(freq: min(clampedSR * 0.42, 860.0), sampleRate: clampedSR)
            var m2 = QuadratureOscillator(freq: min(clampedSR * 0.42, 1540.0), sampleRate: clampedSR)
            var m3 = QuadratureOscillator(freq: min(clampedSR * 0.42, 2280.0), sampleRate: clampedSR)
            for i in 0..<numFrames {
                let t = Double(i) / clampedSR
                let mallet = t < 0.002 ? rng.nextSigned() * (1.0 - t / 0.002) * (0.35 + 0.25 * atk) : 0.0
                let tone = m1.next() * 0.70 * exp(-t * 30.0)
                    + m2.next() * 0.42 * exp(-t * 42.0)
                    + m3.next() * 0.20 * exp(-t * 58.0)
                mono[i] = (tone + mallet) * vel * 0.62
            }
        }

        return panMonoToStereo(mono: mono, pan: pan, sampleRate: clampedSR)
    }

    // MARK: - Karplus-Strong Plucked String (.nylon & .steel)

    private static func renderKarplusStrong(
        into mono: inout [Double],
        freq: Double,
        sampleRate: Double,
        velocity: Double,
        pickAttack: Double,
        brightness: Double,
        damping: Double,
        loopAlpha: Double,
        pickPosition: Double,
        dispersion: Double,
        bodyResonance: Double,
        shimmerWet: Double,
        isNylon: Bool,
        rng: inout DeterministicRNG
    ) {
        let numFrames = mono.count
        let delayLen = max(4, Int((sampleRate / freq).rounded()))
        var delayLine = [Double](repeating: 0.0, count: delayLen)

        let exciteCutoff = isNylon ? (1200.0 + 2200.0 * pickAttack) : (2600.0 + 5200.0 * pickAttack)
        var exciteLP = BiquadFilter.lowpass(sampleRate: sampleRate, frequency: exciteCutoff, q: 0.707)

        let combOffset = max(1, min(delayLen - 1, Int(Double(delayLen) * pickPosition)))
        var rawNoise = [Double](repeating: 0.0, count: delayLen)
        for i in 0..<delayLen {
            let fingerPulse = isNylon ? sin(Double.pi * Double(i) / Double(delayLen)) * 0.50 : 0.0
            rawNoise[i] = exciteLP.process(rng.nextSigned() * 0.85 + fingerPulse)
        }
        for i in 0..<delayLen {
            let delayed = rawNoise[(i - combOffset + delayLen) % delayLen]
            delayLine[i] = (rawNoise[i] - 0.65 * delayed) * (0.7 + 0.3 * brightness)
        }

        let alpha = max(0.35, min(0.96, loopAlpha))
        var prevOut = 0.0
        var allpassPrevIn = 0.0
        var allpassPrevOut = 0.0
        var readIdx = 0

        // Body cavity & top-plate resonances
        var airRes = BiquadFilter.peaking(sampleRate: sampleRate, frequency: isNylon ? 98.0 : 110.0, q: 2.2, gainDb: 4.5 * bodyResonance)
        var topRes = BiquadFilter.peaking(sampleRate: sampleRate, frequency: isNylon ? 210.0 : 240.0, q: 1.8, gainDb: 3.5 * bodyResonance)
        var bridgeShimmer = BiquadFilter.peaking(sampleRate: sampleRate, frequency: 2800.0, q: 1.4, gainDb: isNylon ? -2.0 : 3.2 * brightness)

        // Optional 12-string octave/detune shimmer secondary waveguide
        let hasShimmer = shimmerWet > 0.01
        let shimmerFreq = freq < 200.0 ? min(sampleRate * 0.4, freq * 2.0) : min(sampleRate * 0.4, freq * 1.0035)
        let shimDelayLen = max(4, Int((sampleRate / shimmerFreq).rounded()))
        var shimDelay = [Double](repeating: 0.0, count: hasShimmer ? shimDelayLen : 1)
        if hasShimmer {
            for i in 0..<shimDelayLen {
                shimDelay[i] = rng.nextSigned() * 0.6
            }
        }
        var shimIdx = 0
        var shimPrev = 0.0

        for i in 0..<numFrames {
            let current = delayLine[readIdx]
            let nextIdx = (readIdx + 1) % delayLen
            let nextSample = delayLine[nextIdx]

            let avg = 0.5 * (current + nextSample)
            let lp = alpha * avg + (1.0 - alpha) * prevOut
            prevOut = lp

            // First-order string stiffness dispersion allpass
            let disp = dispersion * (lp - allpassPrevOut) + allpassPrevIn
            allpassPrevIn = lp
            allpassPrevOut = disp

            delayLine[readIdx] = disp * damping
            readIdx = nextIdx

            var sample = disp
            if hasShimmer {
                let sCur = shimDelay[shimIdx]
                let sNext = shimDelay[(shimIdx + 1) % shimDelayLen]
                let sOut = (0.5 * (sCur + sNext) * 0.85 + shimPrev * 0.15) * 0.9970
                shimDelay[shimIdx] = sOut
                shimPrev = sOut
                shimIdx = (shimIdx + 1) % shimDelayLen
                sample = sample * (1.0 - shimmerWet * 0.35) + sOut * (shimmerWet * 0.55)
            }

            let shaped = bridgeShimmer.process(topRes.process(airRes.process(sample)))
            let t = Double(i) / sampleRate
            let fadeIn = min(1.0, t / 0.002)
            let fadeOut = i > numFrames - 512 ? Double(numFrames - i) / 512.0 : 1.0
            mono[i] = shaped * fadeIn * fadeOut * velocity * 0.52
        }
    }

    // MARK: - Grand Piano (.piano)

    private static func renderPiano(
        into mono: inout [Double],
        freq: Double,
        sampleRate: Double,
        velocity: Double,
        pickAttack: Double,
        rng: inout DeterministicRNG
    ) {
        let numFrames = mono.count
        let nyquistLimit = sampleRate * 0.44
        let inharmonicity = 0.00018 * pow(freq / 261.63, 0.8)
        let slopeExp = max(0.65, 1.35 - 0.55 * velocity - 0.20 * pickAttack)

        struct Partial {
            var oscL: QuadratureOscillator
            var oscC: QuadratureOscillator
            var oscR: QuadratureOscillator
            var amp: Double
            var decayRate: Double
        }

        var partials: [Partial] = []
        let baseDecay = 2.6 * pow(440.0 / max(55.0, freq), 0.35)
        for k in 1...7 {
            let fk = Double(k) * freq * sqrt(1.0 + inharmonicity * Double(k * k))
            if fk >= nyquistLimit { break }
            let amp = 1.0 / pow(Double(k), slopeExp)
            let decayRate = 1.0 / max(0.18, baseDecay / (1.0 + 0.32 * Double(k - 1)))
            partials.append(Partial(
                oscL: QuadratureOscillator(freq: fk * 0.99965, sampleRate: sampleRate, initialPhase: 0.1 * Double(k)),
                oscC: QuadratureOscillator(freq: fk, sampleRate: sampleRate),
                oscR: QuadratureOscillator(freq: fk * 1.00040, sampleRate: sampleRate, initialPhase: 0.25 * Double(k)),
                amp: amp,
                decayRate: decayRate
            ))
        }

        var hammerOsc = QuadratureOscillator(freq: 220.0, sampleRate: sampleRate)
        var soundboard = BiquadFilter.peaking(sampleRate: sampleRate, frequency: 280.0, q: 1.2, gainDb: 2.5)

        let pCount = partials.count
        partials.withUnsafeMutableBufferPointer { pBuf in
            for i in 0..<numFrames {
                let t = Double(i) / sampleRate
                let attackEnv = min(1.0, t / 0.003)
                var sum = 0.0
                for p in 0..<pCount {
                    let unison = pBuf[p].oscL.next() * 0.3 + pBuf[p].oscC.next() * 0.45 + pBuf[p].oscR.next() * 0.3
                    let env = 0.62 * exp(-t * pBuf[p].decayRate * 2.8) + 0.38 * exp(-t * pBuf[p].decayRate)
                    sum += unison * pBuf[p].amp * env
                }
                let hammerThump = t < 0.010 ? (hammerOsc.next() * 0.28 + rng.nextSigned() * 0.12) * exp(-t * 280.0) : 0.0
                let fadeOut = i > numFrames - 512 ? Double(numFrames - i) / 512.0 : 1.0
                mono[i] = soundboard.process(sum * 0.36 + hammerThump) * attackEnv * fadeOut * velocity * 0.65
            }
        }
    }

    // MARK: - Bowed Violin (.violin)

    private static func renderViolin(
        into mono: inout [Double],
        freq: Double,
        sampleRate: Double,
        velocity: Double,
        pickAttack: Double,
        rng: inout DeterministicRNG
    ) {
        let numFrames = mono.count
        let nyquist = sampleRate * 0.44
        let harmonics = (1...10).filter { Double($0) * freq < nyquist }
        var oscs = harmonics.map { k in
            QuadratureOscillator(freq: Double(k) * freq, sampleRate: sampleRate)
        }

        let attackSec = max(0.035, 0.085 - 0.045 * pickAttack)
        let releaseSec = min(0.22, Double(numFrames) / sampleRate * 0.20)
        var bowNoiseBP = BiquadFilter.bandpass(sampleRate: sampleRate, frequency: 2600.0, q: 1.4)
        var f1 = BiquadFilter.peaking(sampleRate: sampleRate, frequency: 280.0, q: 2.0, gainDb: 3.5)
        var f2 = BiquadFilter.peaking(sampleRate: sampleRate, frequency: 480.0, q: 1.8, gainDb: 4.0)
        var f3 = BiquadFilter.peaking(sampleRate: sampleRate, frequency: 2400.0, q: 1.5, gainDb: 3.0)
        var lp = BiquadFilter.lowpass(sampleRate: sampleRate, frequency: 5200.0)
        var vibOsc = QuadratureOscillator(freq: 5.4, sampleRate: sampleRate)

        let totalSec = Double(numFrames) / sampleRate
        for i in 0..<numFrames {
            let t = Double(i) / sampleRate
            let vibRamp = max(0.0, min(1.0, (t - 0.16) / 0.14))
            let vibRatio = 1.0 + vibOsc.next() * 0.008 * vibRamp

            if i % 16 == 0 {
                for idx in oscs.indices {
                    oscs[idx].setFrequency(Double(harmonics[idx]) * freq * vibRatio, sampleRate: sampleRate)
                }
            }

            var saw = 0.0
            for idx in oscs.indices {
                let k = Double(harmonics[idx])
                saw += oscs[idx].next() / k
            }
            let rosin = bowNoiseBP.process(rng.nextSigned()) * 0.045
            let shaped = lp.process(f3.process(f2.process(f1.process(saw * 0.55 + rosin))))

            let atkEnv = min(1.0, t / attackSec)
            let relEnv = (totalSec - t) < releaseSec ? max(0.0, (totalSec - t) / releaseSec) : 1.0
            let sustain = 0.88 - 0.15 * (t / max(0.2, totalSec))
            mono[i] = shaped * atkEnv * relEnv * sustain * velocity * 0.62
        }
    }

    // MARK: - Cylindrical Bore Clarinet (.clarinet)

    private static func renderClarinet(
        into mono: inout [Double],
        freq: Double,
        sampleRate: Double,
        velocity: Double,
        pickAttack: Double,
        rng: inout DeterministicRNG
    ) {
        let numFrames = mono.count
        let nyquist = sampleRate * 0.44
        // Odd harmonics strongly dominate cylindrical reed bore
        let harmonicOrders = [1, 2, 3, 5, 7, 9, 11].filter { Double($0) * freq < nyquist }
        let weights: [Int: Double] = [1: 1.0, 2: 0.06, 3: 0.48, 5: 0.26, 7: 0.15, 9: 0.09, 11: 0.05]
        var oscs = harmonicOrders.map { QuadratureOscillator(freq: Double($0) * freq, sampleRate: sampleRate) }

        var breathBP = BiquadFilter.bandpass(sampleRate: sampleRate, frequency: 2200.0, q: 1.8)
        var woodFormant = BiquadFilter.peaking(sampleRate: sampleRate, frequency: 1150.0, q: 1.4, gainDb: 3.5)
        var vibOsc = QuadratureOscillator(freq: 5.0, sampleRate: sampleRate)
        let totalSec = Double(numFrames) / sampleRate
        let attackSec = max(0.015, 0.036 - 0.016 * pickAttack)
        let releaseSec = min(0.14, totalSec * 0.18)

        for i in 0..<numFrames {
            let t = Double(i) / sampleRate
            let vibRamp = max(0.0, min(1.0, (t - 0.14) / 0.12))
            let vibRatio = 1.0 + vibOsc.next() * 0.004 * vibRamp
            if i % 16 == 0 {
                for idx in oscs.indices {
                    oscs[idx].setFrequency(Double(harmonicOrders[idx]) * freq * vibRatio, sampleRate: sampleRate)
                }
            }

            var tone = 0.0
            for idx in oscs.indices {
                tone += oscs[idx].next() * (weights[harmonicOrders[idx]] ?? 0.05)
            }
            let breath = breathBP.process(rng.nextSigned()) * (t < 0.025 ? 0.16 : 0.03)
            let atkEnv = min(1.0, t / attackSec)
            let relEnv = (totalSec - t) < releaseSec ? max(0.0, (totalSec - t) / releaseSec) : 1.0
            mono[i] = woodFormant.process(tone * 0.45 + breath) * atkEnv * relEnv * exp(-t * 0.35) * velocity * 0.65
        }
    }

    // MARK: - Conical Bore Alto Saxophone (.altoSax)

    private static func renderAltoSax(
        into mono: inout [Double],
        freq: Double,
        sampleRate: Double,
        velocity: Double,
        pickAttack: Double,
        rng: inout DeterministicRNG
    ) {
        let numFrames = mono.count
        let nyquist = sampleRate * 0.44
        let harmonics = (1...12).filter { Double($0) * freq < nyquist }
        let amps: [Double] = harmonics.map { k in
            k == 2 ? 0.85 : (k == 3 ? 0.65 : (1.0 / pow(Double(k), 1.05)))
        }
        var oscs = harmonics.map { QuadratureOscillator(freq: Double($0) * freq, sampleRate: sampleRate) }
        var formant1 = BiquadFilter.peaking(sampleRate: sampleRate, frequency: 550.0, q: 1.5, gainDb: 4.5)
        var formant2 = BiquadFilter.peaking(sampleRate: sampleRate, frequency: 1650.0, q: 1.4, gainDb: 4.0)
        var growlBP = BiquadFilter.bandpass(sampleRate: sampleRate, frequency: 1900.0, q: 1.2)
        var vibOsc = QuadratureOscillator(freq: 5.2, sampleRate: sampleRate)

        let totalSec = Double(numFrames) / sampleRate
        let attackSec = max(0.012, 0.030 - 0.015 * pickAttack)
        let releaseSec = min(0.15, totalSec * 0.18)

        for i in 0..<numFrames {
            let t = Double(i) / sampleRate
            // Upward pitch scoop (-35 cents -> 0 over 45ms) + delayed vibrato
            let scoopRatio = t < 0.045 ? pow(2.0, (-35.0 * (1.0 - t / 0.045)) / 1200.0) : 1.0
            let vibRamp = max(0.0, min(1.0, (t - 0.14) / 0.12))
            let vibRatio = 1.0 + vibOsc.next() * 0.007 * vibRamp

            if i % 16 == 0 {
                for idx in oscs.indices {
                    oscs[idx].setFrequency(Double(harmonics[idx]) * freq * scoopRatio * vibRatio, sampleRate: sampleRate)
                }
            }

            var tone = 0.0
            for idx in oscs.indices {
                tone += oscs[idx].next() * amps[idx]
            }
            let lipSlap = t < 0.022 ? growlBP.process(rng.nextSigned()) * (0.18 + 0.12 * pickAttack) : 0.0
            let shaped = formant2.process(formant1.process(tone * 0.36 + lipSlap))
            let atkEnv = min(1.0, t / attackSec)
            let relEnv = (totalSec - t) < releaseSec ? max(0.0, (totalSec - t) / releaseSec) : 1.0
            mono[i] = shaped * atkEnv * relEnv * exp(-t * 0.30) * velocity * 0.62
        }
    }

    // MARK: - Free-Reed Harmonica (.harmonica)

    private static func renderHarmonica(
        into mono: inout [Double],
        freq: Double,
        sampleRate: Double,
        velocity: Double,
        pickAttack: Double,
        rng: inout DeterministicRNG
    ) {
        let numFrames = mono.count
        let nyquist = sampleRate * 0.44
        let harmonics = (1...7).filter { Double($0) * freq < nyquist }
        var oscsA = harmonics.map { QuadratureOscillator(freq: Double($0) * freq, sampleRate: sampleRate) }
        let detune = pow(2.0, 6.0 / 1200.0)
        var oscsB = harmonics.map { QuadratureOscillator(freq: Double($0) * freq * detune, sampleRate: sampleRate) }

        var chuffBP = BiquadFilter.bandpass(sampleRate: sampleRate, frequency: 3200.0, q: 1.5)
        var reedEQ = BiquadFilter.peaking(sampleRate: sampleRate, frequency: 1450.0, q: 1.2, gainDb: 3.5)

        let totalSec = Double(numFrames) / sampleRate
        let attackSec = max(0.010, 0.024 - 0.010 * pickAttack)
        let releaseSec = min(0.12, totalSec * 0.18)

        for i in 0..<numFrames {
            let t = Double(i) / sampleRate
            let bendRatio = t < 0.040 ? pow(2.0, (-20.0 * (1.0 - t / 0.040)) / 1200.0) : 1.0
            if i % 16 == 0 {
                for idx in oscsA.indices {
                    let fk = Double(harmonics[idx]) * freq * bendRatio
                    oscsA[idx].setFrequency(fk, sampleRate: sampleRate)
                    oscsB[idx].setFrequency(fk * detune, sampleRate: sampleRate)
                }
            }

            var sum = 0.0
            for idx in oscsA.indices {
                let w = 1.0 / pow(Double(harmonics[idx]), 1.15)
                sum += (oscsA[idx].next() + oscsB[idx].next()) * 0.5 * w
            }
            let saturated = tanh(sum * 1.45) * 0.48
            let chuff = t < 0.016 ? chuffBP.process(rng.nextSigned()) * 0.15 : 0.0
            let atkEnv = min(1.0, t / attackSec)
            let relEnv = (totalSec - t) < releaseSec ? max(0.0, (totalSec - t) / releaseSec) : 1.0
            mono[i] = reedEQ.process(saturated + chuff) * atkEnv * relEnv * exp(-t * 0.35) * velocity * 0.65
        }
    }

    // MARK: - Acoustic Upright Bass (.bass)

    private static func renderAcousticBass(
        into mono: inout [Double],
        freq: Double,
        sampleRate: Double,
        velocity: Double,
        pickAttack: Double,
        rng: inout DeterministicRNG
    ) {
        let numFrames = mono.count
        let clampedFreq = min(380.0, freq)
        var h1 = QuadratureOscillator(freq: clampedFreq, sampleRate: sampleRate)
        var h2 = QuadratureOscillator(freq: clampedFreq * 2.0, sampleRate: sampleRate)
        var h3 = QuadratureOscillator(freq: clampedFreq * 3.0, sampleRate: sampleRate)
        var h4 = QuadratureOscillator(freq: clampedFreq * 4.0, sampleRate: sampleRate)
        var thumpOsc = QuadratureOscillator(freq: 95.0, sampleRate: sampleRate)

        var lp = BiquadFilter.lowpass(sampleRate: sampleRate, frequency: 850.0 + 900.0 * pickAttack)
        var bodyBoost = BiquadFilter.peaking(sampleRate: sampleRate, frequency: 85.0, q: 1.5, gainDb: 4.5)

        for i in 0..<numFrames {
            let t = Double(i) / sampleRate
            if t < 0.020 && i % 8 == 0 {
                let drop = 1.0 + 0.025 * (1.0 - t / 0.020)
                h1.setFrequency(clampedFreq * drop, sampleRate: sampleRate)
                h2.setFrequency(clampedFreq * 2.0 * drop, sampleRate: sampleRate)
            } else if i == Int(0.020 * sampleRate) {
                h1.setFrequency(clampedFreq, sampleRate: sampleRate)
                h2.setFrequency(clampedFreq * 2.0, sampleRate: sampleRate)
            }

            let tone = h1.next() * 1.0 * exp(-t * 1.2)
                + h2.next() * 0.42 * exp(-t * 2.1)
                + h3.next() * 0.16 * exp(-t * 3.4)
                + h4.next() * 0.05 * exp(-t * 5.0)
            let woodThump = t < 0.025 ? (thumpOsc.next() * 0.25 + rng.nextSigned() * 0.08) * exp(-t * 110.0) : 0.0
            let atkEnv = min(1.0, t / 0.005)
            let fadeOut = i > numFrames - 512 ? Double(numFrames - i) / 512.0 : 1.0
            mono[i] = bodyBoost.process(lp.process(tone * 0.55 + woodThump)) * atkEnv * fadeOut * velocity * 0.72
        }
    }

    // MARK: - Pick Attack Transient Shaper (Measurable in First 0...25ms)

    private static func applyPickAttackTransientShaper(
        samples: inout [Double],
        sampleRate: Double,
        pickAttack: Double,
        velocity: Double,
        instrument: AcousticInstrumentType,
        rng: inout DeterministicRNG
    ) {
        let attackFrames = min(samples.count, max(16, Int(sampleRate * 0.025)))
        let clickFrames = min(samples.count, max(8, Int(sampleRate * 0.012)))
        var clickHP = BiquadFilter.highpass(sampleRate: sampleRate, frequency: 1850.0)

        // Gain multiplier across 0..25ms: at 0.0 -> ~0.62, at 0.5 -> ~1.0, at 1.0 -> ~1.55
        let transientBoostPeak = (pickAttack - 0.5) * 0.95
        let clickScale = (instrument == .violin || instrument == .clarinet) ? 0.18 : 0.36

        for i in 0..<attackFrames {
            let progress = Double(i) / Double(attackFrames)
            // Raised cosine envelope peaking near 3ms and tapering cleanly to 0 at 25ms
            let window = 0.5 * (1.0 + cos(Double.pi * progress))
            let shaperGain = max(0.35, 1.0 + transientBoostPeak * window)
            var s = samples[i] * shaperGain

            if i < clickFrames && pickAttack > 0.02 {
                let clickDecay = 1.0 - (Double(i) / Double(clickFrames))
                let clickBurst = clickHP.process(rng.nextSigned()) * clickDecay * clickScale * pickAttack * velocity
                s += clickBurst
            }
            samples[i] = s
        }
    }

    // MARK: - Constant-Power Stereo Panning & Soft Safety Clamp

    private static func panMonoToStereo(mono: [Double], pan: Double, sampleRate: Double) -> StereoSamples {
        let theta = (max(-1.0, min(1.0, pan)) + 1.0) * (Double.pi * 0.25)
        let gainL = Float(cos(theta))
        let gainR = Float(sin(theta))

        var left = [Float](repeating: 0.0, count: mono.count)
        var right = [Float](repeating: 0.0, count: mono.count)

        for i in 0..<mono.count {
            let v = mono[i]
            let safe = v.isFinite ? Float(max(-0.98, min(0.98, v))) : 0.0
            left[i] = safe * gainL
            right[i] = safe * gainR
        }
        return StereoSamples(left: left, right: right, sampleRate: sampleRate)
    }
}
