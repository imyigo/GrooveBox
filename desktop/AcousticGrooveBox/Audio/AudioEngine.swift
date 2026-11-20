import Foundation
import AVFoundation
import AudioToolbox
import Accelerate

/// Apple CoreAudio & AVAudioEngine tabanlı ultra-düşük gecikmeli yerel Logic Pro ses motoru
public final class NativeAudioEngine: ObservableObject {
    public static let shared = NativeAudioEngine()

    private let engine = AVAudioEngine()

    // Standart Yüksek Çözünürlüklü Ses Formatı (44.1kHz Stereo)
    private let audioFormat: AVAudioFormat

    // DSP Busses (Logic Pro Channel Strip)
    private let mainMixer: AVAudioMixerNode
    private let chordMixer = AVAudioMixerNode()
    private let soloMixer = AVAudioMixerNode()
    private let drumMixer = AVAudioMixerNode()
    private let vocalMixer = AVAudioMixerNode()

    // Logic Space Designer & 3-Band Channel EQ
    private let reverbNode = AVAudioUnitReverb()
    private let eqNode = AVAudioUnitEQ(numberOfBands: 3)

    // Ayrılmış Bağımsız Polifonik Player Havuzları (Birbirini kesmez!)
    private var chordPlayers: [AVAudioPlayerNode] = []
    private var soloPlayers: [AVAudioPlayerNode] = []
    private var drumPlayers: [AVAudioPlayerNode] = []

    private var chordPlayerIndex = 0
    private var soloPlayerIndex = 0
    private var drumPlayerIndex = 0

    // Vokal Kaydı (Microphone Recording)
    private var isRecordingVocal = false
    private var vocalAudioFile: AVAudioFile?
    private var recordedVocalURL: URL?

    // Sequencer Timing (Apple GCD DispatchSourceTimer)
    private var timer: DispatchSourceTimer?
    private let timerQueue = DispatchQueue(label: "com.acousticgroovebox.sequencer", qos: .userInteractive)

    // Arka plan atomik sequencer durumu
    private var internalStep: Int = 0
    private var internalChordIdx: Int = 0
    private var internalSectionIdx: Int = 0
    private var internalRepeat: Int = 0

    // SwiftUI UI Durumları (@Published, daima @MainActor üzerinden güncellenir)
    @Published public var isPlaying: Bool = false
    @Published public var bpm: Double = 104.0
    @Published public var currentSectionIndex: Int = 0
    @Published public var currentChordIndex: Int = 0
    @Published public var currentStep: Int = 0
    @Published public var currentRepeat: Int = 0
    @Published public var percussionEnabled: Bool = true

    // Logic Smart Controls Parametreleri
    @Published public var warmth: Double = 0.65
    @Published public var airSheen: Double = 0.75
    @Published public var pickAttack: Double = 0.50
    @Published public var spaceReverbWet: Double = 0.35

    private init() {
        self.audioFormat = AVAudioFormat(standardFormatWithSampleRate: 44100.0, channels: 2)!
        self.mainMixer = engine.mainMixerNode
        setupEngine()
    }

    private func setupEngine() {
        // Alt mikserleri ve efektleri bağla
        engine.attach(chordMixer)
        engine.attach(soloMixer)
        engine.attach(drumMixer)
        engine.attach(vocalMixer)
        engine.attach(eqNode)
        engine.attach(reverbNode)

        // Space Designer Reverb simülasyonu
        reverbNode.loadFactoryPreset(.mediumChamber)
        reverbNode.wetDryMix = 30.0

        // 3-Band Logic Channel EQ
        let bands = eqNode.bands
        if bands.count >= 3 {
            // Low Warmth (Gövde Rezonansı)
            bands[0].filterType = .lowShelf
            bands[0].frequency = 280.0
            bands[0].gain = 3.0
            bands[0].bypass = false

            // Mid Focus (Akustik Tını)
            bands[1].filterType = .parametric
            bands[1].frequency = 1200.0
            bands[1].bandwidth = 1.0
            bands[1].gain = 1.0
            bands[1].bypass = false

            // High Air Sheen (Pena Parıltısı)
            bands[2].filterType = .highShelf
            bands[2].frequency = 8500.0
            bands[2].gain = 3.5
            bands[2].bypass = false
        }

        // Busses -> EQ -> Reverb -> MainMixer
        engine.connect(chordMixer, to: eqNode, format: audioFormat)
        engine.connect(soloMixer, to: eqNode, format: audioFormat)
        engine.connect(drumMixer, to: eqNode, format: audioFormat)
        engine.connect(vocalMixer, to: eqNode, format: audioFormat)
        engine.connect(eqNode, to: reverbNode, format: audioFormat)
        engine.connect(reverbNode, to: mainMixer, format: audioFormat)

        // 1. Akor telleri için 18 bağımsız polifonik player
        for _ in 0..<18 {
            let p = AVAudioPlayerNode()
            engine.attach(p)
            engine.connect(p, to: chordMixer, format: audioFormat)
            chordPlayers.append(p)
        }

        // 2. Solo melodiler için 12 bağımsız player
        for _ in 0..<12 {
            let p = AVAudioPlayerNode()
            engine.attach(p)
            engine.connect(p, to: soloMixer, format: audioFormat)
            soloPlayers.append(p)
        }

        // 3. Davul vuruşları için 8 bağımsız player
        for _ in 0..<8 {
            let p = AVAudioPlayerNode()
            engine.attach(p)
            engine.connect(p, to: drumMixer, format: audioFormat)
            drumPlayers.append(p)
        }

        startEngineIfNeeded()
    }

