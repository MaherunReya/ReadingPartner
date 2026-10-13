import { MOODS } from "../mood";

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
            className={`group flex flex-1 flex-col items-center gap-1 rounded-2xl border-2 px-1 py-3 transition-all active:scale-95 disabled:opacity-60 ${
              active
                ? "-translate-y-0.5 border-edge bg-sun text-on-sun shadow-[3px_3px_0_0_var(--color-edge)]"
                : "border-line hover:border-brand"
            }`}
          >
            <span className="text-3xl transition-transform group-hover:scale-110 sm:text-4xl" aria-hidden="true">{m.emoji}</span>
            <span className="text-xs font-bold">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}