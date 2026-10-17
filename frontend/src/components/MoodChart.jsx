import { moodColor, moodInfo, useMoodPalette } from "../mood";
import MoodFace from "./MoodFace";

// One bar per day: taller and more colorful for better moods. Days without a check-in are a small stub.
export default function MoodChart({ days }) {
  const [palette] = useMoodPalette();
  const logged = days.filter((d) => d.entry);
  return (
    <div>
      <div className="flex h-36 items-end gap-0.5 sm:gap-1" role="img"
        aria-label={`Mood over the last ${days.length} days. ${logged.length} check-ins.`}>
        {days.map((d) => {
          const m = d.entry ? moodInfo(d.entry.mood) : null;
          return (
            <div key={d.key} className="flex h-full min-w-0 flex-1 items-end"
              title={m ? `${d.label}: ${m.label}` : `${d.label}: no check-in`}>
              {m ? (
                <div className="w-full rounded-t-md border-2 border-b-0 border-edge transition-all duration-500"
                  style={{ height: `${d.entry.mood * 20}%`, background: moodColor(d.entry.mood, palette) }} />
              ) : (
                <div className="h-1.5 w-full rounded-full bg-line" />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>{days[0]?.label}</span>
        <span className="font-bold text-ink">Today</span>
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-muted" aria-label="Legend">
        {[1, 2, 3, 4, 5].map((v) => {
          const m = moodInfo(v);
          return (
            <li key={v} className="flex items-center gap-1.5">
              <MoodFace value={v} size={18} />
              {m.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}