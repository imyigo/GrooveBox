import { useEffect, useState } from "react";
import { parseChordSequence } from "../config/songIdeas";

export function ChordEntry({
  sectionId,
  chords,
  onChange,
}: {
  sectionId: string;
  chords: string[];
  onChange: (chords: string[]) => void;
}) {
  const current = chords.join(" ");
  const [value, setValue] = useState(current);
  const [error, setError] = useState("");
  useEffect(() => {
    setValue(current);
    setError("");
  }, [sectionId, current]);
  return (
    <details className="chord-entry">
      <summary>Kendi akorlarını yazmak ister misin?</summary>
      <p className="muted">
        Hazır eşliği kullanabilir veya bildiğin akorları boşlukla ayırarak
        yazabilirsin.
      </p>
      <div className="control-row">
        <input
          aria-label="Kendi akorlarım"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Am Dm E7 Am"
          maxLength={600}
        />
        <button
          className="button"
          onClick={() => {
            try {
              onChange(parseChordSequence(value));
              setError("");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Akorlar okunamadı.");
            }
          }}
        >
          Akorları uygula
        </button>
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </details>
  );
}
