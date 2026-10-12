import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api";
import Card from "../components/Card";
import Toast from "../components/Toast";
import WeekChart from "../components/WeekChart";
import { addDays, lastNDays, pad, toISODate } from "../dates";

const TOMATO = "\uD83C\uDF45";
const SETTINGS_KEY = "studyguide_focus_settings";
const MUTE_KEY = "studyguide_focus_muted";
const DEFAULTS = { focus: 25, short: 5, long: 15 };
const LIMITS = { focus: [1, 90], short: [1, 30], long: [1, 60] };
const ROUNDS_PER_SET = 4;

const MODES = {
  focus: { label: "Focus", mascot: TOMATO, bg: "bg-pink", hint: "Deep work. Phone away." },
  short: { label: "Short break", mascot: "\uD83C\uDF75", bg: "bg-mint", hint: "Sip some water. Stretch." },
  long: { label: "Long break", mascot: "\uD83D\uDECB\uFE0F", bg: "bg-sky", hint: "You earned this one." },
};

const CHEERS = [
  "Tomato-ly crushed it!",
  "That's one juicy session.",
  "Focus level: legendary.",
  "Look at you go!",
  "Another tomato in the basket.",
];
const CONFETTI = ["\uD83C\uDF45", "\u2728", "\uD83C\uDF89", "\u2B50", "\uD83D\uDD25"];

function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch {
    return DEFAULTS;
  }
}

function loadMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function clock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