    private func startEngineIfNeeded() {
        guard !engine.isRunning else { return }
        do {
            try engine.start()
        } catch {
            print("AVAudioEngine başlatma hatası: \(error)")
        }
    }

    // MARK: - Logic Smart Controls DSP Metodları
    public func setWarmthValue(_ val: Double) {
        warmth = val
        if eqNode.bands.count > 0 {
            eqNode.bands[0].gain = Float((val - 0.5) * 14.0)
        }
    }

    public func setAirSheenValue(_ val: Double) {
        airSheen = val
        if eqNode.bands.count > 2 {
            eqNode.bands[2].gain = Float((val - 0.5) * 16.0)
        }
    }

    public func setSpaceDesignerPreset(_ preset: AVAudioUnitReverbPreset) {
        reverbNode.loadFactoryPreset(preset)
    }

    public func setReverbWet(_ val: Double) {
        spaceReverbWet = val
        reverbNode.wetDryMix = Float(max(0, min(100, val * 100)))
    }

    // MARK: - Akustik Enstrüman & Tel Sentezi (Sıfır Gecikme)
    public func playStringNote(
        freq: Double,
        duration: Double = 3.0,
        velocity: Float = 0.85,
        instrument: AcousticInstrumentType = .nylon
    ) {
        guard freq > 20, freq < 4500 else { return }
        startEngineIfNeeded()

        let sampleRate = audioFormat.sampleRate
        let numFrames = AVAudioFrameCount(sampleRate * duration)
        guard let buffer = AVAudioPCMBuffer(pcmFormat: audioFormat, frameCapacity: numFrames) else { return }
        buffer.frameLength = numFrames
        let channels = buffer.floatChannelData!

        let omega = 2.0 * Double.pi * freq / sampleRate
        let decayExponent = instrument == .piano ? 2.0 : (instrument == .steel ? 2.5 : 3.2)
        let decayFactor = exp(-decayExponent / (sampleRate * duration))
        var currentDecay = 1.0

        for frame in 0..<Int(numFrames) {
            let t = Double(frame)

            // Akustik Karplus-Strong / Additive fiziksel model
            let fundamental = sin(omega * t)
            let octave1 = 0.50 * sin(2.0 * omega * t)
            let fifth = 0.25 * sin(3.0 * omega * t)
            let octave2 = 0.12 * sin(4.0 * omega * t)

            // Pena vuruşu atağı (Attack click transient - ilk 10ms)
            let attackClick: Double
            if frame < Int(sampleRate * 0.008) {
                attackClick = Double.random(in: -0.15...0.15) * (1.0 - Double(frame) / (sampleRate * 0.008))
            } else {
                attackClick = 0.0
            }

            var sample = Float((fundamental + octave1 + fifth + octave2 + attackClick) * currentDecay * Double(velocity) * 0.32)

            // Tavan sınırlayıcı
            sample = max(-0.95, min(0.95, sample))

            channels[0][frame] = sample
            channels[1][frame] = sample

            currentDecay *= decayFactor
        }

        // Sıradaki adanmış polifonik player'a gönder
        let player = chordPlayers[chordPlayerIndex]
        chordPlayerIndex = (chordPlayerIndex + 1) % chordPlayers.count

        if !player.isPlaying { player.play() }
        player.scheduleBuffer(buffer, at: nil, options: [], completionHandler: nil)
    }

