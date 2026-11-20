import Foundation

// MARK: - Enstrüman Türleri (9 Enstrüman)
public enum AcousticInstrumentType: String, CaseIterable, Identifiable, Codable, Hashable {
    case nylon = "nylon"
    case steel = "steel"
    case piano = "piano"
    case violin = "violin"
    case clarinet = "clarinet"
    case altoSax = "alto_sax"
    case harmonica = "harmonica"
    case bass = "bass"
    case drums = "drums"

    public var id: String { rawValue }

    public var displayName: String { name }

    public var name: String {
        switch self {
        case .nylon: return "Sıcak Naylon Gitar"
        case .steel: return "Çelik Akustik Gitar"
        case .piano: return "Kuyruklu Piyano"
        case .violin: return "Keman"
        case .clarinet: return "Klarnet"
        case .altoSax: return "Saksafon"
        case .harmonica: return "Mızıka"
        case .bass: return "Akustik Bas"
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
        case .bass: return "guitars.fill"
        case .drums: return "circle.grid.cross"
        }
    }

    public var defaultOctave: Int {
        switch self {
        case .bass:
            return 2
        case .nylon, .steel, .piano, .altoSax, .drums:
            return 3
        case .violin, .clarinet, .harmonica:
            return 4
        }
    }
}

// MARK: - Gitar Gövde Önayarları (4 Preset)
public enum GuitarBodyPreset: String, CaseIterable, Identifiable, Codable, Hashable {
    case dreadnought = "dreadnought"
    case taylorParlor = "taylor-parlor"
    case gibsonJumbo = "gibson-jumbo"
    case twelveStringShimmer = "twelve-string-shimmer"

    public var id: String { rawValue }

    public var name: String { displayName }

    public var displayName: String {
        switch self {
        case .dreadnought: return "Martin D-28 Dreadnought"
        case .taylorParlor: return "Taylor 814ce Grand Auditorium"
        case .gibsonJumbo: return "Gibson SJ-200 Jumbo King"
        case .twelveStringShimmer: return "12-String Shimmer Acoustic"
        }
    }

    public var brightness: Double {
        switch self {
        case .dreadnought: return 0.70
        case .taylorParlor: return 0.85
        case .gibsonJumbo: return 0.60
        case .twelveStringShimmer: return 0.90
        }
    }

    public var bodyResonance: Double {
        switch self {
        case .dreadnought: return 0.85
        case .taylorParlor: return 0.65
        case .gibsonJumbo: return 0.90
        case .twelveStringShimmer: return 0.75
        }
    }

    public var reverbWet: Double {
        switch self {
        case .dreadnought: return 0.08
        case .taylorParlor: return 0.10
        case .gibsonJumbo: return 0.06
        case .twelveStringShimmer: return 0.12
        }
    }

    public var chorusWet: Double {
        switch self {
        case .dreadnought: return 0.00
        case .taylorParlor: return 0.08
        case .gibsonJumbo: return 0.00
        case .twelveStringShimmer: return 0.25
        }
    }

    public var strumSpeedMs: Double {
        switch self {
        case .dreadnought: return 22.0
        case .taylorParlor: return 18.0
        case .gibsonJumbo: return 25.0
        case .twelveStringShimmer: return 28.0
        }
    }
}

// MARK: - Space Designer Reverb Önayarları (4 Preset)
public enum SpaceDesignerPreset: String, CaseIterable, Identifiable, Codable, Hashable {
    case dryRoom = "dry-room"
    case warmWood = "warm-wood"
    case concertHall = "concert-hall"
    case plate = "plate"

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .dryRoom: return "Dry Studio"
        case .warmWood: return "Warm Wood"
        case .concertHall: return "Concert Hall"
        case .plate: return "Plate"
        }
    }

    public var defaultWet: Double {
        switch self {
        case .dryRoom: return 0.10
        case .warmWood: return 0.30
        case .concertHall: return 0.42
        case .plate: return 0.35
        }
    }

    public var durationSeconds: Double {
        switch self {
        case .dryRoom: return 0.35
        case .warmWood: return 1.15
        case .concertHall: return 2.40
        case .plate: return 1.65
        }
    }

    public var decaySeconds: Double {
        switch self {
        case .dryRoom: return 0.28
        case .warmWood: return 0.95
        case .concertHall: return 2.10
        case .plate: return 1.40
        }
    }

    public var preDelayMs: Double {
        switch self {
        case .dryRoom: return 4.0
        case .warmWood: return 12.0
        case .concertHall: return 26.0
        case .plate: return 8.0
        }
    }

    public var lowShelfGainDb: Double {
        switch self {
        case .dryRoom: return -2.0
        case .warmWood: return 2.5
        case .concertHall: return 1.5
        case .plate: return -1.5
        }
    }

    public var highShelfCutHz: Double {
        switch self {
        case .dryRoom: return 7500.0
        case .warmWood: return 5200.0
        case .concertHall: return 6400.0
        case .plate: return 9500.0
        }
    }

    public var resonanceDb: Double {
        switch self {
        case .dryRoom: return 1.5
        case .warmWood: return 3.0
        case .concertHall: return 2.0
        case .plate: return 1.0
        }
    }
}

// MARK: - Müzikal Gamlar ve Makamlar (6 Gam/Makam)
public struct MusicalScale: Identifiable, Hashable, Codable {
    public let id: String
    public let name: String
    public let category: String
    public let intervals: [Int]
    public let description: String
    public let recommendedChords: [String]

    public init(
        id: String,
        name: String,
        category: String = "western",
        intervals: [Int],
        description: String = "",
        recommendedChords: [String]
    ) {
        self.id = id
        self.name = name
        self.category = category
        self.intervals = intervals
        self.description = description
        self.recommendedChords = recommendedChords
    }
}

public struct DiatonicChordInfo: Identifiable, Hashable, Codable {
    public let id: String
    public let degree: Int
    public let roman: String
    public let chordId: String
    public let displayName: String
    public let role: String

    public init(id: String, degree: Int, roman: String, chordId: String, displayName: String, role: String) {
        self.id = id
        self.degree = degree
        self.roman = roman
        self.chordId = chordId
        self.displayName = displayName
        self.role = role
    }
}

public struct ScaleNote: Hashable, Codable {
    public let noteName: String
    public let midi: Int
    public let degree: Int

    public init(noteName: String, midi: Int, degree: Int) {
        self.noteName = noteName
        self.midi = midi
        self.degree = degree
    }
}

public struct ScaleLibrary {
    public static let noteNames: [String] = [
        "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"
    ]

    public static let canonicalChordRootNames: [String] = [
        "C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"
    ]

