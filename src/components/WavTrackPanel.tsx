import { useRef, useState } from "react";
import { FolderOpen, Volume2 } from "lucide-react";
import { WavTrack } from "../project";
import { audioEngine } from "../audio/AudioEngine";
import { songSequencer } from "../audio/Sequencer";

export function WavTrackPanel({
  track,
  onChange,
}: {
  track?: WavTrack;
  onChange: (track: WavTrack | undefined) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const importWav = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      if (file.size > 20 * 1024 * 1024)
        throw new Error("En fazla 20 MB büyüklüğünde bir WAV seçin.");
      const bytes = await file.arrayBuffer();
      const header = new TextDecoder("ascii").decode(bytes.slice(0, 12));
      if (!header.startsWith("RIFF") || header.slice(8, 12) !== "WAVE")
        throw new Error("Geçerli bir WAV ses dosyası seçin.");
      await audioEngine.unlock();
      const decoded = await audioEngine
        .getContext()
        .decodeAudioData(bytes.slice(0));
      const peaks = Array.from({ length: 96 }, (_, index) => {
        const from = Math.floor((index * decoded.length) / 96);
        const to = Math.floor(((index + 1) * decoded.length) / 96);
        let peak = 0;
        for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
          const samples = decoded.getChannelData(channel);
          for (let sample = from; sample < to; sample++)
            peak = Math.max(peak, Math.abs(samples[sample]));
        }
        return Math.min(1, peak);
      });
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(new Blob([bytes], { type: "audio/wav" }));
      });
      songSequencer.stop();
      onChange({
        id: crypto.randomUUID(),
        name: file.name,
        dataUrl,
        duration: decoded.duration,
        peaks,
        volume: 0.85,
        muted: false,
        offsetSeconds: 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "WAV açılamadı.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };
  return (
    <section className="panel wav-panel" aria-label="WAV ses kanalı">
      <div className="section-heading">
        <div>
          <span className="eyebrow">AUDIO TRACK</span>
          <h3>WAV ses kanalı</h3>
        </div>
        <button
          className="button"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <FolderOpen size={16} />
          {busy ? "Ses açılıyor…" : track ? "WAV değiştir" : "WAV ekle"}
        </button>
      </div>
      <input
        ref={input}
        className="sr-only"
        type="file"
        accept=".wav,audio/wav,audio/x-wav"
        aria-label="WAV dosyası"
        onChange={(e) => void importWav(e.target.files?.[0])}
      />
      {track ? (
        <>
          <div className="control-row">
            <strong>{track.name}</strong>
            <span className="muted">{track.duration.toFixed(1)} saniye</span>
            <button
              className="button"
              aria-pressed={track.muted}
              onClick={() => onChange({ ...track, muted: !track.muted })}
            >
              {track.muted ? "WAV sessiz" : "WAV açık"}
            </button>
            <label className="wav-volume">
              <Volume2 size={16} />
              <input
                aria-label="WAV ses seviyesi"
                type="range"
                min="0"
                max="1.2"
                step="0.01"
                value={track.volume}
                onChange={(e) =>
                  onChange({ ...track, volume: +e.target.value })
                }
              />
            </label>
            <label>
              Başlangıç (sn)
              <input
                aria-label="WAV başlangıcı saniye"
                type="number"
                min="0"
                max="86400"
                step="0.1"
                value={track.offsetSeconds}
                onChange={(e) => {
                  const value = +e.target.value;
                  if (value >= 0 && value <= 86400) {
                    songSequencer.stop();
                    onChange({ ...track, offsetSeconds: value });
                  }
                }}
              />
            </label>
            <button
              className="button danger"
              onClick={() => {
                songSequencer.stop();
                onChange(undefined);
              }}
            >
              Kanalı kaldır
            </button>
          </div>
          <div
            className="audio-waveform"
            role="img"
            aria-label={`${track.name} dalga biçimi`}
          >
            {track.peaks.map((peak, index) => (
              <i
                key={index}
                style={{ height: `${Math.max(2, peak * 100)}%` }}
              />
            ))}
          </div>
        </>
      ) : (
        <p className="muted">
          Bir vokal veya eşlik WAV’ı açıp parçayla birlikte çalın ve miks
          kaydına dahil edin.
        </p>
      )}
      <p className="muted">
        WAV özgün hızında ve perdesinde çalar. Proje dosyasına sesin kendisi de
        eklenir; ayrı WAV dışa aktarma ise miksin ses kaydıdır.
      </p>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
