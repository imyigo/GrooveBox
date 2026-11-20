import Foundation
import AVFoundation

struct MixdownSnapshot: @unchecked Sendable {
    let sections: [SongSection]
    let bpm: Double
    let swing: Double
    let percussionEnabled: Bool
    let chordInstrument: AcousticInstrumentType
    let soloInstrument: AcousticInstrumentType
    let bodyPreset: GuitarBodyPreset
    let warmth: Double
    let airSheen: Double
    let pickAttack: Double
    let spaceReverbWet: Double
    let strumSpread: Double
    let activeSpacePreset: SpaceDesignerPreset
    let soloLoopEvents: [SoloLoopEvent]
    let soloLoopMuted: Bool
    let recordedVocalURL: URL?
    let masterVolume: Float
    let masterMuted: Bool
    let chordVolume: Float
    let chordMuted: Bool
    let chordSolo: Bool
    let drumVolume: Float
    let drumMuted: Bool
    let drumSolo: Bool
    let soloVolume: Float
    let soloMuted: Bool
    let soloSolo: Bool
    let vocalVolume: Float
    let vocalMuted: Bool
    let vocalSolo: Bool
    let sampleRate: Double
}

enum OfflineMixdownRenderer {

    static func render(snapshot: MixdownSnapshot, to url: URL) throws {
        let sr = (snapshot.sampleRate >= 8000.0 && snapshot.sampleRate <= 192000.0) ? snapshot.sampleRate : 48000.0
        let safeBpm = max(50.0, min(180.0, snapshot.bpm))
        let safeSwing = max(0.0, min(0.4, snapshot.swing))
        let baseStepSec = (60.0 / safeBpm) / 4.0

        // Compute effective gains matching NativeAudioEngine mixer math
        let anySolo = snapshot.chordSolo || snapshot.drumSolo || snapshot.soloSolo || snapshot.vocalSolo
        let masterGain: Float = snapshot.masterMuted ? 0.0 : max(0.0, min(1.0, snapshot.masterVolume))

        func effectiveGain(vol: Float, muted: Bool, solo: Bool) -> Float {
            guard !snapshot.masterMuted, !muted, (!anySolo || solo) else { return 0.0 }
            return max(0.0, min(1.0, vol))
        }

        let chordGain = effectiveGain(vol: snapshot.chordVolume, muted: snapshot.chordMuted, solo: snapshot.chordSolo)
        let drumGain = effectiveGain(vol: snapshot.drumVolume, muted: snapshot.drumMuted, solo: snapshot.drumSolo)
        let soloGain = effectiveGain(vol: snapshot.soloVolume, muted: snapshot.soloMuted, solo: snapshot.soloSolo)
        let vocalGain = effectiveGain(vol: snapshot.vocalVolume, muted: snapshot.vocalMuted, solo: snapshot.vocalSolo)

        // Compute total arrangement bars & duration
        var totalBars = 0
        for sec in snapshot.sections where !sec.chords.isEmpty {
            totalBars += max(1, sec.repeats) * sec.chords.count
        }

        let barDurationSec = baseStepSec * 16.0
        var arrangementDurationSec = Double(totalBars) * barDurationSec
        let tailSec = (arrangementDurationSec > 0.0 && snapshot.spaceReverbWet > 0.01)
            ? min(2.0, snapshot.activeSpacePreset.decaySeconds * 0.75 + 0.5)
            : (arrangementDurationSec > 0.0 ? 0.65 : 0.0)

        // Load vocal samples if present and active
        var vocalSamples: (left: [Float], right: [Float])? = nil
        if let vocalURL = snapshot.recordedVocalURL, vocalGain > 0.0, masterGain > 0.0 {
            vocalSamples = loadAudioAsStereo(url: vocalURL, targetSampleRate: sr)
            if let v = vocalSamples {
                let vocalSec = Double(v.left.count) / sr
                arrangementDurationSec = max(arrangementDurationSec, vocalSec)
            }
        }

        let totalSec = max(0.5, arrangementDurationSec + tailSec)
        let totalFrames = max(64, Int((totalSec * sr).rounded()))

        var mixL = [Double](repeating: 0.0, count: totalFrames)
        var mixR = [Double](repeating: 0.0, count: totalFrames)

        let hasAnyActiveOutput = masterGain > 0.0001 && (chordGain > 0.0001 || drumGain > 0.0001 || soloGain > 0.0001 || vocalGain > 0.0001)

        if hasAnyActiveOutput {
            var chordL = [Double](repeating: 0.0, count: totalFrames)
            var chordR = [Double](repeating: 0.0, count: totalFrames)
            var drumL = [Double](repeating: 0.0, count: totalFrames)
            var drumR = [Double](repeating: 0.0, count: totalFrames)
            var soloL = [Double](repeating: 0.0, count: totalFrames)
            var soloR = [Double](repeating: 0.0, count: totalFrames)

            var currentBarOffset = 0
            var rng = DeterministicRNG(seed: 2026)

            for (secIdx, sec) in snapshot.sections.enumerated() {
                guard !sec.chords.isEmpty else { continue }
                let repeats = max(1, sec.repeats)
                let pattern = StrumPatternLibrary.pattern(id: sec.patternId)
                let drumMode = sec.resolvedDrumMode

                for _ in 0..<repeats {
                    for (barIdx, chordName) in sec.chords.enumerated() {
                        let chord = ChordLibrary.chordNamed(chordName)
                        let barStartSec = Double(currentBarOffset) * barDurationSec

                        for step in 0..<16 {
                            let swingOffsetSec = (step % 2 == 1) ? (safeSwing * 0.5 * baseStepSec) : 0.0
                            let stepStartSec = barStartSec + Double(step) * baseStepSec + swingOffsetSec
                            let stepStartFrame = max(0, Int((stepStartSec * sr).rounded()))

                            // 1. Chord / Strum Track
                            if chordGain > 0.0001, pattern.steps.indices.contains(step) {
                                let pStep = pattern.steps[step]
                                renderChordStep(
                                    chord: chord,
                                    step: pStep,
                                    startFrame: stepStartFrame,
                                    sampleRate: sr,
                                    snapshot: snapshot,
                                    rng: &rng,
                                    outL: &chordL,
                                    outR: &chordR
                                )
                            }

                            // 2. Drum Track
                            if snapshot.percussionEnabled && drumGain > 0.0001 {
                                let drumTriggers = DrumModeGrid.triggers(for: drumMode, step: step)
                                for trigger in drumTriggers {
                                    let drumStereo = AcousticSynthesizer.synthesizeDrum(
                                        hit: trigger.hit,
                                        velocity: trigger.velocity,
                                        sampleRate: sr,
                                        pickAttack: snapshot.pickAttack
                                    )
                                    addStereo(drumStereo, atFrame: stepStartFrame, outL: &drumL, outR: &drumR)
                                }
                            }

                            // 3. Solo Looper Track
                            if !snapshot.soloLoopMuted && soloGain > 0.0001 {
                                let matchingEvents = snapshot.soloLoopEvents.filter {
                                    $0.sectionIndex == secIdx && $0.barIndex == barIdx && $0.step == step
                                }
                                for event in matchingEvents {
                                    if event.instrument == .drums {
                                        let hit = DrumHitType.allCases[abs(event.midi) % DrumHitType.allCases.count]
                                        let drumStereo = AcousticSynthesizer.synthesizeDrum(
                                            hit: hit,
                                            velocity: event.velocity,
                                            sampleRate: sr,
                                            pickAttack: snapshot.pickAttack
                                        )
                                        addStereo(drumStereo, atFrame: stepStartFrame, outL: &soloL, outR: &soloR)
                                    } else {
                                        let freq = ChordLibrary.midiToFrequency(event.midi)
                                        let noteStereo = AcousticSynthesizer.synthesizeNote(
                                            freq: freq,
                                            duration: min(2.2, baseStepSec * 6.0),
                                            velocity: event.velocity,
                                            sampleRate: sr,
                                            instrument: event.instrument,
                                            bodyPreset: snapshot.bodyPreset,
                                            pickAttack: snapshot.pickAttack
                                        )
                                        addStereo(noteStereo, atFrame: stepStartFrame, outL: &soloL, outR: &soloR)
                                    }
                                }
                            }
                        }

                        currentBarOffset += 1
                    }
                }
            }

            // Sum tracks with Mute/Solo/Volume scaling
            let cG = Double(chordGain)
            let dG = Double(drumGain)
            let sG = Double(soloGain)
            let vG = Double(vocalGain)

            for i in 0..<totalFrames {
                var l = chordL[i] * cG + drumL[i] * dG + soloL[i] * sG
                var r = chordR[i] * cG + drumR[i] * dG + soloR[i] * sG
                if let v = vocalSamples, i < v.left.count {
                    l += Double(v.left[i]) * vG
                    r += Double(v.right[i]) * vG
                }
                mixL[i] = l * Double(masterGain)
                mixR[i] = r * Double(masterGain)
            }

            // Apply 3-Band Logic Channel EQ (Warmth @ 108Hz, Mid @ 1200Hz, Air Sheen @ 4500Hz)
            let lowGainDb = (snapshot.warmth - 0.5) * 14.0
            let highGainDb = (snapshot.airSheen - 0.5) * 16.0
            var lowL = BiquadFilter.lowShelf(sampleRate: sr, frequency: 108.0, gainDb: lowGainDb)
            var lowR = BiquadFilter.lowShelf(sampleRate: sr, frequency: 108.0, gainDb: lowGainDb)
            var midL = BiquadFilter.peaking(sampleRate: sr, frequency: 1200.0, q: 1.0, gainDb: 1.0)
            var midR = BiquadFilter.peaking(sampleRate: sr, frequency: 1200.0, q: 1.0, gainDb: 1.0)
            var highL = BiquadFilter.highShelf(sampleRate: sr, frequency: 4500.0, gainDb: highGainDb)
            var highR = BiquadFilter.highShelf(sampleRate: sr, frequency: 4500.0, gainDb: highGainDb)

            var floatL = [Float](repeating: 0.0, count: totalFrames)
            var floatR = [Float](repeating: 0.0, count: totalFrames)

            for i in 0..<totalFrames {
                let eqL = highL.process(midL.process(lowL.process(mixL[i])))
                let eqR = highR.process(midR.process(lowR.process(mixR[i])))
                floatL[i] = Float(eqL.isFinite ? eqL : 0.0)
                floatR[i] = Float(eqR.isFinite ? eqR : 0.0)
            }

            // Apply Space Designer Stereo Reverb
            SpaceDesignerOfflineProcessor.processStereo(
                left: &floatL,
                right: &floatR,
                sampleRate: sr,
                preset: snapshot.activeSpacePreset,
                wet: snapshot.spaceReverbWet
            )

            // Final soft-limiter + NaN/Inf safety guard (peak strictly <= 1.0)
            for i in 0..<totalFrames {
                let sL = Double(floatL[i])
                let sR = Double(floatR[i])
                mixL[i] = softLimit(sL)
                mixR[i] = softLimit(sR)
            }
        }

        try writeWAVFile(left: mixL, right: mixR, sampleRate: sr, to: url)
    }

