import XCTest
import AVFoundation
import AcousticGrooveBox

final class AudioEngineTests: XCTestCase {

    private func makeTempURL(ext: String = "wav") -> URL {
        FileManager.default.temporaryDirectory
            .appendingPathComponent("AcousticGrooveBoxTest_\(UUID().uuidString).\(ext)")
    }

    private func readWAV(_ url: URL) throws -> (left: [Float], right: [Float], sampleRate: Double) {
        let rawData = try Data(contentsOf: url)
        XCTAssertGreaterThan(rawData.count, 44, "WAV file too small")
        let riff = String(data: rawData.subdata(in: 0..<4), encoding: .ascii)
        let wave = String(data: rawData.subdata(in: 8..<12), encoding: .ascii)
        XCTAssertEqual(riff, "RIFF")
        XCTAssertEqual(wave, "WAVE")

        let file = try AVAudioFile(forReading: url)
        let frameCount = AVAudioFrameCount(file.length)
        XCTAssertGreaterThan(frameCount, 0)

        let format = file.processingFormat
        guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else {
            XCTFail("Failed to allocate PCM buffer")
            return ([], [], format.sampleRate)
        }
        try file.read(into: buffer)
        guard let ch = buffer.floatChannelData else {
            XCTFail("Missing floatChannelData")
            return ([], [], format.sampleRate)
        }

        let count = Int(buffer.frameLength)
        let left = Array(UnsafeBufferPointer(start: ch[0], count: count))
        let right = format.channelCount > 1 ? Array(UnsafeBufferPointer(start: ch[1], count: count)) : left
        XCTAssertTrue(left.allSatisfy(\.isFinite), "Left channel contains NaN or Inf")
        XCTAssertTrue(right.allSatisfy(\.isFinite), "Right channel contains NaN or Inf")
        return (left, right, format.sampleRate)
    }

    private func rms(_ samples: ArraySlice<Float>) -> Double {
        guard !samples.isEmpty else { return 0.0 }
        var sumSq = 0.0
        for s in samples {
            let d = Double(s)
            sumSq += d * d
        }
        return sqrt(sumSq / Double(samples.count))
    }

    private func peak(_ samples: ArraySlice<Float>) -> Float {
        samples.reduce(Float(0.0)) { max($0, abs($1)) }
    }

    private func goertzelEnergy(_ samples: ArraySlice<Float>, sampleRate: Double, targetFreq: Double) -> Double {
        guard !samples.isEmpty else { return 0.0 }
        let k = (Double(samples.count) * targetFreq) / sampleRate
        let omega = (2.0 * Double.pi * k) / Double(samples.count)
        let coeff = 2.0 * cos(omega)
        var q0 = 0.0
        var q1 = 0.0
        var q2 = 0.0
        for s in samples {
            q0 = coeff * q1 - q2 + Double(s)
            q2 = q1
            q1 = q0
        }
        return max(0.0, q1 * q1 + q2 * q2 - q1 * q2 * coeff) / Double(samples.count)
    }

    private func bandEnergy(_ samples: ArraySlice<Float>, sampleRate: Double, frequencies: [Double]) -> Double {
        frequencies.reduce(0.0) { $0 + goertzelEnergy(samples, sampleRate: sampleRate, targetFreq: $1) }
    }

