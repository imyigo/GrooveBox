import XCTest
import AcousticGrooveBox

final class MusicModelsTests: XCTestCase {

    // MARK: - 1. Instruments, Body Presets, Space Designer Presets, Drum Modes & Hits

    func testAcousticInstrumentTypesCountAndMetadata() {
        XCTAssertEqual(AcousticInstrumentType.allCases.count, 9)
        let expected: [AcousticInstrumentType] = [
            .nylon, .steel, .piano, .violin, .clarinet, .altoSax, .harmonica, .bass, .drums
        ]
        XCTAssertEqual(AcousticInstrumentType.allCases, expected)

        for instrument in AcousticInstrumentType.allCases {
            XCTAssertFalse(instrument.id.isEmpty)
            XCTAssertEqual(instrument.id, instrument.rawValue)
            XCTAssertFalse(instrument.name.isEmpty)
            XCTAssertEqual(instrument.displayName, instrument.name)
            XCTAssertFalse(instrument.icon.isEmpty)
            XCTAssertTrue((2...4).contains(instrument.defaultOctave))
        }
        XCTAssertEqual(AcousticInstrumentType.bass.defaultOctave, 2)
        XCTAssertEqual(AcousticInstrumentType.violin.defaultOctave, 4)
    }

    func testGuitarBodyPresets() {
        XCTAssertEqual(GuitarBodyPreset.allCases.count, 4)
        for preset in GuitarBodyPreset.allCases {
            XCTAssertFalse(preset.displayName.isEmpty)
            XCTAssertTrue((0.0...1.0).contains(preset.brightness))
            XCTAssertTrue((0.0...1.0).contains(preset.bodyResonance))
            XCTAssertTrue((0.0...1.0).contains(preset.reverbWet))
            XCTAssertTrue((0.0...1.0).contains(preset.chorusWet))
            XCTAssertGreaterThan(preset.strumSpeedMs, 0.0)
        }
        XCTAssertGreaterThan(GuitarBodyPreset.twelveStringShimmer.chorusWet, 0.0)
    }

    func testSpaceDesignerPresets() {
        XCTAssertEqual(SpaceDesignerPreset.allCases.count, 4)
        XCTAssertEqual(SpaceDesignerPreset.dryRoom.displayName, "Dry Studio")
        XCTAssertEqual(SpaceDesignerPreset.warmWood.displayName, "Warm Wood")
        XCTAssertEqual(SpaceDesignerPreset.concertHall.displayName, "Concert Hall")
        XCTAssertEqual(SpaceDesignerPreset.plate.displayName, "Plate")

        for preset in SpaceDesignerPreset.allCases {
            XCTAssertTrue((0.0...1.0).contains(preset.defaultWet))
            XCTAssertGreaterThan(preset.durationSeconds, 0.0)
            XCTAssertGreaterThan(preset.decaySeconds, 0.0)
            XCTAssertGreaterThanOrEqual(preset.preDelayMs, 0.0)
            XCTAssertGreaterThan(preset.highShelfCutHz, 1000.0)
        }
        XCTAssertLessThan(SpaceDesignerPreset.dryRoom.durationSeconds, SpaceDesignerPreset.concertHall.durationSeconds)
    }

    func testDrumModesAndDrumHitTypes() {
        XCTAssertEqual(DrumMode.allCases.count, 5)
        XCTAssertEqual(
            Set(DrumMode.allCases.map(\.rawValue)),
            ["full", "cajon-shaker", "shaker-only", "flamenco", "mute"]
        )

        XCTAssertEqual(DrumHitType.allCases.count, 6)
        let expectedHits: [DrumHitType] = [
            .cajonBass, .cajonSlap, .shakerClosed, .shakerOpen, .tambourine, .woodblock
        ]
        XCTAssertEqual(DrumHitType.allCases, expectedHits)
        XCTAssertEqual(Set(DrumHitType.allCases.map(\.midiNote)).count, 6)
        XCTAssertEqual(Set(DrumHitType.allCases.map(\.legacyKey)).count, 6)

        for hit in DrumHitType.allCases {
            XCTAssertFalse(hit.displayName.isEmpty)
            XCTAssertTrue((0...127).contains(hit.midiNote))
            XCTAssertEqual(DrumHitType.from(legacyKey: hit.legacyKey), hit)
            XCTAssertEqual(DrumHitType.from(legacyKey: hit.id), hit)
        }
        XCTAssertEqual(DrumHitType.from(legacyKey: "shaker"), .shakerClosed)
    }

