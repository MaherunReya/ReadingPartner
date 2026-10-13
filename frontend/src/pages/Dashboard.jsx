import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api";
import Card from "../components/Card";
import PrayerToday from "../components/PrayerToday";
import ProgressRing from "../components/ProgressRing";
import SubjectProgress from "../components/SubjectProgress";
import TaskForm from "../components/TaskForm";
import TaskItem from "../components/TaskItem";
import Toast from "../components/Toast";
import WeekChart from "../components/WeekChart";
import { addDays, lastNDays, toISODate } from "../dates";

const WEEK = 7 * 24 * 60 * 60 * 1000;
const STATUS_TABS = [
  { id: "open", label: "To do" },
  { id: "done", label: "Done" },
  { id: "all", label: "All" },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

const doneDay = (t) => toISODate(new Date(t.completed_at ?? t.updated_at ?? t.created_at));

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("open");
  const [subject, setSubject] = useState("");
  const [toast, setToast] = useState(null);

  const me = useQuery({ queryKey: ["me"], queryFn: () => api.get("/auth/me").then((r) => r.data) });
  const tasksQuery = useQuery({ queryKey: ["tasks"], queryFn: () => api.get("/tasks").then((r) => r.data) });
  const tasks = tasksQuery.data ?? [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["tasks"] });
  const createTask = useMutation({ mutationFn: (body) => api.post("/tasks", body), onSuccess: refresh });
  const updateTask = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/tasks/${id}`, body),
    onSuccess: refresh,
  });
  const deleteTask = useMutation({ mutationFn: (id) => api.delete(`/tasks/${id}`), onSuccess: refresh });

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(id);
  }, [toast]);

  const subjects = useMemo(
    () => [...new Set(tasks.map((t) => t.subject).filter(Boolean))].sort(),
    [tasks]
  );

  const stats = useMemo(() => {
    const now = Date.now();
    const open = tasks.filter((t) => !t.completed);
    const done = tasks.filter((t) => t.completed);
    const overdue = open.filter((t) => t.deadline && new Date(t.deadline) < now).length;
    const dueSoon = open.filter((t) => {
      const d = t.deadline && new Date(t.deadline);
      return d && d >= now && d - now < WEEK;
    }).length;

    const perDay = {};
    done.forEach((t) => { const k = doneDay(t); perDay[k] = (perDay[k] || 0) + 1; });
    const todayKey = toISODate(new Date());
    const days = lastNDays(7).map((d) => ({
      key: toISODate(d),
      label: d.toLocaleDateString([], { weekday: "short" }),
      count: perDay[toISODate(d)] || 0,
      isToday: toISODate(d) === todayKey,
    }));

    let streak = 0;
    let cursor = new Date();
    if (!perDay[todayKey]) cursor = addDays(cursor, -1); // an empty today doesn't break the streak
    while (perDay[toISODate(cursor)]) { streak += 1; cursor = addDays(cursor, -1); }

    const bySubject = {};
    tasks.forEach((t) => {
      if (!t.subject) return;
      bySubject[t.subject] ??= { name: t.subject, done: 0, total: 0 };
      bySubject[t.subject].total += 1;
      if (t.completed) bySubject[t.subject].done += 1;
    });

    const next = open
      .filter((t) => t.deadline)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0] ?? open[0];

    return {
      open: open.length, done: done.length, overdue, dueSoon, days, streak,
      todayDone: perDay[todayKey] || 0,
      weekDone: days.reduce((n, d) => n + d.count, 0),
      pct: tasks.length ? Math.round((done.length / tasks.length) * 100) : 0,
      subjects: Object.values(bySubject).sort((a, b) => a.name.localeCompare(b.name)),
      next,
    };
  }, [tasks]);

  function handleToggle(task) {
    const completing = !task.completed;
    updateTask.mutate({ id: task.id, completed: completing }, {
      onSuccess: () => {
        if (!completing) return;
        const n = stats.todayDone + 1;
        setToast({
          message: n === 1 ? "Nice. First task done today." : `Nice. ${n} tasks done today.`,
          undo: () => updateTask.mutate({ id: task.id, completed: false }),
        });
      },
    });
  }

  function handleDelete(task) {
    deleteTask.mutate(task.id, {
      onSuccess: () =>
        setToast({
          message: "Task deleted.",
          undo: async () => {
            const { data } = await api.post("/tasks", {
              title: task.title, description: task.description,
              subject: task.subject, deadline: task.deadline,
            });
            if (task.completed) await api.patch(`/tasks/${data.id}`, { completed: true });
            refresh();
          },
        }),
    });
  }

  const visible = tasks.filter(
    (t) =>
      (status === "all" || (status === "done") === t.completed) &&
      (!subject || t.subject === subject)
  );

  const error = [createTask, updateTask, deleteTask, tasksQuery].map((m) => m.error).find(Boolean);
  const firstName = (me.data?.name || "").split(" ")[0];
  const summary = tasks.length === 0
    ? "Add your first assignment to get started."
    : stats.open === 0
      ? "You're all caught up."
      : [`${stats.open} to do`, stats.overdue && `${stats.overdue} overdue`, stats.dueSoon && `${stats.dueSoon} due this week`]
          .filter(Boolean).join(" \u00b7 ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{greeting()}{firstName ? `, ${firstName}` : ""}</h1>
        <p className="mt-1 text-muted">
          {new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })} &middot; {summary}
        </p>
      </div>

      {stats.next && (
        <div className="sticker flex flex-wrap items-center justify-between gap-3 bg-sun px-5 py-4 text-on-sun">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-on-sun/70">Up next</p>
            <p className="mt-0.5 break-words font-display text-lg font-semibold">{stats.next.title}</p>
            {stats.next.deadline && (
              <p className="text-sm text-on-sun/70">
                Due {new Date(stats.next.deadline).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/focus?task=${stats.next.id}`}
              className="btn rounded-xl bg-surface px-4 py-2 text-sm font-bold text-ink">
              Focus on this
            </Link>
            <button onClick={() => handleToggle(stats.next)}
              className="btn rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white">
              Mark done
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Progress">
          <div className="flex items-center gap-5">
            <ProgressRing value={stats.pct} />
            <dl className="space-y-1 text-sm">
              <div className="flex gap-2"><dt className="w-16 text-muted">To do</dt><dd className="font-semibold">{stats.open}</dd></div>
              <div className="flex gap-2"><dt className="w-16 text-muted">Overdue</dt>
                <dd className={`font-semibold ${stats.overdue ? "text-overdue" : ""}`}>{stats.overdue}</dd></div>
              <div className="flex gap-2"><dt className="w-16 text-muted">Done</dt><dd className="font-semibold">{stats.done}</dd></div>
            </dl>
          </div>
          <p className="mt-4 text-sm text-muted">
            {stats.streak > 0
              ? `${stats.streak}-day streak. Complete a task today to keep it going.`
              : "Complete a task to start a streak."}
          </p>
        </Card>

        <Card title="This week" action={<span className="text-sm text-muted">{stats.weekDone} completed</span>}>
          <WeekChart days={stats.days} />
        </Card>

        <PrayerToday />
      </div>

      <Card title="Add a task">
        <TaskForm subjects={subjects} busy={createTask.isPending} onAdd={(body) => createTask.mutate(body)} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
        <section aria-label="Your tasks">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" className="flex gap-1 rounded-xl border-2 border-edge bg-surface p-1">
              {STATUS_TABS.map((tab) => (
                <button key={tab.id} role="tab" aria-selected={status === tab.id} onClick={() => setStatus(tab.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-bold transition-colors ${
                    status === tab.id ? "bg-brand text-white" : "text-muted hover:text-ink"
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>
            {subject && (
              <button onClick={() => setSubject("")}
                className="rounded-full bg-brand/10 px-3 py-1 text-sm text-brand-ink hover:bg-brand/20">
                {subject} &times;
              </button>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-md bg-overdue/10 px-3 py-2 text-sm text-overdue">
              {errorMessage(error)}
            </p>
          )}

          {tasksQuery.isLoading ? (
            <div className="mt-4 space-y-2" aria-busy="true">
              {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-line/60" />)}
            </div>
          ) : visible.length === 0 ? (
            <p className="mt-4 rounded-2xl border-2 border-dashed border-line px-4 py-10 text-center text-muted">
              {tasks.length === 0
                ? "No tasks yet. Add your first assignment above."
                : status === "open" && !subject
                  ? "Nothing left to do. Enjoy the break."
                  : "Nothing here. Try a different filter."}
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {visible.map((task) => (
                <TaskItem key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete}
                  onEdit={(t, fields) => updateTask.mutate({ id: t.id, ...fields })} />
              ))}
            </ul>
          )}
        </section>

        <Card title="By subject" className="h-fit">
          <SubjectProgress subjects={stats.subjects} selected={subject} onSelect={setSubject} />
        </Card>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}