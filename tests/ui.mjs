import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";
import { Window } from "happy-dom";

// This is a React/DOM integration test, not a browser or microphone simulation claim.
const dom = new Window({ url: "http://localhost:3000" });
for (const key of [
  "window",
  "document",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLSelectElement",
  "HTMLAnchorElement",
  "Event",
  "KeyboardEvent",
  "MouseEvent",
  "PointerEvent",
  "FileReader",
  "File",
  "Blob",
  "localStorage",
  "navigator",
]) {
  Object.defineProperty(globalThis, key, {
    value: key === "window" ? dom : dom[key],
    configurable: true,
  });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const originalTimeout = globalThis.setTimeout;
const pendingTimers = new Set();
globalThis.setTimeout = (callback, ms, ...args) => {
  const id = originalTimeout(() => {
    pendingTimers.delete(id);
    callback(...args);
  }, ms);
  pendingTimers.add(id);
  return id;
};
const urls = new Map();
URL.createObjectURL = (blob) => {
  const url = `blob:test-${urls.size}`;
  urls.set(url, blob);
  return url;
};
URL.revokeObjectURL = (url) => urls.delete(url);
const downloads = [];
dom.HTMLAnchorElement.prototype.click = function () {
  downloads.push({ name: this.download, blob: urls.get(this.href) });
};
dom.HTMLElement.prototype.setPointerCapture = () => {};

const soundEvents = [];
class Param {
  value = 0;
  setValueAtTime(v) {
    this.value = v;
  }
  setTargetAtTime(v) {
    this.value = v;
  }
  linearRampToValueAtTime(v) {
    this.value = v;
  }
  exponentialRampToValueAtTime(v) {
    assert.ok(v > 0);
    this.value = v;
  }
  cancelScheduledValues() {}
}
class AudioNode extends dom.EventTarget {
  gain = new Param();
  frequency = new Param();
  detune = new Param();
  Q = new Param();
  pan = new Param();
  delayTime = new Param();
  threshold = new Param();
  knee = new Param();
  ratio = new Param();
  attack = new Param();
  release = new Param();
  connect(target) {
    return target;
  }
  disconnect() {}
  start(...args) {
    this.started = true;
    soundEvents.push({ kind: this.kind, args, buffer: this.buffer });
  }
  stop() {
    assert.ok(
      this.started,
      "Web Audio source.stop() must follow source.start()",
    );
    this.dispatchEvent(new Event("ended"));
  }
}
const audioBuffer = (channels = 2, length = 4800, rate = 48000) => {
  const data = Array.from({ length: channels }, () =>
    Float32Array.from({ length }, (_, i) => Math.sin(i * 0.1) * 0.1),
  );
  return {
    numberOfChannels: channels,
    length,
    sampleRate: rate,
    duration: length / rate,
    getChannelData: (index) => data[index],
  };
};
class AudioContext {
  currentTime = 0;
  state = "running";
  sampleRate = 48000;
  destination = new AudioNode();
  resume() {
    this.state = "running";
    return Promise.resolve();
  }
  createGain() {
    return new AudioNode();
  }
  createBiquadFilter() {
    return new AudioNode();
  }
  createDelay() {
    return new AudioNode();
  }
  createConvolver() {
    return new AudioNode();
  }
  createStereoPanner() {
    return new AudioNode();
  }
  createDynamicsCompressor() {
    return new AudioNode();
  }
  createBufferSource() {
    const node = new AudioNode();
    node.kind = "sample";
    return node;
  }
  createOscillator() {
    const node = new AudioNode();
    node.kind = "oscillator";
    return node;
  }
  createBuffer(...args) {
    return audioBuffer(...args);
  }
  decodeAudioData(bytes) {
    const buffer = audioBuffer();
    buffer.fixture =
      new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF"
        ? "wav"
        : "soundfont";
    return Promise.resolve(buffer);
  }
  createMediaStreamDestination() {
    const node = new AudioNode();
    node.stream = { getTracks: () => [{ stop() {} }] };
    return node;
  }
  createMediaStreamSource() {
    return new AudioNode();
  }
}
dom.AudioContext = AudioContext;
globalThis.fetch = async (path) =>
  new Response(await readFile(new URL(`../public${path}`, import.meta.url)), {
    status: 200,
  });
class MediaRecorder {
  static isTypeSupported(type) {
    return type.startsWith("audio/webm");
  }
  state = "inactive";
  mimeType = "audio/webm;codecs=opus";
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    queueMicrotask(() => {
      this.ondataavailable?.({ data: new Blob(["encoded audio fixture"]) });
      void this.onstop?.();
    });
  }
}
globalThis.MediaRecorder = dom.MediaRecorder = MediaRecorder;
const vite = await createServer({
  server: { middlewareMode: true, watch: null },
  appType: "custom",
});
let root,
  checks = 0;
