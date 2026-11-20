import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({
  server: { middlewareMode: true, watch: null },
  appType: "custom",
});
let checks = 0;
try {
  const { GUITAR_CHORDS, getChordPitchClasses, noteSemitone } =
    await vite.ssrLoadModule("/src/config/chords.ts");
  const { MUSICAL_SCALES, ROOT_NOTES, getDiatonicChords } =
    await vite.ssrLoadModule("/src/config/scales.ts");
  const { changeSongKey, mapMidiToKey } = await vite.ssrLoadModule(
    "/src/config/harmony.ts",
  );
  const { createProject, parseProject } =
    await vite.ssrLoadModule("/src/project.ts");
  const { encodeWav } = await vite.ssrLoadModule("/src/audio/wav.ts");
  const { SongSequencer } = await vite.ssrLoadModule("/src/audio/Sequencer.ts");
  const { audioEngine } = await vite.ssrLoadModule("/src/audio/AudioEngine.ts");
  const { strumEngine } = await vite.ssrLoadModule("/src/audio/StrumEngine.ts");
  const { SONG_STYLES, ideaChords, ideaSections, parseChordSequence } =
    await vite.ssrLoadModule("/src/config/songIdeas.ts");
  const { padGrid } = await vite.ssrLoadModule("/src/config/padGrid.ts");
  const { parseMidi } = await vite.ssrLoadModule("/src/audio/midi.ts");
  for (const root of ROOT_NOTES)
    for (const scale of Object.values(MUSICAL_SCALES))
      for (const chromatic of [false, true]) {
        const pads = padGrid(root, scale.id, 0, chromatic);
        assert.equal(pads.length, 64);
        assert.ok(pads.every((p) => p.midi >= 0 && p.midi <= 127));
        assert.equal(pads[59].midi, pads[48].midi);
        if (!chromatic)
          assert.ok(
            pads.every((p) =>
              scale.intervals
                .map((n) => (n + noteSemitone(root)) % 12)
                .includes(p.midi % 12),
            ),
          );
        checks++;
      }
  assert.deepEqual(parseMidi([0x92, 60, 127]), {
    type: "on",
    note: 60,
    velocity: 1,
  });
  assert.deepEqual(parseMidi([0x90, 60, 0]), {
    type: "off",
    note: 60,
    velocity: 0,
  });
  assert.deepEqual(parseMidi([0x81, 60, 60]), {
    type: "off",
    note: 60,
    velocity: 0,
  });
  assert.deepEqual(parseMidi([0xb0, 64, 127]), { type: "sustain", down: true });
  assert.deepEqual(parseMidi([0xb0, 64, 0]), { type: "sustain", down: false });
  assert.deepEqual(parseMidi([0xb0, 123, 0]), { type: "panic" });
  for (const data of [
    [],
    [0x90, 60],
    [0x90, 128, 100],
    [0x90, 60, -1],
    [0xf8, 0, 0],
  ])
    assert.equal(parseMidi(data), null);
  checks++;
  for (const style of SONG_STYLES)
    for (const root of ROOT_NOTES)
      for (let variant = 0; variant < 8; variant++) {
        const chords = ideaChords(style, root, variant);
        assert.equal(chords.length, 4);
        assert.ok(chords.every((id) => GUITAR_CHORDS[id]));
        const sections = ideaSections(style, root, variant);
        assert.equal(new Set(sections.map((s) => s.id)).size, 4);
        assert.ok(
          sections.every((s) => s.chords.every((id) => GUITAR_CHORDS[id])),
        );
        checks++;
      }
  assert.deepEqual(parseChordSequence("am, dm | E7 am"), [
    "Am",
    "Dm",
    "E7",
    "Am",
  ]);
  assert.deepEqual(parseChordSequence("D♭m F♯m"), ["C#m", "F#m"]);
  assert.throws(() => parseChordSequence("Am nope"));
  checks++;

  for (const root of ROOT_NOTES)
    for (const scale of Object.values(MUSICAL_SCALES)) {
      const palette = getDiatonicChords(root, scale.id);
      assert.equal(palette.length, 7);
      for (const { chordId } of palette) {
        assert.ok(
          GUITAR_CHORDS[chordId],
          `${root}/${scale.id}: missing ${chordId}`,
        );
        assert.ok(GUITAR_CHORDS[chordId].midiNotes.length >= 3);
        if (scale.intervals.length === 7) {
          const allowed = scale.intervals.map(
            (n) => (n + noteSemitone(root)) % 12,
          );
          assert.ok(
            getChordPitchClasses(GUITAR_CHORDS[chordId]).every((n) =>
              allowed.includes(n),
            ),
            `${chordId} outside ${root}/${scale.id}`,
          );
        }
      }
      const changed = changeSongKey(
        createProject().sections,
        "A",
        "minor",
        root,
        scale.id,
      );
      assert.ok(
        changed.every((s) => s.chords.every((id) => GUITAR_CHORDS[id])),
      );
      for (let midi = 36; midi <= 84; midi++) {
        const moved = mapMidiToKey(midi, "A", "minor", root, scale.id);
        assert.ok(
          scale.intervals
            .map((n) => (n + noteSemitone(root)) % 12)
            .includes(moved % 12),
        );
      }
      checks++;
    }
  const project = createProject();
  assert.deepEqual(parseProject(JSON.stringify(project)), project);
  const lyricProject = {
    ...project,
    soloMode: "chromatic",
    sections: project.sections.map((s) => ({
      ...s,
      lyrics: "Bir özgün dize\nBir başka dize",
    })),
  };
  assert.deepEqual(parseProject(JSON.stringify(lyricProject)), lyricProject);
  checks++;
  for (const mutate of [
    (p) => (p.bpm = null),
    (p) => (p.sections[0].chords = ["__proto__"]),
    (p) => p.sections.push(p.sections[0]),
    (p) => (p.mix.reverbWet = 10),
    (p) => (p.sections[0].repeats = 2.5),
    (p) => (p.sections[0].lyrics = 42),
    (p) => (p.soloMode = "unknown"),
    (p) => (p.padVelocity = 2),
    (p) => (p.metronomeOn = "yes"),
    (p) => (p.countInBars = 2),
  ]) {
    const invalid = structuredClone(project);
    mutate(invalid);
    assert.throws(() => parseProject(JSON.stringify(invalid)));
    checks++;
  }
  const wav = await encodeWav({
    numberOfChannels: 2,
    sampleRate: 48000,
    length: 3,
    getChannelData: (ch) =>
      new Float32Array(ch ? [0.5, -0.5, 0] : [1.5, -1.5, 0]),
  }).arrayBuffer();
  const header = new DataView(wav);
  assert.equal(new TextDecoder().decode(wav.slice(0, 4)), "RIFF");
  assert.equal(header.getUint32(24, true), 48000);
  assert.equal(header.getUint16(22, true), 2);
  assert.equal(header.getInt16(44, true), 32767);
  assert.equal(header.getInt16(48, true), -32768);
  checks++;

  const originalTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const originalWindow = globalThis.window;
  let now = 0,
    timerId = 0,
    interval;
  const timers = new Map();
  const ctx = {
    get currentTime() {
      return now;
    },
    state: "running",
  };
  const played = [];
  const clicks = [];
  audioEngine.playMetronome = (...args) => clicks.push(args);
  audioEngine.unlock = async () => true;
  audioEngine.ready = async () => {};
  audioEngine.getContext = () => ctx;
  audioEngine.stopAll = () => {};
  audioEngine.getSoloInstrument = () => "piano";
  audioEngine.playRecordedNote = (...args) => played.push(args);
  strumEngine.strumChord = () => {};
  globalThis.window = {
    setInterval: (fn) => {
      interval = fn;
      return 100;
    },
  };
  globalThis.setTimeout = (fn, ms) => {
    const id = ++timerId;
    timers.set(id, { fn, at: now + ms / 1000 });
    return id;
  };
  globalThis.clearTimeout = (id) => timers.delete(id);
  try {
    const sequence = new SongSequencer();
    sequence.setPercussionEnabled(false);
    sequence.setBpm(120);
    const first = {
      ...project.sections[0],
      id: "a",
      chords: ["Am"],
      repeats: 3,
    };
    const second = {
      ...project.sections[1],
      id: "b",
      chords: ["Dm"],
      repeats: 1,
    };
    sequence.setSections([first, second]);
    let audible;
    sequence.onStep((state) => (audible = state));
    await sequence.start();
    const tickTo = (time) => {
      while (now < time - 0.00001) {
        now = Math.min(time, now + 0.025);
        interval();
        for (const [id, t] of [...timers])
          if (t.at <= now + 0.00001) {
            timers.delete(id);
            t.fn();
          }
      }
    };
    tickTo(1.1);
    sequence.setIsRecordingSolo(true);
    sequence.addSoloNote(69);
    assert.equal(
      sequence.getRecordedNotes()[0].step,
      audible.currentStep,
      "record at the audible step rather than future scheduling cursor",
    );
    assert.equal(sequence.getRecordedNotes()[0].instrument, "piano");
    checks++;
    tickTo(5.95);
    assert.equal(audible.currentSectionIndex, 0);
    assert.equal(audible.currentRepeat, 2);
    tickTo(6.1);
    assert.equal(
      audible.currentSectionIndex,
      1,
      "advance after exactly three complete loops",
    );
    checks++;
    sequence.queueSection(0);
    tickTo(8.1);
    assert.equal(
      audible.currentSectionIndex,
      0,
      "queued section launches at bar boundary",
    );
    checks++;
    sequence.setSections([second, first]);
    assert.equal(sequence.getRecordedNotes()[0].sectionId, "a");
    assert.equal(
      sequence.getRecordedNotes()[0].sectionIndex,
      1,
      "notes follow stable section IDs when reordered",
    );
    checks++;
    const restored = {
      ...project,
      sections: [second, first],
      notes: sequence.getRecordedNotes(),
    };
    assert.deepEqual(
      parseProject(JSON.stringify(restored)).notes,
      restored.notes,
    );
    checks++;
    sequence.stop();
    assert.equal(timers.size, 0, "stop cancels pending UI events");
    assert.equal(audible.isPlaying, false);
    checks++;
    const captured = sequence.getRecordedNotes();
    sequence.setSections([second]);
    assert.equal(sequence.getRecordedNotes().length, 0);
    assert.equal(captured.length, 1);
    checks++;
    const layered = new SongSequencer();
    layered.setSections([first]);
    layered.setPercussionEnabled(true);
    const layers = [
      {
        id: "melody",
        sectionId: "a",
        sectionIndex: 0,
        midi: 69,
        step: 0,
        barIndex: 0,
        velocity: 0.9,
        instrument: "piano",
      },
      {
        id: "drum",
        sectionId: "a",
        sectionIndex: 0,
        midi: 36,
        step: 0,
        barIndex: 0,
        velocity: 0.9,
        instrument: "drums",
      },
    ];
    layered.setRecordedNotes(layers);
    layered.setSoloMuted(true);
    played.length = 0;
    layered.scheduleStep(0, 0, 0, now);
    assert.deepEqual(
      played.map((args) => args[3]),
      ["drums"],
      "solo mute must not mute recorded drums",
    );
    checks++;
    layered.setSoloMuted(false);
    layered.setPercussionEnabled(false);
    played.length = 0;
    layered.scheduleStep(0, 0, 0, now);
    assert.deepEqual(
      played.map((args) => args[3]),
      ["piano"],
      "drum mute must not mute the melody",
    );
    checks++;
    layered.clearSolo({ sectionId: "a", track: "drums" });
    assert.deepEqual(
      layered.getRecordedNotes().map((n) => n.id),
      ["melody"],
    );
    checks++;
    layered.stop();
    const counted = new SongSequencer();
    counted.setSections([first]);
    counted.setPercussionEnabled(false);
    counted.setBpm(120);
    counted.setMetronome(true);
    counted.setCountIn(1);
    clicks.length = 0;
    await counted.start();
    assert.equal(clicks.length, 4, "pre-roll schedules exactly four beats");
    assert.equal(counted.getState().countInBeat, 1);
    counted.setIsRecordingSolo(true);
    counted.addSoloNote(69);
    assert.equal(
      counted.getRecordedNotes().length,
      0,
      "pre-roll is not recorded as a song note",
    );
    tickTo(now + 2.1);
    assert.equal(counted.getState().countInBeat, null);
    counted.addSoloNote(69);
    assert.equal(counted.getRecordedNotes().length, 1);
    assert.ok(clicks.length > 4, "click continues on song beats");
    counted.stop();
    checks++;
  } finally {
    globalThis.setTimeout = originalTimeout;
    globalThis.clearTimeout = originalClearTimeout;
    globalThis.window = originalWindow;
  }
  console.log(
    `PASS: ${checks} checks — all keys/scales, project validation, stereo WAV, audible recording clock, ×3 transitions, scene launch and note persistence.`,
  );
} finally {
  await vite.close();
}