    private func writeSineWAV(to url: URL, freq: Double = 440.0, duration: Double = 0.4, sampleRate: Double = 48000.0) throws {
        let frames = Int(sampleRate * duration)
        guard let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 2),
              let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(frames)) else {
            XCTFail("Could not create test sine format")
            return
        }
        buffer.frameLength = AVAudioFrameCount(frames)
        let ch = buffer.floatChannelData!
        for i in 0..<frames {
            let v = Float(0.35 * sin(2.0 * Double.pi * freq * Double(i) / sampleRate))
            ch[0][i] = v
            ch[1][i] = v
        }
        let settings: [String: Any] = [
            AVFormatIDKey: kAudioFormatLinearPCM,
            AVSampleRateKey: sampleRate,
            AVNumberOfChannelsKey: 2,
            AVLinearPCMBitDepthKey: 16,
            AVLinearPCMIsFloatKey: false,
            AVLinearPCMIsBigEndianKey: false,
            AVLinearPCMIsNonInterleaved: false
        ]
        let file = try AVAudioFile(forWriting: url, settings: settings, commonFormat: .pcmFormatFloat32, interleaved: false)
        try file.write(from: buffer)
    }

    // MARK: - 1. Public API & View Backward Compatibility

    func testPublicAPIAndViewBackwardCompatibility() async {
        await MainActor.run {
            _ = NativeAudioEngine.shared
            let engine = NativeAudioEngine(autoStartEngine: false)

            XCTAssertFalse(engine.isPlaying)
            XCTAssertEqual(engine.bpm, 104.0)
            XCTAssertEqual(engine.swing, 0.0)
            XCTAssertTrue(engine.percussionEnabled)
            XCTAssertTrue(engine.autoAdvanceSections)
            XCTAssertEqual(engine.currentSectionIndex, 0)
            XCTAssertNil(engine.queuedSectionIndex)
            XCTAssertEqual(engine.currentChordIndex, 0)
            XCTAssertEqual(engine.currentStep, 0)
            XCTAssertEqual(engine.currentRepeat, 0)
            XCTAssertEqual(engine.sections.count, 4)
            XCTAssertEqual(engine.chordInstrument, .nylon)
            XCTAssertEqual(engine.soloInstrument, .violin)
            XCTAssertEqual(engine.bodyPreset, .dreadnought)
            XCTAssertEqual(engine.scaleRoot, "A")
            XCTAssertEqual(engine.scaleId, "minor")
            _ = engine.harmonyMode

            XCTAssertEqual(engine.warmth, 0.65, accuracy: 0.01)
            XCTAssertEqual(engine.airSheen, 0.75, accuracy: 0.01)
            XCTAssertEqual(engine.pickAttack, 0.50, accuracy: 0.01)
            XCTAssertEqual(engine.spaceReverbWet, 0.30, accuracy: 0.01)
            XCTAssertEqual(engine.strumSpread, 0.40, accuracy: 0.01)
            XCTAssertEqual(engine.activeSpacePreset, .warmWood)

            XCTAssertGreaterThan(engine.masterVolume, 0.0)
            XCTAssertFalse(engine.masterMuted)
            XCTAssertFalse(engine.chordMuted)
            XCTAssertFalse(engine.drumMuted)
            XCTAssertFalse(engine.soloMuted)
            XCTAssertFalse(engine.vocalMuted)
            XCTAssertFalse(engine.chordSolo)
            XCTAssertFalse(engine.drumSolo)
            XCTAssertFalse(engine.soloSolo)
            XCTAssertFalse(engine.vocalSolo)

            XCTAssertFalse(engine.isRecordingVocal)
            XCTAssertEqual(engine.vocalInputLevel, 0.0)
            XCTAssertNil(engine.recordedVocalURL)
            XCTAssertEqual(engine.recordedVocalDuration, 0.0)
            XCTAssertFalse(engine.vocalPermissionDenied)
            XCTAssertFalse(engine.monitorVocalInput)
            XCTAssertFalse(engine.isRecordingSolo)
            XCTAssertTrue(engine.soloLoopEvents.isEmpty)
            XCTAssertFalse(engine.soloLoopMuted)

            let am = ChordLibrary.chordNamed("Am")
            engine.strumChord(am)
            engine.strumChord(am, downstroke: true, instrument: .steel)
            engine.playSingleString(chord: am, stringIndex: 1, velocity: 0.8)
            engine.playSoloNote(freq: 440.0, duration: 0.5, velocity: 0.8, instrument: .nylon)
            engine.playDrumHit("kick")

            engine.setSpaceDesignerPreset(.mediumChamber)
            XCTAssertEqual(engine.activeSpacePreset, .warmWood)
            engine.setSpaceDesignerPreset(.largeHall)
            XCTAssertEqual(engine.activeSpacePreset, .concertHall)
            engine.setSpaceDesignerPreset(.plate)
            XCTAssertEqual(engine.activeSpacePreset, .plate)
            engine.setSpaceDesignerPreset(.dryRoom)
            XCTAssertEqual(engine.activeSpacePreset, .dryRoom)

            engine.setWarmthValue(0.8)
            engine.setAirSheenValue(0.9)
            engine.setPickAttackValue(0.7)
            engine.setStrumSpreadValue(0.6)
            engine.setReverbWet(0.4)
            engine.applyBodyPreset(.twelveStringShimmer)
            XCTAssertEqual(engine.bodyPreset, .twelveStringShimmer)

            let stoppedURL: URL? = engine.stopVocalRecording()
            XCTAssertNil(stoppedURL)

            engine.togglePlayback(sections: DefaultSections.initial, instrument: .steel)
            XCTAssertTrue(engine.isPlaying)
            engine.togglePlayback(sections: DefaultSections.initial, instrument: .steel)
            XCTAssertFalse(engine.isPlaying)

            engine.startPlayback(sections: DefaultSections.initial)
            XCTAssertTrue(engine.isPlaying)
            engine.resetTransport()
            XCTAssertFalse(engine.isPlaying)
        }
    }

    // MARK: - 2. Non-Blocking MainActor Interactive Playback

    func testInteractivePlaybackDoesNotBlockMainThread() async {
        await MainActor.run {
            let engine = NativeAudioEngine(autoStartEngine: false)
            let am = ChordLibrary.chordNamed("Am")

            let start = CFAbsoluteTimeGetCurrent()
            for i in 0..<10 {
                engine.chordInstrument = AcousticInstrumentType.allCases[i % 8]
                engine.strumChord(am, stroke: .down, velocity: 0.9)
                engine.playSoloMidi(60 + i, velocity: 0.9)
                engine.playDrumPad(DrumHitType.allCases[i % DrumHitType.allCases.count], velocity: 0.9)
            }
            let elapsed = CFAbsoluteTimeGetCurrent() - start
            XCTAssertLessThan(elapsed, 0.25, "Interactive playback blocked MainActor for \(elapsed)s")
        }
    }

    // MARK: - 3. All 9 Instrument Timbres Produce Distinct Valid Audio

    func testAllNineInstrumentTimbresProduceDistinctValidAudio() async throws {
        let engine = await MainActor.run { () -> NativeAudioEngine in
            let e = NativeAudioEngine(autoStartEngine: false)
            e.sections = [SongSection(id: "t", name: "Test", chords: ["Am"], patternId: "folk-rock", repeats: 1, drumMode: "mute")]
            e.bpm = 140.0
            e.percussionEnabled = false
            e.spaceReverbWet = 0.0
            e.strumSpread = 0.0
            return e
        }

        var buffersByInst: [AcousticInstrumentType: (left: [Float], sampleRate: Double)] = [:]
        for inst in AcousticInstrumentType.allCases {
            await MainActor.run { engine.chordInstrument = inst }
            let url = makeTempURL()
            defer { try? FileManager.default.removeItem(at: url) }
            try await engine.exportMixdownWAV(to: url)
            let wav = try readWAV(url)
            let p = peak(wav.left[...])
            let r = rms(wav.left[...])
            XCTAssertGreaterThan(p, 0.01, "\(inst.rawValue) produced near-zero peak")
            XCTAssertLessThanOrEqual(p, 1.0, "\(inst.rawValue) clipped above 1.0")
            XCTAssertGreaterThan(r, 0.001, "\(inst.rawValue) produced near-silent RMS")
            buffersByInst[inst] = (wav.left, wav.sampleRate)
        }

        let bass = buffersByInst[.bass]!
        let violin = buffersByInst[.violin]!
        let steel = buffersByInst[.steel]!
        let nylon = buffersByInst[.nylon]!
        let piano = buffersByInst[.piano]!
        let clarinet = buffersByInst[.clarinet]!
        let altoSax = buffersByInst[.altoSax]!

        let bassSlice = bass.left.prefix(Int(bass.sampleRate * 0.4))
        let violinSlice = violin.left.prefix(Int(violin.sampleRate * 0.4))
        let bassLowRatio = bandEnergy(bassSlice, sampleRate: bass.sampleRate, frequencies: [82, 110, 147, 220])
            / max(1e-9, bandEnergy(bassSlice, sampleRate: bass.sampleRate, frequencies: [1200, 2400, 3600]))
        let violinLowRatio = bandEnergy(violinSlice, sampleRate: violin.sampleRate, frequencies: [82, 110, 147, 220])
            / max(1e-9, bandEnergy(violinSlice, sampleRate: violin.sampleRate, frequencies: [1200, 2400, 3600]))
        XCTAssertGreaterThan(bassLowRatio, violinLowRatio, "Bass must have higher low/high energy ratio than violin")

        let steelSlice = steel.left.prefix(Int(steel.sampleRate * 0.4))
        let nylonSlice = nylon.left.prefix(Int(nylon.sampleRate * 0.4))
        let steelHF = bandEnergy(steelSlice, sampleRate: steel.sampleRate, frequencies: [2800, 3600, 4800])
        let nylonHF = bandEnergy(nylonSlice, sampleRate: nylon.sampleRate, frequencies: [2800, 3600, 4800])
        XCTAssertGreaterThan(steelHF, nylonHF, "Steel guitar should have brighter upper-harmonic energy than nylon")

        let pianoAttackRatio = rms(piano.left[0..<Int(piano.sampleRate * 0.015)])
            / max(1e-6, rms(piano.left[Int(piano.sampleRate * 0.06)..<Int(piano.sampleRate * 0.16)]))
        let violinAttackRatio = rms(violin.left[0..<Int(violin.sampleRate * 0.015)])
            / max(1e-6, rms(violin.left[Int(violin.sampleRate * 0.06)..<Int(violin.sampleRate * 0.16)]))
        XCTAssertGreaterThan(pianoAttackRatio, violinAttackRatio, "Piano hammer transient must be faster than bowed violin swell")

        let n = min(clarinet.left.count, altoSax.left.count, Int(clarinet.sampleRate * 0.25))
        let diff = zip(clarinet.left[0..<n], altoSax.left[0..<n]).reduce(0.0) { $0 + abs(Double($1.0 - $1.1)) } / Double(n)
        XCTAssertGreaterThan(diff, 0.005, "Clarinet and Alto Sax must synthesize distinct waveforms")
    }

    // MARK: - 4. All 6 Drum Hits & 5 Drum Modes

    func testAllSixDrumHitsAndFiveDrumModes() async throws {
        let engine = await MainActor.run { () -> NativeAudioEngine in
            let e = NativeAudioEngine(autoStartEngine: false)
            for hit in DrumHitType.allCases {
                e.playDrumPad(hit, velocity: 0.9)
            }
            e.chordMuted = true
            e.percussionEnabled = true
            e.spaceReverbWet = 0.0
            e.bpm = 120.0
            return e
        }

        var rmsByMode: [DrumMode: Double] = [:]
        for mode in DrumMode.allCases {
            await MainActor.run {
                engine.sections = [
                    SongSection(id: "d", name: "Drums", chords: ["Am"], patternId: "folk-rock", repeats: 1, drumMode: mode.rawValue)
                ]
            }
            let url = makeTempURL()
            defer { try? FileManager.default.removeItem(at: url) }
            try await engine.exportMixdownWAV(to: url)
            let wav = try readWAV(url)
            rmsByMode[mode] = rms(wav.left[...])
            if mode == .mute {
                XCTAssertEqual(peak(wav.left[...]), 0.0, accuracy: 1e-6, ".mute drumMode should produce silence when chords muted")
            } else {
                XCTAssertGreaterThan(rmsByMode[mode]!, 0.002, "\(mode.rawValue) should produce audible drums")
            }
        }

        XCTAssertGreaterThan(rmsByMode[.full]!, rmsByMode[.shakerOnly]!, ".full drumMode should have higher energy than .shakerOnly")
    }

    // MARK: - 5. Pick Attack Modulates First 25ms Transient Energy

    func testPickAttackModulatesFirst25msTransientEnergy() async throws {
        let engine = await MainActor.run { () -> NativeAudioEngine in
            let e = NativeAudioEngine(autoStartEngine: false)
            e.sections = [SongSection(id: "p", name: "Pick", chords: ["Am"], patternId: "folk-rock", repeats: 1, drumMode: "mute")]
            e.chordInstrument = .steel
            e.percussionEnabled = false
            e.spaceReverbWet = 0.0
            e.strumSpread = 0.0
            e.bpm = 120.0
            e.pickAttack = 0.0
            return e
        }

        let urlLow = makeTempURL()
        defer { try? FileManager.default.removeItem(at: urlLow) }
        try await engine.exportMixdownWAV(to: urlLow)
        let wavLow = try readWAV(urlLow)

        await MainActor.run { engine.pickAttack = 1.0 }
        let urlHigh = makeTempURL()
        defer { try? FileManager.default.removeItem(at: urlHigh) }
        try await engine.exportMixdownWAV(to: urlHigh)
        let wavHigh = try readWAV(urlHigh)

        let windowFrames = Int(wavHigh.sampleRate * 0.025)
        let rmsLow = rms(wavLow.left[0..<windowFrames])
        let rmsHigh = rms(wavHigh.left[0..<windowFrames])
        let peakLow = peak(wavLow.left[0..<windowFrames])
        let peakHigh = peak(wavHigh.left[0..<windowFrames])

        XCTAssertGreaterThan(rmsHigh, rmsLow * 1.15, "pickAttack=1.0 must produce >15% higher 0-25ms transient RMS than pickAttack=0.0")
        XCTAssertGreaterThan(peakHigh, peakLow * 1.15, "pickAttack=1.0 must produce >15% higher 0-25ms transient peak than pickAttack=0.0")
    }

    // MARK: - 6. Warmth (108Hz) & Air Sheen (4.5kHz) Spectral Deltas

    func testWarmthAndAirSheenEQSpectralDeltas() async throws {
        let engine = await MainActor.run { () -> NativeAudioEngine in
            let e = NativeAudioEngine(autoStartEngine: false)
            e.sections = [SongSection(id: "eq", name: "EQ", chords: ["Am"], patternId: "folk-rock", repeats: 1, drumMode: "mute")]
            e.chordInstrument = .steel
            e.percussionEnabled = false
            e.spaceReverbWet = 0.0
            e.bpm = 120.0
            e.setAirSheenValue(0.5)
            e.setWarmthValue(0.0)
            return e
        }

        let urlCold = makeTempURL()
        defer { try? FileManager.default.removeItem(at: urlCold) }
        try await engine.exportMixdownWAV(to: urlCold)
        let wavCold = try readWAV(urlCold)

        await MainActor.run { engine.setWarmthValue(1.0) }
        let urlWarm = makeTempURL()
        defer { try? FileManager.default.removeItem(at: urlWarm) }
        try await engine.exportMixdownWAV(to: urlWarm)
        let wavWarm = try readWAV(urlWarm)

        let nW = min(wavCold.left.count, Int(wavCold.sampleRate * 0.5))
        let lowFreqs = [82.0, 108.0, 146.0]
        let coldLowEnergy = bandEnergy(wavCold.left[0..<nW], sampleRate: wavCold.sampleRate, frequencies: lowFreqs)
        let warmLowEnergy = bandEnergy(wavWarm.left[0..<nW], sampleRate: wavWarm.sampleRate, frequencies: lowFreqs)
        XCTAssertGreaterThan(warmLowEnergy, coldLowEnergy * 1.25, "Warmth=1.0 must boost 108Hz low-band energy")

        await MainActor.run {
            engine.setWarmthValue(0.5)
            engine.setAirSheenValue(0.0)
        }
        let urlDull = makeTempURL()
        defer { try? FileManager.default.removeItem(at: urlDull) }
        try await engine.exportMixdownWAV(to: urlDull)
        let wavDull = try readWAV(urlDull)

        await MainActor.run { engine.setAirSheenValue(1.0) }
        let urlAiry = makeTempURL()
        defer { try? FileManager.default.removeItem(at: urlAiry) }
        try await engine.exportMixdownWAV(to: urlAiry)
        let wavAiry = try readWAV(urlAiry)

        let nA = min(wavDull.left.count, Int(wavDull.sampleRate * 0.5))
        let highFreqs = [4800.0, 6200.0, 8000.0]
        let dullHighEnergy = bandEnergy(wavDull.left[0..<nA], sampleRate: wavDull.sampleRate, frequencies: highFreqs)
        let airyHighEnergy = bandEnergy(wavAiry.left[0..<nA], sampleRate: wavAiry.sampleRate, frequencies: highFreqs)
        XCTAssertGreaterThan(airyHighEnergy, dullHighEnergy * 1.25, "Air Sheen=1.0 must boost >=4.5kHz high-band energy")
    }

    // MARK: - 7. Space Designer Presets & Strum Spread

    func testSpaceDesignerPresetsAndStrumSpread() async throws {
        let engine = await MainActor.run { () -> NativeAudioEngine in
            let e = NativeAudioEngine(autoStartEngine: false)
            e.sections = [SongSection(id: "sp", name: "Space", chords: ["Am"], patternId: "folk-rock", repeats: 1, drumMode: "mute")]
            e.chordInstrument = .nylon
            e.percussionEnabled = false
            e.bpm = 120.0
            e.setSpaceDesignerPreset(.dryRoom)
            e.setReverbWet(0.0)
            return e
        }

        let urlDry = makeTempURL()
        defer { try? FileManager.default.removeItem(at: urlDry) }
        try await engine.exportMixdownWAV(to: urlDry)
        let wavDry = try readWAV(urlDry)

        await MainActor.run {
            engine.setSpaceDesignerPreset(.concertHall)
            engine.setReverbWet(0.85)
        }
        let urlHall = makeTempURL()
        defer { try? FileManager.default.removeItem(at: urlHall) }
        try await engine.exportMixdownWAV(to: urlHall)
        let wavHall = try readWAV(urlHall)

        XCTAssertGreaterThan(wavHall.left.count, wavDry.left.count, "Concert Hall tail should extend mixdown length beyond dry")
        let tailStart = Int(wavDry.sampleRate * 2.15)
        let tailEnd = min(wavHall.left.count, tailStart + Int(wavHall.sampleRate * 0.5))
        XCTAssertGreaterThan(rms(wavHall.left[tailStart..<tailEnd]), 0.0005, "Concert Hall must generate an audible reverb tail")

        await MainActor.run {
            engine.setSpaceDesignerPreset(.plate)
            XCTAssertEqual(engine.activeSpacePreset, .plate)
            engine.setReverbWet(0.0)
            engine.setStrumSpreadValue(0.0)
        }

        let urlNarrow = makeTempURL()
        defer { try? FileManager.default.removeItem(at: urlNarrow) }
        try await engine.exportMixdownWAV(to: urlNarrow)
        let wavNarrow = try readWAV(urlNarrow)

        await MainActor.run { engine.setStrumSpreadValue(1.0) }
        let urlWide = makeTempURL()
        defer { try? FileManager.default.removeItem(at: urlWide) }
        try await engine.exportMixdownWAV(to: urlWide)
        let wavWide = try readWAV(urlWide)

        let n = min(wavNarrow.left.count, wavWide.left.count, Int(wavWide.sampleRate * 0.5))
        let narrowDiff = zip(wavNarrow.left[0..<n], wavNarrow.right[0..<n]).map { $0 - $1 }
        let wideDiff = zip(wavWide.left[0..<n], wavWide.right[0..<n]).map { $0 - $1 }
        XCTAssertGreaterThan(rms(wideDiff[...]), rms(narrowDiff[...]) + 0.001, "Strum Spread=1.0 must widen stereo L-R image")
    }

    // MARK: - 8. Mixer Track Mute, Solo & Volume Isolation

    func testMixerTrackMutesSoloAndMasterMute() async throws {
        let engine = await MainActor.run { () -> NativeAudioEngine in
            let e = NativeAudioEngine(autoStartEngine: false)
            e.sections = [SongSection(id: "m", name: "Mix", chords: ["Am"], patternId: "folk-rock", repeats: 1, drumMode: "full")]
            e.bpm = 140.0
            e.spaceReverbWet = 0.0
            e.masterMuted = true
            return e
        }

        let urlMasterMute = makeTempURL()
        defer { try? FileManager.default.removeItem(at: urlMasterMute) }
        try await engine.exportMixdownWAV(to: urlMasterMute)
        let wavMasterMute = try readWAV(urlMasterMute)
        XCTAssertEqual(peak(wavMasterMute.left[...]), 0.0, accuracy: 1e-6)

        await MainActor.run {
            engine.masterMuted = false
            engine.chordMuted = true
            engine.drumMuted = true
            engine.soloMuted = true
            engine.vocalMuted = true
        }
        let urlAllMuted = makeTempURL()
        defer { try? FileManager.default.removeItem(at: urlAllMuted) }
        try await engine.exportMixdownWAV(to: urlAllMuted)
        let wavAllMuted = try readWAV(urlAllMuted)
        XCTAssertEqual(peak(wavAllMuted.left[...]), 0.0, accuracy: 1e-6)

        await MainActor.run {
            engine.chordMuted = false
            engine.drumMuted = false
            engine.drumSolo = true
        }
        let urlDrumSolo = makeTempURL()
        defer { try? FileManager.default.removeItem(at: urlDrumSolo) }
        try await engine.exportMixdownWAV(to: urlDrumSolo)
        let wavDrumSolo = try readWAV(urlDrumSolo)
        XCTAssertGreaterThan(rms(wavDrumSolo.left[...]), 0.002)

        await MainActor.run {
            engine.drumSolo = false
            engine.drumMuted = true
            engine.chordMuted = false
            engine.chordVolume = 1.0
        }
        let urlFull = makeTempURL()
        defer { try? FileManager.default.removeItem(at: urlFull) }
        try await engine.exportMixdownWAV(to: urlFull)
        let wavFull = try readWAV(urlFull)

        await MainActor.run { engine.chordVolume = 0.25 }
        let urlQuarter = makeTempURL()
        defer { try? FileManager.default.removeItem(at: urlQuarter) }
        try await engine.exportMixdownWAV(to: urlQuarter)
        let wavQuarter = try readWAV(urlQuarter)

        XCTAssertLessThan(rms(wavQuarter.left[...]), rms(wavFull.left[...]) * 0.45)
    }

    // MARK: - 9. Sequencer Bounds Safety & Quantized Section Queue

    func testSequencerBoundsSafetyAndQuantizedSectionQueue() async throws {
        let engine = await MainActor.run { () -> NativeAudioEngine in
            let e = NativeAudioEngine(autoStartEngine: false)
            e.queueSection(-1)
            XCTAssertEqual(e.currentSectionIndex, 0)
            e.queueSection(999)
            XCTAssertEqual(e.currentSectionIndex, 0)

            e.queueSection(2)
            XCTAssertEqual(e.currentSectionIndex, 2)
            XCTAssertNil(e.queuedSectionIndex)

            e.sections = [
                SongSection(id: "s0", name: "S0", chords: ["Am"], patternId: "folk-rock", repeats: 4, drumMode: "mute"),
                SongSection(id: "s1", name: "S1", chords: ["F"], patternId: "folk-rock", repeats: 4, drumMode: "mute")
            ]
            e.bpm = 180.0
            e.queueSection(0)
            e.startPlayback()
            XCTAssertTrue(e.isPlaying)

            e.queueSection(1)
            XCTAssertEqual(e.queuedSectionIndex, 1)
            return e
        }

        let deadline = Date().addingTimeInterval(2.5)
        while Date() < deadline {
            let secIdx = await MainActor.run { engine.currentSectionIndex }
            if secIdx == 1 { break }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        await MainActor.run {
            XCTAssertEqual(engine.currentSectionIndex, 1, "Quantized section queue did not transition at bar boundary")
            XCTAssertNil(engine.queuedSectionIndex)
            engine.stopPlayback()

            engine.sections = []
            engine.startPlayback()
            engine.strumChord(ChordLibrary.chordNamed("Am"))
            engine.playSoloMidi(60)
        }

        let emptyURL = makeTempURL()
        defer { try? FileManager.default.removeItem(at: emptyURL) }
        try await engine.exportMixdownWAV(to: emptyURL)
        _ = try readWAV(emptyURL)

        await MainActor.run {
            engine.stopPlayback()
            engine.sections = [SongSection(id: "emptyChords", name: "Empty", chords: [], repeats: 0, drumMode: "mute")]
            engine.startPlayback()
        }

        let emptyChordsURL = makeTempURL()
        defer { try? FileManager.default.removeItem(at: emptyChordsURL) }
        try await engine.exportMixdownWAV(to: emptyChordsURL)
        _ = try readWAV(emptyChordsURL)
        await MainActor.run { engine.stopPlayback() }
    }

    // MARK: - 10. Solo Looper Snapping & Mixdown Inclusion

    func testSoloLooperZeroErrorSnappingAndMixdownInclusion() async throws {
        let engine = await MainActor.run { () -> NativeAudioEngine in
            let e = NativeAudioEngine(autoStartEngine: false)
            e.sections = [
                SongSection(id: "s0", name: "Verse", chords: ["Am"], patternId: "folk-rock", repeats: 1, drumMode: "mute")
            ]
            e.harmonyMode = .chordTones
            e.soloInstrument = .clarinet
            e.isRecordingSolo = true
            e.bpm = 120.0
            e.spaceReverbWet = 0.0

            e.playSoloMidi(62, velocity: 0.9)
            XCTAssertEqual(e.soloLoopEvents.count, 1)
            XCTAssertEqual(e.soloLoopEvents.first?.midi, 60)
            XCTAssertEqual(e.soloLoopEvents.first?.instrument, .clarinet)

            e.chordMuted = true
            e.drumMuted = true
            e.soloMuted = false
            e.soloLoopMuted = false
            return e
        }

        let urlSoloOn = makeTempURL()
        defer { try? FileManager.default.removeItem(at: urlSoloOn) }
        try await engine.exportMixdownWAV(to: urlSoloOn)
        let wavSoloOn = try readWAV(urlSoloOn)
        XCTAssertGreaterThan(rms(wavSoloOn.left[...]), 0.002)

        await MainActor.run { engine.soloLoopMuted = true }
        let urlLoopMuted = makeTempURL()
        defer { try? FileManager.default.removeItem(at: urlLoopMuted) }
        try await engine.exportMixdownWAV(to: urlLoopMuted)
        let wavLoopMuted = try readWAV(urlLoopMuted)
        XCTAssertEqual(peak(wavLoopMuted.left[...]), 0.0, accuracy: 1e-6)

        await MainActor.run {
            engine.clearSoloLoop()
            XCTAssertTrue(engine.soloLoopEvents.isEmpty)
        }
    }

    // MARK: - 11. Vocal Recording Safety, Mixdown Inclusion & Delete

    func testVocalRecordingSafetySyncMixdownAndDelete() async throws {
        let engine = await MainActor.run { NativeAudioEngine(autoStartEngine: false) }

        await engine.startVocalRecording()
        await MainActor.run {
            XCTAssertFalse(engine.isRecordingVocal)
            XCTAssertNil(engine.stopVocalRecording())
        }

        let vocalURL = makeTempURL()
        try writeSineWAV(to: vocalURL, freq: 440.0, duration: 0.5)
        defer { try? FileManager.default.removeItem(at: vocalURL) }

        await MainActor.run {
            engine.recordedVocalURL = vocalURL
            XCTAssertEqual(engine.recordedVocalDuration, 0.5, accuracy: 0.05)
            engine.playVocalTakePreview()

            engine.sections = [SongSection(id: "v", name: "V", chords: ["Am"], patternId: "folk-rock", repeats: 1, drumMode: "mute")]
            engine.chordMuted = true
            engine.drumMuted = true
            engine.soloMuted = true
            engine.vocalMuted = false
            engine.spaceReverbWet = 0.0
        }

        let urlVocalMix = makeTempURL()
        defer { try? FileManager.default.removeItem(at: urlVocalMix) }
        try await engine.exportMixdownWAV(to: urlVocalMix)
        let wavVocalMix = try readWAV(urlVocalMix)
        XCTAssertGreaterThan(rms(wavVocalMix.left[...]), 0.01, "Vocal take must be included in mixdown")

        await MainActor.run { engine.vocalMuted = true }
        let urlVocalMuted = makeTempURL()
        defer { try? FileManager.default.removeItem(at: urlVocalMuted) }
        try await engine.exportMixdownWAV(to: urlVocalMuted)
        let wavVocalMuted = try readWAV(urlVocalMuted)
        XCTAssertEqual(peak(wavVocalMuted.left[...]), 0.0, accuracy: 1e-6)

        await MainActor.run {
            engine.deleteVocalTake()
            XCTAssertNil(engine.recordedVocalURL)
            XCTAssertEqual(engine.recordedVocalDuration, 0.0)
        }
        XCTAssertFalse(FileManager.default.fileExists(atPath: vocalURL.path))
    }

    // MARK: - 12. Config Change Recovery & Project JSON Export

    func testConfigChangeRecoveryAndProjectJSONExport() async throws {
        let engine = await MainActor.run { () -> NativeAudioEngine in
            let e = NativeAudioEngine(autoStartEngine: false)
            e.bpm = 118.0
            e.swing = 0.22
            e.chordInstrument = .steel
            e.soloInstrument = .altoSax
            e.applyBodyPreset(.twelveStringShimmer)
            e.setSpaceDesignerPreset(.concertHall)
            e.setWarmthValue(0.74)
            e.setAirSheenValue(0.82)
            e.setPickAttackValue(0.68)
            e.setReverbWet(0.45)
            return e
        }

        NotificationCenter.default.post(name: .AVAudioEngineConfigurationChange, object: nil)
        try await Task.sleep(nanoseconds: 120_000_000)

        let lyrics = ["intro": "[Am] Gece", "verse": "[Dm] Rüzgar"]
        let rawData = await MainActor.run { engine.exportProjectJSON(lyrics: lyrics) }
        let data = try XCTUnwrap(rawData)
        let decoded = try await SongProjectStore.shared.importJSONData(data)

        XCTAssertEqual(decoded.bpm, 118.0, accuracy: 0.01)
        XCTAssertEqual(decoded.swing, 0.22, accuracy: 0.01)
        XCTAssertEqual(decoded.chordInstrument, .steel)
        XCTAssertEqual(decoded.soloInstrument, .altoSax)
        XCTAssertEqual(decoded.bodyPreset, .twelveStringShimmer)
        XCTAssertEqual(decoded.spaceDesignerPreset, .concertHall)
        XCTAssertEqual(decoded.warmth, 0.74, accuracy: 0.01)
        XCTAssertEqual(decoded.airSheen, 0.82, accuracy: 0.01)
        XCTAssertEqual(decoded.pickAttack, 0.68, accuracy: 0.01)
        XCTAssertEqual(decoded.spaceReverbWet, 0.45, accuracy: 0.01)
        XCTAssertEqual(decoded.lyrics, lyrics)
    }

    // MARK: - 13. Live CoreAudio Graph Connectivity (autoStartEngine: true & .shared)

    func testLiveEngineGraphAllFourMixersAndSharedPlaybackDoNotCrash() async throws {
        // Write a mono 16kHz vocal take to test live format resampling on vocalPreviewPlayer
        let monoVocalURL = makeTempURL(ext: "wav")
        defer { try? FileManager.default.removeItem(at: monoVocalURL) }
        do {
            let sr = 16000.0
            let frames = Int(sr * 0.25)
            guard let format = AVAudioFormat(standardFormatWithSampleRate: sr, channels: 1),
                  let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(frames)),
                  let ch = buffer.floatChannelData else {
                XCTFail("Failed to allocate mono vocal test buffer")
                return
            }
            buffer.frameLength = AVAudioFrameCount(frames)
            for i in 0..<frames {
                ch[0][i] = Float(0.25 * sin(2.0 * Double.pi * 330.0 * Double(i) / sr))
            }
            let settings: [String: Any] = [
                AVFormatIDKey: kAudioFormatLinearPCM,
                AVSampleRateKey: sr,
                AVNumberOfChannelsKey: 1,
                AVLinearPCMBitDepthKey: 16,
                AVLinearPCMIsFloatKey: false,
                AVLinearPCMIsBigEndianKey: false,
                AVLinearPCMIsNonInterleaved: false
            ]
            let file = try AVAudioFile(forWriting: monoVocalURL, settings: settings, commonFormat: .pcmFormatFloat32, interleaved: false)
            try file.write(from: buffer)
        }

        let liveEngine = await MainActor.run { () -> NativeAudioEngine in
            let e = NativeAudioEngine(autoStartEngine: true)
            e.masterMuted = true // Exercise full live AVAudioPlayerNode graph silently
            e.bpm = 160.0
            e.recordedVocalURL = monoVocalURL

            // Exercise all 4 mixer paths (chord, solo, drum, vocal) on live graph
            let am = ChordLibrary.chordNamed("Am")
            e.strumChord(am, stroke: .down, velocity: 0.9)
            e.playSingleString(chord: am, stringIndex: 2, velocity: 0.85)
            e.playSoloMidi(64, velocity: 0.9)
            e.playDrumPad(.cajonBass, velocity: 0.95)
            e.playVocalTakePreview()

            // Exercise live sequencer startPlayback -> stopPlayback -> rapid restart
            e.isRecordingSolo = true
            e.playSoloMidi(67, velocity: 0.85)
            e.isRecordingSolo = false
            e.startPlayback()
            return e
        }

        try await Task.sleep(nanoseconds: 250_000_000)

        await MainActor.run {
            XCTAssertTrue(liveEngine.isPlaying)
            liveEngine.stopPlayback()
            XCTAssertFalse(liveEngine.isPlaying)

            // Rapid stop/start session token stress
            for _ in 0..<5 {
                liveEngine.startPlayback()
                liveEngine.stopPlayback()
            }
            XCTAssertFalse(liveEngine.isPlaying)
            liveEngine.recordedVocalURL = nil

            // Exercise NativeAudioEngine.shared on all interactive paths
            let shared = NativeAudioEngine.shared
            let prevMuted = shared.masterMuted
            shared.masterMuted = true
            shared.strumChord(ChordLibrary.chordNamed("Em"))
            shared.playSoloMidi(62)
            shared.playDrumPad(.cajonSlap)
            shared.startPlayback()
            shared.stopPlayback()
            shared.masterMuted = prevMuted
        }

        // Drain async buffer render completions cleanly
        try await Task.sleep(nanoseconds: 120_000_000)
    }

    // MARK: - 14. Solo Looper Drum Consistency & Vocal Re-Entry Safety

    func testSoloLooperDrumsAndVocalConcurrencyGuards() async throws {
        let engine = await MainActor.run { () -> NativeAudioEngine in
            let e = NativeAudioEngine(autoStartEngine: false)
            e.sections = [
                SongSection(id: "d", name: "Drums", chords: ["Am"], patternId: "folk-rock", repeats: 1, drumMode: "mute")
            ]
            e.chordMuted = true
            e.drumMuted = true
            e.soloMuted = false
            e.soloLoopMuted = false
            e.spaceReverbWet = 0.0
            e.bpm = 120.0
            e.harmonyMode = .freeScale
            e.soloInstrument = .drums
            e.isRecordingSolo = true
            e.playSoloMidi(60, velocity: 0.95) // 60 % 6 == 0 -> cajonBass
            return e
        }

        let bassURL = makeTempURL()
        defer { try? FileManager.default.removeItem(at: bassURL) }
        try await engine.exportMixdownWAV(to: bassURL)
        let bassWAV = try readWAV(bassURL)
        XCTAssertGreaterThan(rms(bassWAV.left[...]), 0.002)

        await MainActor.run {
            engine.clearSoloLoop()
            engine.playSoloMidi(62, velocity: 0.95) // 62 % 6 == 2 -> shakerClosed
        }
        let shakerURL = makeTempURL()
        defer { try? FileManager.default.removeItem(at: shakerURL) }
        try await engine.exportMixdownWAV(to: shakerURL)
        let shakerWAV = try readWAV(shakerURL)
        XCTAssertGreaterThan(rms(shakerWAV.left[...]), 0.0005)

        let bassLow = bandEnergy(bassWAV.left.prefix(Int(bassWAV.sampleRate * 0.2)), sampleRate: bassWAV.sampleRate, frequencies: [70, 95, 120])
        let shakerLow = bandEnergy(shakerWAV.left.prefix(Int(shakerWAV.sampleRate * 0.2)), sampleRate: shakerWAV.sampleRate, frequencies: [70, 95, 120])
        XCTAssertGreaterThan(bassLow, shakerLow * 3.0, "MIDI 60 (.cajonBass) must have much higher sub-bass energy than MIDI 62 (.shakerClosed)")

        // Verify concurrent async startVocalRecording + sync startVocalRecording/startPlayback race safety
        await withTaskGroup(of: Void.self) { group in
            for _ in 0..<4 {
                group.addTask {
                    await engine.startVocalRecording()
                }
            }
        }
        await MainActor.run {
            engine.startVocalRecording()
            engine.startPlayback()
            engine.stopPlayback()
            XCTAssertFalse(engine.isRecordingVocal)
        }
    }
}