    // MARK: - 2. Scales, Makams & Diatonic Chords

    func testScaleLibraryDefinitionsAndScaleNotes() {
        XCTAssertEqual(ScaleLibrary.scales.count, 6)
        let expectedIds = ["minor", "hicaz", "kurdi", "pentatonic-minor", "major", "dorian"]
        XCTAssertEqual(ScaleLibrary.scales.map(\.id), expectedIds)
        XCTAssertEqual(ScaleLibrary.noteNames.count, 12)
        XCTAssertEqual(ScaleLibrary.canonicalChordRootNames.count, 12)

        for scale in ScaleLibrary.scales {
            let notes = ScaleLibrary.getScaleNotes(root: "A", scaleId: scale.id, baseOctave: 3)
            XCTAssertEqual(notes.count, scale.intervals.count * 2)
            for idx in 1..<notes.count {
                XCTAssertGreaterThan(notes[idx].midi, notes[idx - 1].midi)
            }
            for note in notes {
                XCTAssertTrue((0...127).contains(note.midi))
                let pc = (note.midi - ScaleLibrary.semitone(for: "A") + 120) % 12
                XCTAssertTrue(scale.intervals.contains(pc))
            }
        }
    }

    func testDiatonicChordsAcrossAll12RootsAnd6Scales() {
        let testRoots = ScaleLibrary.noteNames + ["Db", "Eb", "Gb", "Ab", "Bb"]
        for root in testRoots {
            for scale in ScaleLibrary.scales {
                let chordIds = ScaleLibrary.getDiatonicChords(root: root, scaleId: scale.id)
                let infos = ScaleLibrary.getDiatonicChordInfos(root: root, scaleId: scale.id)

                XCTAssertEqual(chordIds.count, 7, "Expected 7 diatonic chords for \(root) \(scale.id)")
                XCTAssertEqual(infos.map(\.chordId), chordIds)

                for chordId in chordIds {
                    let resolved = ChordLibrary.chordsByName[chordId]
                    XCTAssertNotNil(resolved, "Missing chord '\(chordId)' in ChordLibrary for \(root) \(scale.id)")
                    XCTAssertEqual(ChordLibrary.chordNamed(chordId).name, chordId)
                }

                // Degree 1 chord root should match requested root pitch class
                let tonicChord = ChordLibrary.chordNamed(chordIds[0])
                XCTAssertEqual(tonicChord.rootPitchClass, ScaleLibrary.semitone(for: root))
            }
        }
    }

    // MARK: - 3. ChordLibrary (55 Chords, Voicings, Aliases, Fallback)

    func testChordLibraryCountAndRequiredChords() {
        XCTAssertEqual(ChordLibrary.chords.count, 55)
        XCTAssertEqual(ChordLibrary.chordsByName.count, 55)

        let required27Plus = [
            "C", "G", "D", "A", "E", "F",
            "Am", "Em", "Dm", "Bm", "F#m",
            "G7", "E7", "A7", "B7", "D7",
            "Bb", "Gm", "Cm", "Bdim",
            "Am7", "Dm7", "Cmaj7", "Cadd9", "Dsus4", "Em7", "Fmaj7",
            "Eb", "Ab", "Fm"
        ]
        for name in required27Plus {
            let chord = ChordLibrary.chordsByName[name]
            XCTAssertNotNil(chord, "Required chord \(name) missing from ChordLibrary")
            XCTAssertEqual(ChordLibrary.chordNamed(name).name, name)
        }
    }

