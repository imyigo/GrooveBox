import Foundation
import AVFoundation

// MARK: - Cache Keys

struct PCMBufferBox: @unchecked Sendable {
    let buffer: AVAudioPCMBuffer
}

struct NoteCacheKey: Hashable, @unchecked Sendable {
    let instrument: AcousticInstrumentType
    let bodyPreset: GuitarBodyPreset
    let freqMilliHz: Int
    let velocityBucket: Int
    let pickAttackBucket: Int
    let durationBucket: Int
    let panBucket: Int
    let sampleRateInt: Int

    init(
        instrument: AcousticInstrumentType,
        bodyPreset: GuitarBodyPreset,
        freq: Double,
        velocity: Double,
        pickAttack: Double,
        duration: Double,
        pan: Double,
        sampleRate: Double
    ) {
        self.instrument = instrument
        self.bodyPreset = bodyPreset
        self.freqMilliHz = Int((freq * 1000.0).rounded())
        self.velocityBucket = max(0, min(10, Int((velocity * 10.0).rounded())))
        self.pickAttackBucket = max(0, min(20, Int((pickAttack * 20.0).rounded())))
        self.durationBucket = max(1, min(24, Int((duration * 4.0).rounded())))
        self.panBucket = max(-10, min(10, Int((pan * 10.0).rounded())))
        self.sampleRateInt = Int(sampleRate.rounded())
    }
}

struct DrumCacheKey: Hashable, @unchecked Sendable {
    let hit: DrumHitType
    let velocityBucket: Int
    let pickAttackBucket: Int
    let sampleRateInt: Int

    init(hit: DrumHitType, velocity: Double, pickAttack: Double, sampleRate: Double) {
        self.hit = hit
        self.velocityBucket = max(0, min(10, Int((velocity * 10.0).rounded())))
        self.pickAttackBucket = max(0, min(20, Int((pickAttack * 20.0).rounded())))
        self.sampleRateInt = Int(sampleRate.rounded())
    }
}

struct MuteChopCacheKey: Hashable, @unchecked Sendable {
    let bodyPreset: GuitarBodyPreset
    let velocityBucket: Int
    let pickAttackBucket: Int
    let panBucket: Int
    let sampleRateInt: Int

    init(bodyPreset: GuitarBodyPreset, velocity: Double, pickAttack: Double, pan: Double, sampleRate: Double) {
        self.bodyPreset = bodyPreset
        self.velocityBucket = max(0, min(10, Int((velocity * 10.0).rounded())))
        self.pickAttackBucket = max(0, min(20, Int((pickAttack * 20.0).rounded())))
        self.panBucket = max(-10, min(10, Int((pan * 10.0).rounded())))
        self.sampleRateInt = Int(sampleRate.rounded())
    }
}

enum CacheKey: Hashable, @unchecked Sendable {
    case note(NoteCacheKey)
    case drum(DrumCacheKey)
    case muteChop(MuteChopCacheKey)
}

// MARK: - Bounded Thread-Safe LRU Buffer Cache

final class AcousticBufferCache: @unchecked Sendable {
    private let maxEntries: Int
    private let lock = NSLock()
    private var entries: [CacheKey: AVAudioPCMBuffer] = [:]
    private var lruOrder: [CacheKey] = []

    private let renderQueue = DispatchQueue(
        label: "com.acousticgroovebox.dsp.render",
        qos: .userInteractive,
        attributes: .concurrent
    )

    private let prewarmQueue = DispatchQueue(
        label: "com.acousticgroovebox.dsp.prewarm",
        qos: .utility
    )

    private var prewarmToken: UInt64 = 0
    private var generation: UInt64 = 0

    init(maxEntries: Int = 256) {
        self.maxEntries = max(32, maxEntries)
    }

    func clear() {
        lock.lock()
        generation &+= 1
        prewarmToken &+= 1
        entries.removeAll(keepingCapacity: true)
        lruOrder.removeAll(keepingCapacity: true)
        lock.unlock()
    }

    func get(_ key: CacheKey) -> AVAudioPCMBuffer? {
        lock.lock()
        defer { lock.unlock() }
        guard let buffer = entries[key] else { return nil }
        if let idx = lruOrder.firstIndex(of: key) {
            lruOrder.remove(at: idx)
            lruOrder.append(key)
        }
        return buffer
    }

