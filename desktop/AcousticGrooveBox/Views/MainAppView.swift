import SwiftUI

public struct MainAppView: View {
    @ObservedObject var audioEngine = NativeAudioEngine.shared

    @State private var viewMode: AppMode = .groovebox
    @State private var sections: [SongSection] = DefaultSections.initial
    @State private var selectedInstrument: AcousticInstrumentType = .nylon
    @State private var lyrics: [String: String] = [
        "intro": "",
        "verse": "Yollarda bulurum seni...\nBir şarkı fısıldar gibi rüzgar.",
        "chorus": "Dön bana, dön bana yeniden...\nSensiz geçen günlerin acısı bitmiyor.",
        "solo": ""
    ]

    enum AppMode {
        case groovebox
        case studio
    }

    public init() {}

    public var body: some View {
        VStack(spacing: 0) {
            // 1. TOP HEADER (BRAND & 2-MODE SWITCHER)
            HStack(spacing: 12) {
                // Logo & Title
                HStack(spacing: 8) {
                    Image(systemName: "guitars.fill")
                        .font(.system(size: 16))
                        .foregroundColor(.orange)
                        .padding(6)
                        .background(Color.orange.opacity(0.15))
                        .cornerRadius(8)

                    VStack(alignment: .leading, spacing: 1) {
                        Text("Acoustic GrooveBox")
                            .font(.system(size: 14, weight: .black))
                            .foregroundColor(.white)
                        Text("Apple Logic Pro Audio Engine & Müzik Teorisi Sıfırlayan Beste İstasyonu")
                            .font(.system(size: 9))
                            .foregroundColor(.gray)
                    }
                }

                Spacer()

                // 2-MODE WORKFLOW SWITCHER
                HStack(spacing: 4) {
                    Button(action: { viewMode = .groovebox }) {
                        HStack(spacing: 4) {
                            Image(systemName: "circle.grid.2x2.fill")
                            Text("GROOVEBOX MODU")
                        }
                        .font(.system(size: 11, weight: .bold))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(viewMode == .groovebox ? Color.orange : Color.clear)
                        .foregroundColor(viewMode == .groovebox ? .white : .gray)
                        .cornerRadius(6)
                    }
                    .buttonStyle(.plain)

                    Button(action: { viewMode = .studio }) {
                        HStack(spacing: 4) {
                            Image(systemName: "slider.vertical.3")
                            Text("STÜDYO MODU")
                        }
                        .font(.system(size: 11, weight: .bold))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(viewMode == .studio ? Color.purple : Color.clear)
                        .foregroundColor(viewMode == .studio ? .white : .gray)
                        .cornerRadius(6)
                    }
                    .buttonStyle(.plain)
                }
                .padding(3)
                .background(Color(white: 0.08))
                .cornerRadius(8)

                Spacer()

                // Kemik Enstrüman Seçicisi
                HStack(spacing: 4) {
                    Button(action: { selectedInstrument = .nylon }) {
                        Text("🎸 Naylon")
                            .font(.system(size: 11, weight: selectedInstrument == .nylon ? .bold : .medium))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(selectedInstrument == .nylon ? Color.orange : Color(white: 0.14))
                            .foregroundColor(selectedInstrument == .nylon ? .white : .secondary)
                            .cornerRadius(6)
                    }
                    .buttonStyle(.plain)

                    Button(action: { selectedInstrument = .steel }) {
                        Text("🎸 Çelik")
                            .font(.system(size: 11, weight: selectedInstrument == .steel ? .bold : .medium))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(selectedInstrument == .steel ? Color.orange : Color(white: 0.14))
                            .foregroundColor(selectedInstrument == .steel ? .white : .secondary)
                            .cornerRadius(6)
                    }
                    .buttonStyle(.plain)

                    Button(action: { selectedInstrument = .piano }) {
                        Text("🎹 Piyano")
                            .font(.system(size: 11, weight: selectedInstrument == .piano ? .bold : .medium))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(selectedInstrument == .piano ? Color.orange : Color(white: 0.14))
                            .foregroundColor(selectedInstrument == .piano ? .white : .secondary)
                            .cornerRadius(6)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color(white: 0.06))
            .overlay(Rectangle().frame(height: 1).foregroundColor(Color(white: 0.14)), alignment: .bottom)

            // 2. MAIN ACTIVE VIEW (GrooveBox vs Stüdyo)
            Group {
                if viewMode == .groovebox {
                    GrooveBoxView(sections: $sections, selectedInstrument: $selectedInstrument, lyrics: $lyrics)
                } else {
                    StudioView(sections: $sections, lyrics: $lyrics)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            // 3. BOTTOM TRANSPORT BAR (RIFF ÇAL / DURDUR, BPM, SWING)
            HStack(spacing: 16) {
                // Play / Stop Button
                Button(action: {
                    audioEngine.togglePlayback(sections: sections, instrument: selectedInstrument)
                }) {
                    HStack(spacing: 6) {
                        Image(systemName: audioEngine.isPlaying ? "stop.fill" : "play.fill")
                        Text(audioEngine.isPlaying ? "DURDUR" : "RIFF ÇAL (DÖNGÜ)")
                    }
                    .font(.system(size: 12, weight: .black))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(audioEngine.isPlaying ? Color.red : Color.orange)
                    .foregroundColor(.white)
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)

                // Ritim Aç/Kapat Butonu
                Button(action: {
                    audioEngine.percussionEnabled.toggle()
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: audioEngine.percussionEnabled ? "speaker.wave.2.fill" : "speaker.slash.fill")
                        Text(audioEngine.percussionEnabled ? "RİTİM: AÇIK" : "RİTİM: KAPALI")
                    }
                    .font(.system(size: 10, weight: .bold))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(audioEngine.percussionEnabled ? Color.green.opacity(0.8) : Color(white: 0.15))
                    .foregroundColor(.white)
                    .cornerRadius(6)
                }
                .buttonStyle(.plain)

                // Tempo (BPM)
                HStack(spacing: 8) {
                    Text("TEMPO:")
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                        .foregroundColor(.gray)
                    Slider(value: $audioEngine.bpm, in: 50...180, step: 1)
                        .frame(width: 120)
                        .accentColor(.orange)
                    Text("\(Int(audioEngine.bpm)) BPM")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundColor(.orange)
                        .frame(width: 60, alignment: .leading)
                }

                Spacer()

                Text("Apple CoreAudio Ultra-Low Latency Engine (0 ms)")
                    .font(.system(size: 9, weight: .medium, design: .monospaced))
                    .foregroundColor(.gray)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color(white: 0.06))
            .overlay(Rectangle().frame(height: 1).foregroundColor(Color(white: 0.14)), alignment: .top)
        }
        .frame(minWidth: 960, minHeight: 680)
        .background(Color(white: 0.03))
    }
}
