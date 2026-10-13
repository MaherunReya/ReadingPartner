import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "./api";

export const MODES = {
  focus: { label: "Focus" },
  short: { label: "Short break" },
  long: { label: "Long break" },
};

const SETTINGS_KEY = "studyguide_focus_settings";
const TIMER_KEY = "studyguide_focus_timer";
const DEFAULT_SETTINGS = { focus: 25, short: 5, long: 15, sound: true };
const IDLE = { mode: "focus", status: "idle", endAt: null, remaining: null, cycle: 0, taskId: null };
const STALE_MS = 5 * 60 * 1000; // a timer that ended long ago is dropped, not counted

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: the timer still works, it just won't survive a refresh */
  }
}

function initialTimer() {
  const t = { ...IDLE, ...load(TIMER_KEY, {}) };
  if (t.status === "running" && (!t.endAt || t.endAt < Date.now() - STALE_MS)) {
    return { ...t, status: "idle", endAt: null, remaining: null };
  }
  return t;
}

export function formatClock(ms) {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const FocusContext = createContext(null);

export function FocusProvider({ children }) {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...load(SETTINGS_KEY, {}) }));
  const [timer, setTimer] = useState(initialTimer);
  const [now, setNow] = useState(Date.now());
  const [notice, setNotice] = useState(null);

  // Refs let the completion handler read the latest values without re-subscribing.
  const timerRef = useRef(timer);
  const settingsRef = useRef(settings);
  const audioRef = useRef(null);
  timerRef.current = timer;
  settingsRef.current = settings;

  const record = useMutation({
    mutationFn: (body) => api.post("/focus", body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["focus"] }),
    onError: () => setNotice("That session couldn't be saved. Check your connection."),
  });

  useEffect(() => save(TIMER_KEY, timer), [timer]);

  const beep = useCallback(() => {
    const ctx = audioRef.current;
    if (!ctx || !settingsRef.current.sound) return;
    [0, 0.25, 0.5].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.2, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.2);
    });
  }, []);

  const complete = useCallback(() => {
    const t = timerRef.current;
    if (t.status !== "running") return; // guards against completing twice
    timerRef.current = { ...t, status: "idle" };
    beep();
    if (t.mode === "focus") {
      record.mutate({ minutes: settingsRef.current.focus, task_id: t.taskId });
      const cycle = t.cycle + 1;
      const next = cycle % 4 === 0 ? "long" : "short";
      setTimer({ ...t, mode: next, status: "idle", endAt: null, remaining: null, cycle });
      setNotice(next === "long" ? "Four rounds done. Take a long break." : "Focus session done. Take a short break.");
    } else {
      setTimer({ ...t, mode: "focus", status: "idle", endAt: null, remaining: null });
      setNotice("Break's over. Ready for another round?");
    }
  }, [beep, record]);

  // Tick while running. Time is measured against endAt, so a throttled background tab stays accurate.
  useEffect(() => {
    if (timer.status !== "running") return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timer.status]);

  useEffect(() => {
    if (timer.status === "running" && timer.endAt && now >= timer.endAt) complete();
  }, [now, timer, complete]);

  const remainingMs =
    timer.status === "running" ? Math.max(0, timer.endAt - now)
    : timer.status === "paused" ? timer.remaining
    : settings[timer.mode] * 60000;

  useEffect(() => {
    document.title = timer.status === "idle"
      ? "Study Guide"
      : `${formatClock(remainingMs)} ${MODES[timer.mode].label} | Study Guide`;
    return () => { document.title = "Study Guide"; };
  }, [timer.status, timer.mode, remainingMs]);

  const actions = useMemo(() => ({
    start() {
      if (!audioRef.current && window.AudioContext) audioRef.current = new AudioContext();
      audioRef.current?.resume?.();
      setNotice(null);
      setNow(Date.now());
      setTimer((t) => {
        if (t.status === "running") return t;
        const rest = t.status === "paused" ? t.remaining : settingsRef.current[t.mode] * 60000;
        return { ...t, status: "running", endAt: Date.now() + rest, remaining: null };
      });
    },
    pause() {
      setTimer((t) =>
        t.status !== "running" ? t
          : { ...t, status: "paused", remaining: Math.max(0, t.endAt - Date.now()), endAt: null });
    },
    reset() {
      setTimer((t) => ({ ...t, status: "idle", endAt: null, remaining: null }));
    },
    skip() {
      setNotice(null);
      setTimer((t) => ({ ...t, mode: t.mode === "focus" ? "short" : "focus", status: "idle", endAt: null, remaining: null }));
    },
    setMode(mode) {
      setNotice(null);
      setTimer((t) => ({ ...t, mode, status: "idle", endAt: null, remaining: null }));
    },
    setTask(taskId) {
      setTimer((t) => ({ ...t, taskId }));
    },
    updateSettings(patch) {
      setSettings((s) => {
        const next = { ...s, ...patch };
        save(SETTINGS_KEY, next);
        return next;
      });
    },
    dismissNotice() {
      setNotice(null);
    },
  }), []);

  const totalMs = settings[timer.mode] * 60000;
  const value = { timer, settings, remainingMs, totalMs, notice, saving: record.isPending, ...actions };
  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useFocus() {
  return useContext(FocusContext);
}

export function useFocusSessions(days = 14) {
  return useQuery({
    queryKey: ["focus", days],
    queryFn: () => api.get("/focus", { params: { days } }).then((r) => r.data),
  });
}