    private func insert(_ buffer: AVAudioPCMBuffer, for key: CacheKey, expectedGeneration: UInt64) {
        lock.lock()
        defer { lock.unlock() }
        guard generation == expectedGeneration else { return }

        if entries[key] != nil {
            if let idx = lruOrder.firstIndex(of: key) {
                lruOrder.remove(at: idx)
            }
        } else if lruOrder.count >= maxEntries, let oldest = lruOrder.first {
            lruOrder.removeFirst()
            entries.removeValue(forKey: oldest)
        }
        entries[key] = buffer
        lruOrder.append(key)
    }

    private func currentGeneration() -> UInt64 {
        lock.lock()
        defer { lock.unlock() }
        return generation
    }

    private func isPrewarmValid(token: UInt64, expectedGeneration: UInt64) -> Bool {
        lock.lock()
        defer { lock.unlock() }
        return prewarmToken == token && generation == expectedGeneration
    }

    // MARK: - Non-Blocking Note / Drum / Mute Fetch-or-Render

    func obtainNoteBuffer(
        freq: Double,
        duration: Double,
        velocity: Double,
        instrument: AcousticInstrumentType,
        bodyPreset: GuitarBodyPreset,
        pickAttack: Double,
        pan: Double,
        format: AVAudioFormat,
        completion: @escaping @Sendable (AVAudioPCMBuffer) -> Void
    ) {
        let key = CacheKey.note(
            NoteCacheKey(
                instrument: instrument,
                bodyPreset: bodyPreset,
                freq: freq,
                velocity: velocity,
                pickAttack: pickAttack,
                duration: duration,
                pan: pan,
                sampleRate: format.sampleRate
            )
        )

        if let cached = get(key) {
            completion(cached)
            return
        }

        let gen = currentGeneration()
        renderQueue.async { [weak self] in
            guard let self = self else { return }
            if let cachedAfterQueue = self.get(key) {
                completion(cachedAfterQueue)
                return
            }
            let stereo = AcousticSynthesizer.synthesizeNote(
                freq: freq,
                duration: duration,
                velocity: velocity,
                sampleRate: format.sampleRate,
                instrument: instrument,
                bodyPreset: bodyPreset,
                pickAttack: pickAttack,
                pan: pan
            )
            guard let buffer = stereo.toPCMBuffer(format: format) else { return }
            self.insert(buffer, for: key, expectedGeneration: gen)
            completion(buffer)
        }
    }

    func obtainDrumBuffer(
        hit: DrumHitType,
        velocity: Double,
        pickAttack: Double,
        format: AVAudioFormat,
        completion: @escaping @Sendable (AVAudioPCMBuffer) -> Void
    ) {
        let key = CacheKey.drum(
            DrumCacheKey(
                hit: hit,
                velocity: velocity,
                pickAttack: pickAttack,
                sampleRate: format.sampleRate
            )
        )

        if let cached = get(key) {
            completion(cached)
            return
        }

        let gen = currentGeneration()
        renderQueue.async { [weak self] in
            guard let self = self else { return }
            if let cachedAfterQueue = self.get(key) {
                completion(cachedAfterQueue)
                return
            }
            let stereo = AcousticSynthesizer.synthesizeDrum(
                hit: hit,
                velocity: velocity,
                sampleRate: format.sampleRate,
                pickAttack: pickAttack
            )
            guard let buffer = stereo.toPCMBuffer(format: format) else { return }
            self.insert(buffer, for: key, expectedGeneration: gen)
            completion(buffer)
        }
    }

    func obtainMuteChopBuffer(
        velocity: Double,
        bodyPreset: GuitarBodyPreset,
        pickAttack: Double,
        pan: Double,
        format: AVAudioFormat,
        completion: @escaping @Sendable (AVAudioPCMBuffer) -> Void
    ) {
        let key = CacheKey.muteChop(
            MuteChopCacheKey(
                bodyPreset: bodyPreset,
                velocity: velocity,
                pickAttack: pickAttack,
                pan: pan,
                sampleRate: format.sampleRate
            )
        )

        if let cached = get(key) {
            completion(cached)
            return
        }

        let gen = currentGeneration()
        renderQueue.async { [weak self] in
            guard let self = self else { return }
            if let cachedAfterQueue = self.get(key) {
                completion(cachedAfterQueue)
                return
            }
            let stereo = AcousticSynthesizer.synthesizeMuteChop(
                sampleRate: format.sampleRate,
                velocity: velocity,
                bodyPreset: bodyPreset,
                pickAttack: pickAttack,
                pan: pan
            )
            guard let buffer = stereo.toPCMBuffer(format: format) else { return }
            self.insert(buffer, for: key, expectedGeneration: gen)
            completion(buffer)
        }
    }

    // MARK: - Background Pre-Warming (Zero MainActor Stalls)

