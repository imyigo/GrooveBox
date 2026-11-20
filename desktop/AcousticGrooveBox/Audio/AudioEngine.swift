import Foundation
import AVFoundation
import AudioToolbox
import Accelerate

/// Apple CoreAudio & AVAudioEngine tabanlı ultra-düşük gecikmeli profesyonel ses motoru
public final class NativeAudioEngine: ObservableObject {
    public static let shared = NativeAudioEngine()

    private let engine = AVAudioEngine()

    // DSP Nodes (Logic Pro Channel Strip)
    private let mainMixer: AVAudioMixerNode
    private let chordMixer = AVAudioMixerNode()
    private let soloMixer = AVAudioMixerNode()
    private let drumMixer = AVAudioMixerNode()
    private let vocalMixer = AVAudioMixerNode()

    // Logic Space Designer & EQ
    private let reverbNode = AVAudioUnitReverb()
    private let eqNode = AVAudioUnitEQ(numberOfBands: 3)

    // Player Nodes for polyphonic acoustic synthesis
    private var playerNodes: [AVAudioPlayerNode] = []
    private var sampleRate: Double = 44100.0

    // Vokal Kaydı (Microphone Recording)
    private var isRecordingVocal = false
    private var vocalAudioFile: AVAudioFile?
    private var recordedVocalURL: URL?

    // Sequencer Timing (Apple GCD DispatchSourceTimer)
    private var timer: DispatchSourceTimer?
    @Published public var isPlaying: Bool = false
    @Published public var bpm: Double = 104.0
    @Published public var currentSectionIndex: Int = 0
    @Published public var currentChordIndex: Int = 0
    @Published public var currentStep: Int = 0
    @Published public var currentRepeat: Int = 0

    // Logic Smart Controls Parameters
    @Published public var warmth: Double = 0.65
    @Published public var airSheen: Double = 0.75
    @Published public var pickAttack: Double = 0.50
    @Published public var spaceReverbWet: Double = 0.35

    private init() {
        self.mainMixer = engine.mainMixerNode
        setupEngine()
    }

    private func setupEngine() {
        let format = mainMixer.outputFormat(forBus: 0)
        self.sampleRate = format.sampleRate > 0 ? format.sampleRate : 44100.0

        // Attach submixers
        engine.attach(chordMixer)
        engine.attach(soloMixer)
        engine.attach(drumMixer)
        engine.attach(vocalMixer)
        engine.attach(eqNode)
        engine.attach(reverbNode)

        // Logic Reverb Presets (Space Designer simulation)
        reverbNode.loadFactoryPreset(.mediumChamber)
        reverbNode.wetDryMix = 35.0

        // 3-Band EQ: Low (Warmth), Mid, High (Air Sheen)
        let bands = eqNode.bands
        if bands.count >= 3 {
            bands[0].filterType = .lowShelf
            bands[0].frequency = 320.0
            bands[0].gain = 2.5
            bands[0].bypass = false

            bands[1].filterType = .parametric
            bands[1].frequency = 1200.0
            bands[1].bandwidth = 1.0
            bands[1].gain = 0.0
            bands[1].bypass = false

            bands[2].filterType = .highShelf
            bands[2].frequency = 8500.0
            bands[2].gain = 3.0
            bands[2].bypass = false
        }

        // Connections: Submixers -> EQ -> Reverb -> MainMixer
        engine.connect(chordMixer, to: eqNode, format: nil)
        engine.connect(soloMixer, to: eqNode, format: nil)
        engine.connect(drumMixer, to: eqNode, format: nil)
        engine.connect(vocalMixer, to: eqNode, format: nil)
        engine.connect(eqNode, to: reverbNode, format: nil)
        engine.connect(reverbNode, to: mainMixer, format: nil)

        // Pre-create 16 polyphonic audio player nodes
        for _ in 0..<16 {
            let player = AVAudioPlayerNode()
            engine.attach(player)
            engine.connect(player, to: chordMixer, format: nil)
            playerNodes.append(player)
        }

        do {
            try engine.start()
        } catch {
            print("AVAudioEngine start error: \(error)")
        }
    }