    public static let scales: [MusicalScale] = [
        MusicalScale(
            id: "minor",
            name: "Doğal Minör (Nihavend / Eolian)",
            category: "western",
            intervals: [0, 2, 3, 5, 7, 8, 10],
            description: "Türkçe pop ve rock şarkılarının vazgeçilmez melankolik gamı (Barış Manço, Duman).",
            recommendedChords: ["Am", "Dm", "Em", "F", "G", "C"]
        ),
        MusicalScale(
            id: "hicaz",
            name: "Hicaz / Armonik Minör (Phrygian Dominant)",
            category: "turkish",
            intervals: [0, 1, 4, 5, 7, 8, 10],
            description: "Anadolu ve Doğu Akdeniz tınısı. Sezen Aksu, Levent Yüksel, Özgün Müzik karakteri.",
            recommendedChords: ["E", "F", "Dm", "Am", "E7"]
        ),
        MusicalScale(
            id: "kurdi",
            name: "Kürdi / Frigyen (Phrygian)",
            category: "turkish",
            intervals: [0, 1, 3, 5, 7, 8, 10],
            description: "Anadolu rock ve türkü aranjmanlarının mistik ve karanlık akustik lezzeti.",
            recommendedChords: ["Am", "Bb", "C", "Dm", "Gm"]
        ),
        MusicalScale(
            id: "pentatonic-minor",
            name: "Minör Pentatonik / Blues (Solo Kralı)",
            category: "blues",
            intervals: [0, 3, 5, 6, 7, 10],
            description: "Solo çalarken asla yanlış nota bastırmayan, en lezzetli akustik solo gamı.",
            recommendedChords: ["Am", "C", "D", "E7", "G"]
        ),
        MusicalScale(
            id: "major",
            name: "Doğal Majör (Neşeli Pop & Folk)",
            category: "western",
            intervals: [0, 2, 4, 5, 7, 9, 11],
            description: "Aydınlık, umutlu ve enerjik akustik şarkılar (MFÖ, Nil Karaibrahimgil).",
            recommendedChords: ["C", "Dm", "Em", "F", "G", "Am"]
        ),
        MusicalScale(
            id: "dorian",
            name: "Dorian (Anadolu Rock & Folk)",
            category: "turkish",
            intervals: [0, 2, 3, 5, 7, 9, 10],
            description: "Erkin Koray, Moğollar ve Cem Karaca tarzı 60-70ler Anadolu Pop ruhu.",
            recommendedChords: ["Am", "D", "C", "G", "Em"]
        )
    ]

    public static var all: [MusicalScale] { scales }

    public static func scale(id: String) -> MusicalScale {
        return scales.first(where: { $0.id == id }) ?? scales[0]
    }

    public static func semitone(for noteName: String) -> Int {
        let normalized = noteName.trimmingCharacters(in: .whitespacesAndNewlines)
        switch normalized {
        case "C": return 0
        case "C#", "Db": return 1
        case "D": return 2
        case "D#", "Eb": return 3
        case "E": return 4
        case "F": return 5
        case "F#", "Gb": return 6
        case "G": return 7
        case "G#", "Ab": return 8
        case "A": return 9
        case "A#", "Bb": return 10
        case "B": return 11
        default: return 9 // Default A
        }
    }

    public static func getDiatonicChordInfos(root: String, scaleId: String) -> [DiatonicChordInfo] {
        let rootSemi = semitone(for: root)

        let specs: [(deg: Int, interval: Int, suffix: String, roman: String, role: String)]
        switch scaleId {
        case "major":
            specs = [
                (1, 0, "", "I", "Tonik (Karar)"),
                (2, 2, "m", "ii", "Subdominant (Köprü)"),
                (3, 4, "m", "iii", "Medyant"),
                (4, 5, "", "IV", "Subdominant (Açılım)"),
                (5, 7, "7", "V7", "Dominant (Çözülüm)"),
                (6, 9, "m", "vi", "Bağıl Minör"),
                (7, 11, "dim", "vii°", "Sensibl")
            ]
        case "hicaz":
            specs = [
                (1, 0, "", "I (Hicaz)", "Karar (Tonik)"),
                (2, 1, "", "bII", "Hicaz Karakter (bII)"),
                (3, 4, "dim", "III°", "Medyant"),
                (4, 5, "m", "iv", "Açılım (Subdominant)"),
                (5, 7, "7", "V7", "Çözülüm (Dominant 7)"),
                (6, 8, "", "bVI", "Duygu (Submedyant)"),
                (7, 10, "", "bVII", "Dominant / Karara Dönüş")
            ]
        case "kurdi":
            specs = [
                (1, 0, "m", "i", "Karar (Tonik)"),
                (2, 1, "", "bII", "Kürdi Karakter (bII)"),
                (3, 3, "", "bIII", "Medyant"),
                (4, 5, "m", "iv", "Açılım (Subdominant)"),
                (5, 7, "7", "V7", "Çözülüm (Dominant 7)"),
                (6, 8, "", "bVI", "Duygu (Submedyant)"),
                (7, 10, "", "bVII", "Dominant / Karara Dönüş")
            ]
        case "dorian":
            specs = [
                (1, 0, "m", "i", "Karar (Tonik)"),
                (2, 2, "m", "ii", "Subdominant"),
                (3, 3, "", "bIII", "Medyant"),
                (4, 5, "", "IV", "Açılım (Dorian IV)"),
                (5, 7, "7", "V7", "Çözülüm (Dominant 7)"),
                (6, 9, "dim", "vi°", "Dorian Altılı"),
                (7, 10, "", "bVII", "Dominant / Karara Dönüş")
            ]
        default:
            // "minor" and "pentatonic-minor"
            specs = [
                (1, 0, "m", "i", "Karar (Tonik)"),
                (2, 2, "dim", "ii°", "Subdominant"),
                (3, 3, "", "bIII", "Medyant"),
                (4, 5, "m", "iv", "Açılım (Subdominant)"),
                (5, 7, "7", "V7", "Çözülüm (Dominant 7)"),
                (6, 8, "", "bVI", "Duygu (Submedyant)"),
                (7, 10, "", "bVII", "Dominant / Karara Dönüş")
            ]
        }

        return specs.map { spec in
            let noteName = canonicalChordRootNames[(rootSemi + spec.interval) % 12]
            let chordId = "\(noteName)\(spec.suffix)"
            return DiatonicChordInfo(
                id: "\(spec.deg)-\(chordId)",
                degree: spec.deg,
                roman: spec.roman,
                chordId: chordId,
                displayName: "\(noteName) \(spec.roman)",
                role: spec.role
            )
        }
    }

    public static func getDiatonicChords(root: String, scaleId: String) -> [String] {
        return getDiatonicChordInfos(root: root, scaleId: scaleId).map(\.chordId)
    }