    // MARK: - Helpers

    private static func renderChordStep(
        chord: GuitarChord,
        step: StrumStep,
        startFrame: Int,
        sampleRate: Double,
        snapshot: MixdownSnapshot,
        rng: inout DeterministicRNG,
        outL: inout [Double],
        outR: inout [Double]
    ) {
        let vel = max(0.0, min(1.0, step.velocity * (step.accent ? 1.05 : 0.94)))
        guard step.stroke != .rest, vel > 0.001 else { return }

        if step.stroke == .mute {
            let chop = AcousticSynthesizer.synthesizeMuteChop(
                sampleRate: sampleRate,
                velocity: vel,
                bodyPreset: snapshot.bodyPreset,
                pickAttack: snapshot.pickAttack,
                pan: 0.0
            )
            addStereo(chop, atFrame: startFrame, outL: &outL, outR: &outR)
            return
        }

        let soundingIndices = (0..<6).filter { chord.frets[$0] >= 0 }
        guard !soundingIndices.isEmpty else { return }

        let targetStrings: [Int]
        switch step.stroke {
        case .down:
            targetStrings = soundingIndices
        case .up:
            targetStrings = Array(soundingIndices.reversed())
        case .bass:
            targetStrings = Array(soundingIndices.prefix(2))
        case .treble:
            let high = soundingIndices.filter { $0 >= 2 }
            targetStrings = high.isEmpty ? Array(soundingIndices.suffix(3)) : high
        case .mute, .rest:
            return
        }

        let spreadScale = 0.15 + 1.65 * max(0.0, min(1.0, snapshot.strumSpread))
        let totalSweepMs = snapshot.bodyPreset.strumSpeedMs * spreadScale
        let count = max(1, targetStrings.count)
        let noteDuration = (step.stroke == .bass || step.stroke == .treble) ? 1.6 : 2.2

        for (orderIdx, stringIdx) in targetStrings.enumerated() {
            let fret = chord.frets[stringIdx]
            let freq = ChordLibrary.fretFrequency(stringIndex: stringIdx, fret: fret)
            guard freq > 20.0 else { continue }

            let norm = count > 1 ? Double(orderIdx) / Double(count - 1) : 0.0
            let sweepSec = (totalSweepMs / 1000.0) * pow(norm, 1.15)
            let jitterSec = (rng.nextSigned() * 0.0008) * snapshot.strumSpread
            let offsetFrames = max(0, Int(((sweepSec + jitterSec) * sampleRate).rounded()))

            let stringPan = ((Double(stringIdx) / 5.0) - 0.5) * 0.72 * snapshot.strumSpread
            let strVel = vel * (0.94 + 0.06 * (step.stroke == .down ? (1.0 - norm * 0.4) : (0.6 + norm * 0.4)))

            let stereo = AcousticSynthesizer.synthesizeNote(
                freq: freq,
                duration: noteDuration,
                velocity: min(1.0, strVel),
                sampleRate: sampleRate,
                instrument: snapshot.chordInstrument,
                bodyPreset: snapshot.bodyPreset,
                pickAttack: snapshot.pickAttack,
                pan: stringPan,
                seed: UInt64(stringIdx + 1)
            )
            addStereo(stereo, atFrame: startFrame + offsetFrames, outL: &outL, outR: &outR)
        }
    }

