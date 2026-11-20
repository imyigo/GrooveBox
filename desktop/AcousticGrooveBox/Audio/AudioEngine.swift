import Foundation
import AVFoundation
import AudioToolbox
import Accelerate

// MARK: - Lock-Protected Live Sequencer State

private struct SequencerSnapshot: @unchecked Sendable {
    var sections: [SongSection]
    var bpm: Double
    var swing: Double
    var percussionEnabled: Bool
    var autoAdvanceSections: Bool
    var chordInstrument: AcousticInstrumentType
    var soloInstrument: AcousticInstrumentType
    var bodyPreset: GuitarBodyPreset
    var pickAttack: Double
    var strumSpread: Double
    var soloLoopEvents: [SoloLoopEvent]
    var soloLoopMuted: Bool
    var queuedSectionIndex: Int?
}

private final class SequencerStateBox: @unchecked Sendable {
    private let lock = NSLock()
    private var snapshot: SequencerSnapshot
    private var step: Int = 0
    private var chordIndex: Int = 0
    private var sectionIndex: Int = 0
    private var repeatIndex: Int = 0
    private var sessionID: UInt64 = 0

    init(snapshot: SequencerSnapshot) {
        self.snapshot = snapshot
    }

    func updateSnapshot(_ block: (inout SequencerSnapshot) -> Void) {
        lock.lock()
        block(&snapshot)
        lock.unlock()
    }

    func setIndices(
        step: Int? = nil,
        chordIndex: Int? = nil,
        sectionIndex: Int? = nil,
        repeatIndex: Int? = nil,
        sessionID: UInt64? = nil
    ) {
        lock.lock()
        if let step = step { self.step = step }
        if let chordIndex = chordIndex { self.chordIndex = chordIndex }
        if let sectionIndex = sectionIndex { self.sectionIndex = sectionIndex }
        if let repeatIndex = repeatIndex { self.repeatIndex = repeatIndex }
        if let sessionID = sessionID { self.sessionID = sessionID }
        lock.unlock()
    }

    func readState() -> (snapshot: SequencerSnapshot, step: Int, chordIndex: Int, sectionIndex: Int, repeatIndex: Int) {
        lock.lock()
        defer { lock.unlock() }
        return (snapshot, step, chordIndex, sectionIndex, repeatIndex)
    }

    struct StepResult: @unchecked Sendable {
        let sessionID: UInt64
        let stepJustPlayed: Int
        let chordIndexJustPlayed: Int
        let sectionIndexJustPlayed: Int
        let nextStep: Int
        let nextChordIndex: Int
        let nextSectionIndex: Int
        let nextRepeatIndex: Int
        let consumedQueuedSection: Int?
        let nextStepIntervalSec: Double
    }

    enum AdvanceOutcome: @unchecked Sendable {
        case empty(sessionID: UInt64)
        case step(snapshot: SequencerSnapshot, result: StepResult)
    }

    func advanceStep() -> AdvanceOutcome {
        lock.lock()
        defer { lock.unlock() }

        let safeBpm = max(50.0, min(180.0, snapshot.bpm))
        let safeSwing = max(0.0, min(0.4, snapshot.swing))
        let baseStepSec = (60.0 / safeBpm) / 4.0

        guard !snapshot.sections.isEmpty else {
            return .empty(sessionID: sessionID)
        }

        if !snapshot.sections.indices.contains(sectionIndex) {
            sectionIndex = 0
            chordIndex = 0
            repeatIndex = 0
        }

        let sec = snapshot.sections[sectionIndex]
        if !sec.chords.isEmpty && !sec.chords.indices.contains(chordIndex) {
            chordIndex = 0
        }

        let playedStep = step
        let playedChord = chordIndex
        let playedSection = sectionIndex

        // Compute interval from playedStep to nextStep with swing
        let intervalSec = (playedStep % 2 == 0)
            ? baseStepSec * (1.0 + safeSwing * 0.5)
            : baseStepSec * (1.0 - safeSwing * 0.5)

        var consumedQueue: Int? = nil
        step += 1
        if step >= 16 {
            step = 0
            if let queued = snapshot.queuedSectionIndex, snapshot.sections.indices.contains(queued) {
                sectionIndex = queued
                chordIndex = 0
                repeatIndex = 0
                snapshot.queuedSectionIndex = nil
                consumedQueue = queued
            } else {
                chordIndex += 1
                let barCount = sec.chords.count
                if chordIndex >= max(1, barCount) {
                    chordIndex = 0
                    repeatIndex += 1
                    if repeatIndex >= max(1, sec.repeats) {
                        repeatIndex = 0
                        if snapshot.autoAdvanceSections {
                            sectionIndex = (sectionIndex + 1) % snapshot.sections.count
                        }
                    }
                }
            }
        }

        let res = StepResult(
            sessionID: sessionID,
            stepJustPlayed: playedStep,
            chordIndexJustPlayed: playedChord,
            sectionIndexJustPlayed: playedSection,
            nextStep: step,
            nextChordIndex: chordIndex,
            nextSectionIndex: sectionIndex,
            nextRepeatIndex: repeatIndex,
            consumedQueuedSection: consumedQueue,
            nextStepIntervalSec: max(0.015, intervalSec)
        )
        return .step(snapshot: snapshot, result: res)
    }
}

// MARK: - Voice Pool Slot

private struct VoiceSlot {
    let player: AVAudioPlayerNode
    var busyUntil: TimeInterval = 0.0
    var lastUsedAt: TimeInterval = 0.0
}

// MARK: - NativeAudioEngine (@MainActor CoreAudio & Logic Pro DSP Engine)

@MainActor
public final class NativeAudioEngine: ObservableObject {
    public static let shared = NativeAudioEngine()

    private let engine = AVAudioEngine()
    private let autoStartEngine: Bool
    private var audioFormat: AVAudioFormat

    // DSP Busses (Logic Pro Channel Strip)
    private let mainMixer: AVAudioMixerNode
    private let chordMixer = AVAudioMixerNode()
    private let soloMixer = AVAudioMixerNode()
    private let drumMixer = AVAudioMixerNode()
    private let vocalMixer = AVAudioMixerNode()
    private let trackSumMixer = AVAudioMixerNode()
    private let masterBusMixer = AVAudioMixerNode()

    // Logic Pro Channel EQ + Space Designer Parallel Send
    private let eqNode = AVAudioUnitEQ(numberOfBands: 3)
    private let preDelayNode = AVAudioUnitDelay()
    private let reverbToneEQ = AVAudioUnitEQ(numberOfBands: 3)
    private let reverbNode = AVAudioUnitReverb()
    private let reverbWetMixer = AVAudioMixerNode()

    // Polyphonic Voice-Stealing Player Pools
    private var chordSlots: [VoiceSlot] = []
    private var soloSlots: [VoiceSlot] = []
    private var drumSlots: [VoiceSlot] = []
    private let vocalPreviewPlayer = AVAudioPlayerNode()

    // Off-Main-Thread Buffer Cache, Vocal Recorder & Sequencer
    private let bufferCache = AcousticBufferCache(maxEntries: 256)
    private let vocalRecorder = VocalRecorder()
    private let sequencerQueue = DispatchQueue(label: "com.acousticgroovebox.sequencer", qos: .userInteractive)
    private let exportQueue = DispatchQueue(label: "com.acousticgroovebox.export", qos: .userInitiated)
    private var sequencerTimer: DispatchSourceTimer?
    private let seqState: SequencerStateBox

