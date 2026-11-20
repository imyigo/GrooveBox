import {
  Volume2,
  Play,
  Square,
  Music2,
  LayoutDashboard,
  SlidersHorizontal,
} from "lucide-react";

export type AppViewMode = "groovebox" | "studio";
interface Props {
  mode: AppViewMode;
  onModeChange: (mode: AppViewMode) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  busy: boolean;
  volume: number;
  onVolumeChange: (value: number) => void;
  recording: boolean;
}
export function Header({
  mode,
  onModeChange,
  isPlaying,
  onTogglePlay,
  busy,
  volume,
  onVolumeChange,
  recording,
}: Props) {
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-icon">
          <Music2 size={24} />
        </div>
        <div>
          <h1>
            SongWriter <span>Pro</span>
          </h1>
          <p>Fikrinden ilk kaydına.</p>
        </div>
      </div>
      <nav className="mode-switch" aria-label="Çalışma modu">
        <button
          className={mode === "groovebox" ? "active" : ""}
          aria-pressed={mode === "groovebox"}
          onClick={() => onModeChange("groovebox")}
        >
          <LayoutDashboard size={17} />
          Groovebox
        </button>
        <button
          className={mode === "studio" ? "active" : ""}
          aria-pressed={mode === "studio"}
          onClick={() => onModeChange("studio")}
        >
          <SlidersHorizontal size={17} />
          Studio{" "}
          {recording && <span className="rec-dot" aria-label="Kayıt sürüyor" />}
        </button>
      </nav>
      <div className="control-row header-transport">
        <label className="volume-control">
          <Volume2 size={18} />
          <span className="sr-only">Ana ses seviyesi</span>
          <input
            aria-label="Ana ses seviyesi"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => onVolumeChange(+e.target.value)}
          />
        </label>
        <button
          className={`button ${isPlaying ? "danger" : "primary"}`}
          disabled={busy}
          onClick={onTogglePlay}
        >
          {isPlaying ? <Square size={17} /> : <Play size={17} />}
          {busy ? "Hazırlanıyor…" : isPlaying ? "Durdur" : "Çal"}
        </button>
      </div>
    </header>
  );
}
