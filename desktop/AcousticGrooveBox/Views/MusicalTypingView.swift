import SwiftUI

/// Apple Logic Pro Tarzı Canlı QWERTY Musical Typing Arayüzü
public struct MusicalTypingView: View {
    @ObservedObject var keyboard = KeyboardController.shared
    @ObservedObject var audioEngine = NativeAudioEngine.shared

    // Piyano tuş haritalaması
    private struct KeyItem: Identifiable {
        let id: String
        let letter: String
        let noteName: String
        let isBlack: Bool
    }

    private let whiteKeys: [KeyItem] = [
        KeyItem(id: "a", letter: "A", noteName: "C", isBlack: false),
        KeyItem(id: "s", letter: "S", noteName: "D", isBlack: false),
        KeyItem(id: "d", letter: "D", noteName: "E", isBlack: false),
        KeyItem(id: "f", letter: "F", noteName: "F", isBlack: false),
        KeyItem(id: "g", letter: "G", noteName: "G", isBlack: false),
        KeyItem(id: "h", letter: "H", noteName: "A", isBlack: false),
        KeyItem(id: "j", letter: "J", noteName: "B", isBlack: false),
        KeyItem(id: "k", letter: "K", noteName: "C+", isBlack: false),
        KeyItem(id: "l", letter: "L", noteName: "D+", isBlack: false),
        KeyItem(id: "ş", letter: "Ş", noteName: "E+", isBlack: false),
        KeyItem(id: "i", letter: "İ", noteName: "F+", isBlack: false)
    ]

    private let blackKeys: [KeyItem?] = [
        KeyItem(id: "w", letter: "W", noteName: "C#", isBlack: true),
        KeyItem(id: "e", letter: "E", noteName: "D#", isBlack: true),
        nil, // E - F arası boşluk
        KeyItem(id: "t", letter: "T", noteName: "F#", isBlack: true),
        KeyItem(id: "y", letter: "Y", noteName: "G#", isBlack: true),
        KeyItem(id: "u", letter: "U", noteName: "A#", isBlack: true),
        nil, // B - C arası boşluk
        KeyItem(id: "o", letter: "O", noteName: "C#+", isBlack: true),
        KeyItem(id: "p", letter: "P", noteName: "D#+", isBlack: true),
        nil
    ]

    public init() {}

    public var body: some View {
        VStack(spacing: 8) {
            // Header Bar
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "keyboard.fill")
                        .foregroundColor(.orange)
                    Text("QWERTY MUSICAL TYPING (BİLGİSAYAR KLAVYESİ İLE ÇAL)")
                        .font(.system(size: 10, weight: .black, design: .monospaced))
                        .foregroundColor(.white)
                }

                Spacer()

                // Kısayollar Bilgisi
                HStack(spacing: 8) {
                    Text("⚡ [1-4]: Akor Vur")
                        .font(.system(size: 9, weight: .bold, design: .monospaced))
                        .foregroundColor(.gray)

                    Text("⚡ [Space]: Riff Çal/Durdur")
                        .font(.system(size: 9, weight: .bold, design: .monospaced))
                        .foregroundColor(.orange)

                    // Oktav Değiştirici
                    HStack(spacing: 4) {
                        Button("[Z] -1") {
                            keyboard.octaveOffset = max(-2, keyboard.octaveOffset - 1)
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(white: 0.16))
                        .foregroundColor(.white)
                        .cornerRadius(4)
                        .font(.system(size: 8, weight: .bold, design: .monospaced))

                        Text("Oktav: C\(4 + keyboard.octaveOffset)")
                            .font(.system(size: 9, weight: .black, design: .monospaced))
                            .foregroundColor(.cyan)

                        Button("[X] +1") {
                            keyboard.octaveOffset = min(2, keyboard.octaveOffset + 1)
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(white: 0.16))
                        .foregroundColor(.white)
                        .cornerRadius(4)
                        .font(.system(size: 8, weight: .bold, design: .monospaced))
                    }
                }
            }
            .padding(.horizontal, 4)

            // Görsel Dokunsal QWERTY Piyano Tuşları
            ZStack(alignment: .topLeading) {
                // 1. Beyaz Tuşlar Sırası
                HStack(spacing: 3) {
                    ForEach(whiteKeys) { key in
                        let isPressed = keyboard.pressedKeys.contains(key.id)
                        Button(action: {
                            // Fareyle tıklayarak da çalınabilsin
                            let offset = key.letter == "A" ? 0 : (key.letter == "S" ? 2 : (key.letter == "D" ? 4 : (key.letter == "F" ? 5 : (key.letter == "G" ? 7 : (key.letter == "H" ? 9 : (key.letter == "J" ? 11 : 12))))))
                            let midi = 60 + (keyboard.octaveOffset * 12) + offset
                            audioEngine.playSoloMidi(midi)
                        }) {
                            VStack(spacing: 2) {
                                Spacer()
                                Text(key.letter)
                                    .font(.system(size: 10, weight: .black, design: .monospaced))
                                    .foregroundColor(isPressed ? .black : .primary)
                                Text(key.noteName)
                                    .font(.system(size: 8, weight: .bold))
                                    .foregroundColor(isPressed ? .black : .secondary)
                            }
                            .padding(.bottom, 6)
                            .frame(maxWidth: .infinity, minHeight: 68)
                            .background(isPressed ? Color.orange : Color(white: 0.92))
                            .cornerRadius(5)
                            .shadow(color: isPressed ? .orange.opacity(0.8) : .black.opacity(0.3), radius: isPressed ? 6 : 2)
                        }
                        .buttonStyle(.plain)
                    }
                }

                // 2. Siyah Tuşlar Sırası (Üstte konumlanmış)
                HStack(spacing: 0) {
                    ForEach(Array(blackKeys.enumerated()), id: \.offset) { _, key in
                        if let key = key {
                            let isPressed = keyboard.pressedKeys.contains(key.id)
                            Button(action: {
                                let offset = key.letter == "W" ? 1 : (key.letter == "E" ? 3 : (key.letter == "T" ? 6 : (key.letter == "Y" ? 8 : (key.letter == "U" ? 10 : 13))))
                                let midi = 60 + (keyboard.octaveOffset * 12) + offset
                                audioEngine.playSoloMidi(midi)
                            }) {
                                VStack(spacing: 1) {
                                    Spacer()
                                    Text(key.letter)
                                        .font(.system(size: 8, weight: .black, design: .monospaced))
                                        .foregroundColor(isPressed ? .black : .white)
                                    Text(key.noteName)
                                        .font(.system(size: 7, weight: .bold))
                                        .foregroundColor(isPressed ? .black : .orange)
                                }
                                .padding(.bottom, 4)
                                .frame(width: 30, height: 44)
                                .background(isPressed ? Color.orange : Color(white: 0.12))
                                .cornerRadius(4)
                                .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color.white.opacity(0.15), lineWidth: 1))
                                .shadow(color: isPressed ? .orange.opacity(0.8) : .black.opacity(0.5), radius: isPressed ? 5 : 2)
                            }
                            .buttonStyle(.plain)
                            .frame(maxWidth: .infinity)
                        } else {
                            // Boşluk (E-F ve B-C arası)
                            Spacer()
                                .frame(maxWidth: .infinity)
                        }
                    }
                }
                .padding(.horizontal, 16)
            }
        }
        .padding(10)
        .background(Color(white: 0.07))
        .cornerRadius(12)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.white.opacity(0.12), lineWidth: 1))
    }
}
