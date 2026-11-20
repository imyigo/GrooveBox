import { useEffect, useRef, useState } from "react";
import { Circle, Download, Mic, Square } from "lucide-react";
import { audioEngine } from "../audio/AudioEngine";
import { songSequencer } from "../audio/Sequencer";
import { encodeWav } from "../audio/wav";
import { downloadBlob } from "../project";

type Capture = {
  recorder: MediaRecorder;
  release: () => void;
  cancelled: boolean;
};
export function RecordingPanel({
  onRecordingChange,
}: {
  onRecordingChange: (recording: boolean) => void;
}) {
  const [status, setStatus] = useState<
    "idle" | "preparing" | "recording" | "processing"
  >("idle");
  const [includeMic, setIncludeMic] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [take, setTake] = useState<{
    blob: Blob;
    url: string;
    extension: string;
  } | null>(null);
  const capture = useRef<Capture | null>(null);
  const busy = useRef(false);
  const alive = useRef(true);
  const startedAt = useRef(0);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      const c = capture.current;
      if (c) {
        c.cancelled = true;
        if (c.recorder.state !== "inactive") c.recorder.stop();
        c.release();
      }
    };
  }, []);
  useEffect(
    () => () => {
      if (take) URL.revokeObjectURL(take.url);
    },
    [take],
  );
  useEffect(() => {
    if (status !== "recording") return;
    const timer = window.setInterval(
      () =>
        setSeconds(Math.floor((performance.now() - startedAt.current) / 1000)),
      250,
    );
    return () => clearInterval(timer);
  }, [status]);

  const start = async () => {
    if (busy.current) return;
    busy.current = true;
    setStatus("preparing");
    setError("");
    let release = () => {};
    try {
      if (!window.MediaRecorder)
        throw new Error(
          "Bu tarayıcı ses kaydını desteklemiyor. Güncel Safari, Chrome veya Edge kullanın.",
        );
      await audioEngine.unlock();
      await audioEngine.ready();
      const output = audioEngine.createRecordingOutput();
      let microphone: MediaStream | null = null;
      let micNode: MediaStreamAudioSourceNode | null = null;
      let released = false;
      release = () => {
        if (released) return;
        released = true;
        micNode?.disconnect();
        microphone?.getTracks().forEach((track) => track.stop());
        output.release();
      };
      if (includeMic) {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error("Mikrofon için HTTPS veya localhost üzerinden açın.");
        microphone = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        micNode = audioEngine.getContext().createMediaStreamSource(microphone);
        micNode.connect(output.node); // Record the microphone without feeding it to the speakers.
      }
      if (!alive.current) {
        release();
        busy.current = false;
        return;
      }
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/webm",
        "audio/ogg;codecs=opus",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(
        output.node.stream,
        mimeType ? { mimeType } : undefined,
      );
      const c: Capture = { recorder, release, cancelled: false };
      capture.current = c;
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recorder.onerror = () => {
        c.cancelled = true;
        c.release();
        capture.current = null;
        busy.current = false;
        if (recorder.state !== "inactive") recorder.stop();
        if (alive.current) {
          setStatus("idle");
          setError("Ses kaydı kesildi. Tekrar deneyin.");
          onRecordingChange(false);
        }
      };
      recorder.onstop = async () => {
        release();
        capture.current = null;
        if (c.cancelled || !alive.current) return;
        setStatus("processing");
        onRecordingChange(false);
        try {
          if (!chunks.length) throw new Error("Kayıtta ses verisi oluşmadı.");
          const original = new Blob(chunks, { type: recorder.mimeType });
          let blob = original;
          let extension = recorder.mimeType.includes("mp4")
            ? "m4a"
            : recorder.mimeType.includes("ogg")
              ? "ogg"
              : "webm";
          try {
            const decoded = await audioEngine
              .getContext()
              .decodeAudioData(await original.arrayBuffer());
            blob = encodeWav(decoded);
            extension = "wav";
          } catch {
            if (alive.current)
              setError(
                "WAV dönüşümü desteklenmedi; orijinal ses kaydını indirebilirsiniz.",
              );
          }
          if (alive.current)
            setTake({ blob, extension, url: URL.createObjectURL(blob) });
        } catch (e) {
          if (alive.current)
            setError(e instanceof Error ? e.message : "Kayıt hazırlanamadı.");
        } finally {
          busy.current = false;
          if (alive.current) setStatus("idle");
        }
      };
      recorder.start(500);
      startedAt.current = performance.now();
      setSeconds(0);
      setStatus("recording");
      onRecordingChange(true);
      if (!songSequencer.getIsPlaying()) await songSequencer.start();
    } catch (e) {
      const active = capture.current;
      if (active) {
        active.cancelled = true;
        if (active.recorder.state !== "inactive") active.recorder.stop();
        active.release();
        capture.current = null;
      }
      release();
      busy.current = false;
      setStatus("idle");
      onRecordingChange(false);
      setError(
        e instanceof Error && e.name === "NotAllowedError"
          ? "Mikrofon izni verilmedi. İzin verin veya mikrofon seçimini kapatın."
          : e instanceof Error
            ? e.message
            : "Kayıt başlatılamadı.",
      );
    }
  };
  const stop = () => {
    const c = capture.current;
    if (c?.recorder.state === "recording") {
      setStatus("processing");
      c.recorder.stop();
    }
  };
  return (
    <section className="panel recording-panel" aria-label="Studio ses kaydı">
      <div className="section-heading">
        <div>
          <span className="eyebrow">AUDIO CAPTURE</span>
          <h2>Studio ses kaydı</h2>
        </div>
        <span
          className={
            status === "recording" ? "record-time recording" : "record-time"
          }
          aria-live="polite"
        >
          {String(Math.floor(seconds / 60)).padStart(2, "0")}:
          {String(seconds % 60).padStart(2, "0")}
        </span>
      </div>
      <div className="control-row">
        <label className="check-control">
          <input
            type="checkbox"
            checked={includeMic}
            onChange={(e) => setIncludeMic(e.target.checked)}
            disabled={status !== "idle"}
          />
          <Mic size={16} />
          Mikrofonu dahil et
        </label>
        <span className="muted">
          Riff + solo + ritim miksini kaydeder. Mikrofon hoparlöre verilmez.
        </span>
        {status === "recording" ? (
          <button className="button danger" onClick={stop}>
            <Square size={16} />
            Kaydı durdur
          </button>
        ) : (
          <button
            className="button primary"
            disabled={status !== "idle"}
            onClick={() => void start()}
          >
            <Circle size={16} />
            {status === "preparing"
              ? "Hazırlanıyor…"
              : status === "processing"
                ? "Ses hazırlanıyor…"
                : "Ses kaydını başlat"}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {take && (
        <div className="take-row">
          <audio controls src={take.url} aria-label="Son ses kaydı" />
          <button
            className="button"
            onClick={() =>
              downloadBlob(
                take.blob,
                `songwriter-take-${Date.now()}.${take.extension}`,
              )
            }
          >
            <Download size={16} />
            {take.extension.toUpperCase()} indir
          </button>
          <span className="muted">
            Ses kaydını ayrıca indirin; proje dosyası nota ve ayarları saklar.
          </span>
        </div>
      )}
    </section>
  );
}
