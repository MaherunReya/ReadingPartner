import { Link } from "react-router-dom";
import Card from "./Card";
import MoodPicker from "./MoodPicker";
import { toISODate } from "../dates";
import { moodInfo, tagLabel, useMoodEntries, useSaveMood } from "../mood";
import MoodFace from "./MoodFace";

// Dashboard card: one tap to check in, details live on the Mood page.
export default function MoodQuick() {
  const today = toISODate(new Date());
  const { byDate, isLoading } = useMoodEntries();
  const save = useSaveMood();
  const entry = byDate.get(today);

  if (isLoading) return <Card title="Daily check-in"><div className="h-20 animate-pulse rounded-xl bg-line/60" /></Card>;

  if (entry) {
    const m = moodInfo(entry.mood);
    return (
      <Card title="Daily check-in" action={<Link to="/mood" className="text-sm font-bold text-brand-ink underline">Change or add details</Link>}>
        <div className="flex items-center gap-4">
          <MoodFace value={m.value} size={56} />
          <div>
            <p className="font-display text-xl font-semibold">Feeling {m.label.toLowerCase()} today</p>
            <p className="text-sm text-muted">
              {entry.tags.length ? entry.tags.map(tagLabel).join(", ") : "Thanks for checking in."}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Daily check-in" action={<Link to="/mood" className="text-sm font-bold text-brand-ink underline">Open mood page</Link>}>
      <p className="mb-3 font-display text-xl font-semibold">How are you feeling today?</p>
      <MoodPicker value={null} disabled={save.isPending} onChange={(mood) => save.mutate({ date: today, mood })} />
      {save.isError && <p role="alert" className="mt-3 text-sm text-overdue">Couldn't save that. Try again.</p>}
    </Card>
  );
}