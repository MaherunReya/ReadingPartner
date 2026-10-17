import { useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import api from "../api";
import Card from "../components/Card";
import TimerRing from "../components/TimerRing";
import WeekChart from "../components/WeekChart";
import { lastNDays, toISODate } from "../dates";
import { MODES, formatClock, useFocus, useFocusSessions } from "../focusTimer";

const MODE_ICON = { focus: "timer", short: "coffee", long: "moon" };

// One calm ring colour for work, another for breaks.
const MODE_COLOR = { focus: "var(--color-brand-dark)", short: "var(--color-done)", long: "var(--color-done)" };

function RoundDots({ filled }) {
  return (
    <span className={`size-3.5 rounded-full border-2 border-edge transition-colors ${filled ? "bg-brand-dark" : "bg-line"}`} />
  );
}

function TaskChip({ selected, onClick, children, title }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onClick} title={title}
      className={`max-w-[16rem] truncate rounded-full border-2 px-3.5 py-1.5 text-sm font-bold transition-all duration-150 ${
        selected
          ? "border-edge bg-brand text-on-sun"
          : "border-line bg-surface text-ink hover:border-edge"
      }`}>
      {children}
    </button>
  );
}

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
  const chipTasks = timer.taskId && !openTasks.some((t) => t.id === timer.taskId)
    ? [...openTasks, { id: timer.taskId, title: taskTitle(timer.taskId) ?? "Selected task" }]
    : openTasks;
  const filled = timer.mode === "long" ? 4 : timer.cycle % 4;
  const progress = f.totalMs ? 1 - f.remainingMs / f.totalMs : 0;
  const running_ = timer.status === "running";
  const statusLabel = timer.status === "paused"
    ? "Paused"
    : timer.mode === "focus"
      ? (running_ ? "Focusing" : "Ready to focus")
      : (running_ ? "On a break" : "Ready for a break");
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
          <div role="tablist" aria-label="Timer mode" className="mx-auto flex w-fit gap-2">
            {Object.entries(MODES).map(([id, m]) => (
              <button key={id} role="tab" aria-selected={timer.mode === id} disabled={running}
                onClick={() => f.setMode(id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold transition-colors disabled:cursor-not-allowed ${
                  timer.mode === id ? "bg-brand text-on-sun" : "text-muted hover:bg-line/60 disabled:opacity-50"
                }`}>
                <Icon name={MODE_ICON[id]} className="size-4" /> {m.label}
              </button>
            ))}
          </div>

          <div className="relative mx-auto mt-6 w-fit max-w-full">
            <TimerRing progress={progress} color={MODE_COLOR[timer.mode]} size={260} stroke={14}>
              <span className="font-display text-6xl font-bold tabular-nums" role="timer" aria-live="off">
                {formatClock(f.remainingMs)}
              </span>
              <span className="mt-2 text-sm font-bold text-muted">
                {statusLabel}
              </span>
            </TimerRing>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {running ? (
              <button onClick={f.pause} className="btn inline-flex items-center gap-2 rounded-xl bg-sun px-8 py-3 font-display text-lg font-semibold text-on-sun">
                <Icon name="pause" className="size-5" /> Pause
              </button>
            ) : (
              <button onClick={f.start} className="btn inline-flex items-center gap-2 rounded-xl bg-brand px-8 py-3 font-display text-lg font-semibold text-on-sun">
                <Icon name="play" filled className="size-5" /> {timer.status === "paused" ? "Resume" : "Start"}
              </button>
            )}
            <button onClick={f.reset} disabled={idle}
              className="btn inline-flex items-center gap-2 rounded-xl bg-surface px-5 py-3 font-bold disabled:opacity-50"><Icon name="reset" className="size-4" /> Reset</button>
            <button onClick={f.skip}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-3 font-bold text-muted hover:text-ink">
              <Icon name="skip" className="size-4" /> Skip {timer.mode === "focus" ? "to break" : "break"}
            </button>
          </div>

          <div className="mt-5 flex items-center justify-center gap-2" role="img" aria-label={`${filled} of 4 rounds before a long break`}>
            {[0, 1, 2, 3].map((i) => <RoundDots key={i} filled={i < filled} />)}
          </div>

          <div className="mx-auto mt-6 max-w-md">
            <div className="sticker-sm bg-sun px-4 py-3 text-on-sun">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider opacity-70"><Icon name="pin" className="size-3.5" /> Now working on</p>
              <p className="mt-0.5 break-words font-display text-lg font-bold leading-snug">
                {timer.taskId ? (taskTitle(timer.taskId) ?? "Selected task") : "Just focusing"}
              </p>
            </div>
            <p id="focus-task-label" className="mt-4 text-sm font-bold text-muted">Pick something to focus on</p>
            <div role="radiogroup" aria-labelledby="focus-task-label" className="mt-2 flex max-h-32 flex-wrap gap-2 overflow-y-auto p-1">
              <TaskChip selected={!timer.taskId} onClick={() => f.setTask(null)}>Just focusing</TaskChip>
              {chipTasks.map((t) => (
                <TaskChip key={t.id} selected={timer.taskId === t.id} onClick={() => f.setTask(t.id)} title={t.title}>{t.title}</TaskChip>
              ))}
            </div>
            {openTasks.length === 0 && (
              <p className="mt-2 text-xs text-muted">No open tasks yet. Add some on the dashboard and they'll show up here.</p>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="sticker-sm bg-surface px-4 py-3">
              <p className="flex items-center gap-1.5 text-sm text-muted"><Icon name="clock" className="size-4" /> Focused today</p>
              <p className="font-display text-2xl font-bold">{hours ? `${hours}h ${mins}m` : `${mins}m`}</p>
            </div>
            <div className="sticker-sm bg-surface px-4 py-3">
              <p className="flex items-center gap-1.5 text-sm text-muted"><Icon name="timer" className="size-4" /> Rounds today</p>
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