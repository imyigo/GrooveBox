import Foundation

// MARK: - Enstrüman Türleri
public enum AcousticInstrumentType: String, CaseIterable, Identifiable {
    case nylon = "nylon"
    case steel = "steel"
    case piano = "piano"
    case violin = "violin"
    case clarinet = "clarinet"
    case altoSax = "alto_sax"
    case harmonica = "harmonica"
    case drums = "drums"

    public var id: String { rawValue }

    public var displayName: String {
        name
    }

    public var name: String {
        switch self {
        case .nylon: return "Sıcak Naylon Gitar"
        case .steel: return "Çelik Akustik Gitar"
        case .piano: return "Kuyruklu Piyano"
        case .violin: return "Keman"
        case .clarinet: return "Klarnet"
        case .altoSax: return "Saksafon"
        case .harmonica: return "Mızıka"
        case .drums: return "Akustik Davul"
        }
    }

    public var icon: String {
        switch self {
        case .nylon, .steel: return "guitars"
        case .piano: return "pianokeys"
        case .violin: return "tuningfork"
        case .clarinet, .altoSax: return "wind"
        case .harmonica: return "waveform"
        case .drums: return "circle.grid.cross"
        }
    }
}

// MARK: - Akor Modeli
public struct GuitarChord: Identifiable, Hashable {
    public let id: String
    public let name: String
    public let displayName: String
    public let root: String
    public let frets: [Int] // 6 tel freti (-1 = susturulmuş)
    public let pitchClasses: [Int] // 0-11 nota sınıfları (C=0, C#=1... B=11)

    public init(id: String, name: String, displayName: String, root: String, frets: [Int], pitchClasses: [Int]) {
        self.id = id
        self.name = name
        self.displayName = displayName
        self.root = root
        self.frets = frets
        self.pitchClasses = pitchClasses
    }
}

// MARK: - Popüler Akor Kütüphanesi
public struct ChordLibrary {
    public static let standardTuningFreqs: [Double] = [82.41, 110.00, 146.83, 196.00, 246.94, 329.63]

    public static let chords: [String: GuitarChord] = [
        "Am": GuitarChord(id: "Am", name: "Am", displayName: "A Minör", root: "A", frets: [-1, 0, 2, 2, 1, 0], pitchClasses: [9, 0, 4]),
        "Dm": GuitarChord(id: "Dm", name: "Dm", displayName: "D Minör", root: "D", frets: [-1, -1, 0, 2, 3, 1], pitchClasses: [2, 5, 9]),
        "E": GuitarChord(id: "E", name: "E", displayName: "E Majör", root: "E", frets: [0, 2, 2, 1, 0, 0], pitchClasses: [4, 8, 11]),
        "E7": GuitarChord(id: "E7", name: "E7", displayName: "E Dominant 7", root: "E", frets: [0, 2, 0, 1, 0, 0], pitchClasses: [4, 8, 11, 2]),
        "F": GuitarChord(id: "F", name: "F", displayName: "F Majör", root: "F", frets: [1, 3, 3, 2, 1, 1], pitchClasses: [5, 9, 0]),
        "C": GuitarChord(id: "C", name: "C", displayName: "C Majör", root: "C", frets: [-1, 3, 2, 0, 1, 0], pitchClasses: [0, 4, 7]),
        "G": GuitarChord(id: "G", name: "G", displayName: "G Majör", root: "G", frets: [3, 2, 0, 0, 0, 3], pitchClasses: [7, 11, 2]),
        "Em": GuitarChord(id: "Em", name: "Em", displayName: "E Minör", root: "E", frets: [0, 2, 2, 0, 0, 0], pitchClasses: [4, 7, 11]),
        "D": GuitarChord(id: "D", name: "D", displayName: "D Majör", root: "D", frets: [-1, -1, 0, 2, 3, 2], pitchClasses: [2, 6, 9]),
        "Fmaj7": GuitarChord(id: "Fmaj7", name: "Fmaj7", displayName: "F Majör 7", root: "F", frets: [-1, -1, 3, 2, 1, 0], pitchClasses: [5, 9, 0, 4]),
        "Em7": GuitarChord(id: "Em7", name: "Em7", displayName: "E Minör 7", root: "E", frets: [0, 2, 2, 0, 3, 3], pitchClasses: [4, 7, 11, 2]),
        "Am7": GuitarChord(id: "Am7", name: "Am7", displayName: "A Minör 7", root: "A", frets: [-1, 0, 2, 0, 1, 0], pitchClasses: [9, 0, 4, 7]),
        "Dm7": GuitarChord(id: "Dm7", name: "Dm7", displayName: "D Minör 7", root: "D", frets: [-1, -1, 0, 2, 1, 1], pitchClasses: [2, 5, 9, 0]),
        "Cmaj7": GuitarChord(id: "Cmaj7", name: "Cmaj7", displayName: "C Majör 7", root: "C", frets: [-1, 3, 2, 0, 0, 0], pitchClasses: [0, 4, 7, 11]),
        "G7": GuitarChord(id: "G7", name: "G7", displayName: "G Dominant 7", root: "G", frets: [3, 2, 0, 0, 0, 1], pitchClasses: [7, 11, 2, 5]),
        "Bdim": GuitarChord(id: "Bdim", name: "Bdim", displayName: "B Diminished", root: "B", frets: [-1, 2, 3, 4, 3, -1], pitchClasses: [11, 2, 5])
    ]