    // MARK: - Solo Nota Çalma
    public func playSoloNote(freq: Double, duration: Double = 2.5, velocity: Float = 0.9, instrument: AcousticInstrumentType = .nylon) {
        guard freq > 20, freq < 5000 else { return }
        startEngineIfNeeded()

        let sampleRate = audioFormat.sampleRate
        let numFrames = AVAudioFrameCount(sampleRate * duration)
        guard let buffer = AVAudioPCMBuffer(pcmFormat: audioFormat, frameCapacity: numFrames) else { return }
        buffer.frameLength = numFrames
        let channels = buffer.floatChannelData!

        let omega = 2.0 * Double.pi * freq / sampleRate
        let decayFactor = exp(-2.2 / (sampleRate * duration))
        var currentDecay = 1.0

        for frame in 0..<Int(numFrames) {
            let t = Double(frame)
            let s1 = sin(omega * t)
            let s2 = 0.60 * sin(2.0 * omega * t)
            let s3 = 0.30 * sin(3.0 * omega * t)
            let sample = Float((s1 + s2 + s3) * currentDecay * Double(velocity) * 0.35)
            channels[0][frame] = sample
            channels[1][frame] = sample
            currentDecay *= decayFactor
        }

        let player = soloPlayers[soloPlayerIndex]
        soloPlayerIndex = (soloPlayerIndex + 1) % soloPlayers.count

        if !player.isPlaying { player.play() }
        player.scheduleBuffer(buffer, at: nil, options: [], completionHandler: nil)
    }

    // MARK: - Gerçekçi Akor Strum Çalma
    public func strumChord(_ chord: GuitarChord, downstroke: Bool = true, instrument: AcousticInstrumentType = .nylon) {
        let indices = downstroke ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0]
        var delayMs: Double = 0.0

