import { useState } from "react";
import Card from "../components/Card";
import CheckButton from "../components/CheckButton";
import { lastNDays, toISODate } from "../dates";
import {
  HISTORY_DAYS, METHODS, PRAYERS, SCHOOLS, formatTime, fullDayStreak, loadSettings,
  nextPrayer, saveSettings, untilText, useNow, usePrayerLogs, usePrayerTimes, useTogglePrayer,
} from "../prayers";

const field = "mt-1 w-full rounded-md border border-line bg-surface px-3 py-2";

function SettingsForm({ settings, onSave, onCancel }) {
  const [draft, setDraft] = useState(settings);
  function submit(e) {
    e.preventDefault();
    onSave({
      ...draft,
      city: draft.city.trim() || settings.city,
      country: draft.country.trim() || settings.country,
      method: Number(draft.method),
      school: Number(draft.school),
    });
  }
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="city" className="text-sm font-medium">City</label>
        <input id="city" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} className={field} />
      </div>
      <div>
        <label htmlFor="country" className="text-sm font-medium">Country</label>
        <input id="country" value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })} className={field} />
      </div>
      <div>
        <label htmlFor="method" className="text-sm font-medium">Calculation method</label>
        <select id="method" value={draft.method} onChange={(e) => setDraft({ ...draft, method: e.target.value })} className={field}>
          {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="school" className="text-sm font-medium">Asr calculation</label>
        <select id="school" value={draft.school} onChange={(e) => setDraft({ ...draft, school: e.target.value })} className={field}>
          {SCHOOLS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" className="rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark">Save</button>
        <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 text-muted hover:text-ink">Cancel</button>
      </div>
    </form>
  );
}

export default function Prayers() {
  const [settings, setSettings] = useState(loadSettings);
  const [editing, setEditing] = useState(false);
  const now = useNow();
  const timesQuery = usePrayerTimes(settings);
  const logs = usePrayerLogs();
  const toggle = useTogglePrayer();

  const today = toISODate(now);
  const times = timesQuery.data?.times;
  const next = nextPrayer(times, now);
  const week = lastNDays(7, now);
  const has = (date, id) => logs.done.has(`${date}|${id}`);
  const set = (date, prayer, completed) => toggle.mutate({ date, prayer, completed });

  const doneToday = PRAYERS.filter((p) => has(today, p.id)).length;
  const streak = fullDayStreak(logs.done);
  const weekTotal = week.reduce((n, d) => n + PRAYERS.filter((p) => has(toISODate(d), p.id)).length, 0);
  const monthDays = lastNDays(30, now);
  const monthTotal = monthDays.reduce((n, d) => n + PRAYERS.filter((p) => has(toISODate(d), p.id)).length, 0);
  const monthPct = Math.round((monthTotal / 150) * 100);

  const stats = [
    { label: "Today", value: `${doneToday} / 5` },
    { label: "Full-day streak", value: `${streak}${streak >= HISTORY_DAYS ? "+" : ""} day${streak === 1 ? "" : "s"}` },
    { label: "Last 7 days", value: `${weekTotal} / 35` },
    { label: "Last 30 days", value: `${monthPct}%` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Prayer tracker</h1>
          <p className="mt-1 text-muted">
            {now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}
            {timesQuery.data?.hijri && <> &middot; {timesQuery.data.hijri}</>}
            {" "}&middot; {settings.city}, {settings.country}
          </p>
        </div>
        <button onClick={() => setEditing((v) => !v)} aria-expanded={editing}
          className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:bg-paper">
          Location &amp; method
        </button>
      </div>

      {editing && (
        <Card title="Prayer time settings">
          <SettingsForm settings={settings} onCancel={() => setEditing(false)}
            onSave={(s) => { saveSettings(s); setSettings(s); setEditing(false); }} />
        </Card>
      )}

      {timesQuery.isError && (
        <p role="alert" className="rounded-md bg-overdue/10 px-3 py-2 text-sm text-overdue">
          Couldn't load prayer times. Check your connection or your city and country. You can still log your prayers below.
        </p>
      )}

      {next && (
        <div className="rounded-xl border border-brand/30 bg-brand/5 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink">Next prayer</p>
          <p className="mt-0.5 text-xl font-bold">
            {next.label} <span className="font-medium text-muted">at {formatTime(times[next.id])}{next.tomorrow ? " tomorrow" : ""}</span>
          </p>
          <p className="text-sm text-muted">in {untilText(next.at, now)}</p>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-line bg-surface px-4 py-3">
            <dt className="text-sm text-muted">{s.label}</dt>
            <dd className="text-2xl font-bold">{s.value}</dd>
          </div>
        ))}
      </dl>

      <Card title="Today">
        <ul className="divide-y divide-line">
          {PRAYERS.map((p) => {
            const checked = has(today, p.id);
            const isNext = next && !next.tomorrow && next.id === p.id;
            return (
              <li key={p.id} className="flex items-center gap-4 py-3">
                <CheckButton checked={checked} label={`${p.label}: ${checked ? "prayed" : "not yet"}`}
                  onClick={() => set(today, p.id, !checked)} className="size-6" />
                <div className="flex-1">
                  <p className={`font-medium ${checked ? "text-muted" : ""}`}>{p.label}</p>
                  {isNext && <p className="text-xs font-semibold text-brand-ink">Next</p>}
                </div>
                <span className="text-sm text-muted">{times ? formatTime(times[p.id]) : ""}</span>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="This week" action={<span className="text-sm text-muted">Tap a circle to update a day</span>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-center text-sm">
            <thead>
              <tr>
                <th className="w-24 pb-2 text-left font-medium text-muted"><span className="sr-only">Prayer</span></th>
                {week.map((d) => (
                  <th key={toISODate(d)} className={`pb-2 font-medium ${toISODate(d) === today ? "text-ink" : "text-muted"}`}>
                    {d.toLocaleDateString([], { weekday: "short" })}
                    <span className="block text-xs">{d.getDate()}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PRAYERS.map((p) => (
                <tr key={p.id} className="border-t border-line">
                  <th scope="row" className="py-2 text-left font-medium">{p.label}</th>
                  {week.map((d) => {
                    const date = toISODate(d);
                    const checked = has(date, p.id);
                    return (
                      <td key={date} className={`py-2 ${date === today ? "bg-brand/5" : ""}`}>
                        <CheckButton checked={checked} className="mx-auto"
                          label={`${p.label} on ${d.toLocaleDateString([], { weekday: "long" })}: ${checked ? "prayed" : "not marked"}`}
                          onClick={() => set(date, p.id, !checked)} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-sm text-muted">
        Times come from the Aladhan service for your city and the method you choose, so check them against your local mosque if they differ.
      </p>
    </div>
  );
}