    private static func addStereo(
        _ samples: StereoSamples,
        atFrame startFrame: Int,
        outL: inout [Double],
        outR: inout [Double]
    ) {
        guard startFrame < outL.count else { return }
        let limit = min(samples.frameCount, outL.count - startFrame)
        for i in 0..<limit {
            outL[startFrame + i] += Double(samples.left[i])
            outR[startFrame + i] += Double(samples.right[i])
        }
    }

    @inline(__always)
    private static func softLimit(_ sample: Double) -> Double {
        guard sample.isFinite else { return 0.0 }
        let threshold = 0.90
        let absVal = abs(sample)
        if absVal <= threshold {
            return sample
        }
        let excess = absVal - threshold
        let compressed = threshold + (1.0 - threshold) * tanh(excess / (1.0 - threshold))
        return max(-1.0, min(1.0, sample < 0 ? -compressed : compressed))
    }

    static func loadAudioAsStereo(url: URL, targetSampleRate: Double) -> (left: [Float], right: [Float])? {
        guard FileManager.default.fileExists(atPath: url.path) else { return nil }
        guard let file = try? AVAudioFile(forReading: url) else { return nil }
        let totalLength = AVAudioFrameCount(file.length)
        guard totalLength > 0 else { return nil }

        let srcFormat = file.processingFormat
        guard let srcBuffer = AVAudioPCMBuffer(pcmFormat: srcFormat, frameCapacity: totalLength) else { return nil }
        do {
            try file.read(into: srcBuffer)
        } catch {
            return nil
        }

        let frames = Int(srcBuffer.frameLength)
        guard frames > 0, let srcData = srcBuffer.floatChannelData else { return nil }
        let chCount = Int(srcFormat.channelCount)
        let srcSR = srcFormat.sampleRate

        if abs(srcSR - targetSampleRate) < 1.0 {
            let left = Array(UnsafeBufferPointer(start: srcData[0], count: frames))
            let right = chCount > 1 ? Array(UnsafeBufferPointer(start: srcData[1], count: frames)) : left
            return (left, right)
        }

        // Linear resample to targetSampleRate
        let outFrames = max(1, Int((Double(frames) * targetSampleRate / max(8000.0, srcSR)).rounded()))
        var outL = [Float](repeating: 0.0, count: outFrames)
        var outR = [Float](repeating: 0.0, count: outFrames)
        let ratio = srcSR / targetSampleRate
        let srcRPtr = chCount > 1 ? srcData[1] : srcData[0]

        for i in 0..<outFrames {
            let pos = Double(i) * ratio
            let idx0 = min(frames - 1, Int(pos))
            let idx1 = min(frames - 1, idx0 + 1)
            let frac = Float(pos - Double(idx0))
            outL[i] = srcData[0][idx0] * (1.0 - frac) + srcData[0][idx1] * frac
            outR[i] = srcRPtr[idx0] * (1.0 - frac) + srcRPtr[idx1] * frac
        }
        return (outL, outR)
    }