    private var configChangeObserver: NSObjectProtocol?
    private var configChangeDebounceWorkItem: DispatchWorkItem?
    private var isMonitoringConnected = false
    private var isInternalSync = false
    private var playbackSessionID: UInt64 = 0
    private var isStartingVocalRecording = false
    private var activeRecordingURL: URL?

    // MARK: - @Published Transport & Sequencer State

    @Published public var isPlaying: Bool = false

    @Published public var bpm: Double = 104.0 {
        didSet {
            let clamped = max(50.0, min(180.0, bpm))
            if clamped != bpm {
                bpm = clamped
                return
            }
            seqState.updateSnapshot { $0.bpm = clamped }
            if isPlaying {
                rescheduleSequencerTimer()
            }
        }
    }

    @Published public var swing: Double = 0.0 {
        didSet {
            let clamped = max(0.0, min(0.4, swing))
            if clamped != swing {
                swing = clamped
                return
            }
            seqState.updateSnapshot { $0.swing = clamped }
        }
    }

    @Published public var percussionEnabled: Bool = true {
        didSet { seqState.updateSnapshot { $0.percussionEnabled = percussionEnabled } }
    }

    @Published public var autoAdvanceSections: Bool = true {
        didSet { seqState.updateSnapshot { $0.autoAdvanceSections = autoAdvanceSections } }
    }

    @Published public var currentSectionIndex: Int = 0 {
        didSet {
            if !sections.isEmpty {
                let clamped = max(0, min(sections.count - 1, currentSectionIndex))
                if clamped != currentSectionIndex {
                    currentSectionIndex = clamped
                    return
                }
            } else if currentSectionIndex != 0 {
                currentSectionIndex = 0
                return
            }
            if !isInternalSync {
                seqState.setIndices(sectionIndex: currentSectionIndex)
            }
            scheduleCachePrewarm()
        }
    }

    @Published public var queuedSectionIndex: Int? = nil {
        didSet {
            if !isInternalSync {
                seqState.updateSnapshot { $0.queuedSectionIndex = queuedSectionIndex }
            }
        }
    }

    @Published public var currentChordIndex: Int = 0 {
        didSet {
            if !isInternalSync {
                seqState.setIndices(chordIndex: max(0, currentChordIndex))
            }
        }
    }

    @Published public var currentStep: Int = 0
    @Published public var currentRepeat: Int = 0

    @Published public var sections: [SongSection] = DefaultSections.initial {
        didSet {
            seqState.updateSnapshot { $0.sections = sections }
            if sections.isEmpty {
                currentSectionIndex = 0
                currentChordIndex = 0
                queuedSectionIndex = nil
            } else {
                if currentSectionIndex >= sections.count {
                    currentSectionIndex = max(0, sections.count - 1)
                }
                let chordCount = sections[currentSectionIndex].chords.count
                if chordCount == 0 || currentChordIndex >= chordCount {
                    currentChordIndex = 0
                }
                if let q = queuedSectionIndex, !sections.indices.contains(q) {
                    queuedSectionIndex = nil
                }
            }
            scheduleCachePrewarm()
        }
    }

    @Published public var chordInstrument: AcousticInstrumentType = .nylon {
        didSet {
            seqState.updateSnapshot { $0.chordInstrument = chordInstrument }
            scheduleCachePrewarm()
        }
    }

    @Published public var soloInstrument: AcousticInstrumentType = .violin {
        didSet {
            seqState.updateSnapshot { $0.soloInstrument = soloInstrument }
            scheduleCachePrewarm()
        }
    }

    @Published public var bodyPreset: GuitarBodyPreset = .dreadnought {
        didSet {
            seqState.updateSnapshot { $0.bodyPreset = bodyPreset }
            scheduleCachePrewarm()
        }
    }

    @Published public var scaleRoot: String = "A" {
        didSet { scheduleCachePrewarm() }
    }

    @Published public var scaleId: String = "minor" {
        didSet { scheduleCachePrewarm() }
    }

    @Published public var harmonyMode: SoloHarmonyMode = .smartLick

    // MARK: - @Published Smart Controls & Mixer State

    @Published public var warmth: Double = 0.65 {
        didSet {
            let clamped = max(0.0, min(1.0, warmth))
            if clamped != warmth { warmth = clamped; return }
            applyWarmthDSP(clamped)
        }
    }

    @Published public var airSheen: Double = 0.75 {
        didSet {
            let clamped = max(0.0, min(1.0, airSheen))
            if clamped != airSheen { airSheen = clamped; return }
            applyAirSheenDSP(clamped)
        }
    }

    @Published public var pickAttack: Double = 0.50 {
        didSet {
            let clamped = max(0.0, min(1.0, pickAttack))
            if clamped != pickAttack { pickAttack = clamped; return }
            seqState.updateSnapshot { $0.pickAttack = clamped }
            scheduleCachePrewarm()
        }
    }

    @Published public var spaceReverbWet: Double = 0.30 {
        didSet {
            let clamped = max(0.0, min(1.0, spaceReverbWet))
            if clamped != spaceReverbWet { spaceReverbWet = clamped; return }
            applyReverbWetDSP(clamped)
        }
    }

    @Published public var strumSpread: Double = 0.40 {
        didSet {
            let clamped = max(0.0, min(1.0, strumSpread))
            if clamped != strumSpread { strumSpread = clamped; return }
            seqState.updateSnapshot { $0.strumSpread = clamped }
        }
    }

    @Published public var activeSpacePreset: SpaceDesignerPreset = .warmWood {
        didSet { applySpaceDesignerDSP(activeSpacePreset) }
    }

    @Published public var masterVolume: Float = 0.85 {
        didSet {
            let clamped = max(0.0, min(1.0, masterVolume))
            if clamped != masterVolume { masterVolume = clamped; return }
            recalculateMixerGains()
        }
    }

    @Published public var masterMuted: Bool = false {
        didSet { recalculateMixerGains() }
    }

    @Published public var chordVolume: Float = 0.95 {
        didSet {
            let clamped = max(0.0, min(1.0, chordVolume))
            if clamped != chordVolume { chordVolume = clamped; return }
            recalculateMixerGains()
        }
    }

    @Published public var chordMuted: Bool = false {
        didSet { recalculateMixerGains() }
    }

    @Published public var chordSolo: Bool = false {
        didSet { recalculateMixerGains() }
    }

    @Published public var drumVolume: Float = 0.90 {
        didSet {
            let clamped = max(0.0, min(1.0, drumVolume))
            if clamped != drumVolume { drumVolume = clamped; return }
            recalculateMixerGains()
        }
    }

    @Published public var drumMuted: Bool = false {
        didSet { recalculateMixerGains() }
    }

    @Published public var drumSolo: Bool = false {
        didSet { recalculateMixerGains() }
    }

    @Published public var soloVolume: Float = 0.95 {
        didSet {
            let clamped = max(0.0, min(1.0, soloVolume))
            if clamped != soloVolume { soloVolume = clamped; return }
            recalculateMixerGains()
        }
    }

    @Published public var soloMuted: Bool = false {
        didSet { recalculateMixerGains() }
    }

    @Published public var soloSolo: Bool = false {
        didSet { recalculateMixerGains() }
    }

    @Published public var vocalVolume: Float = 0.95 {
        didSet {
            let clamped = max(0.0, min(1.0, vocalVolume))
            if clamped != vocalVolume { vocalVolume = clamped; return }
            recalculateMixerGains()
        }
    }

    @Published public var vocalMuted: Bool = false {
        didSet { recalculateMixerGains() }
    }

    @Published public var vocalSolo: Bool = false {
        didSet { recalculateMixerGains() }
    }