    public static func getScaleNotes(root: String, scaleId: String, baseOctave: Int = 3) -> [ScaleNote] {
        let activeScale = scale(id: scaleId)
        let rootSemi = semitone(for: root)
        let rootMidi = 12 * (baseOctave + 1) + rootSemi

        var notes: [ScaleNote] = []
        notes.reserveCapacity(activeScale.intervals.count * 2)

        for octave in 0..<2 {
            for (index, interval) in activeScale.intervals.enumerated() {
                let rawMidi = rootMidi + (octave * 12) + interval
                let midi = max(0, min(127, rawMidi))
                let pitchClass = ((midi % 12) + 12) % 12
                let midiOctave = (midi / 12) - 1
                let name = "\(noteNames[pitchClass])\(midiOctave)"
                notes.append(ScaleNote(noteName: name, midi: midi, degree: index + 1 + (octave * 7)))
            }
        }
        return notes
    }
}

// MARK: - Solo Harmoni Modları (4 Mod)
public enum SoloHarmonyMode: String, CaseIterable, Identifiable, Codable, Hashable {
    case chordTones = "chord-tones"
    case smartLick = "smart-lick"
    case pentatonic = "pentatonic"
    case freeScale = "free-scale"

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .chordTones: return "Akor Sesleri"
        case .smartLick: return "Akıllı Lick"
        case .pentatonic: return "Pentatonik"
        case .freeScale: return "Serbest Gam"
        }
    }
}

// MARK: - Akor Modeli
public struct GuitarChord: Identifiable, Hashable, Codable {
    public let id: String
    public let name: String
    public let displayName: String
    public let root: String
    public let frets: [Int]        // 6 tel freti (-1 = susturulmuş)
    public let pitchClasses: [Int] // 0-11 nota sınıfları (C=0, C#=1... B=11)

    public init(id: String, name: String, displayName: String, root: String, frets: [Int], pitchClasses: [Int]) {
        self.id = id
        self.name = name
        self.displayName = displayName
        self.root = root
        self.frets = frets
        self.pitchClasses = pitchClasses
    }

    public var rootPitchClass: Int {
        ScaleLibrary.semitone(for: root)
    }

    public var midiNotes: [Int] {
        zip(ChordLibrary.stringBaseMidi, frets).map { base, fret in
            fret >= 0 ? base + fret : -1
        }
    }

    public var soundingMidiNotes: [Int] {
        midiNotes.filter { $0 >= 0 }
    }
}

// MARK: - Akor Kütüphanesi (55 Doğrulanmış Akor + Sıfır Hata Snapping)
public struct ChordLibrary {
    public static let standardTuningFreqs: [Double] = [82.41, 110.00, 146.83, 196.00, 246.94, 329.63]
    public static let stringBaseMidi: [Int] = [40, 45, 50, 55, 59, 64]