    func schedulePrewarm(
        sections: [SongSection],
        activeSectionIndex: Int,
        chordInstrument: AcousticInstrumentType,
        soloInstrument: AcousticInstrumentType,
        bodyPreset: GuitarBodyPreset,
        pickAttack: Double,
        scaleRoot: String,
        scaleId: String,
        format: AVAudioFormat
    ) {
        lock.lock()
        prewarmToken &+= 1
        let token = prewarmToken
        let gen = generation
        lock.unlock()

        prewarmQueue.asyncAfter(deadline: .now() + 0.04) { [weak self] in
            guard let self = self, self.isPrewarmValid(token: token, expectedGeneration: gen) else { return }

            // 1. Pre-warm all 6 DrumHitTypes at default velocity
            for hit in DrumHitType.allCases {
                guard self.isPrewarmValid(token: token, expectedGeneration: gen) else { return }
                let dKey = CacheKey.drum(DrumCacheKey(hit: hit, velocity: 0.9, pickAttack: pickAttack, sampleRate: format.sampleRate))
                if self.get(dKey) == nil {
                    let stereo = AcousticSynthesizer.synthesizeDrum(hit: hit, velocity: 0.9, sampleRate: format.sampleRate, pickAttack: pickAttack)
                    if let buf = stereo.toPCMBuffer(format: format) {
                        self.insert(buf, for: dKey, expectedGeneration: gen)
                    }
                }
            }

            // 2. Pre-warm chords in active section (and next section if present)
            var chordNames: [String] = []
            if sections.indices.contains(activeSectionIndex) {
                chordNames.append(contentsOf: sections[activeSectionIndex].chords)
                let nextIdx = (activeSectionIndex + 1) % max(1, sections.count)
                if sections.indices.contains(nextIdx) && nextIdx != activeSectionIndex {
                    chordNames.append(contentsOf: sections[nextIdx].chords)
                }
            }
            for chordName in Set(chordNames) {
                guard self.isPrewarmValid(token: token, expectedGeneration: gen) else { return }
                let chord = ChordLibrary.chordNamed(chordName)
                for s in 0..<6 {
                    guard self.isPrewarmValid(token: token, expectedGeneration: gen) else { return }
                    let fret = chord.frets[s]
                    guard fret >= 0 else { continue }
                    let freq = ChordLibrary.fretFrequency(stringIndex: s, fret: fret)
                    let nKey = CacheKey.note(NoteCacheKey(
                        instrument: chordInstrument,
                        bodyPreset: bodyPreset,
                        freq: freq,
                        velocity: 0.85,
                        pickAttack: pickAttack,
                        duration: 2.5,
                        pan: 0.0,
                        sampleRate: format.sampleRate
                    ))
                    if self.get(nKey) == nil {
                        let stereo = AcousticSynthesizer.synthesizeNote(
                            freq: freq,
                            duration: 2.5,
                            velocity: 0.85,
                            sampleRate: format.sampleRate,
                            instrument: chordInstrument,
                            bodyPreset: bodyPreset,
                            pickAttack: pickAttack,
                            pan: 0.0
                        )
                        if let buf = stereo.toPCMBuffer(format: format) {
                            self.insert(buf, for: nKey, expectedGeneration: gen)
                        }
                    }
                }
            }

            // 3. Pre-warm active scale solo notes
            let notes = ScaleLibrary.getScaleNotes(root: scaleRoot, scaleId: scaleId, baseOctave: soloInstrument.defaultOctave)
            for note in notes {
                guard self.isPrewarmValid(token: token, expectedGeneration: gen) else { return }
                let freq = ChordLibrary.midiToFrequency(note.midi)
                let nKey = CacheKey.note(NoteCacheKey(
                    instrument: soloInstrument,
                    bodyPreset: bodyPreset,
                    freq: freq,
                    velocity: 0.9,
                    pickAttack: pickAttack,
                    duration: 2.2,
                    pan: 0.0,
                    sampleRate: format.sampleRate
                ))
                if self.get(nKey) == nil {
                    let stereo = AcousticSynthesizer.synthesizeNote(
                        freq: freq,
                        duration: 2.2,
                        velocity: 0.9,
                        sampleRate: format.sampleRate,
                        instrument: soloInstrument,
                        bodyPreset: bodyPreset,
                        pickAttack: pickAttack,
                        pan: 0.0
                    )
                    if let buf = stereo.toPCMBuffer(format: format) {
                        self.insert(buf, for: nKey, expectedGeneration: gen)
                    }
                }
            }
        }
    }
}
