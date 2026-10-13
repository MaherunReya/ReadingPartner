import { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import MoodChart from "../components/MoodChart";
import MoodPicker from "../components/MoodPicker";
import { addDays, lastNDays, toISODate } from "../dates";
import { useFocus } from "../focusTimer";
import { TAGS, checkInStreak, moodInfo, suggestion, tagLabel, useDeleteMood, useMoodEntries, useSaveMood } from "../mood";

export default function MoodPage() {
  const today = toISODate(new Date());
  const { byDate, isLoading } = useMoodEntries(60);
  const save = useSaveMood();
  const remove = useDeleteMood();
  const { settings, updateSettings } = useFocus();

  const entry = byDate.get(today);
  const [mood, setMood] = useState(null);
  const [tags, setTags] = useState([]);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);

  // Fill the form with today's saved check-in once it loads
  useEffect(() => {
    if (entry) {
      setMood(entry.mood);
      setTags(entry.tags);
      setNote(entry.note ?? "");
    }
  }, [entry?.mood, entry?.note, entry?.tags?.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  function submit(e) {
    e.preventDefault();
    if (!mood) return;
    setSaved(false);
    save.mutate({ date: today, mood, tags, note: note.trim() || null }, { onSuccess: () => setSaved(true) });
  }

  const toggleTag = (id) => setTags((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));

  const stats = useMemo(() => {
    const days30 = lastNDays(30).map((d) => ({
      key: toISODate(d),
      label: d.toLocaleDateString([], { month: "short", day: "numeric" }),
      entry: byDate.get(toISODate(d)) ?? null,
    }));
    const week = lastNDays(7).map((d) => byDate.get(toISODate(d))).filter(Boolean);
    const avg = week.length ? week.reduce((n, e) => n + e.mood, 0) / week.length : null;
    const tagCounts = {};
    days30.forEach((d) => d.entry?.tags.forEach((t) => (tagCounts[t] = (tagCounts[t] || 0) + 1)));
    const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const recent = [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
    const lastFive = [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    const lowRun = lastFive.length >= 3 && lastFive.filter((e) => e.mood <= 2).length >= 3;
    return { days30, avg, topTags, recent, lowRun };
  }, [byDate]);

  const streak = checkInStreak(byDate);
  const todayMood = entry ? entry.mood : mood;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mood check-in</h1>
        <p className="mt-1 text-muted">A quick note to yourself. Only you can see this.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card title="How are you feeling today?">
          <form onSubmit={submit} className="space-y-5">
            <MoodPicker value={mood} onChange={(v) => { setMood(v); setSaved(false); }} />

            <fieldset>
              <legend className="text-sm font-bold text-muted">Anything describe it? (optional)</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {TAGS.map((t) => (
                  <button key={t.id} type="button" aria-pressed={tags.includes(t.id)}
                    onClick={() => { toggleTag(t.id); setSaved(false); }}
                    className={`rounded-full border-2 px-3 py-1 text-sm font-bold transition-colors ${
                      tags.includes(t.id) ? "border-edge bg-brand text-white" : "border-line hover:border-brand"
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="mood-note" className="text-sm font-bold text-muted">A note to yourself (optional)</label>
              <textarea id="mood-note" rows={3} maxLength={500} value={note}
                onChange={(e) => { setNote(e.target.value); setSaved(false); }}
                placeholder="What's on your mind today?"
                className="mt-1 w-full resize-y border border-line bg-surface px-3 py-2" />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={!mood || save.isPending}
                className="btn rounded-xl bg-brand px-6 py-2.5 font-display text-lg font-semibold text-white disabled:opacity-50">
                {entry ? "Update check-in" : "Save check-in"}
              </button>
              {saved && <span role="status" className="text-sm font-bold text-done">Saved. Nice one.</span>}
              {save.isError && <span role="alert" className="text-sm text-overdue">Couldn't save. Try again.</span>}
            </div>
          </form>
        </Card>

        <div className="space-y-6">
          {todayMood ? (
            <div className="sticker bg-sun p-5 text-on-sun">
              <p className="text-xs font-bold uppercase tracking-wide text-on-sun/70">For today</p>
              <p className="mt-1">{suggestion(todayMood)}</p>
              {todayMood <= 2 && (
                <button onClick={() => { updateSettings({ focus: 15 }); setApplied(true); }}
                  className="btn mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white">
                  {settings.focus === 15 || applied ? "Focus rounds set to 15 min" : "Use 15-minute focus rounds"}
                </button>
              )}
            </div>
          ) : (
            <div className="sticker-sm bg-surface p-5 text-sm text-muted">
              Pick a mood and you'll get a suggestion that fits your energy today.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="sticker-sm bg-surface px-4 py-3">
              <p className="text-sm text-muted">7-day average</p>
              <p className="font-display text-2xl font-bold">
                {stats.avg ? <>{moodInfo(Math.round(stats.avg)).emoji} {stats.avg.toFixed(1)}</> : "-"}
              </p>
            </div>
            <div className="sticker-sm bg-surface px-4 py-3">
              <p className="text-sm text-muted">Check-in streak</p>
              <p className="font-display text-2xl font-bold">{streak} day{streak === 1 ? "" : "s"}</p>
            </div>
          </div>

          {stats.lowRun && (
            <p className="rounded-2xl border-2 border-line bg-surface p-4 text-sm text-muted">
              It's been a heavy few days. Talking to a friend, a family member or someone at your university can really help.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Last 30 days" action={stats.topTags.length ? (
          <span className="text-sm text-muted">Most common: {stats.topTags.map(([t]) => tagLabel(t)).join(", ")}</span>
        ) : null}>
          {isLoading ? <div className="h-36 animate-pulse rounded-xl bg-line/60" /> : <MoodChart days={stats.days30} />}
        </Card>

        <Card title="Recent check-ins">
          {stats.recent.length === 0 ? (
            <p className="text-sm text-muted">No check-ins yet. Your first one takes about five seconds.</p>
          ) : (
            <ul className="divide-y divide-line">
              {stats.recent.map((e) => {
                const m = moodInfo(e.mood);
                const d = new Date(`${e.date}T12:00:00`);
                return (
                  <li key={e.date} className="flex items-start gap-3 py-2.5 text-sm">
                    <span className="text-2xl" aria-hidden="true">{m.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">
                        {m.label} <span className="font-normal text-muted">
                          &middot; {e.date === today ? "Today" : d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                        </span>
                      </p>
                      {e.tags.length > 0 && <p className="text-muted">{e.tags.map(tagLabel).join(", ")}</p>}
                      {e.note && <p className="mt-0.5 break-words">{e.note}</p>}
                    </div>
                    <button onClick={() => remove.mutate(e.date)} aria-label={`Remove check-in for ${e.date}`}
                      className="rounded px-2 py-1 text-muted hover:bg-overdue/10 hover:text-overdue">Remove</button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}