    public static let chords: [GuitarChord] = [
        // 12 Major Chords
        GuitarChord(id: "C", name: "C", displayName: "C Majör", root: "C", frets: [-1, 3, 2, 0, 1, 0], pitchClasses: [0, 4, 7]),
        GuitarChord(id: "C#", name: "C#", displayName: "C# Majör", root: "C#", frets: [-1, 4, 6, 6, 6, 4], pitchClasses: [1, 5, 8]),
        GuitarChord(id: "D", name: "D", displayName: "D Majör", root: "D", frets: [-1, -1, 0, 2, 3, 2], pitchClasses: [2, 6, 9]),
        GuitarChord(id: "Eb", name: "Eb", displayName: "Eb Majör", root: "Eb", frets: [-1, 6, 8, 8, 8, 6], pitchClasses: [3, 7, 10]),
        GuitarChord(id: "E", name: "E", displayName: "E Majör", root: "E", frets: [0, 2, 2, 1, 0, 0], pitchClasses: [4, 8, 11]),
        GuitarChord(id: "F", name: "F", displayName: "F Majör", root: "F", frets: [1, 3, 3, 2, 1, 1], pitchClasses: [5, 9, 0]),
        GuitarChord(id: "F#", name: "F#", displayName: "F# Majör", root: "F#", frets: [2, 4, 4, 3, 2, 2], pitchClasses: [6, 10, 1]),
        GuitarChord(id: "G", name: "G", displayName: "G Majör", root: "G", frets: [3, 2, 0, 0, 0, 3], pitchClasses: [7, 11, 2]),
        GuitarChord(id: "Ab", name: "Ab", displayName: "Ab Majör", root: "Ab", frets: [4, 6, 6, 5, 4, 4], pitchClasses: [8, 0, 3]),
        GuitarChord(id: "A", name: "A", displayName: "A Majör", root: "A", frets: [-1, 0, 2, 2, 2, 0], pitchClasses: [9, 1, 4]),
        GuitarChord(id: "Bb", name: "Bb", displayName: "Bb Majör", root: "Bb", frets: [-1, 1, 3, 3, 3, 1], pitchClasses: [10, 2, 5]),
        GuitarChord(id: "B", name: "B", displayName: "B Majör", root: "B", frets: [-1, 2, 4, 4, 4, 2], pitchClasses: [11, 3, 6]),

        // 12 Minor Chords
        GuitarChord(id: "Cm", name: "Cm", displayName: "C Minör", root: "C", frets: [-1, 3, 5, 5, 4, 3], pitchClasses: [0, 3, 7]),
        GuitarChord(id: "C#m", name: "C#m", displayName: "C# Minör", root: "C#", frets: [-1, 4, 6, 6, 5, 4], pitchClasses: [1, 4, 8]),
        GuitarChord(id: "Dm", name: "Dm", displayName: "D Minör", root: "D", frets: [-1, -1, 0, 2, 3, 1], pitchClasses: [2, 5, 9]),
        GuitarChord(id: "Ebm", name: "Ebm", displayName: "Eb Minör", root: "Eb", frets: [-1, 6, 8, 8, 7, 6], pitchClasses: [3, 6, 10]),
        GuitarChord(id: "Em", name: "Em", displayName: "E Minör", root: "E", frets: [0, 2, 2, 0, 0, 0], pitchClasses: [4, 7, 11]),
        GuitarChord(id: "Fm", name: "Fm", displayName: "F Minör", root: "F", frets: [1, 3, 3, 1, 1, 1], pitchClasses: [5, 8, 0]),
        GuitarChord(id: "F#m", name: "F#m", displayName: "F# Minör", root: "F#", frets: [2, 4, 4, 2, 2, 2], pitchClasses: [6, 9, 1]),
        GuitarChord(id: "Gm", name: "Gm", displayName: "G Minör", root: "G", frets: [3, 5, 5, 3, 3, 3], pitchClasses: [7, 10, 2]),
        GuitarChord(id: "Abm", name: "Abm", displayName: "Ab Minör", root: "Ab", frets: [4, 6, 6, 4, 4, 4], pitchClasses: [8, 11, 3]),
        GuitarChord(id: "Am", name: "Am", displayName: "A Minör", root: "A", frets: [-1, 0, 2, 2, 1, 0], pitchClasses: [9, 0, 4]),
        GuitarChord(id: "Bbm", name: "Bbm", displayName: "Bb Minör", root: "Bb", frets: [-1, 1, 3, 3, 2, 1], pitchClasses: [10, 1, 5]),
        GuitarChord(id: "Bm", name: "Bm", displayName: "B Minör", root: "B", frets: [-1, 2, 4, 4, 3, 2], pitchClasses: [11, 2, 6]),

        // 12 Dominant 7th Chords
        GuitarChord(id: "C7", name: "C7", displayName: "C Dominant 7", root: "C", frets: [-1, 3, 2, 3, 1, 3], pitchClasses: [0, 4, 7, 10]),
        GuitarChord(id: "C#7", name: "C#7", displayName: "C# Dominant 7", root: "C#", frets: [-1, 4, 6, 4, 6, 4], pitchClasses: [1, 5, 8, 11]),
        GuitarChord(id: "D7", name: "D7", displayName: "D Dominant 7", root: "D", frets: [-1, -1, 0, 2, 1, 2], pitchClasses: [2, 6, 9, 0]),
        GuitarChord(id: "Eb7", name: "Eb7", displayName: "Eb Dominant 7", root: "Eb", frets: [-1, 6, 8, 6, 8, 6], pitchClasses: [3, 7, 10, 1]),
        GuitarChord(id: "E7", name: "E7", displayName: "E Dominant 7", root: "E", frets: [0, 2, 0, 1, 0, 0], pitchClasses: [4, 8, 11, 2]),
        GuitarChord(id: "F7", name: "F7", displayName: "F Dominant 7", root: "F", frets: [1, 3, 1, 2, 1, 1], pitchClasses: [5, 9, 0, 3]),
        GuitarChord(id: "F#7", name: "F#7", displayName: "F# Dominant 7", root: "F#", frets: [2, 4, 2, 3, 2, 2], pitchClasses: [6, 10, 1, 4]),
        GuitarChord(id: "G7", name: "G7", displayName: "G Dominant 7", root: "G", frets: [3, 2, 0, 0, 0, 1], pitchClasses: [7, 11, 2, 5]),
        GuitarChord(id: "Ab7", name: "Ab7", displayName: "Ab Dominant 7", root: "Ab", frets: [4, 6, 4, 5, 4, 4], pitchClasses: [8, 0, 3, 6]),
        GuitarChord(id: "A7", name: "A7", displayName: "A Dominant 7", root: "A", frets: [-1, 0, 2, 0, 2, 0], pitchClasses: [9, 1, 4, 7]),
        GuitarChord(id: "Bb7", name: "Bb7", displayName: "Bb Dominant 7", root: "Bb", frets: [-1, 1, 3, 1, 3, 1], pitchClasses: [10, 2, 5, 8]),
        GuitarChord(id: "B7", name: "B7", displayName: "B Dominant 7", root: "B", frets: [-1, 2, 1, 2, 0, 2], pitchClasses: [11, 3, 6, 9]),

        // 12 Diminished Chords
        GuitarChord(id: "Cdim", name: "Cdim", displayName: "C Diminished", root: "C", frets: [-1, 3, 4, 5, 4, -1], pitchClasses: [0, 3, 6]),
        GuitarChord(id: "C#dim", name: "C#dim", displayName: "C# Diminished", root: "C#", frets: [-1, 4, 5, 6, 5, -1], pitchClasses: [1, 4, 7]),
        GuitarChord(id: "Ddim", name: "Ddim", displayName: "D Diminished", root: "D", frets: [-1, -1, 0, 1, 3, 1], pitchClasses: [2, 5, 8]),
        GuitarChord(id: "Ebdim", name: "Ebdim", displayName: "Eb Diminished", root: "Eb", frets: [-1, -1, 1, 2, 4, 2], pitchClasses: [3, 6, 9]),
        GuitarChord(id: "Edim", name: "Edim", displayName: "E Diminished", root: "E", frets: [-1, -1, 2, 3, 5, 3], pitchClasses: [4, 7, 10]),
        GuitarChord(id: "Fdim", name: "Fdim", displayName: "F Diminished", root: "F", frets: [1, 2, 3, 1, -1, -1], pitchClasses: [5, 8, 11]),
        GuitarChord(id: "F#dim", name: "F#dim", displayName: "F# Diminished", root: "F#", frets: [2, 3, 4, 2, -1, -1], pitchClasses: [6, 9, 0]),
        GuitarChord(id: "Gdim", name: "Gdim", displayName: "G Diminished", root: "G", frets: [3, 4, 5, 3, -1, -1], pitchClasses: [7, 10, 1]),
        GuitarChord(id: "Abdim", name: "Abdim", displayName: "Ab Diminished", root: "Ab", frets: [4, 5, 6, 4, -1, -1], pitchClasses: [8, 11, 2]),
        GuitarChord(id: "Adim", name: "Adim", displayName: "A Diminished", root: "A", frets: [-1, 0, 1, 2, 1, -1], pitchClasses: [9, 0, 3]),
        GuitarChord(id: "Bbdim", name: "Bbdim", displayName: "Bb Diminished", root: "Bb", frets: [-1, 1, 2, 3, 2, -1], pitchClasses: [10, 1, 4]),
        GuitarChord(id: "Bdim", name: "Bdim", displayName: "B Diminished", root: "B", frets: [-1, 2, 3, 4, 3, -1], pitchClasses: [11, 2, 5]),

        // 7 Extended / Color Chords
        GuitarChord(id: "Fmaj7", name: "Fmaj7", displayName: "F Majör 7", root: "F", frets: [-1, -1, 3, 2, 1, 0], pitchClasses: [5, 9, 0, 4]),
        GuitarChord(id: "Em7", name: "Em7", displayName: "E Minör 7", root: "E", frets: [0, 2, 2, 0, 3, 3], pitchClasses: [4, 7, 11, 2]),
        GuitarChord(id: "Am7", name: "Am7", displayName: "A Minör 7", root: "A", frets: [-1, 0, 2, 0, 1, 0], pitchClasses: [9, 0, 4, 7]),
        GuitarChord(id: "Dm7", name: "Dm7", displayName: "D Minör 7", root: "D", frets: [-1, -1, 0, 2, 1, 1], pitchClasses: [2, 5, 9, 0]),
        GuitarChord(id: "Cmaj7", name: "Cmaj7", displayName: "C Majör 7", root: "C", frets: [-1, 3, 2, 0, 0, 0], pitchClasses: [0, 4, 7, 11]),
        GuitarChord(id: "Cadd9", name: "Cadd9", displayName: "C add9", root: "C", frets: [-1, 3, 2, 0, 3, 3], pitchClasses: [0, 4, 7, 2]),
        GuitarChord(id: "Dsus4", name: "Dsus4", displayName: "D sus4", root: "D", frets: [-1, -1, 0, 2, 3, 3], pitchClasses: [2, 7, 9])
    ]

    public static let chordsByName: [String: GuitarChord] = Dictionary(
        uniqueKeysWithValues: chords.map { ($0.name, $0) }
    )