    private static func writeWAVFile(left: [Double], right: [Double], sampleRate: Double, to url: URL) throws {
        let fm = FileManager.default
        let parent = url.deletingLastPathComponent()
        if !fm.fileExists(atPath: parent.path) {
            try fm.createDirectory(at: parent, withIntermediateDirectories: true)
        }
        if fm.fileExists(atPath: url.path) {
            try fm.removeItem(at: url)
        }

        guard let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 2),
              let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(left.count)) else {
            throw NSError(domain: "OfflineMixdownRenderer", code: -1, userInfo: [NSLocalizedDescriptionKey: "Ses formatı oluşturulamadı."])
        }
        buffer.frameLength = AVAudioFrameCount(left.count)
        guard let chData = buffer.floatChannelData else {
            throw NSError(domain: "OfflineMixdownRenderer", code: -2, userInfo: [NSLocalizedDescriptionKey: "Ses belleği ayrılamadı."])
        }
        for i in 0..<left.count {
            chData[0][i] = Float(left[i].isFinite ? max(-1.0, min(1.0, left[i])) : 0.0)
            chData[1][i] = Float(right[i].isFinite ? max(-1.0, min(1.0, right[i])) : 0.0)
        }

        let wavSettings: [String: Any] = [
            AVFormatIDKey: kAudioFormatLinearPCM,
            AVSampleRateKey: sampleRate,
            AVNumberOfChannelsKey: 2,
            AVLinearPCMBitDepthKey: 16,
            AVLinearPCMIsFloatKey: false,
            AVLinearPCMIsBigEndianKey: false,
            AVLinearPCMIsNonInterleaved: false
        ]

        let outFile = try AVAudioFile(
            forWriting: url,
            settings: wavSettings,
            commonFormat: .pcmFormatFloat32,
            interleaved: false
        )
        try outFile.write(from: buffer)
    }
}
