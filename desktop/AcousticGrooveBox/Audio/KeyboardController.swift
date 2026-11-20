import Foundation
import AppKit
import SwiftUI
import Combine

/// Apple Logic Pro & GarageBand Standardında QWERTY "Musical Typing" Klavye Denetleyicisi
@MainActor
public final class KeyboardController: ObservableObject {
    public static let shared = KeyboardController()

    // Aktif basılı tutulan tuşlar (UI görsel parlaması için)
    @Published public var pressedKeys: Set<String> = []
    
    // Geçerli temel oktav (Varsayılan: 0, yani C4 = 60 MIDI)
    @Published public var octaveOffset: Int = 0 // -2 ... +2 oktav
    
    // Klavye denetleyicisi aktif mi?
    @Published public var isEnabled: Bool = true

    private var eventMonitor: Any?
    private var activeMidiNotes: [String: Int] = [:]

    // Standart Logic Pro / GarageBand Musical Typing Haritası (Yarıton farkı / Semitone offset from C4)
    // Beyaz Tuşlar (A-S-D-F-G-H-J-K-L-;-')
    // Siyah Tuşlar (W-E-T-Y-U-O-P-[-])
    private let musicalKeyMap: [String: Int] = [
        // Orta Sıra (Beyaz Tuşlar)
        "a": 0,   // C4
        "s": 2,   // D4
        "d": 4,   // E4
        "f": 5,   // F4
        "g": 7,   // G4
        "h": 9,   // A4
        "j": 11,  // B4
        "k": 12,  // C5
        "l": 14,  // D5
        ";": 16,  // E5
        "ş": 16,  // Türkçe klavye
        "'": 17,  // F5
        "i": 17,  // Türkçe klavye
        "ı": 17,

        // Üst Sıra (Siyah Tuşlar - Diyezler/Bemoller)
        "w": 1,   // C#4
        "e": 3,   // D#4
        "t": 6,   // F#4
        "y": 8,   // G#4
        "u": 10,  // A#4
        "o": 13,  // C#5
        "p": 15,  // D#5
        "ğ": 18,  // F#5 (Türkçe)
        "ü": 20,  // G#5 (Türkçe)
        "[": 18,  // F#5
        "]": 20,  // G#5

        // Alternatif Üst Sıra Pentatonik / Melodi Desteği
        "q": -3,  // A3
        "r": 5,   // F4
    ]

    private init() {
        setupEventMonitor()
    }

    deinit {
        if let monitor = eventMonitor {
            NSEvent.removeMonitor(monitor)
        }
    }

    public func setupEventMonitor() {
        guard eventMonitor == nil else { return }

        eventMonitor = NSEvent.addLocalMonitorForEvents(matching: [.keyDown, .keyUp]) { [weak self] event in
            guard let self = self else { return event }

            // Kullanıcı metin yazıyorsa (Söz Defteri / TextField) tuşları çalma, normal yazıya bırak
            if let window = NSApp.keyWindow,
               let firstResponder = window.firstResponder,
               firstResponder.isKind(of: NSTextView.self) || firstResponder.isKind(of: NSTextField.self) {
                return event
            }

            if event.type == .keyDown {
                if self.handleKeyDown(event: event) {
                    return nil // Event tüketildi (sistem bip sesini engelle)
                }
            } else if event.type == .keyUp {
                if self.handleKeyUp(event: event) {
                    return nil
                }
            }

            return event
        }
    }

    private func handleKeyDown(event: NSEvent) -> Bool {
        guard isEnabled else { return false }
        // Tuş basılı tutulduğunda işletim sisteminin otomatik arka arkaya gönderdiği tekrarları atla
        guard !event.isARepeat else { return true }

        let characters = event.charactersIgnoringModifiers?.lowercased() ?? ""
        guard let char = characters.first else { return false }
        let key = String(char)

        let engine = NativeAudioEngine.shared

        // 1. SPACE TUŞU -> RIFF ÇAL / DURDUR (Global DAW Standard)
        if event.keyCode == 49 || key == " " {
            engine.togglePlayback(sections: engine.sections, instrument: engine.chordInstrument)
            return true
        }

        // 2. OKTAV DEĞİŞTİRME TUŞLARI (Z: -1 Oktav, X: +1 Oktav)
        if key == "z" {
            self.octaveOffset = max(-2, self.octaveOffset - 1)
            return true
        }
        if key == "x" {
            self.octaveOffset = min(2, self.octaveOffset + 1)
            return true
        }

        // 3. RAKAM TUŞLARI (1...8) -> CANLI AKOR STRUM VURUŞU
        if let num = Int(key), num >= 1, num <= 8 {
            let chordIndex = num - 1
            if engine.sections.indices.contains(engine.currentSectionIndex) {
                let sec = engine.sections[engine.currentSectionIndex]
                if sec.chords.indices.contains(chordIndex) {
                    let chordName = sec.chords[chordIndex]
                    let chord = ChordLibrary.chordNamed(chordName)
                    engine.strumChord(chord, downstroke: true, instrument: engine.chordInstrument)
                    self.pressedKeys.insert(key)
                    return true
                }
            }
        }

        // 4. MÜZİKAL SOLO NOTALARI (Musical Typing)
        if let offset = musicalKeyMap[key] {
            let baseMidi = 60 + (octaveOffset * 12) + offset // C4 = 60
            activeMidiNotes[key] = baseMidi

            // Akor gamına kilitlenerek veya serbest solo çal
            engine.playSoloMidi(baseMidi, velocity: 0.92)
            self.pressedKeys.insert(key)
            return true
        }

        return false
    }

    private func handleKeyUp(event: NSEvent) -> Bool {
        guard isEnabled else { return false }
        let characters = event.charactersIgnoringModifiers?.lowercased() ?? ""
        guard let char = characters.first else { return false }
        let key = String(char)

        if pressedKeys.contains(key) {
            self.pressedKeys.remove(key)
            activeMidiNotes.removeValue(forKey: key)
            return true
        }

        return false
    }
}