        for s in indices {
            let fret = chord.frets[s]
            if fret >= 0 {
                let freq = ChordLibrary.fretFrequency(stringIndex: s, fret: fret)
                timerQueue.asyncAfter(deadline: .now() + (delayMs / 1000.0)) { [weak self] in
                    self?.playStringNote(freq: freq, duration: 3.5, velocity: 0.85, instrument: instrument)
                }
                delayMs += 5.0 // 5ms el vuruşu yayılımı (gerçekçi akustik strumming)
            }
        }
    }

    // MARK: - Organik Akustik Davul Vuruşları (Kahon, Slap, Shaker)
    public func playDrumHit(_ type: String) {
        guard percussionEnabled else { return }
        startEngineIfNeeded()

        let sampleRate = audioFormat.sampleRate
        let duration = type == "kick" ? 0.32 : (type == "snare" ? 0.28 : 0.16)
        let numFrames = AVAudioFrameCount(sampleRate * duration)
        guard let buffer = AVAudioPCMBuffer(pcmFormat: audioFormat, frameCapacity: numFrames) else { return }
        buffer.frameLength = numFrames
        let channels = buffer.floatChannelData!

        if type == "kick" {
            // Organik Kahon Bası (68Hz -> 36Hz gövde vuruntusu)
            for f in 0..<Int(numFrames) {
                let progress = Double(f) / Double(numFrames)
                let freq = 68.0 * (1.0 - progress * 0.5)
                let val = sin(2.0 * .pi * freq * Double(f) / sampleRate) * exp(-progress * 9.0)
                let s = Float(val * 0.85)
                channels[0][f] = s
                channels[1][f] = s
            }
        } else if type == "snare" {
            // Kahon Köşe Tokadı (Crisp wood snare slap)
            for f in 0..<Int(numFrames) {
                let progress = Double(f) / Double(numFrames)
                let noise = Double.random(in: -1.0...1.0)
                let body = sin(2.0 * .pi * 180.0 * Double(f) / sampleRate) * 0.3
                let val = (noise + body) * exp(-progress * 20.0)
                let s = Float(val * 0.70)
                channels[0][f] = s
                channels[1][f] = s
            }
        } else {
            // Organik Stüdyo Shaker / Tef
            for f in 0..<Int(numFrames) {
                let progress = Double(f) / Double(numFrames)
                let noise = Double.random(in: -1.0...1.0)
                let val = noise * exp(-progress * 30.0)
                let s = Float(val * 0.45)
                channels[0][f] = s
                channels[1][f] = s
            }
        }

        let player = drumPlayers[drumPlayerIndex]
        drumPlayerIndex = (drumPlayerIndex + 1) % drumPlayers.count

        if !player.isPlaying { player.play() }
        player.scheduleBuffer(buffer, at: nil, options: [], completionHandler: nil)
    }

    // MARK: - Kesintisiz Sequencer Başlat / Durdur
    public func togglePlayback(sections: [SongSection], instrument: AcousticInstrumentType = .nylon) {
        if isPlaying {
            stopPlayback()
        } else {
            startPlayback(sections: sections, instrument: instrument)
        }
    }

    public func startPlayback(sections: [SongSection], instrument: AcousticInstrumentType = .nylon) {
        guard !isPlaying, !sections.isEmpty else { return }
        startEngineIfNeeded()

        internalStep = 0
        internalChordIdx = 0
        internalRepeat = 0
        internalSectionIdx = currentSectionIndex < sections.count ? currentSectionIndex : 0

        DispatchQueue.main.async {
            self.isPlaying = true
            self.currentStep = 0
            self.currentChordIndex = self.internalChordIdx
            self.currentRepeat = 0
            self.currentSectionIndex = self.internalSectionIdx
        }

        let stepDurationSec = (60.0 / bpm) / 4.0 // 16'lık nota aralığı
        let intervalMs = Int(stepDurationSec * 1000.0)

        timer?.cancel()
        timer = DispatchSource.makeTimerSource(queue: timerQueue)
        timer?.schedule(deadline: .now(), repeating: .milliseconds(max(15, intervalMs)))
        timer?.setEventHandler { [weak self] in
            guard let self = self else { return }
            self.tickStep(sections: sections, instrument: instrument)
        }
        timer?.resume()
    }

    public func stopPlayback() {
        timer?.cancel()
        timer = nil
        internalStep = 0

        DispatchQueue.main.async {
            self.isPlaying = false
            self.currentStep = 0
        }
    }

    private func tickStep(sections: [SongSection], instrument: AcousticInstrumentType) {
        guard sections.indices.contains(internalSectionIdx) else { return }
        let sec = sections[internalSectionIdx]
        let chordName = sec.chords.indices.contains(internalChordIdx) ? sec.chords[internalChordIdx] : (sec.chords.first ?? "Am")
        let chord = ChordLibrary.chordNamed(chordName)

        let step = internalStep

        // 1. Akustik Riff / Akor Vuruşları (Logic Pro Fingerpicking & Groove)
        if step == 0 || step == 8 {
            self.strumChord(chord, downstroke: true, instrument: instrument)
        } else if step == 4 || step == 12 {
            self.strumChord(chord, downstroke: false, instrument: instrument)
        } else if step == 6 || step == 14 {
            // İnce tellere hafif arpej fırçası (Acoustic brush)
            let highStrings = [2, 3, 4, 5]
            for s in highStrings {
                let fret = chord.frets[s]
                if fret >= 0 {
                    let freq = ChordLibrary.fretFrequency(stringIndex: s, fret: fret)
                    self.playStringNote(freq: freq, duration: 2.0, velocity: 0.55, instrument: instrument)
                }
            }
        }

        // 2. Akustik Perküsyon (Kahon & Shaker)
        if percussionEnabled {
            if step == 0 || step == 8 {
                self.playDrumHit("kick")
            } else if step == 4 || step == 12 {
                self.playDrumHit("snare")
            }
            if step % 2 == 0 {
                self.playDrumHit("shaker")
            }
        }

        // 3. Adım İlerlemesi (Atomik Arka Plan Döngüsü)
        internalStep += 1
        if internalStep >= 16 {
            internalStep = 0
            internalChordIdx += 1
            if internalChordIdx >= sec.chords.count {
                internalChordIdx = 0
                internalRepeat += 1
                if internalRepeat >= sec.repeats {
                    internalRepeat = 0
                    internalSectionIdx = (internalSectionIdx + 1) % sections.count
                }
            }
        }

        // 4. UI'ı güvenli bir şekilde Ana Thread'e gönder
        let sStep = internalStep
        let sChord = internalChordIdx
        let sSec = internalSectionIdx
        let sRep = internalRepeat

        DispatchQueue.main.async {
            self.currentStep = sStep
            self.currentChordIndex = sChord
            self.currentSectionIndex = sSec
            self.currentRepeat = sRep
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