    func testAll55ChordVoicingsMatchPitchClassesAndFrequencies() {
        for chord in ChordLibrary.chords {
            XCTAssertEqual(chord.frets.count, 6, "\(chord.name) must have 6 string frets")
            XCTAssertEqual(chord.midiNotes.count, 6)
            XCTAssertFalse(chord.soundingMidiNotes.isEmpty)

            let soundingPitchClasses = Set(chord.soundingMidiNotes.map { $0 % 12 })
            let declaredPitchClasses = Set(chord.pitchClasses)
            XCTAssertEqual(
                soundingPitchClasses,
                declaredPitchClasses,
                "Fret voicing pitch classes mismatch for \(chord.name)"
            )
            XCTAssertTrue(declaredPitchClasses.contains(chord.rootPitchClass))
        }

        XCTAssertEqual(ChordLibrary.fretFrequency(stringIndex: 0, fret: 0), 82.41, accuracy: 0.01)
        XCTAssertEqual(ChordLibrary.fretFrequency(stringIndex: 1, fret: 0), 110.00, accuracy: 0.01)
        XCTAssertEqual(ChordLibrary.fretFrequency(stringIndex: 1, fret: 12), 220.00, accuracy: 0.01)
        XCTAssertEqual(ChordLibrary.fretFrequency(stringIndex: 0, fret: -1), 0.0)
        XCTAssertEqual(ChordLibrary.fretFrequency(stringIndex: 6, fret: 0), 0.0)
        XCTAssertEqual(ChordLibrary.midiToFrequency(69), 440.0, accuracy: 0.001)
    }

    func testChordNamedEnharmonicAliasesAndFallback() {
        XCTAssertEqual(ChordLibrary.chordNamed("Db").name, "C#")
        XCTAssertEqual(ChordLibrary.chordNamed("D#").name, "Eb")
        XCTAssertEqual(ChordLibrary.chordNamed("Gb").name, "F#")
        XCTAssertEqual(ChordLibrary.chordNamed("G#").name, "Ab")
        XCTAssertEqual(ChordLibrary.chordNamed("A#").name, "Bb")
        XCTAssertEqual(ChordLibrary.chordNamed("G#m").name, "Abm")
        XCTAssertEqual(ChordLibrary.chordNamed("A#7").name, "Bb7")
        XCTAssertEqual(ChordLibrary.chordNamed("D#dim").name, "Ebdim")
        XCTAssertEqual(ChordLibrary.chordNamed("Fsm").name, "F#m")
        XCTAssertEqual(ChordLibrary.chordNamed("NON_EXISTENT_CHORD").name, "Am")
    }

    // MARK: - 4. Zero-Error Solo Snapping (snapMidiToChord)

    func testSnapMidiToChordAllModesAndScales() {
        let am = ChordLibrary.chordNamed("Am") // A=9, C=0, E=4
        let cMajor = ChordLibrary.chordNamed("C") // C=0, E=4, G=7

        // .chordTones: octave preservation + downward tie-break
        // D4 (62, pc=2) is equidistant (2 semitones) from C4 (60) and E4 (64) -> picks downward C4 (60)
        XCTAssertEqual(ChordLibrary.snapMidiToChord(midi: 62, chord: am, mode: .chordTones), 60)
        // Exact chord tone preserved
        XCTAssertEqual(ChordLibrary.snapMidiToChord(midi: 69, chord: am, mode: .chordTones), 69)

        // All MIDI inputs snap to valid chord tones in .chordTones
        for m in 48...72 {
            let snapped = ChordLibrary.snapMidiToChord(midi: m, chord: am, mode: .chordTones)
            XCTAssertTrue(am.pitchClasses.contains(snapped % 12))
        }

        // .smartLick: allows 7th (G=7) and 9th (B=11) on Am in A minor
        XCTAssertEqual(ChordLibrary.snapMidiToChord(midi: 67, chord: am, mode: .smartLick, scaleRoot: "A", scaleId: "minor"), 67)
        XCTAssertEqual(ChordLibrary.snapMidiToChord(midi: 71, chord: am, mode: .smartLick, scaleRoot: "A", scaleId: "minor"), 71)

        // .pentatonic: minor chord uses minor pentatonic [0,3,5,7,10]; major chord uses major pentatonic [0,2,4,7,9]
        // On Am: D4(62, pc=2) -> in Am pentatonic (A, C, D, E, G), D is valid so preserved!
        XCTAssertEqual(ChordLibrary.snapMidiToChord(midi: 62, chord: am, mode: .pentatonic), 62)
        // On C: F4(65, pc=5) is not in C major pentatonic (C, D, E, G, A) -> snaps to E4(64)
        XCTAssertEqual(ChordLibrary.snapMidiToChord(midi: 65, chord: cMajor, mode: .pentatonic), 64)

        // .freeScale across all 6 scales/makams
        for scale in ScaleLibrary.scales {
            let rootSemi = ScaleLibrary.semitone(for: "E")
            let allowedPCs = Set(scale.intervals.map { (rootSemi + $0) % 12 })
            for midi in 48...72 {
                let snapped = ChordLibrary.snapMidiToChord(
                    midi: midi,
                    chord: ChordLibrary.chordNamed("E"),
                    mode: .freeScale,
                    scaleRoot: "E",
                    scaleId: scale.id
                )
                XCTAssertTrue(allowedPCs.contains(snapped % 12), "Snapped note \(snapped) not in \(scale.id)")
            }
        }
    }

