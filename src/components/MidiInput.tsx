import { useEffect, useRef, useState } from "react";
import { parseMidi } from "../audio/midi";

export function MidiInput({
  onPress,
  onRelease,
}: {
  onPress: (note: number, key: string, velocity: number) => Promise<void>;
  onRelease: (key: string) => void;
}) {
  const [access, setAccess] = useState<MIDIAccess | null>(null);
  const [inputs, setInputs] = useState<MIDIInput[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const callbacks = useRef({ onPress, onRelease });
  callbacks.current = { onPress, onRelease };
  useEffect(() => {
    if (!access) return;
    const refresh = () => {
      const list = [...access.inputs.values()].filter(
        (input) => input.state === "connected",
      );
      setInputs(list);
      setSelected((previous) =>
        list.some((input) => input.id === previous)
          ? previous
          : list[0]?.id || "",
      );
    };
    refresh();
    access.addEventListener("statechange", refresh);
    return () => access.removeEventListener("statechange", refresh);
  }, [access]);
  useEffect(() => {
    const input = inputs.find((port) => port.id === selected);
    if (!input) return;
    const active = new Set<string>(),
      deferred = new Set<string>();
    let sustain = false;
    const release = (key: string) => {
      callbacks.current.onRelease(key);
      active.delete(key);
      deferred.delete(key);
    };
    const handler = (event: MIDIMessageEvent) => {
      if (!event.data) return;
      const action = parseMidi(event.data);
      if (!action) return;
      if (action.type === "panic") {
        for (const key of active) release(key);
        sustain = false;
        return;
      }
      if (action.type === "sustain") {
        sustain = action.down;
        if (!sustain) for (const key of deferred) release(key);
        return;
      }
      const key = `midi-${input.id}-${action.note}`;
      if (action.type === "on") {
        if (deferred.has(key)) release(key);
        active.add(key);
        void callbacks.current.onPress(action.note, key, action.velocity);
      } else if (sustain && active.has(key)) deferred.add(key);
      else release(key);
    };
    input.addEventListener("midimessage", handler);
    return () => {
      input.removeEventListener("midimessage", handler);
      for (const key of active) release(key);
    };
  }, [inputs, selected]);
  const connect = async () => {
    if (access) {
      setAccess(null);
      setInputs([]);
      return;
    }
    setBusy(true);
    setError("");
    try {
      setAccess(await navigator.requestMIDIAccess({ sysex: false }));
    } catch {
      setError(
        "MIDI erişimi açılamadı. Tarayıcı iznini ve cihaz bağlantısını kontrol edin.",
      );
    } finally {
      setBusy(false);
    }
  };
  const supported = typeof navigator.requestMIDIAccess === "function";
  return (
    <div className="console-midi">
      <button
        disabled={!supported || busy}
        onClick={() => void connect()}
        aria-pressed={!!access}
      >
        {busy ? "MIDI…" : access ? "MIDI ayır" : "MIDI bağla"}
      </button>
      {access && (
        <select
          aria-label="MIDI giriş cihazı"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {inputs.length ? (
            inputs.map((port) => (
              <option key={port.id} value={port.id}>
                {port.name || "MIDI klavye"}
              </option>
            ))
          ) : (
            <option value="">Bağlı cihaz yok</option>
          )}
        </select>
      )}
      <span>
        {!supported
          ? "Bu tarayıcıda MIDI yok"
          : !access
            ? "USB KLAVYE / PAD"
            : `${inputs.length} GİRİŞ`}
      </span>
      {error && (
        <span className="error-message" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