    // MARK: - @Published Vocal Recording & Playback State

    @Published public var isRecordingVocal: Bool = false
    @Published public var vocalInputLevel: Float = 0.0

    @Published public var recordedVocalURL: URL? = nil {
        didSet {
            if let url = recordedVocalURL {
                recordedVocalDuration = VocalRecorder.durationOfAudioFile(at: url)
            } else {
                recordedVocalDuration = 0.0
            }
        }
    }

    @Published public var recordedVocalDuration: TimeInterval = 0.0
    @Published public var vocalPermissionDenied: Bool = false
    @Published public var audioErrorMessage: String? = nil

    @Published public var monitorVocalInput: Bool = false {
        didSet { applyVocalMonitoringState() }
    }

    // MARK: - @Published Solo Looper State

    @Published public var isRecordingSolo: Bool = false

    @Published public var soloLoopEvents: [SoloLoopEvent] = [] {
        didSet { seqState.updateSnapshot { $0.soloLoopEvents = soloLoopEvents } }
    }

    @Published public var soloLoopMuted: Bool = false {
        didSet { seqState.updateSnapshot { $0.soloLoopMuted = soloLoopMuted } }
    }

    // MARK: - Initialization & Teardown

    public init(autoStartEngine: Bool = true) {
        self.autoStartEngine = autoStartEngine
        self.mainMixer = engine.mainMixerNode
        self.audioFormat = Self.resolveAudioFormat(from: engine)
        self.seqState = SequencerStateBox(
            snapshot: SequencerSnapshot(
                sections: DefaultSections.initial,
                bpm: 104.0,
                swing: 0.0,
                percussionEnabled: true,
                autoAdvanceSections: true,
                chordInstrument: .nylon,
                soloInstrument: .violin,
                bodyPreset: .dreadnought,
                pickAttack: 0.50,
                strumSpread: 0.40,
                soloLoopEvents: [],
                soloLoopMuted: false,
                queuedSectionIndex: nil
            )
        )

        attachAndBuildGraph()
        applyAllDSPAndMixerState()
        registerConfigurationChangeObserver()

        if autoStartEngine {
            startEngineIfNeeded()
        }
        scheduleCachePrewarm()
    }

    deinit {
        sequencerTimer?.cancel()
        configChangeDebounceWorkItem?.cancel()
        bufferCache.clear()
        if let observer = configChangeObserver {
            NotificationCenter.default.removeObserver(observer)
        }
    }

    // MARK: - CoreAudio Graph Setup & Hardware Configuration Recovery

    private static func resolveAudioFormat(from engine: AVAudioEngine) -> AVAudioFormat {
        let hwFormat = engine.outputNode.outputFormat(forBus: 0)
        let sr = (hwFormat.sampleRate >= 8000.0 && hwFormat.sampleRate <= 192000.0) ? hwFormat.sampleRate : 48000.0
        return AVAudioFormat(standardFormatWithSampleRate: sr, channels: 2)
            ?? AVAudioFormat(standardFormatWithSampleRate: 48000.0, channels: 2)!
    }

    private func attachAndBuildGraph() {
        attachGraphNodesIfNeeded()
        configureEQBands()
        connectGraph()
    }

    private func attachGraphNodesIfNeeded() {
        let busNodes: [AVAudioNode] = [
            chordMixer,
            soloMixer,
            drumMixer,
            vocalMixer,
            trackSumMixer,
            eqNode,
            masterBusMixer,
            preDelayNode,
            reverbToneEQ,
            reverbNode,
            reverbWetMixer,
            vocalPreviewPlayer
        ]
        for node in busNodes where node.engine == nil {
            engine.attach(node)
        }

        if chordSlots.isEmpty {
            chordSlots = (0..<24).map { _ in
                let p = AVAudioPlayerNode()
                engine.attach(p)
                return VoiceSlot(player: p)
            }
        }
        if soloSlots.isEmpty {
            soloSlots = (0..<16).map { _ in
                let p = AVAudioPlayerNode()
                engine.attach(p)
                return VoiceSlot(player: p)
            }
        }
        if drumSlots.isEmpty {
            drumSlots = (0..<12).map { _ in
                let p = AVAudioPlayerNode()
                engine.attach(p)
                return VoiceSlot(player: p)
            }
        }
    }

    private func configureEQBands() {
        let bands = eqNode.bands
        if bands.count >= 3 {
            // Warmth: 108 Hz Low-Shelf
            bands[0].filterType = .lowShelf
            bands[0].frequency = 108.0
            bands[0].bypass = false

            // Acoustic Mid Focus
            bands[1].filterType = .parametric
            bands[1].frequency = 1200.0
            bands[1].bandwidth = 1.0
            bands[1].gain = 1.0
            bands[1].bypass = false

            // Air Sheen: 4.5 kHz High-Shelf
            bands[2].filterType = .highShelf
            bands[2].frequency = 4500.0
            bands[2].bypass = false
        }

        let revBands = reverbToneEQ.bands
        if revBands.count >= 3 {
            revBands[0].filterType = .lowShelf
            revBands[0].frequency = 220.0
            revBands[0].bypass = false

            revBands[1].filterType = .parametric
            revBands[1].frequency = 340.0
            revBands[1].bandwidth = 1.2
            revBands[1].bypass = false

            revBands[2].filterType = .lowPass
            revBands[2].bypass = false
        }
    }

    private func connectGraph() {
        for slot in chordSlots {
            engine.connect(slot.player, to: chordMixer, format: audioFormat)
        }
        for slot in soloSlots {
            engine.connect(slot.player, to: soloMixer, format: audioFormat)
        }
        for slot in drumSlots {
            engine.connect(slot.player, to: drumMixer, format: audioFormat)
        }
        engine.connect(vocalPreviewPlayer, to: vocalMixer, format: audioFormat)

        // Sum all 4 track submixers on distinct buses of trackSumMixer before single-input eqNode
        engine.connect(chordMixer, to: trackSumMixer, fromBus: 0, toBus: trackSumMixer.nextAvailableInputBus, format: audioFormat)
        engine.connect(soloMixer, to: trackSumMixer, fromBus: 0, toBus: trackSumMixer.nextAvailableInputBus, format: audioFormat)
        engine.connect(drumMixer, to: trackSumMixer, fromBus: 0, toBus: trackSumMixer.nextAvailableInputBus, format: audioFormat)
        engine.connect(vocalMixer, to: trackSumMixer, fromBus: 0, toBus: trackSumMixer.nextAvailableInputBus, format: audioFormat)
        engine.connect(trackSumMixer, to: eqNode, fromBus: 0, toBus: 0, format: audioFormat)

        // Fan out post-EQ signal to dry masterBusMixer and parallel Space Designer wet send
        let dryPoint = AVAudioConnectionPoint(node: masterBusMixer, bus: masterBusMixer.nextAvailableInputBus)
        let wetPoint = AVAudioConnectionPoint(node: preDelayNode, bus: 0)
        engine.connect(eqNode, to: [dryPoint, wetPoint], fromBus: 0, format: audioFormat)

        engine.connect(preDelayNode, to: reverbToneEQ, format: audioFormat)
        engine.connect(reverbToneEQ, to: reverbNode, format: audioFormat)
        engine.connect(reverbNode, to: reverbWetMixer, format: audioFormat)
        engine.connect(reverbWetMixer, to: masterBusMixer, fromBus: 0, toBus: masterBusMixer.nextAvailableInputBus, format: audioFormat)
        engine.connect(masterBusMixer, to: mainMixer, format: audioFormat)
    }

