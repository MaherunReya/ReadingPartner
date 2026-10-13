import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import api from "../api";
import Card from "../components/Card";
import TimerRing from "../components/TimerRing";
import WeekChart from "../components/WeekChart";
import { lastNDays, toISODate } from "../dates";
import { MODES, formatClock, useFocus, useFocusSessions } from "../focusTimer";

function SettingsForm() {
  const { settings, updateSettings } = useFocus();
  const [draft, setDraft] = useState({ focus: settings.focus, short: settings.short, long: settings.long });

  function commit(key) {
    const n = Math.round(Number(draft[key]));
    const value = Number.isFinite(n) ? Math.min(180, Math.max(1, n)) : settings[key];
    setDraft((d) => ({ ...d, [key]: value }));
    updateSettings({ [key]: value });
  }

  const fields = [
    { key: "focus", label: "Focus" },
    { key: "short", label: "Short break" },
    { key: "long", label: "Long break" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold text-muted">Length in minutes</p>
      <div className="grid grid-cols-3 items-end gap-3">
        {fields.map((f) => (
          <div key={f.key}>
            <label htmlFor={`set-${f.key}`} className="text-xs font-bold text-muted">{f.label}</label>
            <input id={`set-${f.key}`} type="number" min={1} max={180} inputMode="numeric"
              value={draft[f.key]}
              onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
              onBlur={() => commit(f.key)}
              className="mt-1 w-full border border-line bg-surface px-3 py-2" />
          </div>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" checked={settings.sound} onChange={(e) => updateSettings({ sound: e.target.checked })}
          className="size-4 accent-brand" />
        Play a sound when a session ends
      </label>
      <p className="text-xs text-muted">Changes apply to the next session you start.</p>
    </div>
  );
}

export default function FocusPage() {
  const f = useFocus();
  const { timer } = f;
  const [params] = useSearchParams();
  const sessionsQuery = useFocusSessions(14);
  const tasksQuery = useQuery({ queryKey: ["tasks"], queryFn: () => api.get("/tasks").then((r) => r.data) });
  const openTasks = (tasksQuery.data ?? []).filter((t) => !t.completed);
  const running = timer.status === "running";
  const idle = timer.status === "idle";

  // /focus?task=12 (from the dashboard's "Focus on this" button) preselects a task
  useEffect(() => {
    const id = Number(params.get("task"));
    if (id && timer.status === "idle") f.setTask(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const sessions = sessionsQuery.data ?? [];
    const perDay = {};
    sessions.forEach((s) => {
      const k = toISODate(new Date(s.completed_at));
      perDay[k] = (perDay[k] || 0) + s.minutes;
    });
    const todayKey = toISODate(new Date());
    const days = lastNDays(7).map((d) => ({
      key: toISODate(d),
      label: d.toLocaleDateString([], { weekday: "short" }),
      count: perDay[toISODate(d)] || 0,
      isToday: toISODate(d) === todayKey,
    }));
    const today = sessions.filter((s) => toISODate(new Date(s.completed_at)) === todayKey);
    return {
      days,
      today,
      todayMinutes: perDay[todayKey] || 0,
      weekMinutes: days.reduce((n, d) => n + d.count, 0),
    };
  }, [sessionsQuery.data]);

  const taskTitle = (id) => (tasksQuery.data ?? []).find((t) => t.id === id)?.title;
  const filled = timer.mode === "long" ? 4 : timer.cycle % 4;
  const progress = f.totalMs ? 1 - f.remainingMs / f.totalMs : 0;
  const ringColor = timer.mode === "focus" ? "var(--color-brand)" : "var(--color-done)";
  const hours = Math.floor(stats.todayMinutes / 60);
  const mins = stats.todayMinutes % 60;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Focus timer</h1>
        <p className="mt-1 text-muted">Work in short, focused rounds with breaks in between. Four rounds earns a long break.</p>
      </div>

      {f.notice && (
        <div role="status" className="sticker flex items-center justify-between gap-4 bg-sun px-5 py-3 font-bold text-on-sun">
          <span>{f.notice}</span>
          <button onClick={f.dismissNotice} aria-label="Dismiss" className="text-xl leading-none">&times;</button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <div role="tablist" aria-label="Timer mode" className="mx-auto flex w-fit gap-1 rounded-xl border-2 border-edge bg-surface p-1">
            {Object.entries(MODES).map(([id, m]) => (
              <button key={id} role="tab" aria-selected={timer.mode === id} disabled={running}
                onClick={() => f.setMode(id)}
                className={`rounded-lg px-4 py-1.5 text-sm font-bold transition-colors disabled:cursor-not-allowed ${
                  timer.mode === id ? "bg-brand text-white" : "text-muted hover:text-ink disabled:opacity-50"
                }`}>
                {m.label}
              </button>
            ))}
          </div>

          <div className="mt-8">
            <TimerRing progress={progress} color={ringColor}>
              <span className="font-display text-6xl font-bold tabular-nums" role="timer" aria-live="off">
                {formatClock(f.remainingMs)}
              </span>
              <span className="mt-1 text-sm font-bold text-muted">
                {timer.status === "paused" ? "Paused" : MODES[timer.mode].label}
              </span>
            </TimerRing>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {running ? (
              <button onClick={f.pause} className="btn rounded-xl bg-sun px-8 py-3 font-display text-lg font-semibold text-on-sun">
                Pause
              </button>
            ) : (
              <button onClick={f.start} className="btn rounded-xl bg-brand px-8 py-3 font-display text-lg font-semibold text-white">
                {timer.status === "paused" ? "Resume" : "Start"}
              </button>
            )}
            <button onClick={f.reset} disabled={idle}
              className="btn rounded-xl bg-surface px-5 py-3 font-bold disabled:opacity-50">Reset</button>
            <button onClick={f.skip}
              className="rounded-xl px-4 py-3 font-bold text-muted hover:text-ink">
              Skip {timer.mode === "focus" ? "to break" : "break"}
            </button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2" role="img" aria-label={`${filled} of 4 rounds before a long break`}>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`size-3.5 rounded-full border-2 border-edge ${i < filled ? "bg-brand" : "bg-surface"}`} />
            ))}
          </div>

          <div className="mx-auto mt-8 max-w-sm">
            <label htmlFor="focus-task" className="text-sm font-bold text-muted">What are you working on?</label>
            <select id="focus-task" value={timer.taskId ?? ""}
              onChange={(e) => f.setTask(e.target.value ? Number(e.target.value) : null)}
              className="mt-1 w-full border border-line bg-surface px-3 py-2">
              <option value="">Just focusing</option>
              {openTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              {timer.taskId && !openTasks.some((t) => t.id === timer.taskId) && (
                <option value={timer.taskId}>{taskTitle(timer.taskId) ?? "Selected task"}</option>
              )}
            </select>
          </div>
        </Card>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="sticker-sm bg-surface px-4 py-3">
              <p className="text-sm text-muted">Focused today</p>
              <p className="font-display text-2xl font-bold">{hours ? `${hours}h ${mins}m` : `${mins}m`}</p>
            </div>
            <div className="sticker-sm bg-surface px-4 py-3">
              <p className="text-sm text-muted">Rounds today</p>
              <p className="font-display text-2xl font-bold">{stats.today.length}</p>
            </div>
          </div>
          <Card title="Timer settings"><SettingsForm /></Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Last 7 days" action={<span className="text-sm text-muted">{stats.weekMinutes} min focused</span>}>
          <WeekChart days={stats.days} />
        </Card>

        <Card title="Today's rounds">
          {stats.today.length === 0 ? (
            <p className="text-sm text-muted">No rounds yet today. Start the timer to log your first one.</p>
          ) : (
            <ul className="divide-y divide-line">
              {stats.today.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0 break-words font-bold">{taskTitle(s.task_id) ?? "Just focusing"}</span>
                  <span className="shrink-0 text-muted">
                    {s.minutes} min &middot; {new Date(s.completed_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}