function Ring({ progress, size = 280, stroke = 16, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto aspect-square" style={{ width: size, maxWidth: "100%" }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="#fff" stroke="rgba(31,23,71,0.15)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1f1747" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - progress)}
          style={{ transition: "stroke-dashoffset 300ms linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-on-sun">{children}</div>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`Decrease ${label}`} disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="btn size-8 rounded-lg bg-surface font-bold disabled:opacity-40">&minus;</button>
        <span className="w-12 text-center font-display font-semibold tabular-nums">{value}m</span>
        <button type="button" aria-label={`Increase ${label}`} disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="btn size-8 rounded-lg bg-surface font-bold disabled:opacity-40">+</button>
      </div>
    </div>
  );
}

export default function Focus() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState(loadSettings);
  const [mode, setMode] = useState("focus");
  const [running, setRunning] = useState(false);
  const [endAt, setEndAt] = useState(null);
  const [left, setLeft] = useState(() => loadSettings().focus * 60000);
  const [round, setRound] = useState(0); // focus sessions finished in the current set of four
  const [taskId, setTaskId] = useState("");
  const [muted, setMuted] = useState(loadMuted);
  const [toast, setToast] = useState(null);
  const [burst, setBurst] = useState(0);
  const audioRef = useRef(null);
  const finishRef = useRef(() => {});

  const total = settings[mode] * 60000;
  const info = MODES[mode];

  // ---- data ----
  const sessionsQuery = useQuery({
    queryKey: ["focus"],
    queryFn: () => api.get("/focus", { params: { days: 30 } }).then((r) => r.data),
  });
  const tasksQuery = useQuery({ queryKey: ["tasks"], queryFn: () => api.get("/tasks").then((r) => r.data) });
  const openTasks = (tasksQuery.data ?? []).filter((t) => !t.completed);
  const task = openTasks.find((t) => String(t.id) === taskId);

  const logSession = useMutation({
    mutationFn: (body) => api.post("/focus", body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["focus"] }),
  });
  const markDone = useMutation({
    mutationFn: (id) => api.patch(`/tasks/${id}`, { completed: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setTaskId("");
      setToast({ message: "Task done. Nice work." });
    },
  });

  const stats = useMemo(() => {
    const perDay = {};
    let todayMinutes = 0;
    const todayKey = toISODate(new Date());
    (sessionsQuery.data ?? []).forEach((s) => {
      const key = toISODate(new Date(s.completed_at));
      perDay[key] = (perDay[key] || 0) + 1;
      if (key === todayKey) todayMinutes += s.minutes;
    });
    let streak = 0;
    let cursor = new Date();
    if (!perDay[todayKey]) cursor = addDays(cursor, -1); // an empty today doesn't break the streak
    while (perDay[toISODate(cursor)]) { streak += 1; cursor = addDays(cursor, -1); }
    const days = lastNDays(7).map((d) => ({
      key: toISODate(d),
      label: d.toLocaleDateString([], { weekday: "short" }),
      count: perDay[toISODate(d)] || 0,
      isToday: toISODate(d) === todayKey,
    }));
    return { today: perDay[todayKey] || 0, todayMinutes, streak, days };
  }, [sessionsQuery.data]);

  // ---- sound (Web Audio, no asset needed) ----
  function ensureAudio() {
    if (audioRef.current) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioRef.current = new Ctx();
  }

  function chime() {
    const ctx = audioRef.current;
    if (muted || !ctx) return;
    [660, 880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + i * 0.18;
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  }

  // ---- timer ----
  function switchMode(next, nextSettings = settings) {
    setMode(next);
    setRunning(false);
    setEndAt(null);
    setLeft(nextSettings[next] * 60000);
  }

  function start() {
    ensureAudio();
    audioRef.current?.resume?.();
    setEndAt(Date.now() + left);
    setRunning(true);
  }

  function pause() {
    setLeft(Math.max(0, endAt - Date.now()));
    setRunning(false);
  }

  function reset() {
    setRunning(false);
    setEndAt(null);
    setLeft(total);
  }

  function skip() {
    if (mode === "focus") switchMode(round + 1 >= ROUNDS_PER_SET ? "long" : "short");
    else {
      if (mode === "long") setRound(0);
      switchMode("focus");
    }
  }

  function finish() {
    chime();
    if (mode === "focus") {
      logSession.mutate({ minutes: settings.focus, subject: task?.subject ?? null });
      setBurst((b) => b + 1);
      const nextRound = round + 1;
      setRound(nextRound);
      setToast({ message: CHEERS[Math.floor(Math.random() * CHEERS.length)] });
      switchMode(nextRound >= ROUNDS_PER_SET ? "long" : "short");
    } else {
      if (mode === "long") setRound(0);
      setToast({ message: "Break's over. Ready for another?" });
      switchMode("focus");
    }
  }
  finishRef.current = finish;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const ms = endAt - Date.now();
      if (ms <= 0) finishRef.current();
      else setLeft(ms);
    }, 250);
    return () => clearInterval(id);
  }, [running, endAt]);

  // Show the countdown in the browser tab.
  useEffect(() => {
    if (!running) return undefined;
    document.title = `${clock(left)} \u00b7 ${info.label}`;
    return () => { document.title = "Study Guide"; };
  }, [running, left, info.label]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  function updateSetting(key, value) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* session only */ }
    if (key === mode && !running) setLeft(value * 60000);
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    try { localStorage.setItem(MUTE_KEY, next ? "1" : "0"); } catch { /* session only */ }
  }

  const particles = useMemo(
    () => Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 140 + Math.random() * 90;
      return {
        emoji: CONFETTI[i % CONFETTI.length],
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        rot: Math.round(Math.random() * 360 - 180),
        delay: Math.random() * 0.15,
      };
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [burst]
  );

  const progress = total ? Math.min(1, Math.max(0, 1 - left / total)) : 0;

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes focus-bob { 0%,100% { transform: translateY(0) rotate(-5deg); } 50% { transform: translateY(-8px) rotate(5deg); } }
        @keyframes focus-pop { 0% { transform: translate(0,0) scale(.3); opacity: 1; } 100% { transform: translate(var(--dx),var(--dy)) scale(1.3) rotate(var(--rot)); opacity: 0; } }
      `}</style>

      <div>
        <h1 className="text-3xl font-bold">Focus timer</h1>
        <p className="mt-1 text-muted">
          {stats.today === 0
            ? "No tomatoes yet today. Start your first one."
            : `${stats.today} ${stats.today === 1 ? "tomato" : "tomatoes"} today \u00b7 ${stats.todayMinutes} min focused`}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className={`sticker relative overflow-hidden p-5 transition-colors duration-300 sm:p-8 ${info.bg}`}
          aria-label="Timer">
          <div role="tablist" aria-label="Timer mode"
            className="mx-auto flex w-fit max-w-full flex-wrap justify-center gap-1 rounded-xl border-2 border-edge bg-surface p-1">
            {Object.entries(MODES).map(([id, m]) => (
              <button key={id} role="tab" aria-selected={mode === id} onClick={() => switchMode(id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold transition-colors ${
                  mode === id ? "bg-brand text-white" : "text-muted hover:text-ink"
                }`}>
                {m.label}
              </button>
            ))}
          </div>

          <div className="relative mt-6">
            <Ring progress={progress}>
              <span className="text-6xl leading-none" aria-hidden="true"
                style={running ? { animation: "focus-bob 1.6s ease-in-out infinite" } : undefined}>
                {info.mascot}
              </span>
              <span className="mt-2 font-display text-6xl font-bold tabular-nums" role="timer" aria-live="off">
                {clock(left)}
              </span>
              <span className="mt-1 text-sm font-semibold text-on-sun/70">{info.hint}</span>
            </Ring>

            {/* confetti when a focus session finishes */}
            <div key={burst} className="pointer-events-none absolute inset-0 flex items-center justify-center motion-reduce:hidden" aria-hidden="true">
              {burst > 0 && particles.map((p, i) => (
                <span key={i} className="absolute text-2xl"
                  style={{
                    "--dx": `${p.dx}px`, "--dy": `${p.dy}px`, "--rot": `${p.rot}deg`,
                    animation: `focus-pop 1.1s ease-out ${p.delay}s both`,
                  }}>
                  {p.emoji}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {running ? (
              <button onClick={pause} className="btn rounded-2xl bg-sun px-8 py-3 text-lg font-bold text-on-sun">Pause</button>
            ) : (
              <button onClick={start} className="btn rounded-2xl bg-brand px-8 py-3 text-lg font-bold text-white">
                {left < total ? "Resume" : "Start"}
              </button>
            )}
            <button onClick={reset} className="btn rounded-2xl bg-surface px-4 py-3 font-bold">Reset</button>
            <button onClick={skip} className="btn rounded-2xl bg-surface px-4 py-3 font-bold">Skip</button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2" aria-label={`${round} of ${ROUNDS_PER_SET} sessions done in this set`}>
            {Array.from({ length: ROUNDS_PER_SET }, (_, i) => (
              <span key={i} className={`text-2xl transition-all duration-300 ${i < round ? "scale-110" : "opacity-30 grayscale"}`} aria-hidden="true">
                {TOMATO}
              </span>
            ))}
          </div>
          <p className="mt-1 text-center text-xs font-semibold text-on-sun/70">
            {round >= ROUNDS_PER_SET ? "Set complete. Long break time." : `${ROUNDS_PER_SET - round} more for a long break`}
          </p>

          <div className="mx-auto mt-6 max-w-sm">
            <label htmlFor="focus-task" className="mb-1 block text-xs font-bold uppercase tracking-wide text-on-sun/70">
              Working on
            </label>
            <div className="flex gap-2">
              <select id="focus-task" value={taskId} onChange={(e) => setTaskId(e.target.value)}
                className="min-w-0 flex-1 border-edge bg-surface px-3 py-2 text-sm text-ink">
                <option value="">Nothing in particular</option>
                {openTasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.subject ? `${t.subject}: ` : ""}{t.title}</option>
                ))}
              </select>
              {task && (
                <button onClick={() => markDone.mutate(task.id)} disabled={markDone.isPending}
                  className="btn shrink-0 rounded-xl bg-surface px-3 py-2 text-sm font-bold">
                  Done
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <Card title="Your focus">
            <dl className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-pink/40 px-2 py-3">
                <dd className="font-display text-2xl font-bold">{stats.today}</dd>
                <dt className="text-xs text-muted">today</dt>
              </div>
              <div className="rounded-xl bg-sun/50 px-2 py-3">
                <dd className="font-display text-2xl font-bold">{stats.todayMinutes}</dd>
                <dt className="text-xs text-muted">minutes</dt>
              </div>
              <div className="rounded-xl bg-mint/50 px-2 py-3">
                <dd className="font-display text-2xl font-bold">{stats.streak}</dd>
                <dt className="text-xs text-muted">day streak</dt>
              </div>
            </dl>
            <p className="mt-3 text-sm text-muted">
              {stats.streak > 0
                ? "Finish a session today to keep your streak alive."
                : "Finish a session to start a streak."}
            </p>
          </Card>

          <Card title="Sessions this week">
            <WeekChart days={stats.days} />
          </Card>

          <Card title="Settings" action={
            <button onClick={toggleMute} aria-pressed={muted}
              className="rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold text-brand-ink hover:bg-brand/20">
              {muted ? "\uD83D\uDD15 Muted" : "\uD83D\uDD14 Sound on"}
            </button>
          }>
            <div className="space-y-3">
              <Stepper label="Focus" value={settings.focus} min={LIMITS.focus[0]} max={LIMITS.focus[1]}
                onChange={(v) => updateSetting("focus", v)} />
              <Stepper label="Short break" value={settings.short} min={LIMITS.short[0]} max={LIMITS.short[1]}
                onChange={(v) => updateSetting("short", v)} />
              <Stepper label="Long break" value={settings.long} min={LIMITS.long[0]} max={LIMITS.long[1]}
                onChange={(v) => updateSetting("long", v)} />
            </div>
          </Card>
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}