    public static func chordNamed(_ name: String) -> GuitarChord {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        if let direct = chordsByName[trimmed] {
            return direct
        }

        if trimmed == "Fsm" {
            return chordsByName["F#m"]!
        }

        let enharmonicPrefixes: [(from: String, to: String)] = [
            ("Db", "C#"),
            ("D#", "Eb"),
            ("Gb", "F#"),
            ("G#", "Ab"),
            ("A#", "Bb")
        ]

        for mapping in enharmonicPrefixes {
            if trimmed.hasPrefix(mapping.from) {
                let normalized = mapping.to + trimmed.dropFirst(mapping.from.count)
                if let aliased = chordsByName[normalized] {
                    return aliased
                }
            }
        }

        return chordsByName["Am"]!
    }

    public static func fretFrequency(stringIndex: Int, fret: Int) -> Double {
        guard fret >= 0, stringIndex >= 0, stringIndex < 6 else { return 0 }
        let base = standardTuningFreqs[stringIndex]
        return base * pow(2.0, Double(fret) / 12.0)
    }

    public static func midiToFrequency(_ midi: Int) -> Double {
        return 440.0 * pow(2.0, Double(midi - 69) / 12.0)
    }

    public static func snapMidiToChord(
        midi: Int,
        chord: GuitarChord,
        mode: SoloHarmonyMode,
        scaleRoot: String = "A",
        scaleId: String = "minor"
    ) -> Int {
        let baseMidi = max(0, min(127, midi))
        let rootPC = chord.rootPitchClass

        let scale = ScaleLibrary.scale(id: scaleId)
        let scaleRootSemi = ScaleLibrary.semitone(for: scaleRoot)
        let scalePitchClasses = Set(scale.intervals.map { (scaleRootSemi + $0) % 12 })

        let targetPitchClasses: Set<Int>
        switch mode {
        case .chordTones:
            targetPitchClasses = Set(chord.pitchClasses)

        case .smartLick:
            var pcs = Set(chord.pitchClasses)
            let ninth = (rootPC + 2) % 12
            let seventhOffset = chord.id.contains("maj7") ? 11 : 10
            let seventh = (rootPC + seventhOffset) % 12
            let candidateExtensions = [ninth, seventh]
            let scaleFiltered = candidateExtensions.filter { scalePitchClasses.contains($0) }
            pcs.formUnion(scaleFiltered)
            targetPitchClasses = pcs

        case .pentatonic:
            let hasMajorThird = chord.pitchClasses.contains((rootPC + 4) % 12)
            let hasMinorThird = chord.pitchClasses.contains((rootPC + 3) % 12)
            let hasPerfectFourth = chord.pitchClasses.contains((rootPC + 5) % 12)
            let hasDiminishedFifth = chord.pitchClasses.contains((rootPC + 6) % 12)
            let hasPerfectFifth = chord.pitchClasses.contains((rootPC + 7) % 12)

            let intervals: [Int]
            if !hasPerfectFifth && hasDiminishedFifth {
                intervals = [0, 3, 6, 8, 10]
            } else if !hasMajorThird && !hasMinorThird && hasPerfectFourth {
                intervals = [0, 2, 5, 7, 10]
            } else if hasMinorThird {
                intervals = [0, 3, 5, 7, 10]
            } else {
                intervals = [0, 2, 4, 7, 9]
            }
            targetPitchClasses = Set(intervals.map { (rootPC + $0) % 12 })

        case .freeScale:
            targetPitchClasses = scalePitchClasses
        }

        guard !targetPitchClasses.isEmpty else { return baseMidi }

        let basePitchClass = ((baseMidi % 12) + 12) % 12
        if targetPitchClasses.contains(basePitchClass) {
            return baseMidi
        }

        // Nearest pitch class with downward tie-breaking and 0...127 boundary clamping
        for distance in 1...11 {
            let down = baseMidi - distance
            if down >= 0 && targetPitchClasses.contains(down % 12) {
                return down
            }
            let up = baseMidi + distance
            if up <= 127 && targetPitchClasses.contains(up % 12) {
                return up
            }
        }

        return baseMidi
    }
}

// MARK: - Ritim & Strum Desenleri (5 Desen, 16 Adım)
public enum StrumStroke: String, CaseIterable, Codable, Hashable {
    case down
    case up
    case bass
    case treble
    case mute
    case rest
}

public struct StrumStep: Hashable, Codable {
    public let stroke: StrumStroke
    public let velocity: Double
    public let accent: Bool

    public init(stroke: StrumStroke, velocity: Double, accent: Bool = false) {
        self.stroke = stroke
        self.velocity = velocity
        self.accent = accent
    }
}

public struct StrumPattern: Identifiable, Hashable, Codable {
    public let id: String
    public let name: String
    public let steps: [StrumStep]

    public init(id: String, name: String, steps: [StrumStep]) {
        self.id = id
        self.name = name
        self.steps = steps
    }

    private static func grid(_ sparse: [Int: StrumStep]) -> [StrumStep] {
        (0..<16).map { idx in
            sparse[idx] ?? StrumStep(stroke: .rest, velocity: 0.0, accent: false)
        }
    }

    public static let all: [StrumPattern] = [
        StrumPattern(
            id: "folk-rock",
            name: "Classic Folk & Pop (D - D U - U D U)",
            steps: grid([
                0: StrumStep(stroke: .down, velocity: 0.95, accent: true),
                4: StrumStep(stroke: .down, velocity: 0.80),
                6: StrumStep(stroke: .up, velocity: 0.65),
                10: StrumStep(stroke: .up, velocity: 0.70),
                12: StrumStep(stroke: .down, velocity: 0.85, accent: true),
                14: StrumStep(stroke: .up, velocity: 0.60)
            ])
        ),
        StrumPattern(
            id: "fingerpicking-travis",
            name: "Travis Fingerpicking (Arpej)",
            steps: grid([
                0: StrumStep(stroke: .bass, velocity: 0.90, accent: true),
                2: StrumStep(stroke: .treble, velocity: 0.65),
                4: StrumStep(stroke: .bass, velocity: 0.75),
                6: StrumStep(stroke: .treble, velocity: 0.70),
                8: StrumStep(stroke: .bass, velocity: 0.85, accent: true),
                10: StrumStep(stroke: .treble, velocity: 0.65),
                12: StrumStep(stroke: .bass, velocity: 0.75),
                14: StrumStep(stroke: .treble, velocity: 0.70)
            ])
        ),
        StrumPattern(
            id: "percussive-groove",
            name: "Modern Akustik Perküsif (Chuck / Slap)",
            steps: grid([
                0: StrumStep(stroke: .down, velocity: 0.90, accent: true),
                2: StrumStep(stroke: .up, velocity: 0.60),
                4: StrumStep(stroke: .mute, velocity: 1.00, accent: true),
                6: StrumStep(stroke: .up, velocity: 0.65),
                8: StrumStep(stroke: .down, velocity: 0.75),
                10: StrumStep(stroke: .up, velocity: 0.65),
                12: StrumStep(stroke: .mute, velocity: 1.00, accent: true),
                14: StrumStep(stroke: .up, velocity: 0.70)
            ])
        ),
        StrumPattern(
            id: "ballad-arpeggio",
            name: "Duygusal Slow Ballad (6/8 Hissi)",
            steps: grid([
                0: StrumStep(stroke: .bass, velocity: 0.95, accent: true),
                2: StrumStep(stroke: .treble, velocity: 0.55),
                4: StrumStep(stroke: .treble, velocity: 0.60),
                6: StrumStep(stroke: .down, velocity: 0.70),
                8: StrumStep(stroke: .treble, velocity: 0.60),
                10: StrumStep(stroke: .treble, velocity: 0.55),
                12: StrumStep(stroke: .down, velocity: 0.80, accent: true),
                14: StrumStep(stroke: .up, velocity: 0.60)
            ])
        ),
        StrumPattern(
            id: "rumba-spanish",
            name: "Flamenko / Akustik Rumba Riff",
            steps: grid([
                0: StrumStep(stroke: .down, velocity: 1.00, accent: true),
                3: StrumStep(stroke: .up, velocity: 0.70),
                6: StrumStep(stroke: .mute, velocity: 0.90, accent: true),
                8: StrumStep(stroke: .down, velocity: 0.80),
                11: StrumStep(stroke: .up, velocity: 0.70),
                14: StrumStep(stroke: .mute, velocity: 0.90, accent: true)
            ])
        )
    ]

