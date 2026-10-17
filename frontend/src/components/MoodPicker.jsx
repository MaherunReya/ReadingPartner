import { MOODS } from "../mood";
import MoodFace from "./MoodFace";

export default function MoodPicker({ value, onChange, disabled = false }) {
  return (
    <div role="radiogroup" aria-label="How are you feeling?" className="flex gap-2 sm:gap-3">
      {MOODS.map((m) => {
        const active = value === m.value;
        return (
          <button
            key={m.value}
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(m.value)}
            className={`group flex flex-1 flex-col items-center gap-2 rounded-2xl border-2 px-1 py-4 transition-all active:scale-95 disabled:opacity-60 ${
              active
                ? "border-edge bg-surface shadow-[3px_3px_0_0_var(--color-edge)]"
                : "border-line hover:border-edge"
            }`}
          >
            <MoodFace value={m.value} size={56} className="size-10 transition-transform group-hover:scale-105 sm:size-14" />
            <span className="text-xs font-bold sm:text-sm">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}