    private func disconnectAllGraphNodes() {
        for slot in chordSlots { engine.disconnectNodeOutput(slot.player) }
        for slot in soloSlots { engine.disconnectNodeOutput(slot.player) }
        for slot in drumSlots { engine.disconnectNodeOutput(slot.player) }
        engine.disconnectNodeOutput(vocalPreviewPlayer)
        engine.disconnectNodeOutput(chordMixer)
        engine.disconnectNodeOutput(soloMixer)
        engine.disconnectNodeOutput(drumMixer)
        engine.disconnectNodeOutput(vocalMixer)
        engine.disconnectNodeOutput(trackSumMixer)
        engine.disconnectNodeOutput(eqNode)
        engine.disconnectNodeOutput(preDelayNode)
        engine.disconnectNodeOutput(reverbToneEQ)
        engine.disconnectNodeOutput(reverbNode)
        engine.disconnectNodeOutput(reverbWetMixer)
        engine.disconnectNodeOutput(masterBusMixer)
    }

    private func registerConfigurationChangeObserver() {
        configChangeObserver = NotificationCenter.default.addObserver(
            forName: .AVAudioEngineConfigurationChange,
            object: engine,
            queue: .main
        ) { [weak self] _ in
            MainActor.assumeIsolated {
                self?.scheduleConfigurationRecovery()
            }
        }
    }