    // MARK: - Logic Smart Controls DSP
    public func setWarmthValue(_ val: Double) {
        warmth = val
        if eqNode.bands.count > 0 {
            eqNode.bands[0].gain = Float((val - 0.5) * 12.0)
        }
    }

    public func setAirSheenValue(_ val: Double) {
        airSheen = val
        if eqNode.bands.count > 2 {
            eqNode.bands[2].gain = Float((val - 0.5) * 14.0)
        }
    }

    public func setSpaceDesignerPreset(_ preset: AVAudioUnitReverbPreset) {
        reverbNode.loadFactoryPreset(preset)
    }

    // MARK: - Gerçek Akustik Tel & Sentez Vuruşu
    public func playStringNote(freq: Double, duration: Double = 3.0, velocity: Float = 0.85) {
        guard freq > 20, freq < 4000 else { return }

        // CoreAudio Synthesized Acoustic Buffer
        let numFrames = AVAudioFrameCount(sampleRate * duration)
        guard let pcmFormat = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 2),
              let buffer = AVAudioPCMBuffer(pcmFormat: pcmFormat, frameCapacity: numFrames) else { return }

        buffer.frameLength = numFrames
        let channels = buffer.floatChannelData!

        let omega = 2.0 * Double.pi * freq / sampleRate
        let decayFactor = exp(-3.0 / (sampleRate * duration))
        var currentDecay = 1.0

        for frame in 0..<Int(numFrames) {
            // Karplus-Strong & Additive harmonics (Fundamental + 1st Octave + 5th Shimmer)
            let s1 = sin(omega * Double(frame))
            let s2 = 0.55 * sin(2.0 * omega * Double(frame))
            let s3 = 0.25 * sin(3.0 * omega * Double(frame))

            let sample = Float((s1 + s2 + s3) * currentDecay * Double(velocity) * 0.28)
            channels[0][frame] = sample
            channels[1][frame] = sample
            currentDecay *= decayFactor
        }

