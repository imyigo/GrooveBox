import Foundation
import AVFoundation
import Accelerate

/// Thread-safe microphone capture helper.
/// Guarantees zero disk I/O inside CoreAudio's realtime tap callback and guards against
/// missing hardware formats or denied microphone permissions without throwing ObjC NSExceptions.
final class VocalRecorder: @unchecked Sendable {
    private let writerQueue = DispatchQueue(label: "com.acousticgroovebox.vocal.writer", qos: .utility)
    private var vocalAudioFile: AVAudioFile?
    private var activeURL: URL?
    private var hasInstalledTap = false
    private weak var tappedInputNode: AVAudioInputNode?

    enum AuthorizationOutcome {
        case authorized
        case denied
    }

    func ensureMicrophonePermission() async -> AuthorizationOutcome {
        let status = AVCaptureDevice.authorizationStatus(for: .audio)
        switch status {
        case .authorized:
            return .authorized
        case .notDetermined:
            let granted = await AVCaptureDevice.requestAccess(for: .audio)
            return granted ? .authorized : .denied
        case .denied, .restricted:
            return .denied
        @unknown default:
            return .denied
        }
    }

    static func defaultVocalsDirectory(fileManager: FileManager = .default) -> URL {
        let appSupport = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? fileManager.temporaryDirectory
        return appSupport
            .appendingPathComponent("AcousticGrooveBox", isDirectory: true)
            .appendingPathComponent("Vocals", isDirectory: true)
    }

    func startRecording(
        engine: AVAudioEngine,
        onLevelUpdate: @escaping @Sendable (Float) -> Void
    ) -> Result<URL, Error> {
        let inputNode = engine.inputNode
        let inputFormat = inputNode.outputFormat(forBus: 0)

        guard inputFormat.channelCount > 0,
              inputFormat.sampleRate >= 8000.0,
              inputFormat.sampleRate <= 192000.0 else {
            return .failure(VocalRecorderError.invalidInputFormat)
        }

        // Clean any stale tap before installing a new one
        if hasInstalledTap {
            tappedInputNode?.removeTap(onBus: 0)
            hasInstalledTap = false
            tappedInputNode = nil
        }

        let directory = Self.defaultVocalsDirectory()
        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        } catch {
            return .failure(error)
        }

        let outputURL = directory.appendingPathComponent("vocal_take_\(UUID().uuidString).caf")

        let fileSettings: [String: Any] = [
            AVFormatIDKey: kAudioFormatLinearPCM,
            AVSampleRateKey: inputFormat.sampleRate,
            AVNumberOfChannelsKey: Int(inputFormat.channelCount),
            AVLinearPCMBitDepthKey: 32,
            AVLinearPCMIsFloatKey: true,
            AVLinearPCMIsNonInterleaved: !inputFormat.isInterleaved
        ]

        let openedFile: AVAudioFile
        do {
            openedFile = try AVAudioFile(
                forWriting: outputURL,
                settings: fileSettings,
                commonFormat: inputFormat.commonFormat,
                interleaved: inputFormat.isInterleaved
            )
        } catch {
            return .failure(error)
        }

        writerQueue.sync {
            self.vocalAudioFile = openedFile
            self.activeURL = outputURL
        }

        let capturedFormat = inputFormat
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: capturedFormat) { [weak self] buffer, _ in
            guard let self = self, buffer.frameLength > 0 else { return }

            // Compute fast RMS level without blocking or disk I/O
            let rmsLevel = Self.computeLevel(buffer: buffer)
            DispatchQueue.main.async {
                onLevelUpdate(rmsLevel)
            }

            // Copy PCM frames for async serial file write off the CoreAudio tap thread
            guard let copy = Self.copyPCMBuffer(buffer) else { return }
            self.writerQueue.async {
                guard let file = self.vocalAudioFile else { return }
                try? file.write(from: copy)
            }
        }

        hasInstalledTap = true
        tappedInputNode = inputNode
        return .success(outputURL)
    }

    func stopRecording() -> URL? {
        if hasInstalledTap {
            tappedInputNode?.removeTap(onBus: 0)
            hasInstalledTap = false
            tappedInputNode = nil
        }

        var finishedURL: URL?
        writerQueue.sync {
            self.vocalAudioFile = nil
            finishedURL = self.activeURL
            self.activeURL = nil
        }
        return finishedURL
    }

    static func durationOfAudioFile(at url: URL) -> TimeInterval {
        guard FileManager.default.fileExists(atPath: url.path) else { return 0.0 }
        guard let file = try? AVAudioFile(forReading: url) else { return 0.0 }
        let sr = file.processingFormat.sampleRate
        guard sr > 0 else { return 0.0 }
        return Double(file.length) / sr
    }

    private static func computeLevel(buffer: AVAudioPCMBuffer) -> Float {
        guard let channelData = buffer.floatChannelData else { return 0.0 }
        let count = vDSP_Length(buffer.frameLength)
        guard count > 0 else { return 0.0 }
        var rms: Float = 0.0
        vDSP_rmsqv(channelData[0], 1, &rms, count)
        if !rms.isFinite { return 0.0 }
        return min(1.0, max(0.0, rms * 3.2))
    }

    private static func copyPCMBuffer(_ source: AVAudioPCMBuffer) -> AVAudioPCMBuffer? {
        let frameLength = source.frameLength
        guard frameLength > 0,
              let copy = AVAudioPCMBuffer(pcmFormat: source.format, frameCapacity: frameLength) else {
            return nil
        }
        copy.frameLength = frameLength

        let channelCount = Int(source.format.channelCount)
        if let srcFloat = source.floatChannelData, let dstFloat = copy.floatChannelData {
            let byteCount = Int(frameLength) * MemoryLayout<Float>.size
            let bufferCount = source.format.isInterleaved ? 1 : channelCount
            let copyBytes = source.format.isInterleaved ? byteCount * channelCount : byteCount
            for ch in 0..<bufferCount {
                memcpy(dstFloat[ch], srcFloat[ch], copyBytes)
            }
            return copy
        }
        return nil
    }
}

enum VocalRecorderError: Error, LocalizedError {
    case invalidInputFormat

    var errorDescription: String? {
        switch self {
        case .invalidInputFormat:
            return "Geçerli mikrofon girişi bulunamadı (kanal veya örnekleme hızı 0)."
        }
    }
}