    func testSnapMidiToChordBoundaryClamping() {
        let cSharp = ChordLibrary.chordNamed("C#") // pc = 1, 5, 8 (C#0 = 1, C#10 = 121, G#10 = 128 -> invalid >127)
        for mode in SoloHarmonyMode.allCases {
            for extreme in [-50, -1, 0, 1, 126, 127, 200] {
                let snapped = ChordLibrary.snapMidiToChord(
                    midi: extreme,
                    chord: cSharp,
                    mode: mode,
                    scaleRoot: "C#",
                    scaleId: "hicaz"
                )
                XCTAssertTrue((0...127).contains(snapped), "Out of MIDI bounds for \(extreme) in \(mode)")
            }
        }
    }

    // MARK: - 5. 12 Hit Progressions & Non-Repeating Zar At

    func testHitProgressionsAll12AndZarAt() {
        XCTAssertEqual(HitProgression.all.count, 12)
        XCTAssertEqual(Set(HitProgression.all.map(\.id)).count, 12)
        XCTAssertEqual(HitProgression.all.filter { $0.category == .turkish }.count, 9)
        XCTAssertEqual(HitProgression.all.filter { $0.category == .global }.count, 3)

        let validScaleIds = Set(ScaleLibrary.scales.map(\.id))
        let validPatternIds = Set(StrumPattern.all.map(\.id))

        for prog in HitProgression.all {
            XCTAssertFalse(prog.chords.isEmpty)
            XCTAssertTrue((50.0...180.0).contains(prog.bpm))
            XCTAssertTrue(validScaleIds.contains(prog.scaleId), "Invalid scaleId in \(prog.id)")
            XCTAssertTrue(validPatternIds.contains(prog.patternId), "Invalid patternId in \(prog.id)")
            for chordName in prog.chords {
                XCTAssertNotNil(ChordLibrary.chordsByName[chordName], "Missing chord \(chordName) in \(prog.id)")
            }
        }

        // Zar At 0-arg compatibility call
        let anyRandom = HitProgression.random()
        XCTAssertTrue(HitProgression.all.contains(anyRandom))

        // Zar At non-repeating excludingId check across all 12 presets
        for prog in HitProgression.all {
            for _ in 0..<25 {
                let picked = HitProgression.random(excludingId: prog.id)
                XCTAssertNotEqual(picked.id, prog.id, "Zar At repeated excluded preset \(prog.id)")
            }
        }
    }

    // MARK: - 6. Strum Patterns & Song Sections