    public static func chordNamed(_ name: String) -> GuitarChord {
        return chords[name] ?? chords["Am"]!
    }

    public static func fretFrequency(stringIndex: Int, fret: Int) -> Double {
        guard fret >= 0, stringIndex >= 0, stringIndex < 6 else { return 0 }
        let base = standardTuningFreqs[stringIndex]
        return base * pow(2.0, Double(fret) / 12.0)
    }
}

// MARK: - Şarkı Kısımları (Sections)
public struct SongSection: Identifiable, Hashable {
    public let id: String
    public var name: String
    public var chords: [String]
    public var repeats: Int
    public var drumMode: String

    public init(id: String, name: String, chords: [String], repeats: Int = 2, drumMode: String = "cajon-shaker") {
        self.id = id
        self.name = name
        self.chords = chords
        self.repeats = repeats
        self.drumMode = drumMode
    }
}

public struct DefaultSections {
    public static let initial: [SongSection] = [
        SongSection(id: "intro", name: "Giriş (Intro)", chords: ["Am", "Dm"], repeats: 2, drumMode: "shaker-only"),
        SongSection(id: "verse", name: "Söz (Verse)", chords: ["Am", "Dm", "E", "Am"], repeats: 2, drumMode: "cajon-shaker"),
        SongSection(id: "chorus", name: "Nakarat (Chorus)", chords: ["F", "G", "C", "Am"], repeats: 4, drumMode: "full"),
        SongSection(id: "solo", name: "Solo & Köprü", chords: ["Dm", "G", "E7", "Am"], repeats: 2, drumMode: "flamenco")
    ]
}

// MARK: - Hit Akor Trendleri
public struct HitProgression: Identifiable {
    public let id: String
    public let title: String
    public let artistHint: String
    public let chords: [String]
    public let bpm: Double
    public let description: String

    public static let all: [HitProgression] = [
        HitProgression(id: "duman", title: "Duman & 2000ler Rock", artistHint: "Duman, Mor ve Ötesi", chords: ["Em", "C", "G", "D"], bpm: 96, description: "Gençliğin marşı 4 akorlu efsanevi rock yürüyüşü."),
        HitProgression(id: "sezen", title: "Sezen Aksu Nihavend", artistHint: "Sezen Aksu, Levent Yüksel", chords: ["Am", "Dm", "G", "C", "F", "Dm", "E7", "Am"], bpm: 78, description: "Büyük aşk ve hüzünlerin klasik akor zinciri."),
        HitProgression(id: "madrigal", title: "Madrigal / Modern Indie Pop", artistHint: "Madrigal, Dolu Kadehi Ters Tut", chords: ["Fmaj7", "G", "Em7", "Am7"], bpm: 102, description: "Türkiye listelerinde tutan akustik indie hissiyatı."),
        HitProgression(id: "flamenco", title: "Akdeniz & Endülüs Rumba", artistHint: "Gipsy Kings, Yeni Türkü", chords: ["Am", "G", "F", "E7"], bpm: 118, description: "Ateşi yükselten klasik Endülüs kadansı."),
        HitProgression(id: "pop90s", title: "90lar Türkçe Pop", artistHint: "Tarkan, Kenan Doğulu", chords: ["Am", "F", "Dm", "E7"], bpm: 116, description: "90'ların enerjik ve melodik altın çağ matematiği."),
        HitProgression(id: "global4", title: "Global Pop Hit", artistHint: "Ed Sheeran, Coldplay", chords: ["C", "G", "Am", "F"], bpm: 104, description: "Dünya pop listelerinin 100+ hit şarkılık şablonu.")
    ]

    public static func random() -> HitProgression {
        return all.randomElement()!
    }
}