    public static func pattern(id: String) -> StrumPattern {
        return all.first(where: { $0.id == id }) ?? all[0]
    }
}

public enum StrumPatternLibrary {
    public static var all: [StrumPattern] { StrumPattern.all }

    public static func pattern(id: String) -> StrumPattern {
        StrumPattern.pattern(id: id)
    }
}

// MARK: - Davul Modları (5 Mod) & 6-Pad Davul Vuruşları (6 Hit)
public enum DrumMode: String, CaseIterable, Identifiable, Codable, Hashable {
    case full = "full"
    case cajonShaker = "cajon-shaker"
    case shakerOnly = "shaker-only"
    case flamenco = "flamenco"
    case mute = "mute"

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .full: return "Tam Akustik Set"
        case .cajonShaker: return "Kahon & Shaker"
        case .shakerOnly: return "Sadece Shaker"
        case .flamenco: return "Flamenko Palmasını & Kahon"
        case .mute: return "Sessiz (Davul Yok)"
        }
    }
}

public enum DrumHitType: String, CaseIterable, Identifiable, Codable, Hashable {
    case cajonBass = "cajon_bass"
    case cajonSlap = "cajon_slap"
    case shakerClosed = "shaker_closed"
    case shakerOpen = "shaker_open"
    case tambourine = "tambourine"
    case woodblock = "woodblock"

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .cajonBass: return "Kahon Bas"
        case .cajonSlap: return "Kahon Slap"
        case .shakerClosed: return "Kapalı Shaker"
        case .shakerOpen: return "Açık Shaker"
        case .tambourine: return "Tef (Zil)"
        case .woodblock: return "Tahta Blok"
        }
    }

    public var legacyKey: String {
        switch self {
        case .cajonBass: return "kick"
        case .cajonSlap: return "snare"
        case .shakerClosed: return "hihat_closed"
        case .shakerOpen: return "hihat_open"
        case .tambourine: return "tambourine"
        case .woodblock: return "wood"
        }
    }

    public var midiNote: Int {
        switch self {
        case .cajonBass: return 36
        case .cajonSlap: return 38
        case .shakerClosed: return 42
        case .shakerOpen: return 46
        case .tambourine: return 54
        case .woodblock: return 76
        }
    }

    public static func from(legacyKey: String) -> DrumHitType? {
        switch legacyKey.lowercased() {
        case "kick", "cajon_bass": return .cajonBass
        case "snare", "cajon_slap": return .cajonSlap
        case "shaker", "hihat_closed", "shaker_closed": return .shakerClosed
        case "hihat_open", "shaker_open": return .shakerOpen
        case "tambourine": return .tambourine
        case "wood", "woodblock": return .woodblock
        default: return nil
        }
    }
}

// MARK: - Şarkı Kısımları (Sections)
public struct SongSection: Identifiable, Hashable, Codable {
    public let id: String
    public var name: String
    public var chords: [String]
    public var patternId: String
    public var repeats: Int
    public var drumMode: String

    public init(
        id: String,
        name: String,
        chords: [String],
        patternId: String = "folk-rock",
        repeats: Int = 2,
        drumMode: String = "cajon-shaker"
    ) {
        self.id = id
        self.name = name
        self.chords = chords
        self.patternId = patternId
        self.repeats = repeats
        self.drumMode = drumMode
    }

    public var resolvedDrumMode: DrumMode {
        DrumMode(rawValue: drumMode) ?? .cajonShaker
    }
}

public struct DefaultSections {
    public static let initial: [SongSection] = [
        SongSection(id: "intro", name: "Giriş (Intro)", chords: ["Am", "Dm"], patternId: "fingerpicking-travis", repeats: 2, drumMode: "shaker-only"),
        SongSection(id: "verse", name: "Söz (Verse)", chords: ["Am", "Dm", "E", "Am"], patternId: "percussive-groove", repeats: 2, drumMode: "cajon-shaker"),
        SongSection(id: "chorus", name: "Nakarat (Chorus)", chords: ["F", "G", "C", "Am"], patternId: "folk-rock", repeats: 4, drumMode: "full"),
        SongSection(id: "solo", name: "Solo & Köprü", chords: ["Dm", "G", "E7", "Am"], patternId: "rumba-spanish", repeats: 2, drumMode: "flamenco")
    ]
}

// MARK: - Hit Akor Trendleri (12 Preset: 9 Türkçe + 3 Global)
public enum HitCategory: String, CaseIterable, Codable, Hashable {
    case turkish = "turkish"
    case global = "global"
}

public struct HitProgression: Identifiable, Hashable, Codable {
    public let id: String
    public let title: String
    public let artistHint: String
    public let category: HitCategory
    public let scaleRoot: String
    public let scaleId: String
    public let chords: [String]
    public let patternId: String
    public let bpm: Double
    public let description: String

    public init(
        id: String,
        title: String,
        artistHint: String,
        category: HitCategory,
        scaleRoot: String,
        scaleId: String,
        chords: [String],
        patternId: String,
        bpm: Double,
        description: String
    ) {
        self.id = id
        self.title = title
        self.artistHint = artistHint
        self.category = category
        self.scaleRoot = scaleRoot
        self.scaleId = scaleId
        self.chords = chords
        self.patternId = patternId
        self.bpm = bpm
        self.description = description
    }

