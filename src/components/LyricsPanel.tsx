import { NotebookPen } from "lucide-react";
import type { SongSection } from "../types";

export function LyricsPanel({
  section,
  onChange,
}: {
  section: SongSection;
  onChange: (lyrics: string) => void;
}) {
  const lyrics = section.lyrics || "";
  const words = lyrics.trim() ? lyrics.trim().split(/\s+/).length : 0;
  return (
    <section className="panel lyrics-panel" aria-label="Bölüm sözleri">
      <div className="section-heading">
        <div>
          <span className="eyebrow">SÖZ DEFTERİ</span>
          <h3>
            <NotebookPen size={18} />
            {section.name} için sözler
          </h3>
        </div>
        <span className="muted">{words} kelime · projeyle saklanır</span>
      </div>
      <textarea
        aria-label="Bölüm sözleri"
        value={lyrics}
        maxLength={20000}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Eşlik çalarken aklına gelen sözleri buraya yaz. Her kısmın sözleri ayrı saklanır."
        rows={5}
      />
      <p className="muted">
        Groovebox’ta yazdığın sözler Studio’da aynı kısımda görünür.
      </p>
    </section>
  );
}
