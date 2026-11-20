import { useState } from "react";
import { Shuffle, Sparkles, Undo2 } from "lucide-react";
import { SONG_STYLES, SongStyle, ideaChords } from "../config/songIdeas";

export function SongIdeaPanel({
  root,
  onApply,
  canUndo,
  onUndo,
}: {
  root: string;
  onApply: (style: SongStyle, variation: number, wholeSong: boolean) => void;
  canUndo: boolean;
  onUndo: () => void;
}) {
  const [styleId, setStyleId] = useState(SONG_STYLES[0].id);
  const [variation, setVariation] = useState(0);
  const [wholeSong, setWholeSong] = useState(false);
  const style = SONG_STYLES.find((s) => s.id === styleId)!;
  return (
    <section className="panel idea-panel" aria-label="Hazır beste fikirleri">
      <div className="section-heading">
        <div>
          <span className="eyebrow">BİR TARZ SEÇ. ÇALMAYA BAŞLA.</span>
          <h3>
            <Sparkles size={19} />
            Nereden başlayalım?
          </h3>
        </div>
        {canUndo && (
          <button className="button" onClick={onUndo}>
            <Undo2 size={15} />
            Son fikri geri al
          </button>
        )}
      </div>
      <div className="style-pads">
        {SONG_STYLES.map((s) => (
          <button
            key={s.id}
            className={`style-pad ${s.id === styleId ? "active" : ""}`}
            aria-pressed={s.id === styleId}
            onClick={() => {
              setStyleId(s.id);
              setVariation(0);
            }}
          >
            <strong>{s.name}</strong>
            <span>{s.mood}</span>
          </button>
        ))}
      </div>
      <div className="idea-preview">
        <div>
          <strong>{style.name}</strong>
          <p className="muted">{style.description}</p>
          <span className="idea-chords">
            {ideaChords(style, root, variation).join(" · ")}{" "}
            <span className="muted">· {style.bpm} BPM</span>
          </span>
        </div>
        <div className="control-row">
          <label className="check-control">
            <input
              type="checkbox"
              checked={wholeSong}
              onChange={(e) => setWholeSong(e.target.checked)}
            />
            Tam parça düzeni kur
          </label>
          <button
            className="button primary"
            onClick={() => onApply(style, variation, wholeSong)}
          >
            Bu eşlikle başla
          </button>
          <button
            className="button"
            onClick={() => {
              const next = (variation + 1 + Math.floor(Math.random() * 7)) % 8;
              setVariation(next);
              onApply(style, next, wholeSong);
            }}
          >
            <Shuffle size={16} />
            Başka fikir
          </button>
        </div>
      </div>
      <p className="muted">
        {wholeSong
          ? "Giriş, söz, nakarat ve köprü yeniden kurulur; mevcut söz ve nota kayıtlarının yerine geçer. Başka bir düzenleme yapmadan önce son fikri geri alabilirsin."
          : "Seçili kısmın eşliği değişir; parçanın gamı tarza uyarlanır. Sözler ve kayıtlar korunur."}{" "}
        12 tarzda özgün başlangıç şablonları.
      </p>
    </section>
  );
}
