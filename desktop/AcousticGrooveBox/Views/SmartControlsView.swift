import SwiftUI
import AVFoundation

/// Apple Logic Pro Tarzı Smart Controls Döner Düğme Paneli
public struct SmartControlsView: View {
    @ObservedObject var audioEngine = NativeAudioEngine.shared
    var instrument: AcousticInstrumentType

    public init(instrument: AcousticInstrumentType = .nylon) {
        self.instrument = instrument
    }

    public var body: some View {
        VStack(spacing: 10) {
            // Header
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "cpu")
                        .foregroundColor(.orange)
                    Text("LOGIC PRO SMART CONTROLS")
                        .font(.system(size: 11, weight: .black, design: .monospaced))
                        .foregroundColor(.white)
                    Text(instrument.name)
                        .font(.system(size: 9, weight: .bold, design: .monospaced))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.orange.opacity(0.15))
                        .foregroundColor(.orange)
                        .cornerRadius(4)
                }

                Spacer()

                // Space Designer Reverb Presets
                HStack(spacing: 4) {
                    Text("SPACE DESIGNER:")
                        .font(.system(size: 8, weight: .bold, design: .monospaced))
                        .foregroundColor(.gray)

                    Button(action: {
                        audioEngine.setSpaceDesignerPreset(.mediumChamber)
                    }) {
                        Text("Warm Wood")
                            .font(.system(size: 9, weight: .bold))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(Color.orange)
                            .foregroundColor(.white)
                            .cornerRadius(4)
                    }
                    .buttonStyle(.plain)

                    Button(action: {
                        audioEngine.setSpaceDesignerPreset(.largeHall)
                    }) {
                        Text("Concert Hall")
                            .font(.system(size: 9, weight: .medium))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(Color(white: 0.16))
                            .foregroundColor(.secondary)
                            .cornerRadius(4)
                    }
                    .buttonStyle(.plain)

                    Button(action: {
                        audioEngine.setSpaceDesignerPreset(.plate)
                    }) {
                        Text("Plate")
                            .font(.system(size: 9, weight: .medium))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(Color(white: 0.16))
                            .foregroundColor(.secondary)
                            .cornerRadius(4)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 4)

            // 4 Smart Knobs
            HStack(spacing: 12) {
                LogicKnob(title: "Warmth", value: $audioEngine.warmth, color: .orange) { val in
                    audioEngine.setWarmthValue(val)
                }

                LogicKnob(title: "Air Sheen", value: $audioEngine.airSheen, color: .cyan) { val in
                    audioEngine.setAirSheenValue(val)
                }

                LogicKnob(title: "Pick Attack", value: $audioEngine.pickAttack, color: .green) { _ in }

                LogicKnob(title: "Space Reverb", value: $audioEngine.spaceReverbWet, color: .purple) { val in
                    audioEngine.setReverbWet(val)
                }
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(LinearGradient(colors: [Color(white: 0.08), Color(white: 0.04)], startPoint: .top, endPoint: .bottom))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(white: 0.16), lineWidth: 1.5))
        )
    }
}

// MARK: - Logic Pro Döner Düğme Bileşeni
struct LogicKnob: View {
    let title: String
    @Binding var value: Double
    let color: Color
    var onChange: (Double) -> Void

    var body: some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .foregroundColor(.white.opacity(0.8))

            ZStack {
                Circle()
                    .fill(LinearGradient(colors: [Color(white: 0.18), Color(white: 0.10)], startPoint: .topLeading, endPoint: .bottomTrailing))
                    .frame(width: 44, height: 44)
                    .overlay(Circle().stroke(Color(white: 0.25), lineWidth: 1.5))
                    .shadow(color: .black.opacity(0.4), radius: 3, x: 0, y: 2)

                // Gösterge Çizgisi
                Rectangle()
                    .fill(color)
                    .frame(width: 2.5, height: 10)
                    .offset(y: -12)
                    .rotationEffect(.degrees((value - 0.5) * 260.0))
            }
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { gesture in
                        let delta = -gesture.translation.height * 0.005
                        let newVal = max(0.0, min(1.0, value + Double(delta)))
                        value = newVal
                        onChange(newVal)
                    }
            )

            Slider(value: $value, in: 0...1) { _ in
                onChange(value)
            }
            .accentColor(color)
            .controlSize(.mini)

            Text("%\(Int(value * 100))")
                .font(.system(size: 9, weight: .bold, design: .monospaced))
                .foregroundColor(color)
        }
        .padding(6)
        .frame(maxWidth: .infinity)
        .background(Color(white: 0.06))
        .cornerRadius(8)
    }
}