    private func scheduleConfigurationRecovery() {
        configChangeDebounceWorkItem?.cancel()
        let item = DispatchWorkItem { [weak self] in
            MainActor.assumeIsolated {
                self?.handleConfigurationChange()
            }
        }
        configChangeDebounceWorkItem = item
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.08, execute: item)
    }

    private func handleConfigurationChange() {
        if isRecordingVocal {
            _ = stopVocalRecording()
        }

        let wasRunning = engine.isRunning
        if wasRunning {
            engine.stop()
        }

        if isMonitoringConnected {
            engine.disconnectNodeOutput(engine.inputNode)
            isMonitoringConnected = false
        }
        let newFormat = Self.resolveAudioFormat(from: engine)
        if abs(newFormat.sampleRate - audioFormat.sampleRate) > 1.0 || newFormat.channelCount != audioFormat.channelCount {
            audioFormat = newFormat
            bufferCache.clear()
        }

        disconnectAllGraphNodes()
        connectGraph()
        applyAllDSPAndMixerState()
        applyVocalMonitoringState()
        scheduleCachePrewarm()

        if autoStartEngine && (wasRunning || isPlaying || monitorVocalInput) {
            startEngineIfNeeded()
        }
    }

    private func startEngineIfNeeded() {
        guard autoStartEngine, !engine.isRunning else { return }
        let outFormat = engine.outputNode.outputFormat(forBus: 0)
        guard outFormat.channelCount > 0, outFormat.sampleRate >= 8000.0 else {
            return
        }
        do {
            try engine.start()
            audioErrorMessage = nil
        } catch {
            audioErrorMessage = "Ses motoru başlatılamadı: \(error.localizedDescription)"
        }
    }

    private func scheduleCachePrewarm() {
        bufferCache.schedulePrewarm(
            sections: sections,
            activeSectionIndex: currentSectionIndex,
            chordInstrument: chordInstrument,
            soloInstrument: soloInstrument,
            bodyPreset: bodyPreset,
            pickAttack: pickAttack,
            scaleRoot: scaleRoot,
            scaleId: scaleId,
            format: audioFormat
        )
    }

    // MARK: - Smart Controls & Mixer DSP Application

    private func applyAllDSPAndMixerState() {
        applyWarmthDSP(warmth)
        applyAirSheenDSP(airSheen)
        applySpaceDesignerDSP(activeSpacePreset)
        applyReverbWetDSP(spaceReverbWet)
        recalculateMixerGains()
    }

    private func applyWarmthDSP(_ value: Double) {
        if eqNode.bands.count > 0 {
            eqNode.bands[0].gain = Float((value - 0.5) * 14.0)
        }
    }

    private func applyAirSheenDSP(_ value: Double) {
        if eqNode.bands.count > 2 {
            eqNode.bands[2].gain = Float((value - 0.5) * 16.0)
        }
    }

    private func applySpaceDesignerDSP(_ preset: SpaceDesignerPreset) {
        let avPreset: AVAudioUnitReverbPreset
        switch preset {
        case .dryRoom: avPreset = .smallRoom
        case .warmWood: avPreset = .mediumChamber
        case .concertHall: avPreset = .largeHall
        case .plate: avPreset = .plate
        }
        reverbNode.loadFactoryPreset(avPreset)
        reverbNode.wetDryMix = 100.0

        preDelayNode.delayTime = preset.preDelayMs / 1000.0
        preDelayNode.feedback = 0.0
        preDelayNode.wetDryMix = 100.0

        let revBands = reverbToneEQ.bands
        if revBands.count >= 3 {
            revBands[0].gain = Float(preset.lowShelfGainDb)
            revBands[1].gain = Float(preset.resonanceDb)
            revBands[2].frequency = Float(preset.highShelfCutHz)
        }
    }

    private func applyReverbWetDSP(_ value: Double) {
        reverbWetMixer.outputVolume = Float(max(0.0, min(1.0, value)))
    }

    private func recalculateMixerGains() {
        let anySolo = chordSolo || drumSolo || soloSolo || vocalSolo

        func gain(vol: Float, muted: Bool, solo: Bool) -> Float {
            guard !masterMuted, !muted, (!anySolo || solo) else { return 0.0 }
            return max(0.0, min(1.0, vol))
        }

        mainMixer.outputVolume = masterMuted ? 0.0 : max(0.0, min(1.0, masterVolume))
        chordMixer.outputVolume = gain(vol: chordVolume, muted: chordMuted, solo: chordSolo)
        drumMixer.outputVolume = gain(vol: drumVolume, muted: drumMuted, solo: drumSolo)
        soloMixer.outputVolume = gain(vol: soloVolume, muted: soloMuted, solo: soloSolo)
        vocalMixer.outputVolume = gain(vol: vocalVolume, muted: vocalMuted, solo: vocalSolo)
    }

    private func applyVocalMonitoringState() {
        guard autoStartEngine else { return }
        let inputNode = engine.inputNode
        let format = inputNode.outputFormat(forBus: 0)
        if monitorVocalInput {
            guard format.channelCount > 0, format.sampleRate >= 8000.0 else { return }
            if !isMonitoringConnected {
                engine.connect(inputNode, to: vocalMixer, format: format)
                isMonitoringConnected = true
            }
        } else if isMonitoringConnected {
            engine.disconnectNodeOutput(inputNode)
            isMonitoringConnected = false
        }
    }

    // MARK: - Smart Controls Public API

    public func setWarmthValue(_ val: Double) {
        warmth = max(0.0, min(1.0, val))
    }

    public func setAirSheenValue(_ val: Double) {
        airSheen = max(0.0, min(1.0, val))
    }

    public func setPickAttackValue(_ val: Double) {
        pickAttack = max(0.0, min(1.0, val))
    }

    public func setStrumSpreadValue(_ val: Double) {
        strumSpread = max(0.0, min(1.0, val))
    }

    public func setSpaceDesignerPreset(_ preset: SpaceDesignerPreset) {
        activeSpacePreset = preset
    }

    @_disfavoredOverload
    public func setSpaceDesignerPreset(_ preset: AVAudioUnitReverbPreset) {
        switch preset {
        case .smallRoom:
            setSpaceDesignerPreset(.dryRoom)
        case .mediumChamber, .mediumRoom, .mediumHall, .mediumHall2, .mediumHall3:
            setSpaceDesignerPreset(.warmWood)
        case .largeHall, .largeHall2, .largeRoom, .largeRoom2, .largeChamber, .cathedral:
            setSpaceDesignerPreset(.concertHall)
        case .plate:
            setSpaceDesignerPreset(.plate)
        default:
            setSpaceDesignerPreset(.warmWood)
        }
    }

    public func setReverbWet(_ val: Double) {
        spaceReverbWet = max(0.0, min(1.0, val))
    }

    public func applyBodyPreset(_ preset: GuitarBodyPreset) {
        bodyPreset = preset
    }

    // MARK: - Polyphonic Voice-Stealing Buffer Scheduling

    private func scheduleNote(
        on poolType: VoicePoolType,
        freq: Double,
        duration: Double,
        velocity: Double,
        instrument: AcousticInstrumentType,
        bodyPreset: GuitarBodyPreset,
        pickAttack: Double,
        pan: Double
    ) {
        guard freq > 20.0, freq < audioFormat.sampleRate * 0.45 else { return }
        if autoStartEngine { startEngineIfNeeded() }

        let format = audioFormat
        bufferCache.obtainNoteBuffer(
            freq: freq,
            duration: duration,
            velocity: velocity,
            instrument: instrument,
            bodyPreset: bodyPreset,
            pickAttack: pickAttack,
            pan: pan,
            format: format
        ) { [weak self] buffer in
            let box = PCMBufferBox(buffer: buffer)
            DispatchQueue.main.async {
                MainActor.assumeIsolated {
                    self?.enqueueBuffer(box.buffer, duration: duration, pan: pan, poolType: poolType)
                }
            }
        }
    }

    private func scheduleDrum(hit: DrumHitType, velocity: Double, pickAttack: Double, poolType: VoicePoolType = .drum) {
        if autoStartEngine { startEngineIfNeeded() }
        let format = audioFormat
        bufferCache.obtainDrumBuffer(hit: hit, velocity: velocity, pickAttack: pickAttack, format: format) { [weak self] buffer in
            let dur = Double(buffer.frameLength) / max(8000.0, format.sampleRate)
            let box = PCMBufferBox(buffer: buffer)
            DispatchQueue.main.async {
                MainActor.assumeIsolated {
                    self?.enqueueBuffer(box.buffer, duration: dur, pan: 0.0, poolType: poolType)
                }
            }
        }
    }

    private func scheduleMuteChop(velocity: Double, bodyPreset: GuitarBodyPreset, pickAttack: Double, pan: Double) {
        if autoStartEngine { startEngineIfNeeded() }
        let format = audioFormat
        bufferCache.obtainMuteChopBuffer(
            velocity: velocity,
            bodyPreset: bodyPreset,
            pickAttack: pickAttack,
            pan: pan,
            format: format
        ) { [weak self] buffer in
            let box = PCMBufferBox(buffer: buffer)
            DispatchQueue.main.async {
                MainActor.assumeIsolated {
                    self?.enqueueBuffer(box.buffer, duration: 0.085, pan: pan, poolType: .chord)
                }
            }
        }
    }

    private enum VoicePoolType {
        case chord, solo, drum
    }

    private func enqueueBuffer(_ buffer: AVAudioPCMBuffer, duration: Double, pan: Double, poolType: VoicePoolType) {
        guard engine.isRunning else { return }
        let now = CACurrentMediaTime()

        let slotIndex: Int
        let player: AVAudioPlayerNode
        switch poolType {
        case .chord:
            slotIndex = acquireSlotIndex(in: chordSlots, now: now)
            chordSlots[slotIndex].busyUntil = now + duration
            chordSlots[slotIndex].lastUsedAt = now
            player = chordSlots[slotIndex].player
        case .solo:
            slotIndex = acquireSlotIndex(in: soloSlots, now: now)
            soloSlots[slotIndex].busyUntil = now + duration
            soloSlots[slotIndex].lastUsedAt = now
            player = soloSlots[slotIndex].player
        case .drum:
            slotIndex = acquireSlotIndex(in: drumSlots, now: now)
            drumSlots[slotIndex].busyUntil = now + duration
            drumSlots[slotIndex].lastUsedAt = now
            player = drumSlots[slotIndex].player
        }

        guard player.engine === engine else { return }
        player.pan = Float(max(-1.0, min(1.0, pan)))
        if !player.isPlaying {
            player.play()
        }
        player.scheduleBuffer(buffer, at: nil, options: [.interrupts], completionHandler: nil)
    }

    private func acquireSlotIndex(in slots: [VoiceSlot], now: TimeInterval) -> Int {
        if let free = slots.firstIndex(where: { $0.busyUntil <= now }) {
            return free
        }
        var oldestIdx = 0
        var oldestTime = slots[0].lastUsedAt
        for idx in 1..<slots.count where slots[idx].lastUsedAt < oldestTime {
            oldestTime = slots[idx].lastUsedAt
            oldestIdx = idx
        }
        return oldestIdx
    }

    // MARK: - Strumming, Note & Drum Public API

    public func playStringNote(
        freq: Double,
        duration: Double = 3.0,
        velocity: Float = 0.85,
        instrument: AcousticInstrumentType = .nylon
    ) {
        scheduleNote(
            on: .chord,
            freq: freq,
            duration: duration,
            velocity: Double(velocity),
            instrument: instrument,
            bodyPreset: bodyPreset,
            pickAttack: pickAttack,
            pan: 0.0
        )
    }

    public func playSoloNote(
        freq: Double,
        duration: Double = 2.5,
        velocity: Float = 0.9,
        instrument: AcousticInstrumentType = .nylon
    ) {
        scheduleNote(
            on: .solo,
            freq: freq,
            duration: duration,
            velocity: Double(velocity),
            instrument: instrument,
            bodyPreset: bodyPreset,
            pickAttack: pickAttack,
            pan: 0.0
        )
    }

    public func strumChord(_ chord: GuitarChord, stroke: StrumStroke = .down, velocity: Double = 0.95) {
        performStrum(
            chord: chord,
            stroke: stroke,
            velocity: velocity,
            instrument: chordInstrument,
            bodyPreset: bodyPreset,
            pickAttack: pickAttack,
            strumSpread: strumSpread
        )
    }

    public func strumChord(_ chord: GuitarChord, downstroke: Bool, instrument: AcousticInstrumentType = .nylon) {
        performStrum(
            chord: chord,
            stroke: downstroke ? .down : .up,
            velocity: 0.90,
            instrument: instrument,
            bodyPreset: bodyPreset,
            pickAttack: pickAttack,
            strumSpread: strumSpread
        )
    }

    public func playSingleString(chord: GuitarChord, stringIndex: Int, velocity: Double = 0.9) {
        guard (0..<6).contains(stringIndex) else { return }
        let fret = chord.frets[stringIndex]
        guard fret >= 0 else { return }
        let freq = ChordLibrary.fretFrequency(stringIndex: stringIndex, fret: fret)
        guard freq > 20.0 else { return }
        let pan = ((Double(stringIndex) / 5.0) - 0.5) * 0.70 * strumSpread
        scheduleNote(
            on: .chord,
            freq: freq,
            duration: 2.5,
            velocity: velocity,
            instrument: chordInstrument,
            bodyPreset: bodyPreset,
            pickAttack: pickAttack,
            pan: pan
        )
    }

    public func playSoloMidi(_ midi: Int, velocity: Double = 0.9) {
        let activeChordName: String
        if sections.indices.contains(currentSectionIndex),
           sections[currentSectionIndex].chords.indices.contains(currentChordIndex) {
            activeChordName = sections[currentSectionIndex].chords[currentChordIndex]
        } else {
            activeChordName = sections.first?.chords.first ?? "Am"
        }
        let chord = ChordLibrary.chordNamed(activeChordName)

        let snapped = ChordLibrary.snapMidiToChord(
            midi: midi,
            chord: chord,
            mode: harmonyMode,
            scaleRoot: scaleRoot,
            scaleId: scaleId
        )

        if soloInstrument == .drums {
            let hit = DrumHitType.allCases[abs(snapped) % DrumHitType.allCases.count]
            scheduleDrum(hit: hit, velocity: velocity, pickAttack: pickAttack, poolType: .solo)
        } else {
            if harmonyMode == .smartLick {
                let graceMidi = max(0, snapped - 2)
                let graceSnapped = ChordLibrary.snapMidiToChord(
                    midi: graceMidi,
                    chord: chord,
                    mode: .freeScale,
                    scaleRoot: scaleRoot,
                    scaleId: scaleId
                )
                if graceSnapped != snapped {
                    let graceFreq = ChordLibrary.midiToFrequency(graceSnapped)
                    scheduleNote(
                        on: .solo,
                        freq: graceFreq,
                        duration: 0.14,
                        velocity: velocity * 0.55,
                        instrument: soloInstrument,
                        bodyPreset: bodyPreset,
                        pickAttack: pickAttack,
                        pan: -0.08
                    )
                }
            }

            let mainFreq = ChordLibrary.midiToFrequency(snapped)
            let delayNs: UInt64 = (harmonyMode == .smartLick) ? 24_000_000 : 0
            if delayNs == 0 {
                scheduleNote(
                    on: .solo,
                    freq: mainFreq,
                    duration: 2.2,
                    velocity: velocity,
                    instrument: soloInstrument,
                    bodyPreset: bodyPreset,
                    pickAttack: pickAttack,
                    pan: 0.0
                )
            } else {
                let inst = soloInstrument
                let body = bodyPreset
                let atk = pickAttack
                Task { @MainActor [weak self] in
                    try? await Task.sleep(nanoseconds: delayNs)
                    self?.scheduleNote(
                        on: .solo,
                        freq: mainFreq,
                        duration: 2.2,
                        velocity: velocity,
                        instrument: inst,
                        bodyPreset: body,
                        pickAttack: atk,
                        pan: 0.0
                    )
                }
            }
        }

        if isRecordingSolo {
            let safeSecIdx = sections.indices.contains(currentSectionIndex) ? currentSectionIndex : 0
            let safeBarIdx: Int
            if sections.indices.contains(safeSecIdx), !sections[safeSecIdx].chords.isEmpty {
                safeBarIdx = max(0, min(sections[safeSecIdx].chords.count - 1, currentChordIndex))
            } else {
                safeBarIdx = 0
            }
            let event = SoloLoopEvent(
                midi: snapped,
                sectionIndex: safeSecIdx,
                barIndex: safeBarIdx,
                step: max(0, min(15, currentStep)),
                velocity: max(0.0, min(1.0, velocity)),
                instrument: soloInstrument
            )
            soloLoopEvents.append(event)
        }
    }

    public func playDrumPad(_ hit: DrumHitType, velocity: Double = 0.95) {
        guard percussionEnabled else { return }
        scheduleDrum(hit: hit, velocity: max(0.0, min(1.0, velocity)), pickAttack: pickAttack)
    }

    public func playDrumHit(_ type: String) {
        let hit = DrumHitType.from(legacyKey: type) ?? .shakerClosed
        playDrumPad(hit, velocity: 0.90)
    }

    private func performStrum(
        chord: GuitarChord,
        stroke: StrumStroke,
        velocity: Double,
        instrument: AcousticInstrumentType,
        bodyPreset: GuitarBodyPreset,
        pickAttack: Double,
        strumSpread: Double
    ) {
        guard stroke != .rest, velocity > 0.001 else { return }

        if stroke == .mute {
            scheduleMuteChop(velocity: velocity, bodyPreset: bodyPreset, pickAttack: pickAttack, pan: 0.0)
            return
        }

        let soundingIndices = (0..<6).filter { chord.frets[$0] >= 0 }
        guard !soundingIndices.isEmpty else { return }

        let targetStrings: [Int]
        switch stroke {
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

        let spreadScale = 0.15 + 1.65 * max(0.0, min(1.0, strumSpread))
        let totalSweepMs = bodyPreset.strumSpeedMs * spreadScale
        let count = max(1, targetStrings.count)
        let duration = (stroke == .bass || stroke == .treble) ? 1.8 : 2.5

        for (orderIdx, stringIdx) in targetStrings.enumerated() {
            let fret = chord.frets[stringIdx]
            let freq = ChordLibrary.fretFrequency(stringIndex: stringIdx, fret: fret)
            guard freq > 20.0 else { continue }

            let norm = count > 1 ? Double(orderIdx) / Double(count - 1) : 0.0
            let sweepMs = totalSweepMs * pow(norm, 1.15)
            let jitterMs = Double.random(in: -0.8...0.8) * strumSpread
            let delayMs = max(0.0, sweepMs + jitterMs)
            let pan = ((Double(stringIdx) / 5.0) - 0.5) * 0.72 * strumSpread
            let strVel = min(1.0, velocity * (0.94 + 0.06 * (stroke == .down ? (1.0 - norm * 0.35) : (0.65 + norm * 0.35))))

            if delayMs < 0.4 {
                scheduleNote(
                    on: .chord,
                    freq: freq,
                    duration: duration,
                    velocity: strVel,
                    instrument: instrument,
                    bodyPreset: bodyPreset,
                    pickAttack: pickAttack,
                    pan: pan
                )
            } else {
                let instRaw = instrument.rawValue
                let bodyRaw = bodyPreset.rawValue
                sequencerQueue.asyncAfter(deadline: .now() + delayMs / 1000.0) { [weak self] in
                    DispatchQueue.main.async {
                        MainActor.assumeIsolated {
                            let resolvedInst = AcousticInstrumentType(rawValue: instRaw) ?? .nylon
                            let resolvedBody = GuitarBodyPreset(rawValue: bodyRaw) ?? .dreadnought
                            self?.scheduleNote(
                                on: .chord,
                                freq: freq,
                                duration: duration,
                                velocity: strVel,
                                instrument: resolvedInst,
                                bodyPreset: resolvedBody,
                                pickAttack: pickAttack,
                                pan: pan
                            )
                        }
                    }
                }
            }
        }
    }

    // MARK: - Transport & Quantized Sequencer Control

    public func togglePlayback() {
        if isPlaying {
            stopPlayback()
        } else {
            startPlayback()
        }
    }

    public func togglePlayback(sections: [SongSection], instrument: AcousticInstrumentType = .nylon) {
        self.sections = sections
        self.chordInstrument = instrument
        togglePlayback()
    }

    public func startPlayback() {
        guard !isPlaying else { return }
        if autoStartEngine { startEngineIfNeeded() }

        let safeSec = sections.isEmpty ? 0 : max(0, min(sections.count - 1, currentSectionIndex))
        let safeChord: Int
        if sections.indices.contains(safeSec), !sections[safeSec].chords.isEmpty {
            safeChord = max(0, min(sections[safeSec].chords.count - 1, currentChordIndex))
        } else {
            safeChord = 0
        }

        isInternalSync = true
        currentSectionIndex = safeSec
        currentChordIndex = safeChord
        currentStep = 0
        currentRepeat = 0
        isInternalSync = false

        playbackSessionID &+= 1
        let sessionID = playbackSessionID
        seqState.setIndices(step: 0, chordIndex: safeChord, sectionIndex: safeSec, repeatIndex: 0, sessionID: sessionID)
        isPlaying = true

        // Sync recorded vocal take playback from start if present (skip when recording/starting recording)
        scheduleSyncedVocalIfNeeded()

        sequencerTimer?.cancel()
        let timer = DispatchSource.makeTimerSource(queue: sequencerQueue)
        timer.schedule(deadline: .now())
        timer.setEventHandler { [weak self] in
            self?.tickSequencerStep()
        }
        sequencerTimer = timer
        timer.resume()
    }

    public func startPlayback(sections: [SongSection], instrument: AcousticInstrumentType = .nylon) {
        self.sections = sections
        self.chordInstrument = instrument
        startPlayback()
    }

    public func stopPlayback() {
        sequencerTimer?.cancel()
        sequencerTimer = nil

        playbackSessionID &+= 1

        if vocalPreviewPlayer.isPlaying {
            vocalPreviewPlayer.stop()
        }

        isInternalSync = true
        currentStep = 0
        isInternalSync = false

        seqState.setIndices(step: 0, sessionID: playbackSessionID)
        isPlaying = false
    }

    public func resetTransport() {
        stopPlayback()
        isInternalSync = true
        currentSectionIndex = 0
        currentChordIndex = 0
        currentStep = 0
        currentRepeat = 0
        queuedSectionIndex = nil
        isInternalSync = false

        seqState.setIndices(step: 0, chordIndex: 0, sectionIndex: 0, repeatIndex: 0)
        seqState.updateSnapshot { $0.queuedSectionIndex = nil }
    }

    public func queueSection(_ index: Int) {
        guard sections.indices.contains(index) else { return }
        if isPlaying {
            queuedSectionIndex = index
        } else {
            isInternalSync = true
            currentSectionIndex = index
            currentChordIndex = 0
            currentStep = 0
            currentRepeat = 0
            queuedSectionIndex = nil
            isInternalSync = false

            seqState.setIndices(step: 0, chordIndex: 0, sectionIndex: index, repeatIndex: 0)
            seqState.updateSnapshot { $0.queuedSectionIndex = nil }
        }
    }

    private func rescheduleSequencerTimer() {
        guard isPlaying, let timer = sequencerTimer else { return }
        let state = seqState.readState()
        let safeBpm = max(50.0, min(180.0, state.snapshot.bpm))
        let safeSwing = max(0.0, min(0.4, state.snapshot.swing))
        let baseStepSec = (60.0 / safeBpm) / 4.0
        let interval = (state.step % 2 == 0)
            ? baseStepSec * (1.0 + safeSwing * 0.5)
            : baseStepSec * (1.0 - safeSwing * 0.5)
        timer.schedule(deadline: .now() + max(0.015, interval))
    }

    private nonisolated func tickSequencerStep() {
        let outcome = seqState.advanceStep()
        switch outcome {
        case .empty(let capturedSessionID):
            DispatchQueue.main.async { [weak self] in
                MainActor.assumeIsolated {
                    guard let self = self,
                          self.isPlaying,
                          self.playbackSessionID == capturedSessionID else { return }
                    self.stopPlayback()
                }
            }
            return

        case .step(let snapshot, let result):
            let capturedSessionID = result.sessionID
            // Schedule next step one-shot dynamically for live BPM & swing responsiveness
            let nextDelay = result.nextStepIntervalSec
            DispatchQueue.main.async { [weak self] in
                MainActor.assumeIsolated {
                    guard let self = self,
                          self.isPlaying,
                          self.playbackSessionID == capturedSessionID else { return }
                    self.sequencerTimer?.schedule(deadline: .now() + nextDelay)

                    // Sync UI playhead
                    self.isInternalSync = true
                    self.currentStep = result.nextStep
                    self.currentChordIndex = result.nextChordIndex
                    self.currentSectionIndex = result.nextSectionIndex
                    self.currentRepeat = result.nextRepeatIndex
                    if let consumed = result.consumedQueuedSection, self.queuedSectionIndex == consumed {
                        self.queuedSectionIndex = nil
                    }
                    self.isInternalSync = false

                    // Trigger step audio from live snapshot
                    guard snapshot.sections.indices.contains(result.sectionIndexJustPlayed) else { return }
                    let sec = snapshot.sections[result.sectionIndexJustPlayed]
                    let stepIdx = result.stepJustPlayed

                    // 1. Chord / Riff pattern step
                    if !sec.chords.isEmpty && sec.chords.indices.contains(result.chordIndexJustPlayed) {
                        let chord = ChordLibrary.chordNamed(sec.chords[result.chordIndexJustPlayed])
                        let pattern = StrumPatternLibrary.pattern(id: sec.patternId)
                        if pattern.steps.indices.contains(stepIdx) {
                            let pStep = pattern.steps[stepIdx]
                            if pStep.stroke != .rest {
                                let vel = max(0.0, min(1.0, pStep.velocity * (pStep.accent ? 1.05 : 0.94)))
                                self.performStrum(
                                    chord: chord,
                                    stroke: pStep.stroke,
                                    velocity: vel,
                                    instrument: snapshot.chordInstrument,
                                    bodyPreset: snapshot.bodyPreset,
                                    pickAttack: snapshot.pickAttack,
                                    strumSpread: snapshot.strumSpread
                                )
                            }
                        }
                    }

                    // 2. Percussion / DrumMode step
                    if snapshot.percussionEnabled {
                        let drumTriggers = DrumModeGrid.triggers(for: sec.resolvedDrumMode, step: stepIdx)
                        for trigger in drumTriggers {
                            self.scheduleDrum(hit: trigger.hit, velocity: trigger.velocity, pickAttack: snapshot.pickAttack)
                        }
                    }

                    // 3. Solo Looper step
                    if !snapshot.soloLoopMuted {
                        let matchingEvents = snapshot.soloLoopEvents.filter {
                            $0.sectionIndex == result.sectionIndexJustPlayed
                                && $0.barIndex == result.chordIndexJustPlayed
                                && $0.step == stepIdx
                        }
                        for ev in matchingEvents {
                            if ev.instrument == .drums {
                                let hit = DrumHitType.allCases[abs(ev.midi) % DrumHitType.allCases.count]
                                self.scheduleDrum(
                                    hit: hit,
                                    velocity: ev.velocity,
                                    pickAttack: snapshot.pickAttack,
                                    poolType: .solo
                                )
                            } else {
                                let freq = ChordLibrary.midiToFrequency(ev.midi)
                                self.scheduleNote(
                                    on: .solo,
                                    freq: freq,
                                    duration: 1.5,
                                    velocity: ev.velocity,
                                    instrument: ev.instrument,
                                    bodyPreset: snapshot.bodyPreset,
                                    pickAttack: snapshot.pickAttack,
                                    pan: 0.0
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: - Vocal Recording & Synced Playback

    public func startVocalRecording() {
        guard !isRecordingVocal && !isStartingVocalRecording else { return }
        isStartingVocalRecording = true
        if vocalPreviewPlayer.isPlaying {
            vocalPreviewPlayer.stop()
        }
        Task { @MainActor [weak self] in
            await self?.performStartVocalRecording(alreadyMarkedStarting: true)
        }
    }

    public func startVocalRecording() async {
        await performStartVocalRecording(alreadyMarkedStarting: false)
    }

    private func performStartVocalRecording(alreadyMarkedStarting: Bool) async {
        if alreadyMarkedStarting {
            guard !isRecordingVocal else {
                isStartingVocalRecording = false
                return
            }
        } else {
            guard !isRecordingVocal && !isStartingVocalRecording else { return }
            isStartingVocalRecording = true
        }
        defer { isStartingVocalRecording = false }

        if vocalPreviewPlayer.isPlaying {
            vocalPreviewPlayer.stop()
        }

        let auth = await vocalRecorder.ensureMicrophonePermission()
        guard !isRecordingVocal else { return }
        guard auth == .authorized else {
            vocalPermissionDenied = true
            isRecordingVocal = false
            audioErrorMessage = "Mikrofon izni reddedildi. Lütfen Sistem Ayarları > Gizlilik ve Güvenlik > Mikrofon bölümünden izin verin."
            return
        }
        vocalPermissionDenied = false

        if autoStartEngine {
            startEngineIfNeeded()
        }
        guard engine.isRunning else {
            isRecordingVocal = false
            if audioErrorMessage == nil {
                audioErrorMessage = "Ses motoru aktif olmadığı için mikrofon kaydı başlatılamadı."
            }
            return
        }

        if vocalPreviewPlayer.isPlaying {
            vocalPreviewPlayer.stop()
        }

        let result = vocalRecorder.startRecording(engine: engine) { [weak self] level in
            MainActor.assumeIsolated {
                self?.vocalInputLevel = level
            }
        }

        switch result {
        case .success(let url):
            activeRecordingURL = url
            isRecordingVocal = true
            audioErrorMessage = nil
        case .failure(let error):
            activeRecordingURL = nil
            isRecordingVocal = false
            vocalInputLevel = 0.0
            audioErrorMessage = "Vokal kaydı başlatılamadı: \(error.localizedDescription)"
        }
    }

    @discardableResult
    public func stopVocalRecording() -> URL? {
        guard isRecordingVocal else { return nil }
        let url = vocalRecorder.stopRecording()
        isRecordingVocal = false
        vocalInputLevel = 0.0
        let finalizedURL = url ?? activeRecordingURL
        activeRecordingURL = nil
        if let finalizedURL = finalizedURL {
            recordedVocalURL = finalizedURL
            recordedVocalDuration = VocalRecorder.durationOfAudioFile(at: finalizedURL)
        }
        return finalizedURL
    }

    public func deleteVocalTake() {
        if isRecordingVocal {
            _ = stopVocalRecording()
        }
        activeRecordingURL = nil
        if vocalPreviewPlayer.isPlaying {
            vocalPreviewPlayer.stop()
        }
        if let url = recordedVocalURL, FileManager.default.fileExists(atPath: url.path) {
            try? FileManager.default.removeItem(at: url)
        }
        recordedVocalURL = nil
        recordedVocalDuration = 0.0
    }

    public func playVocalTakePreview() {
        guard !isRecordingVocal && !isStartingVocalRecording else { return }
        guard let url = recordedVocalURL, FileManager.default.fileExists(atPath: url.path) else {
            return
        }
        if vocalPreviewPlayer.isPlaying {
            vocalPreviewPlayer.stop()
            return
        }
        scheduleVocalFileOnPlayer(url: url)
    }

    private func scheduleSyncedVocalIfNeeded() {
        guard !isRecordingVocal && !isStartingVocalRecording else { return }
        guard let url = recordedVocalURL, FileManager.default.fileExists(atPath: url.path) else {
            return
        }
        scheduleVocalFileOnPlayer(url: url)
    }

    private func scheduleVocalFileOnPlayer(url: URL) {
        if autoStartEngine { startEngineIfNeeded() }
        guard engine.isRunning, vocalPreviewPlayer.engine === engine else { return }
        guard let stereo = OfflineMixdownRenderer.loadAudioAsStereo(url: url, targetSampleRate: audioFormat.sampleRate),
              !stereo.left.isEmpty,
              let buffer = AVAudioPCMBuffer(pcmFormat: audioFormat, frameCapacity: AVAudioFrameCount(stereo.left.count)),
              let chData = buffer.floatChannelData else {
            return
        }

        let frameCount = stereo.left.count
        buffer.frameLength = AVAudioFrameCount(frameCount)
        stereo.left.withUnsafeBufferPointer { srcL in
            if let base = srcL.baseAddress {
                memcpy(chData[0], base, frameCount * MemoryLayout<Float>.size)
            }
        }
        if audioFormat.channelCount > 1 {
            stereo.right.withUnsafeBufferPointer { srcR in
                if let base = srcR.baseAddress {
                    memcpy(chData[1], base, frameCount * MemoryLayout<Float>.size)
                }
            }
        }

        vocalPreviewPlayer.stop()
        if !vocalPreviewPlayer.isPlaying {
            vocalPreviewPlayer.play()
        }
        vocalPreviewPlayer.scheduleBuffer(buffer, at: nil, options: [.interrupts], completionHandler: nil)
    }

    // MARK: - Solo Looper & Project Export

    public func clearSoloLoop() {
        soloLoopEvents = []
    }

    public func exportProjectJSON(lyrics: [String: String]) -> Data? {
        let project = SongProject(
            version: 1,
            updatedAt: Date(),
            sections: sections,
            lyrics: lyrics,
            bpm: bpm,
            swing: swing,
            scaleRoot: scaleRoot,
            scaleId: scaleId,
            chordInstrument: chordInstrument,
            soloInstrument: soloInstrument,
            bodyPreset: bodyPreset,
            spaceDesignerPreset: activeSpacePreset,
            warmth: warmth,
            airSheen: airSheen,
            pickAttack: pickAttack,
            spaceReverbWet: spaceReverbWet,
            vocalTakeFileName: recordedVocalURL?.lastPathComponent,
            soloLoopEvents: soloLoopEvents
        )
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .custom { date, encoder in
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            var container = encoder.singleValueContainer()
            try container.encode(formatter.string(from: date))
        }
        return try? encoder.encode(project)
    }

    public func exportMixdownWAV(to url: URL) async throws {
        let snapshot = MixdownSnapshot(
            sections: sections,
            bpm: bpm,
            swing: swing,
            percussionEnabled: percussionEnabled,
            chordInstrument: chordInstrument,
            soloInstrument: soloInstrument,
            bodyPreset: bodyPreset,
            warmth: warmth,
            airSheen: airSheen,
            pickAttack: pickAttack,
            spaceReverbWet: spaceReverbWet,
            strumSpread: strumSpread,
            activeSpacePreset: activeSpacePreset,
            soloLoopEvents: soloLoopEvents,
            soloLoopMuted: soloLoopMuted,
            recordedVocalURL: recordedVocalURL,
            masterVolume: masterVolume,
            masterMuted: masterMuted,
            chordVolume: chordVolume,
            chordMuted: chordMuted,
            chordSolo: chordSolo,
            drumVolume: drumVolume,
            drumMuted: drumMuted,
            drumSolo: drumSolo,
            soloVolume: soloVolume,
            soloMuted: soloMuted,
            soloSolo: soloSolo,
            vocalVolume: vocalVolume,
            vocalMuted: vocalMuted,
            vocalSolo: vocalSolo,
            sampleRate: audioFormat.sampleRate
        )

        let queue = exportQueue
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            queue.async {
                do {
                    try OfflineMixdownRenderer.render(snapshot: snapshot, to: url)
                    continuation.resume(returning: ())
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }
}