try {
  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { default: App } = await vite.ssrLoadModule("/src/App.tsx");
  const { songSequencer } = await vite.ssrLoadModule("/src/audio/Sequencer.ts");
  const { encodeWav } = await vite.ssrLoadModule("/src/audio/wav.ts");
  const { parseProject, STORAGE_KEY } =
    await vite.ssrLoadModule("/src/project.ts");
  const { readSavedProject, saveProject } = await vite.ssrLoadModule(
    "/src/projectStorage.ts",
  );
  const { act } = React;
  const container = document.createElement("div");
  document.body.append(container);
  const flush = async () => {
    await act(async () => {
      await new Promise((resolve) => originalTimeout(resolve, 20));
    });
  };
  const find = (label) => {
    const el = container.querySelector(`[aria-label="${label}"]`);
    assert.ok(el, `missing ${label}`);
    return el;
  };
  const button = (text) => {
    const el = [...container.querySelectorAll("button")].find(
      (el) => el.textContent.trim() === text,
    );
    assert.ok(el, `missing button ${text}`);
    return el;
  };
  const click = async (el) => {
    await act(async () => el.click());
    await flush();
  };
  const change = async (el, value) => {
    await act(async () => {
      el.value = value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flush();
  };
  const inputText = async (el, value) => {
    await act(async () => {
      const prototype =
        el.tagName === "TEXTAREA"
          ? dom.HTMLTextAreaElement.prototype
          : dom.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value").set.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flush();
  };
  const mount = async () => {
    root = createRoot(container);
    await act(async () =>
      root.render(
        React.createElement(React.StrictMode, null, React.createElement(App)),
      ),
    );
    await flush();
  };
  await mount();
  assert.match(container.textContent, /SongWriter Pro/);
  checks++;
  await change(find("Global ton"), "D");
  await change(find("Global gam"), "major");
  assert.match(container.textContent, /F#m/);
  assert.match(container.textContent, /C#dim/);
  checks++;
  await click(button("×3"));
  await click(button("Piyano"));
  await change(find("Solo enstrümanı"), "piano");
  await click(button("Solo döngüsü kaydet"));
  await act(async () => {
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { code: "KeyA", key: "a", bubbles: true }),
    );
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
  await flush();
  await act(async () =>
    document.body.dispatchEvent(
      new KeyboardEvent("keyup", { code: "KeyA", key: "a", bubbles: true }),
    ),
  );
  assert.equal(
    songSequencer.getSoloCount(),
    1,
    "physical keyboard captures a note",
  );
  checks++;
  await act(async () =>
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", {
        code: "KeyR",
        key: "r",
        altKey: true,
        bubbles: true,
      }),
    ),
  );
  assert.equal(
    songSequencer.getIsRecordingSolo(),
    false,
    "Alt+R does not get consumed by the R note",
  );
  checks++;
  await click(button("Durdur"));
  await click(button("Proje indir"));
  const exported = parseProject(await downloads.at(-1).blob.text());
  assert.equal(exported.root, "D");
  assert.equal(exported.notes.length, 1);
  assert.equal(exported.sections[0].repeats, 3);
  checks++;
  await click(button("Studio"));
  const existingSections = songSequencer.getSections().length;
  await click(button("Kopyala"));
  assert.equal(songSequencer.getSections().length, existingSections + 1);
  assert.equal(
    songSequencer.getSoloCount(),
    2,
    "duplicated section includes the solo notes",
  );
  checks++;

  const projectInput = container.querySelector(
    'input[type=file][accept=".json,application/json"]',
  );
  const importFile = async (input, file) => {
    Object.defineProperty(input, "files", {
      value: [file],
      configurable: true,
    });
    await act(async () =>
      input.dispatchEvent(new Event("change", { bubbles: true })),
    );
    await flush();
  };
  await importFile(
    projectInput,
    new File([JSON.stringify(exported)], "session.json", {
      type: "application/json",
    }),
  );
  assert.equal(songSequencer.getSections().length, existingSections);
  assert.equal(songSequencer.getSoloCount(), 1);
  checks++;
  await importFile(
    projectInput,
    new File(['{"version":55}'], "bad.json", { type: "application/json" }),
  );
  assert.equal(
    songSequencer.getSoloCount(),
    1,
    "bad import leaves the current project intact",
  );
  checks++;
  const wavBytes = await encodeWav(audioBuffer()).arrayBuffer();
  await importFile(
    find("WAV dosyası"),
    new File([wavBytes], "vocal.wav", { type: "audio/wav" }),
  );
  assert.match(container.textContent, /vocal.wav/);
  assert.ok(find("vocal.wav dalga biçimi"));
  checks++;
  await importFile(
    find("WAV dosyası"),
    new File(["invalid"], "broken.wav", { type: "audio/wav" }),
  );
  assert.match(container.textContent, /Geçerli bir WAV/);
  assert.match(container.textContent, /vocal.wav/);
  checks++;
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: async () => {
        throw new DOMException("denied", "NotAllowedError");
      },
    },
  });
  const microphone = container.querySelector("input[type=checkbox]");
  await click(microphone);
  await click(button("Ses kaydını başlat"));
  assert.match(container.textContent, /Mikrofon izni verilmedi/);
  checks++;
  await click(microphone);
  await click(button("Ses kaydını başlat"));
  assert.ok(button("Kaydı durdur"));
  await act(async () => {
    await new Promise((resolve) => originalTimeout(resolve, 80));
  });
  assert.ok(
    soundEvents.some((e) => e.buffer?.fixture === "wav"),
    "imported WAV is scheduled into the transport",
  );
  checks++;
  await click(button("Kaydı durdur"));
  await flush();
  await click(button("WAV indir"));
  const wavDownload = downloads.at(-1);
  assert.ok(wavDownload.name.endsWith(".wav"));
  assert.equal(
    new TextDecoder().decode(
      (await wavDownload.blob.arrayBuffer()).slice(0, 4),
    ),
    "RIFF",
  );
  checks++;
  await click(button("Durdur"));
  await click(button("Groovebox"));
  await click(button("Naylon gitar"));
  await click(button("Çal"));
  await act(async () => {
    await new Promise((resolve) => originalTimeout(resolve, 80));
  });
  assert.ok(
    soundEvents.some(
      (e) => e.kind === "sample" && e.buffer?.fixture === "soundfont",
    ),
    "guitar samples actually reach a started buffer source",
  );
  checks++;
  await click(button("Durdur"));
  await act(async () => {
    await new Promise((resolve) => originalTimeout(resolve, 450));
  });
  const saved = parseProject(localStorage.getItem(STORAGE_KEY));
  assert.equal(saved.audioTrack.name, "vocal.wav");
  checks++;
  await act(async () => root.unmount());
  root = null;
  await mount();
  await click(button("Studio"));
  assert.match(container.textContent, /vocal.wav/);
  assert.equal(songSequencer.getSoloCount(), 1);
  checks++;
  const { indexedDB } = await import("fake-indexeddb");
  globalThis.indexedDB = indexedDB;
  await act(async () => {
    await saveProject(saved);
    assert.deepEqual(
      await readSavedProject(),
      saved,
      "IndexedDB round-trip retains embedded WAV and notes",
    );
  });
  checks++;
  await click(button("Groovebox"));
  await inputText(
    container.querySelector('textarea[aria-label="Bölüm sözleri"]'),
    "Bir özgün dize\nBir başka dize",
  );
  await click(button("Duygusal Popİçten"));
  await click(button("Bu eşlikle başla"));
  assert.equal(
    container.querySelector('textarea[aria-label="Bölüm sözleri"]').value,
    "Bir özgün dize\nBir başka dize",
  );
  assert.equal(
    songSequencer.getSoloCount(),
    1,
    "section preset preserves captured notes",
  );
  checks++;
  await click(button("Son fikri geri al"));
  await click(button("AKORLAR"));
  await inputText(find("Kendi akorlarım"), "Am Dm E7 Am");
  await click(button("Akorları uygula"));
  assert.deepEqual(songSequencer.getSections()[0].chords, [
    "Am",
    "Dm",
    "E7",
    "Am",
  ]);
  checks++;
  await change(find("Nota yardımı"), "chromatic");
  await change(find("Solo enstrümanı"), "piano");
  await click(button("Solo döngüsü kaydet"));
  await act(async () => {
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { code: "KeyS", key: "s", bubbles: true }),
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  await flush();
  await act(async () =>
    document.body.dispatchEvent(
      new KeyboardEvent("keyup", { code: "KeyS", key: "s", bubbles: true }),
    ),
  );
  assert.equal(
    songSequencer.getRecordedNotes().at(-1).midi,
    51,
    "chromatic D-root keyboard keeps D# instead of snapping",
  );
  assert.equal(
    songSequencer.getRecordedNotes().at(-1).harmonyMode,
    "chromatic",
  );
  checks++;
  await click(button("Solo kaydını bitir"));
  await change(find("Solo enstrümanı"), "drums");
  await click(button("Davul döngüsü kaydet"));
  await act(async () => {
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { code: "KeyA", key: "a", bubbles: true }),
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  await flush();
  await act(async () =>
    document.body.dispatchEvent(
      new KeyboardEvent("keyup", { code: "KeyA", key: "a", bubbles: true }),
    ),
  );
  assert.equal(songSequencer.getRecordedNotes().at(-1).instrument, "drums");
  checks++;
  await click(button("Davul kaydını bitir"));
  await click(button("Durdur"));
  await click(button("Studio"));
  assert.match(container.textContent, /Davul kaydı/);
  assert.equal(
    container.querySelector('textarea[aria-label="Bölüm sözleri"]').value,
    "Bir özgün dize\nBir başka dize",
  );
  checks++;
  await click(button("Groovebox"));
  await click(container.querySelector("input[type=checkbox]"));
  const beforeIdea = songSequencer.getRecordedNotes();
  await click(button("Bu eşlikle başla"));
  assert.equal(songSequencer.getSections()[0].name, "Giriş");
  assert.equal(songSequencer.getSoloCount(), 0);
  await click(button("Son fikri geri al"));
  assert.deepEqual(songSequencer.getRecordedNotes(), beforeIdea);
  checks++;
  console.log(
    `PASS: ${checks} React/DOM flows — global key, ×3, keyboard/Alt+R, project export/import/reload, WAV import/record/export, section copying and sampled guitar playback.`,
  );
} finally {
  if (root) {
    const { act } = await import("react");
    await act(async () => root.unmount());
  }
  for (const timer of pendingTimers) clearTimeout(timer);
  globalThis.setTimeout = originalTimeout;
  await dom.happyDOM.close();
  await vite.close();
}