        // Find available player
        if let player = playerNodes.first(where: { !$0.isPlaying }) ?? playerNodes.first {
            if !player.isPlaying {
                player.play()
            }
            player.scheduleBuffer(buffer, at: nil, options: .interrupts, completionHandler: nil)
        }
    }

    // MARK: - Akor Strum Çalma
    public func strumChord(_ chord: GuitarChord, downstroke: Bool = true) {
        let indices = downstroke ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0]
        var delayMs = 0

        for s in indices {
            let fret = chord.frets[s]
            if fret >= 0 {
                let freq = ChordLibrary.fretFrequency(stringIndex: s, fret: fret)
                DispatchQueue.global(qos: .userInteractive).asyncAfter(deadline: .now() + Double(delayMs) / 1000.0) {
                    self.playStringNote(freq: freq, duration: 3.5, velocity: 0.85)
                }
                delayMs += 5 // 5ms human strum wrist swing
            }
        }
    }

    // MARK: - Organik Akustik Davul Vuruşları
    public func playDrumHit(_ type: String) {
        let duration = 0.35
        let numFrames = AVAudioFrameCount(sampleRate * duration)
        guard let pcmFormat = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 2),
              let buffer = AVAudioPCMBuffer(pcmFormat: pcmFormat, frameCapacity: numFrames) else { return }

        buffer.frameLength = numFrames
        let channels = buffer.floatChannelData!

        if type == "kick" {
            // Kahon bas (65Hz -> 38Hz)
            for f in 0..<Int(numFrames) {
                let progress = Double(f) / Double(numFrames)
                let freq = 68.0 * (1.0 - progress * 0.5)
                let val = sin(2.0 * .pi * freq * Double(f) / sampleRate) * exp(-progress * 8.0)
                channels[0][f] = Float(val * 0.75)
                channels[1][f] = Float(val * 0.75)
            }
        } else if type == "snare" {
            // Kahon slap (crisp wood noise)
            for f in 0..<Int(numFrames) {
                let progress = Double(f) / Double(numFrames)
                let noise = Double.random(in: -1.0...1.0)
                let val = noise * exp(-progress * 18.0)
                channels[0][f] = Float(val * 0.65)
                channels[1][f] = Float(val * 0.65)
            }
        } else {
            // Shaker / Tef
            for f in 0..<Int(numFrames) {
                let progress = Double(f) / Double(numFrames)
                let noise = Double.random(in: -1.0...1.0)
                let val = noise * exp(-progress * 28.0)
                channels[0][f] = Float(val * 0.45)
                channels[1][f] = Float(val * 0.45)
            }
        }

        if let player = playerNodes.first(where: { !$0.isPlaying }) ?? playerNodes.first {
            if !player.isPlaying { player.play() }
            player.scheduleBuffer(buffer, at: nil, options: .interrupts, completionHandler: nil)
        }
    }

    // MARK: - Sequencer Başlat / Durdur
    public func togglePlayback(sections: [SongSection]) {
        if isPlaying {
            stopPlayback()
        } else {
            startPlayback(sections: sections)
        }
    }

    public func startPlayback(sections: [SongSection]) {
        guard !isPlaying else { return }
        isPlaying = true
        currentStep = 0
        currentChordIndex = 0
        currentRepeat = 0

        let stepDurationSec = (60.0 / bpm) / 4.0 // 16th note
        let intervalMs = Int(stepDurationSec * 1000.0)

        timer = DispatchSource.makeTimerSource(queue: DispatchQueue.global(qos: .userInteractive))
        timer?.schedule(deadline: .now(), repeating: .milliseconds(max(10, intervalMs)))
        timer?.setEventHandler { [weak self] in
            guard let self = self else { return }
            self.tickStep(sections: sections)
        }
        timer?.resume()
    }

    public func stopPlayback() {
        isPlaying = false
        timer?.cancel()
        timer = nil
        currentStep = 0
    }

    private func tickStep(sections: [SongSection]) {
        guard sections.indices.contains(currentSectionIndex) else { return }
        let sec = sections[currentSectionIndex]
        let chordName = sec.chords.indices.contains(currentChordIndex) ? sec.chords[currentChordIndex] : "Am"
        let chord = ChordLibrary.chordNamed(chordName)

        // 1. Akor Riff Vuruşları (Downbeat on step 0, 4, 8, 12)
        if currentStep == 0 || currentStep == 8 {
            self.strumChord(chord, downstroke: true)
        } else if currentStep == 4 || currentStep == 12 {
            self.strumChord(chord, downstroke: false)
        }

        // 2. Akustik Perküsyon (Kahon & Shaker)
        if currentStep == 0 || currentStep == 8 {
            self.playDrumHit("kick")
        } else if currentStep == 4 || currentStep == 12 {
            self.playDrumHit("snare")
        }
        if currentStep % 2 == 0 {
            self.playDrumHit("shaker")
        }

        // Adım İlerlemesi
        DispatchQueue.main.async {
            self.currentStep += 1
            if self.currentStep >= 16 {
                self.currentStep = 0
                self.currentChordIndex += 1
                if self.currentChordIndex >= sec.chords.count {
                    self.currentChordIndex = 0
                    self.currentRepeat += 1
                    if self.currentRepeat >= sec.repeats {
                        self.currentRepeat = 0
                        self.currentSectionIndex = (self.currentSectionIndex + 1) % sections.count
                    }
                }
            }
        }
    }

    // MARK: - Canlı Mikrofon Vokal Kaydı (DAW Vokal Kanalı)
    public func startVocalRecording() {
        guard !isRecordingVocal else { return }
        let inputNode = engine.inputNode
        let inputFormat = inputNode.outputFormat(forBus: 0)

        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let audioFilename = documentsPath.appendingPathComponent("vocal_take_\(UUID().uuidString).caf")
        self.recordedVocalURL = audioFilename

        do {
            self.vocalAudioFile = try AVAudioFile(forWriting: audioFilename, settings: inputFormat.settings)
            inputNode.installTap(onBus: 0, bufferSize: 1024, format: inputFormat) { [weak self] buffer, _ in
                try? self?.vocalAudioFile?.write(from: buffer)
            }
            isRecordingVocal = true
        } catch {
            print("Vokal kaydı başlatılamadı: \(error)")
        }
    }

    public func stopVocalRecording() -> URL? {
        guard isRecordingVocal else { return nil }
        engine.inputNode.removeTap(onBus: 0)
        isRecordingVocal = false
        vocalAudioFile = nil
        return recordedVocalURL
    }
}