    public static let all: [HitProgression] = [
        // 9 Turkish Presets
        HitProgression(
            id: "anadolu-rock-manco",
            title: "Anadolu Rock & Barış Manço Ruhu",
            artistHint: "Barış Manço, Moğollar, Fikret Kızılok",
            category: .turkish,
            scaleRoot: "A",
            scaleId: "minor",
            chords: ["Am", "Dm", "E", "Am"],
            patternId: "percussive-groove",
            bpm: 108,
            description: "Anadolu Rock müziğinin omurgası; derin minör hüznü ve güçlü akustik perküsyon."
        ),
        HitProgression(
            id: "duman-morveotesi",
            title: "Duman & 2000ler Türkçe Rock",
            artistHint: "Duman, Mor ve Ötesi, Şebnem Ferah",
            category: .turkish,
            scaleRoot: "E",
            scaleId: "minor",
            chords: ["Em", "C", "G", "D"],
            patternId: "folk-rock",
            bpm: 96,
            description: "Türkiye gençliğinin marşı haline gelen 4 akorlu efsanevi akustik rock yürüyüşü."
        ),
        HitProgression(
            id: "sezen-aksu-nihavend",
            title: "Sezen Aksu & Nihavend Balad",
            artistHint: "Sezen Aksu, Levent Yüksel, Sertab Erener",
            category: .turkish,
            scaleRoot: "A",
            scaleId: "minor",
            chords: ["Am", "Dm", "G", "C", "F", "Dm", "E7", "Am"],
            patternId: "ballad-arpeggio",
            bpm: 78,
            description: "Büyük aşk şarkılarının ve derin Türk pop hüzünlerinin 8 ölçülük klasik akor zinciri."
        ),
        HitProgression(
            id: "hicaz-anadolu-riff",
            title: "Hicaz / Akdeniz Akustik Riff",
            artistHint: "Haluk Levent, Zülfü Livaneli, Ahmet Kaya",
            category: .turkish,
            scaleRoot: "E",
            scaleId: "hicaz",
            chords: ["E", "F", "Dm", "E"],
            patternId: "rumba-spanish",
            bpm: 114,
            description: "Karakteristik Türk Hicaz makamı yürüyüşü; E ve F geçişlerindeki yakıcı doğu tınısı."
        ),
        HitProgression(
            id: "fikret-kizilok-akdeniz",
            title: "Fikret Kızılok / Akdeniz & Şiir",
            artistHint: "Fikret Kızılok, Bülent Ortaçgil",
            category: .turkish,
            scaleRoot: "A",
            scaleId: "minor",
            chords: ["Am", "Fmaj7", "Dm", "E7"],
            patternId: "fingerpicking-travis",
            bpm: 88,
            description: "Fmaj7 dokunuşuyla sofistike, şiirsel ve sıcak naylon telli İstanbul tınısı."
        ),
        HitProgression(
            id: "teoman-2000s",
            title: "Teoman & İstanbul Akustik",
            artistHint: "Teoman, Kaan Tangöze, Yüzyüzeyken Konuşuruz",
            category: .turkish,
            scaleRoot: "G",
            scaleId: "major",
            chords: ["G", "Cadd9", "Em7", "Dsus4"],
            patternId: "folk-rock",
            bpm: 92,
            description: "Açık tellerin (Cadd9, Em7) rezonansıyla meşhur modern Türk indie ve akustik sound."
        ),
        HitProgression(
            id: "yeni-turku-ege",
            title: "Yeni Türkü / Ege & Akdeniz Rüzgarı",
            artistHint: "Yeni Türkü, Ezginin Günlüğü",
            category: .turkish,
            scaleRoot: "D",
            scaleId: "minor",
            chords: ["Dm", "Gm", "A7", "Dm"],
            patternId: "rumba-spanish",
            bpm: 120,
            description: "Coşkulu ritim, sıcak Akdeniz rüzgarı ve parmakla çalınan melankolik ritim."
        ),
        HitProgression(
            id: "indie-trap-pop",
            title: "Madrigal / Dolu Kadehi (Modern Indie Pop)",
            artistHint: "Madrigal, Dolu Kadehi Ters Tut, Köfn",
            category: .turkish,
            scaleRoot: "A",
            scaleId: "minor",
            chords: ["Fmaj7", "G", "Em7", "Am7"],
            patternId: "percussive-groove",
            bpm: 102,
            description: "Son yıllarda Türkiye listelerini kasıp kavuran modern yumuşak akustik indie yürüyüşü."
        ),
        HitProgression(
            id: "turkce-pop-90lar",
            title: "90lar Türkçe Pop Altın Çağı",
            artistHint: "Tarkan, Kenan Doğulu, Mustafa Sandal",
            category: .turkish,
            scaleRoot: "A",
            scaleId: "minor",
            chords: ["Am", "F", "Dm", "E7"],
            patternId: "percussive-groove",
            bpm: 116,
            description: "90ların enerjik, melodik ve akılda kalıcı hit pop şarkı matematiği."
        ),

        // 3 Global Presets
        HitProgression(
            id: "flamenco-andalusia",
            title: "Endülüs & Akdeniz Tutkusu",
            artistHint: "Gipsy Kings, Al Di Meola, Paco de Lucia",
            category: .global,
            scaleRoot: "A",
            scaleId: "minor",
            chords: ["Am", "G", "F", "E7"],
            patternId: "rumba-spanish",
            bpm: 118,
            description: "Klasik Endülüs kadansı; i - VII - VI - V basamaklarıyla ateşi yükselten rumba ritmi."
        ),
        HitProgression(
            id: "wonderwall-style",
            title: "Wonderwall (Oasis Style)",
            artistHint: "Oasis, Britpop",
            category: .global,
            scaleRoot: "E",
            scaleId: "minor",
            chords: ["Em7", "G", "Dsus4", "A7"],
            patternId: "folk-rock",
            bpm: 90,
            description: "1. ve 2. tellerin sabit kaldığı efsanevi açık tel akustik marşı."
        ),
        HitProgression(
            id: "pop-hit-axis",
            title: "Global Pop Hit (I - V - vi - IV)",
            artistHint: "Ed Sheeran, Taylor Swift",
            category: .global,
            scaleRoot: "C",
            scaleId: "major",
            chords: ["C", "G", "Am", "F"],
            patternId: "folk-rock",
            bpm: 104,
            description: "Dünya pop listelerinin en çok dinlenen 4 akorlu şablonu."
        )
    ]

    public static func random(excludingId: String? = nil) -> HitProgression {
        if let excludingId = excludingId {
            let candidates = all.filter { $0.id != excludingId }
            if let picked = candidates.randomElement() {
                return picked
            }
        }
        return all.randomElement()!
    }
}

// MARK: - Solo Looper & Proje Kalıcılığı (Persistence)
public struct SoloLoopEvent: Identifiable, Hashable, Codable {
    public let id: UUID
    public var midi: Int
    public var sectionIndex: Int
    public var barIndex: Int
    public var step: Int
    public var velocity: Double
    public var instrument: AcousticInstrumentType