    func testStrumPatternsAndDefaultSections() {
        XCTAssertEqual(StrumPattern.all.count, 5)
        let expectedPatternIds = [
            "folk-rock",
            "fingerpicking-travis",
            "percussive-groove",
            "ballad-arpeggio",
            "rumba-spanish"
        ]
        XCTAssertEqual(StrumPattern.all.map(\.id), expectedPatternIds)

        for pattern in StrumPattern.all {
            XCTAssertEqual(pattern.steps.count, 16)
            XCTAssertTrue(pattern.steps.contains(where: { $0.stroke != .rest }))
            for step in pattern.steps {
                XCTAssertTrue((0.0...1.0).contains(step.velocity))
            }
            XCTAssertEqual(StrumPattern.pattern(id: pattern.id), pattern)
        }
        XCTAssertEqual(StrumPattern.pattern(id: "unknown-pattern").id, "folk-rock")

        // Compatibility 4-arg SongSection init
        let legacySection = SongSection(id: "test", name: "Test", chords: ["Am", "G"], repeats: 3)
        XCTAssertEqual(legacySection.patternId, "folk-rock")
        XCTAssertEqual(legacySection.drumMode, "cajon-shaker")
        XCTAssertEqual(legacySection.resolvedDrumMode, .cajonShaker)

        // DefaultSections.initial
        XCTAssertEqual(DefaultSections.initial.count, 4)
        XCTAssertEqual(DefaultSections.initial.map(\.id), ["intro", "verse", "chorus", "solo"])
        for sec in DefaultSections.initial {
            XCTAssertEqual(StrumPattern.pattern(id: sec.patternId).id, sec.patternId)
            XCTAssertNotNil(DrumMode(rawValue: sec.drumMode))
            for ch in sec.chords {
                XCTAssertNotNil(ChordLibrary.chordsByName[ch])
            }
        }
    }

    // MARK: - 7. SongProject JSON Round-Trip & SongProjectStore

    func testSongProjectJSONRoundTripAndStorePersistence() async throws {
        let tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("AcousticGrooveBoxTests_\(UUID().uuidString)", isDirectory: true)
        defer { try? FileManager.default.removeItem(at: tempDir) }

        let store = SongProjectStore(baseDirectory: tempDir)

        let event = SoloLoopEvent(
            midi: 64,
            sectionIndex: 1,
            barIndex: 2,
            step: 8,
            velocity: 0.85,
            instrument: .clarinet
        )
        let project = SongProject(
            version: 1,
            updatedAt: Date(timeIntervalSince1970: 1_700_000_000),
            sections: DefaultSections.initial,
            lyrics: ["intro": "[Am] Sessiz gece", "verse": "[Dm] Rüzgar eser"],
            bpm: 112.0,
            swing: 0.15,
            scaleRoot: "E",
            scaleId: "hicaz",
            chordInstrument: .steel,
            soloInstrument: .altoSax,
            bodyPreset: .twelveStringShimmer,
            spaceDesignerPreset: .concertHall,
            warmth: 0.72,
            airSheen: 0.88,
            pickAttack: 0.64,
            spaceReverbWet: 0.42,
            vocalTakeFileName: "vocal_take_01.caf",
            soloLoopEvents: [event]
        )

        // Missing load returns nil
        let missing = try await store.load(named: "nonexistent")
        XCTAssertNil(missing)

        // Save, list, load round-trip
        let savedURL = try await store.save(project, named: "AnadoluHit")
        XCTAssertTrue(FileManager.default.fileExists(atPath: savedURL.path))

        let list = try await store.listProjects()
        XCTAssertEqual(list, ["AnadoluHit"])

        let loaded = try await store.load(named: "AnadoluHit")
        XCTAssertEqual(loaded, project)

        // Corrupt JSON throws error
        let corruptURL = tempDir.appendingPathComponent("corrupt.json")
        try Data("{ invalid json".utf8).write(to: corruptURL)
        do {
            _ = try await store.load(named: "corrupt")
            XCTFail("Expected corrupt JSON to throw DecodingError")
        } catch {
            // Expected decoding failure
        }

        // Invalid path traversal name throws
        do {
            _ = try await store.save(project, named: "../escape")
            XCTFail("Expected invalid project name error")
        } catch {
            // Expected SongProjectStoreError.invalidProjectName
        }

        // Delete removes project
        try await store.delete(named: "AnadoluHit")
        let afterDelete = try await store.load(named: "AnadoluHit")
        XCTAssertNil(afterDelete)
    }

    // MARK: - 8. Opaque-Box Public API Visibility Verification

