import SwiftUI

public struct GrooveBoxView: View {
    @ObservedObject var audioEngine = NativeAudioEngine.shared
    @Binding var sections: [SongSection]
    @Binding var selectedInstrument: AcousticInstrumentType
    @Binding var lyrics: [String: String]

    @State private var showLyricsPad = false
    @State private var selectedProgression: HitProgression?

    public init(sections: Binding<[SongSection]>, selectedInstrument: Binding<AcousticInstrumentType>, lyrics: Binding<[String: String]>) {
        self._sections = sections
        self._selectedInstrument = selectedInstrument
        self._lyrics = lyrics
    }

    public var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 12) {
                // 1. HIT PRESETS & ZAR AT ÇUBUĞU
                HStack(spacing: 8) {
                    Label("TUTAN HIT TRENDLER:", systemImage: "flame.fill")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.orange)

                    Menu {
                        ForEach(HitProgression.all) { prog in
                            Button("\(prog.title) (\(prog.artistHint))") {
                                applyProgression(prog)
                            }
                        }
                    } label: {
                        Text(selectedProgression?.title ?? "Hit Akor Şablonu Seçin...")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(Color(white: 0.12))
                            .cornerRadius(8)
                    }

                    // 🎲 Zar At (Rastgele Hit)
                    Button(action: {
                        let rand = HitProgression.random()
                        applyProgression(rand)
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: "dice.fill")
                            Text("ZAR AT (RASTGELE HIT)")
                        }
                        .font(.system(size: 10, weight: .black))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.orange)
                        .foregroundColor(.white)
                        .cornerRadius(6)
                    }
                    .buttonStyle(.plain)

                    Spacer()

                    // Söz Defteri Toggle
                    Button(action: {
                        withAnimation { showLyricsPad.toggle() }
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: "book.closed.fill")
                            Text("SÖZ & BESTE DEFTERİ")
                            Image(systemName: showLyricsPad ? "chevron.up" : "chevron.down")
                        }
                        .font(.system(size: 10, weight: .bold))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.purple.opacity(0.85))
                        .foregroundColor(.white)
                        .cornerRadius(6)
                    }
                    .buttonStyle(.plain)
                }
                .padding(10)
                .background(Color(white: 0.08))
                .cornerRadius(12)

                // 2. ENTEGRE SÖZ & BESTE DEFTERİ (Açılır/Kapanır)
                if showLyricsPad {
                    let currentSecId = sections[audioEngine.currentSectionIndex].id
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Image(systemName: "pencil.and.outline")
                                .foregroundColor(.purple)
                            Text("Akıllı Söz & Beste Defteri — Kısım: \(sections[audioEngine.currentSectionIndex].name)")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.white)
                            Spacer()
                        }

                        TextEditor(text: Binding(
                            get: { lyrics[currentSecId] ?? "" },
                            set: { lyrics[currentSecId] = $0 }
                        ))
                        .frame(height: 70)
                        .padding(6)
                        .background(Color(white: 0.04))
                        .cornerRadius(8)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.purple.opacity(0.4), lineWidth: 1))
                    }
                    .padding(10)
                    .background(Color(white: 0.06))
                    .cornerRadius(12)
                }

                // 3. KISIM ZİNCİRİ & ABLETON SCENE LAUNCHER
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Label("KISIM ZİNCİRİ & DÖNGÜLER (SCENE LAUNCHER)", systemImage: "music.note.list")
                            .font(.system(size: 10, weight: .black, design: .monospaced))
                            .foregroundColor(.gray)
                        Spacer()
                        Text("Aktif: \(sections[audioEngine.currentSectionIndex].name) (\(audioEngine.currentRepeat + 1)/\(sections[audioEngine.currentSectionIndex].repeats))")
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .foregroundColor(.green)
                    }

                    HStack(spacing: 8) {
                        ForEach(Array(sections.enumerated()), id: \.element.id) { idx, sec in
                            let isCurrent = audioEngine.currentSectionIndex == idx
                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Text(sec.name)
                                        .font(.system(size: 11, weight: .black))
                                        .foregroundColor(isCurrent ? .white : .gray)
                                    Spacer()
                                    Text("\(sec.repeats)x")
                                        .font(.system(size: 9, weight: .bold, design: .monospaced))
                                        .foregroundColor(.orange)
                                }

                                HStack(spacing: 3) {
                                    ForEach(sec.chords, id: \.self) { ch in
                                        Text(ch)
                                            .font(.system(size: 9, weight: .bold, design: .monospaced))
                                            .padding(.horizontal, 4)
                                            .padding(.vertical, 1)
                                            .background(isCurrent ? Color.orange.opacity(0.3) : Color.white.opacity(0.1))
                                            .cornerRadius(4)
                                    }
                                }
                            }
                            .padding(8)
                            .frame(maxWidth: .infinity)
                            .background(isCurrent ? Color.green.opacity(0.15) : Color(white: 0.06))
                            .overlay(RoundedRectangle(cornerRadius: 10).stroke(isCurrent ? Color.green : Color(white: 0.14), lineWidth: 1.5))
                            .cornerRadius(10)
                            .onTapGesture {
                                audioEngine.currentSectionIndex = idx
                                audioEngine.currentChordIndex = 0
                            }
                        }
                    }
                }
                .padding(10)
                .background(Color(white: 0.08))
                .cornerRadius(12)

                // 4. CANLI AKOR PADLERİ (DOKUNSAL VUR / STRUM)
                let currentSec = sections[audioEngine.currentSectionIndex]
                VStack(alignment: .leading, spacing: 6) {
                    Text("CANLI AKOR PADLERİ (DOKUNARAK VUR / STRUM)")
                        .font(.system(size: 10, weight: .black, design: .monospaced))
                        .foregroundColor(.gray)

                    HStack(spacing: 8) {
                        ForEach(Array(currentSec.chords.enumerated()), id: \.offset) { barIdx, chordName in
                            let isPlayingThis = audioEngine.isPlaying && audioEngine.currentChordIndex == barIdx
                            let chordObj = ChordLibrary.chordNamed(chordName)

                            Button(action: {
                                audioEngine.strumChord(chordObj, downstroke: true)
                            }) {
                                VStack(spacing: 2) {
                                    Text("\(barIdx + 1). Bar")
                                        .font(.system(size: 9, weight: .bold, design: .monospaced))
                                        .foregroundColor(isPlayingThis ? .black : .gray)
                                    Text(chordName)
                                        .font(.system(size: 16, weight: .black))
                                        .foregroundColor(isPlayingThis ? .black : .white)
                                    Text(isPlayingThis ? "VURUYOR" : "STRUM")
                                        .font(.system(size: 7, weight: .bold, design: .monospaced))
                                        .foregroundColor(isPlayingThis ? .black : .orange)
                                }
                                .frame(maxWidth: .infinity, minHeight: 52)
                                .background(isPlayingThis ? Color.orange : Color(white: 0.06))
                                .cornerRadius(8)
                                .overlay(RoundedRectangle(cornerRadius: 8).stroke(isPlayingThis ? Color.white : Color.orange.opacity(0.3), lineWidth: 1.5))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(10)
                .background(Color(white: 0.08))
                .cornerRadius(12)

                // 5. APPLE LOGIC PRO SMART CONTROLS
                SmartControlsView(instrument: selectedInstrument)

                // 6. SOLOCU VE DAVUL TUŞ TAKIMI
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Label("USTA SOLOCU & DAVUL (SIFIR HATA AKOR UYUMU)", systemImage: "pianokeys")
                            .font(.system(size: 10, weight: .black, design: .monospaced))
                            .foregroundColor(.gray)
                        Spacer()
                    }

                    // Enstrüman Seçimi
                    HStack(spacing: 4) {
                        ForEach(AcousticInstrumentType.allCases) { inst in
                            Button(action: { selectedInstrument = inst }) {
                                Text(inst.name)
                                    .font(.system(size: 10, weight: selectedInstrument == inst ? .bold : .medium))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(selectedInstrument == inst ? Color.orange : Color(white: 0.14))
                                    .foregroundColor(selectedInstrument == inst ? .white : .secondary)
                                    .cornerRadius(6)
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    // FL Studio tarzı dokunsal solo tuşları
                    let currentChord = ChordLibrary.chordNamed(currentSec.chords.indices.contains(audioEngine.currentChordIndex) ? currentSec.chords[audioEngine.currentChordIndex] : "Am")
                    HStack(spacing: 4) {
                        ForEach(0..<12) { keyIdx in
                            let noteFreq = 220.0 * pow(2.0, Double(keyIdx) / 12.0)
                            Button(action: {
                                if selectedInstrument == .drums {
                                    audioEngine.playDrumHit(keyIdx % 2 == 0 ? "kick" : "snare")
                                } else {
                                    audioEngine.playStringNote(freq: noteFreq, duration: 2.5, velocity: 0.9)
                                }
                            }) {
                                VStack {
                                    Text("Nota \(keyIdx + 1)")
                                        .font(.system(size: 8, weight: .bold))
                                    Image(systemName: "music.note")
                                        .font(.system(size: 10))
                                }
                                .frame(maxWidth: .infinity, minHeight: 46)
                                .background(Color(white: 0.10))
                                .foregroundColor(.white)
                                .cornerRadius(6)
                                .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.white.opacity(0.15), lineWidth: 1))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(10)
                .background(Color(white: 0.08))
                .cornerRadius(12)
            }
            .padding(10)
        }
    }

    private func applyProgression(_ prog: HitProgression) {
        selectedProgression = prog
        audioEngine.bpm = prog.bpm
        sections = [
            SongSection(id: "intro", name: "Giriş (Intro)", chords: Array(prog.chords.prefix(2)), repeats: 2),
            SongSection(id: "verse", name: "Söz (Verse)", chords: prog.chords, repeats: 2),
            SongSection(id: "chorus", name: "Nakarat (Chorus)", chords: prog.chords, repeats: 4),
            SongSection(id: "solo", name: "Solo & Köprü", chords: prog.chords, repeats: 2)
        ]
    }
}
