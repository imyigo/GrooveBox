import SwiftUI

public struct StudioView: View {
    @ObservedObject var audioEngine = NativeAudioEngine.shared
    @Binding var sections: [SongSection]
    @Binding var lyrics: [String: String]

    @State private var isRecordingVocal = false
    @State private var recordedVocalURL: URL?

    public init(sections: Binding<[SongSection]>, lyrics: Binding<[String: String]>) {
        self._sections = sections
        self._lyrics = lyrics
    }

    public var body: some View {
        VStack(spacing: 8) {
            // 1. DAW TIMELINE HEADER & TRANSPORT
            HStack(spacing: 8) {
                HStack(spacing: 6) {
                    Image(systemName: "slider.vertical.3")
                        .foregroundColor(.purple)
                    Text("STÜDYO ZAMAN ÇİZELGESİ (LOGIC PRO MULTI-TRACK)")
                        .font(.system(size: 11, weight: .black, design: .monospaced))
                        .foregroundColor(.white)
                }

                Spacer()

                // Canlı Vokal / Mikrofon Kaydı Butonu
                Button(action: {
                    if isRecordingVocal {
                        recordedVocalURL = audioEngine.stopVocalRecording()
                        isRecordingVocal = false
                    } else {
                        audioEngine.startVocalRecording()
                        isRecordingVocal = true
                        if !audioEngine.isPlaying {
                            audioEngine.startPlayback(sections: sections)
                        }
                    }
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: isRecordingVocal ? "stop.circle.fill" : "mic.fill")
                        Text(isRecordingVocal ? "KAYDI BİTİR" : "🔴 VOKAL KAYDET")
                    }
                    .font(.system(size: 11, weight: .black))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(isRecordingVocal ? Color.red : Color.red.opacity(0.8))
                    .foregroundColor(.white)
                    .cornerRadius(6)
                }
                .buttonStyle(.plain)
            }
            .padding(10)
            .background(Color(white: 0.08))
            .cornerRadius(10)

            // 2. TIMELINE BAR RULER
            HStack(spacing: 2) {
                Text("KANALLAR (TRACKS)")
                    .font(.system(size: 9, weight: .bold, design: .monospaced))
                    .foregroundColor(.gray)
                    .frame(width: 140, alignment: .leading)

                HStack(spacing: 4) {
                    ForEach(sections) { sec in
                        VStack(alignment: .leading, spacing: 1) {
                            Text(sec.name)
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(.white)
                            Text("\(sec.repeats) Tekrar • \(sec.chords.count * sec.repeats) Bar")
                                .font(.system(size: 7, weight: .medium, design: .monospaced))
                                .foregroundColor(.gray)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 4)
                        .padding(.vertical, 2)
                        .background(Color(white: 0.12))
                        .cornerRadius(4)
                    }
                }
            }
            .padding(.horizontal, 8)

            // 3. 4-TRACK DAW LANES
            VStack(spacing: 6) {
                // TRACK 1: Akustik Gitar / Piyano (Akor & Riff)
                DAWTrackRow(title: "Akustik Gitar", subtitle: "Riff & Akor", icon: "guitars", color: .orange) {
                    HStack(spacing: 4) {
                        ForEach(sections) { sec in
                            HStack(spacing: 2) {
                                ForEach(sec.chords, id: \.self) { ch in
                                    Text(ch)
                                        .font(.system(size: 8, weight: .bold, design: .monospaced))
                                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                                        .background(Color.orange.opacity(0.2))
                                        .foregroundColor(.orange)
                                        .cornerRadius(4)
                                }
                            }
                            .frame(maxWidth: .infinity)
                        }
                    }
                }

                // TRACK 2: Akustik Davul (Kahon & Shaker)
                DAWTrackRow(title: "Akustik Davul", subtitle: "Kahon & Shaker", icon: "circle.grid.cross", color: .green) {
                    HStack(spacing: 4) {
                        ForEach(sections) { sec in
                            Text("🥁 \(sec.drumMode)")
                                .font(.system(size: 8, weight: .bold, design: .monospaced))
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                                .background(Color.green.opacity(0.2))
                                .foregroundColor(.green)
                                .cornerRadius(4)
                        }
                    }
                }

                // TRACK 3: Usta Solo (Melodi & Lead)
                DAWTrackRow(title: "Usta Solo", subtitle: "Melodi & Lead", icon: "tuningfork", color: .cyan) {
                    HStack(spacing: 4) {
                        ForEach(sections) { _ in
                            Text("🎵 Canlı Klavyeye Sadık")
                                .font(.system(size: 8, weight: .bold, design: .monospaced))
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                                .background(Color.cyan.opacity(0.2))
                                .foregroundColor(.cyan)
                                .cornerRadius(4)
                        }
                    }
                }

                // TRACK 4: Vokal / Mikrofon (Canlı Ses Kaydı)
                DAWTrackRow(title: "Vokal / Mikrofon", subtitle: isRecordingVocal ? "🔴 Kaydediliyor..." : (recordedVocalURL != nil ? "Kayıt Var" : "Hazır"), icon: "mic", color: .red) {
                    if isRecordingVocal {
                        Text("🔴 MİKROFONDAN ŞARKI KAYDEDİLİYOR...")
                            .font(.system(size: 9, weight: .black, design: .monospaced))
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .background(Color.red.opacity(0.3))
                            .foregroundColor(.white)
                            .cornerRadius(4)
                    } else if recordedVocalURL != nil {
                        Text("🎤 Canlı Vokal Audio Take Hazır")
                            .font(.system(size: 9, weight: .bold, design: .monospaced))
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .background(Color.red.opacity(0.2))
                            .foregroundColor(.red)
                            .cornerRadius(4)
                    } else {
                        Text("Vokal kaydı başlatmak için üstteki 'Vokal Kaydet' butonuna basın")
                            .font(.system(size: 8, weight: .medium))
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .background(Color(white: 0.05))
                            .foregroundColor(.gray)
                            .cornerRadius(4)
                    }
                }
            }
            .padding(8)
            .background(Color(white: 0.05))
            .cornerRadius(10)

            // 4. APPLE LOGIC PRO SMART CONTROLS (Stüdyo Modu)
            SmartControlsView()

            // 5. CANLI QWERTY MUSICAL TYPING KLAVYE
            MusicalTypingView()

            Spacer()
        }
        .padding(10)
    }
}

// MARK: - DAW Kanal Şeridi Satırı
struct DAWTrackRow<Content: View>: View {
    let title: String
    let subtitle: String
    let icon: String
    let color: Color
    @ViewBuilder let content: () -> Content

    var body: some View {
        HStack(spacing: 6) {
            // Track Header
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .foregroundColor(color)
                    .frame(width: 14)
                VStack(alignment: .leading, spacing: 1) {
                    Text(title)
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.white)
                    Text(subtitle)
                        .font(.system(size: 7, weight: .medium, design: .monospaced))
                        .foregroundColor(color.opacity(0.8))
                }
                Spacer()
            }
            .frame(width: 140)
            .padding(6)
            .background(Color(white: 0.09))
            .cornerRadius(6)

            // Track Content
            content()
                .frame(maxWidth: .infinity, maxHeight: 38)
        }
        .frame(height: 38)
    }
}

extension Color {
    static let rose = Color(red: 0.95, green: 0.25, blue: 0.45)
}