    func testPublicAPIOpaqueBoxVisibility() async throws {
        // Verifies import AcousticGrooveBox (without @testable) can construct and inspect all contract types
        let scale = MusicalScale(id: "test", name: "Test", category: "western", intervals: [0, 2, 4], description: "desc", recommendedChords: ["C"])
        XCTAssertEqual(scale.id, "test")
        XCTAssertEqual(ScaleLibrary.all.count, 6)
        XCTAssertEqual(ScaleLibrary.scale(id: "unknown").id, "minor")

        let info = DiatonicChordInfo(id: "1-C", degree: 1, roman: "I", chordId: "C", displayName: "C I", role: "Tonik")
        XCTAssertEqual(info.degree, 1)

        let customChord = GuitarChord(id: "C", name: "C", displayName: "C", root: "C", frets: [-1, 3, 2, 0, 1, 0], pitchClasses: [0, 4, 7])
        XCTAssertEqual(customChord.rootPitchClass, 0)
        XCTAssertEqual(ChordLibrary.standardTuningFreqs.count, 6)
        XCTAssertEqual(ChordLibrary.stringBaseMidi.count, 6)

        let step = StrumStep(stroke: .down, velocity: 0.9, accent: true)
        let pattern = StrumPattern(id: "p", name: "P", steps: [step])
        XCTAssertEqual(pattern.steps.count, 1)
        XCTAssertEqual(StrumPatternLibrary.all.count, 5)
        XCTAssertEqual(StrumPatternLibrary.pattern(id: "rumba-spanish").id, "rumba-spanish")

        let prog = HitProgression(
            id: "custom",
            title: "Custom",
            artistHint: "Artist",
            category: .turkish,
            scaleRoot: "A",
            scaleId: "minor",
            chords: ["Am"],
            patternId: "folk-rock",
            bpm: 100,
            description: "Desc"
        )
        XCTAssertEqual(prog.bpm, 100)

        let project = SongProject()
        let jsonData = try await SongProjectStore.shared.exportJSONData(project)
        let decoded = try await SongProjectStore.shared.importJSONData(jsonData)
        XCTAssertEqual(decoded.version, 1)
    }

    // MARK: - 9. Regression Tests (Iteration 2 Fixes)

    func testSmartLickInEHicazStaysStrictlyWithinScalePitchClasses() {
        // E hicaz: E(4), F(5), G#(8), A(9), B(11), C(0), D(2)
        let eHicazPitchClasses: Set<Int> = [0, 2, 4, 5, 8, 9, 11]
        let fChord = ChordLibrary.chordNamed("F")

        var observedPitchClasses: Set<Int> = []
        for midi in 36...84 {
            let snapped = ChordLibrary.snapMidiToChord(
                midi: midi,
                chord: fChord,
                mode: .smartLick,
                scaleRoot: "E",
                scaleId: "hicaz"
            )
            let pc = snapped % 12
            observedPitchClasses.insert(pc)
            XCTAssertTrue(
                eHicazPitchClasses.contains(pc),
                "Out-of-scale pitch class \(pc) emitted for F in E hicaz .smartLick"
            )
        }
        // Must not inject D# (3) or G (7)
        XCTAssertFalse(observedPitchClasses.contains(3))
        XCTAssertFalse(observedPitchClasses.contains(7))
        XCTAssertEqual(observedPitchClasses, Set(fChord.pitchClasses))
    }

    func testPentatonicDiminishedAndSus4HaveNoSemitoneClashes() {
        let testCases: [(name: String, expectedIncluded: Set<Int>, expectedExcluded: Set<Int>)] = [
            // Bdim = [11, 2, 5]; pentatonic [0,3,6,8,10] -> {11(B), 2(D), 5(F), 7(G), 9(A)}
            ("Bdim", [11, 2, 5, 7, 9], [4, 6]),
            // F#dim = [6, 9, 0]; pentatonic [0,3,6,8,10] -> {6(F#), 9(A), 0(C), 2(D), 4(E)}
            ("F#dim", [6, 9, 0, 2, 4], [1, 11]),
            // Dsus4 = [2, 7, 9]; pentatonic [0,2,5,7,10] -> {2(D), 4(E), 7(G), 9(A), 0(C)}
            ("Dsus4", [2, 7, 9, 4, 0], [6])
        ]

        for testCase in testCases {
            let chord = ChordLibrary.chordNamed(testCase.name)
            var observedPCs: Set<Int> = []
            for midi in 48...71 {
                let snapped = ChordLibrary.snapMidiToChord(midi: midi, chord: chord, mode: .pentatonic)
                let pc = snapped % 12
                observedPCs.insert(pc)

                for chordPC in chord.pitchClasses {
                    let circularDist = min((pc - chordPC + 12) % 12, (chordPC - pc + 12) % 12)
                    XCTAssertNotEqual(
                        circularDist,
                        1,
                        "\(testCase.name) .pentatonic produced ±1 semitone clash: pc \(pc) vs chord tone \(chordPC)"
                    )
                }
            }
            for included in testCase.expectedIncluded {
                XCTAssertTrue(observedPCs.contains(included), "\(testCase.name) .pentatonic missing pc \(included)")
            }
            for excluded in testCase.expectedExcluded {
                XCTAssertFalse(observedPCs.contains(excluded), "\(testCase.name) .pentatonic should exclude pc \(excluded)")
            }
        }
    }

