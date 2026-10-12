import { useMemo } from "react";
import { Link } from "react-router-dom";
import Card from "./Card";
import { toISODate } from "../dates";
import {
  PRAYERS, formatTime, loadSettings, nextPrayer, untilText,
  useNow, usePrayerLogs, usePrayerTimes, useTogglePrayer,
} from "../prayers";

export default function PrayerToday() {
  const settings = useMemo(loadSettings, []);
  const now = useNow();
  const today = toISODate(now);
  const logs = usePrayerLogs();
  const timesQuery = usePrayerTimes(settings);
  const toggle = useTogglePrayer();

  const times = timesQuery.data?.times;
  const next = nextPrayer(times, now);
  const doneCount = PRAYERS.filter((p) => logs.done.has(`${today}|${p.id}`)).length;

  return (
    <Card
      title="Prayers today"
      action={<Link to="/prayers" className="text-sm font-medium text-brand-ink underline">Open tracker</Link>}
    >
      <p className="text-2xl font-bold">
        {doneCount}<span className="text-base font-medium text-muted"> / 5</span>
      </p>
      <p className="mt-1 text-sm text-muted">
        {next ? `Next: ${next.label} at ${formatTime(times[next.id])} (in ${untilText(next.at, now)})` : "Tap a prayer when you've prayed it."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {PRAYERS.map((p) => {
          const checked = logs.done.has(`${today}|${p.id}`);
          return (
            <button key={p.id} aria-pressed={checked}
              onClick={() => toggle.mutate({ date: today, prayer: p.id, completed: !checked })}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                checked ? "border-done bg-done text-white" : "border-line hover:border-brand"
              }`}>
              {p.label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}