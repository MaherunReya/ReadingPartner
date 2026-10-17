import { MOOD_PALETTES, useMoodPalette } from "../mood";

const MIXED = "conic-gradient(var(--color-pink), var(--color-sun), var(--color-mint), var(--color-sky), var(--color-pink))";

export default function MoodPalettePicker() {
  const [palette, setPalette] = useMoodPalette();
  return (
    <fieldset>
      <legend className="text-sm font-bold text-muted">Face colour</legend>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Face colour">
        {Object.entries(MOOD_PALETTES).map(([id, p]) => (
          <button key={id} type="button" role="radio" aria-checked={palette === id} onClick={() => setPalette(id)}
            className={`inline-flex items-center gap-2 rounded-full border-2 px-3 py-1 text-sm font-bold transition-colors ${
              palette === id ? "border-edge bg-surface shadow-[2px_2px_0_var(--color-edge)]" : "border-line text-muted hover:border-edge hover:text-ink"
            }`}>
            <span className="size-4 rounded-full border-2 border-edge" style={{ background: p.color ?? MIXED }} />
            {p.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}