    func testSongProjectDefaultDateRoundTripAndWholeSecondBackwardCompatibility() async throws {
        let tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("AcousticGrooveBoxDateTests_\(UUID().uuidString)", isDirectory: true)
        defer { try? FileManager.default.removeItem(at: tempDir) }

        let store = SongProjectStore(baseDirectory: tempDir)
        let project = SongProject() // uses default Date() with sub-second precision

        let exported = try await store.exportJSONData(project)
        let imported = try await store.importJSONData(exported)
        XCTAssertEqual(imported, project)

        try await store.save(project, named: "FractionalRoundTrip")
        let loaded = try await store.load(named: "FractionalRoundTrip")
        XCTAssertEqual(loaded, project)

        // Backward-compatible decoding of whole-second ISO8601 JSON (without fractional seconds)
        let jsonString = try XCTUnwrap(String(data: exported, encoding: .utf8))
        let regex = try NSRegularExpression(pattern: #"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.\d+Z"#)
        let wholeSecondString = regex.stringByReplacingMatches(
            in: jsonString,
            range: NSRange(jsonString.startIndex..., in: jsonString),
            withTemplate: "$1Z"
        )
        XCTAssertNotEqual(wholeSecondString, jsonString)
        let legacyData = Data(wholeSecondString.utf8)
        let decodedLegacy = try await store.importJSONData(legacyData)
        XCTAssertEqual(decodedLegacy.bpm, project.bpm)
        XCTAssertEqual(decodedLegacy.sections, project.sections)
    }

    func testSongProjectStoreSanitizationRejectsInvalidNamesAndNormalizesJSONSuffix() async throws {
        let tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("AcousticGrooveBoxSanitizeTests_\(UUID().uuidString)", isDirectory: true)
        defer { try? FileManager.default.removeItem(at: tempDir) }

        let store = SongProjectStore(baseDirectory: tempDir)
        let project = SongProject()

        let invalidNames = [".hidden", ".json", "bad\0name", "foo:bar", "../escape", "sub/file", "foo..bar", " .json "]
        for invalidName in invalidNames {
            do {
                _ = try await store.save(project, named: invalidName)
                XCTFail("Expected SongProjectStoreError.invalidProjectName for '\(invalidName)'")
            } catch let error as SongProjectStoreError {
                XCTAssertEqual(error, .invalidProjectName)
            }
        }

        // Case-insensitive .JSON suffix normalization
        let savedURL = try await store.save(project, named: "CaseTest.JSON")
        XCTAssertEqual(savedURL.lastPathComponent, "CaseTest.json")
        let projects = try await store.listProjects()
        XCTAssertTrue(projects.contains("CaseTest"))
        let loaded = try await store.load(named: "CaseTest")
        XCTAssertEqual(loaded, project)
    }

    func testDorianDiatonicDegree2IsMinorTriad() {
        let aDorianChords = ScaleLibrary.getDiatonicChords(root: "A", scaleId: "dorian")
        XCTAssertEqual(aDorianChords.count, 7)
        XCTAssertEqual(aDorianChords[1], "Bm")

        let aDorianInfos = ScaleLibrary.getDiatonicChordInfos(root: "A", scaleId: "dorian")
        XCTAssertEqual(aDorianInfos[1].roman, "ii")
        XCTAssertEqual(aDorianInfos[1].chordId, "Bm")
    }
}