    public init(
        id: UUID = UUID(),
        midi: Int,
        sectionIndex: Int,
        barIndex: Int,
        step: Int,
        velocity: Double = 0.9,
        instrument: AcousticInstrumentType = .violin
    ) {
        self.id = id
        self.midi = midi
        self.sectionIndex = sectionIndex
        self.barIndex = barIndex
        self.step = step
        self.velocity = velocity
        self.instrument = instrument
    }
}

public struct SongProject: Codable, Equatable {
    public var version: Int
    public var updatedAt: Date
    public var sections: [SongSection]
    public var lyrics: [String: String]
    public var bpm: Double
    public var swing: Double
    public var scaleRoot: String
    public var scaleId: String
    public var chordInstrument: AcousticInstrumentType
    public var soloInstrument: AcousticInstrumentType
    public var bodyPreset: GuitarBodyPreset
    public var spaceDesignerPreset: SpaceDesignerPreset
    public var warmth: Double
    public var airSheen: Double
    public var pickAttack: Double
    public var spaceReverbWet: Double
    public var vocalTakeFileName: String?
    public var soloLoopEvents: [SoloLoopEvent]

    public init(
        version: Int = 1,
        updatedAt: Date = Date(),
        sections: [SongSection] = DefaultSections.initial,
        lyrics: [String: String] = ["intro": "", "verse": "", "chorus": "", "solo": ""],
        bpm: Double = 100.0,
        swing: Double = 0.0,
        scaleRoot: String = "A",
        scaleId: String = "minor",
        chordInstrument: AcousticInstrumentType = .nylon,
        soloInstrument: AcousticInstrumentType = .violin,
        bodyPreset: GuitarBodyPreset = .dreadnought,
        spaceDesignerPreset: SpaceDesignerPreset = .warmWood,
        warmth: Double = 0.65,
        airSheen: Double = 0.75,
        pickAttack: Double = 0.50,
        spaceReverbWet: Double = 0.30,
        vocalTakeFileName: String? = nil,
        soloLoopEvents: [SoloLoopEvent] = []
    ) {
        self.version = version
        self.updatedAt = Date(timeIntervalSince1970: (updatedAt.timeIntervalSince1970 * 1000.0).rounded() / 1000.0)
        self.sections = sections
        self.lyrics = lyrics
        self.bpm = bpm
        self.swing = swing
        self.scaleRoot = scaleRoot
        self.scaleId = scaleId
        self.chordInstrument = chordInstrument
        self.soloInstrument = soloInstrument
        self.bodyPreset = bodyPreset
        self.spaceDesignerPreset = spaceDesignerPreset
        self.warmth = warmth
        self.airSheen = airSheen
        self.pickAttack = pickAttack
        self.spaceReverbWet = spaceReverbWet
        self.vocalTakeFileName = vocalTakeFileName
        self.soloLoopEvents = soloLoopEvents
    }
}

public enum SongProjectStoreError: Error, LocalizedError {
    case invalidProjectName

    public var errorDescription: String? {
        switch self {
        case .invalidProjectName:
            return "Geçersiz proje adı."
        }
    }
}

public actor SongProjectStore {
    public static let shared = SongProjectStore()

    private let baseDirectory: URL
    private let fileManager: FileManager

    public init(baseDirectory: URL? = nil, fileManager: FileManager = .default) {
        self.fileManager = fileManager
        if let baseDirectory = baseDirectory {
            self.baseDirectory = baseDirectory
        } else {
            let appSupport = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
                ?? fileManager.temporaryDirectory
            self.baseDirectory = appSupport
                .appendingPathComponent("AcousticGrooveBox", isDirectory: true)
                .appendingPathComponent("Projects", isDirectory: true)
        }
    }

    private func makeEncoder() -> JSONEncoder {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .custom { date, encoder in
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            var container = encoder.singleValueContainer()
            try container.encode(formatter.string(from: date))
        }
        return encoder
    }

    private func makeDecoder() -> JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let dateString = try container.decode(String.self)

            let fractionalFormatter = ISO8601DateFormatter()
            fractionalFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = fractionalFormatter.date(from: dateString) {
                return date
            }

            let standardFormatter = ISO8601DateFormatter()
            standardFormatter.formatOptions = [.withInternetDateTime]
            if let date = standardFormatter.date(from: dateString) {
                return date
            }

            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Invalid ISO8601 date string: \(dateString)"
            )
        }
        return decoder
    }

    private func sanitizedFileURL(named name: String) throws -> URL {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty,
              !trimmed.unicodeScalars.contains(where: { CharacterSet.controlCharacters.contains($0) }),
              !trimmed.contains("/"),
              !trimmed.contains("\\"),
              !trimmed.contains(":") else {
            throw SongProjectStoreError.invalidProjectName
        }

        let stem: String
        if trimmed.lowercased().hasSuffix(".json") {
            stem = String(trimmed.dropLast(5)).trimmingCharacters(in: .whitespacesAndNewlines)
        } else {
            stem = trimmed
        }

        guard !stem.isEmpty,
              stem != ".",
              stem != "..",
              !stem.contains(".."),
              !stem.hasPrefix(".") else {
            throw SongProjectStoreError.invalidProjectName
        }

        let url = baseDirectory.appendingPathComponent("\(stem).json", isDirectory: false)
        guard url.standardizedFileURL.deletingLastPathComponent().path == baseDirectory.standardizedFileURL.path else {
            throw SongProjectStoreError.invalidProjectName
        }
        return url
    }

    public func exportJSONData(_ project: SongProject) throws -> Data {
        return try makeEncoder().encode(project)
    }

    public func importJSONData(_ data: Data) throws -> SongProject {
        return try makeDecoder().decode(SongProject.self, from: data)
    }

    @discardableResult
    public func save(_ project: SongProject, named name: String) throws -> URL {
        try fileManager.createDirectory(at: baseDirectory, withIntermediateDirectories: true)
        let fileURL = try sanitizedFileURL(named: name)
        let data = try exportJSONData(project)
        try data.write(to: fileURL, options: .atomic)
        return fileURL
    }

    public func load(named name: String) throws -> SongProject? {
        let fileURL = try sanitizedFileURL(named: name)
        guard fileManager.fileExists(atPath: fileURL.path) else {
            return nil
        }
        let data = try Data(contentsOf: fileURL)
        return try importJSONData(data)
    }

    public func listProjects() throws -> [String] {
        guard fileManager.fileExists(atPath: baseDirectory.path) else {
            return []
        }
        let urls = try fileManager.contentsOfDirectory(
            at: baseDirectory,
            includingPropertiesForKeys: nil,
            options: [.skipsHiddenFiles]
        )
        return urls
            .filter { $0.pathExtension.lowercased() == "json" }
            .map { $0.deletingPathExtension().lastPathComponent }
            .sorted()
    }

    public func delete(named name: String) throws {
        let fileURL = try sanitizedFileURL(named: name)
        if fileManager.fileExists(atPath: fileURL.path) {
            try fileManager.removeItem(at: fileURL)
        }
    }
}
