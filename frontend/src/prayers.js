import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "./api";
import { addDays, pad, toISODate } from "./dates";

export const PRAYERS = [
  { id: "fajr", label: "Fajr" },
  { id: "dhuhr", label: "Dhuhr" },
  { id: "asr", label: "Asr" },
  { id: "maghrib", label: "Maghrib" },
  { id: "isha", label: "Isha" },
];

export const METHODS = [
  { value: 1, label: "University of Islamic Sciences, Karachi" },
  { value: 2, label: "ISNA (North America)" },
  { value: 3, label: "Muslim World League" },
  { value: 4, label: "Umm al-Qura, Makkah" },
  { value: 5, label: "Egyptian General Authority" },
];

export const SCHOOLS = [
  { value: 1, label: "Hanafi" },
  { value: 0, label: "Standard (Shafi'i, Maliki, Hanbali)" },
];

const SETTINGS_KEY = "studyguide_prayer_settings";
export const DEFAULT_SETTINGS = { city: "Dhaka", country: "Bangladesh", method: 1, school: 1 };
export const HISTORY_DAYS = 60;

export function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable: settings last for this session only */
  }
}

// ---- prayer times (Aladhan API) ----
function parseTime(value) {
  const m = /(\d{1,2}):(\d{2})/.exec(value || "");
  return m ? { h: Number(m[1]), m: Number(m[2]) } : null;
}

async function fetchTimings(settings, date) {
  const day = `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
  const params = new URLSearchParams({
    city: settings.city,
    country: settings.country,
    method: String(settings.method),
    school: String(settings.school),
  });
  const res = await fetch(`https://api.aladhan.com/v1/timingsByCity/${day}?${params}`);
  if (!res.ok) throw new Error("Couldn't load prayer times");
  const { data } = await res.json();
  const t = data.timings;
  const h = data.date?.hijri;
  return {
    times: {
      fajr: parseTime(t.Fajr),
      dhuhr: parseTime(t.Dhuhr),
      asr: parseTime(t.Asr),
      maghrib: parseTime(t.Maghrib),
      isha: parseTime(t.Isha),
    },
    hijri: h ? `${h.day} ${h.month?.en} ${h.year} AH` : null,
  };
}

export function usePrayerTimes(settings) {
  return useQuery({
    queryKey: ["prayer-times", settings, toISODate(new Date())],
    queryFn: () => fetchTimings(settings, new Date()),
    staleTime: 6 * 60 * 60 * 1000,
  });
}

export function formatTime(t) {
  if (!t) return "";
  return new Date(2000, 0, 1, t.h, t.m).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function timeToday(t, now) {
  const d = new Date(now);
  d.setHours(t.h, t.m, 0, 0);
  return d;
}

export function nextPrayer(times, now = new Date()) {
  if (!times) return null;
  for (const p of PRAYERS) {
    const t = times[p.id];
    if (t && timeToday(t, now) > now) return { ...p, at: timeToday(t, now), tomorrow: false };
  }
  if (!times.fajr) return null;
  const at = timeToday(times.fajr, addDays(now, 1));
  return { ...PRAYERS[0], at, tomorrow: true };
}

export function untilText(at, now = new Date()) {
  const mins = Math.max(0, Math.round((at - now) / 60000));
  const h = Math.floor(mins / 60);
  return h ? `${h}h ${mins % 60}m` : `${mins}m`;
}

export function useNow(interval = 60000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

// ---- logs (our backend) ----
export function usePrayerLogs(days = HISTORY_DAYS) {
  const end = toISODate(new Date());
  const start = toISODate(addDays(new Date(), -(days - 1)));
  const query = useQuery({
    queryKey: ["prayers", start, end],
    queryFn: () => api.get("/prayers", { params: { start, end } }).then((r) => r.data),
  });
  const done = useMemo(
    () => new Set((query.data ?? []).map((l) => `${l.date}|${l.prayer}`)),
    [query.data]
  );
  return { ...query, done };
}

export function useTogglePrayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ date, prayer, completed }) =>
      api.put(`/prayers/${date}/${prayer}`, { completed }).then((r) => r.data),
    onMutate: async ({ date, prayer, completed }) => {
      await queryClient.cancelQueries({ queryKey: ["prayers"] });
      const previous = queryClient.getQueriesData({ queryKey: ["prayers"] });
      queryClient.setQueriesData({ queryKey: ["prayers"] }, (old) => {
        const rest = (old ?? []).filter((l) => !(l.date === date && l.prayer === prayer));
        return completed ? [...rest, { date, prayer }] : rest;
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => ctx?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["prayers"] }),
  });
}

// Consecutive days on which all five prayers were marked. Today only counts once it's complete,
// but an unfinished today doesn't break the streak.
export function fullDayStreak(done) {
  const isFull = (d) => PRAYERS.every((p) => done.has(`${toISODate(d)}|${p.id}`));
  let cursor = new Date();
  if (!isFull(cursor)) cursor = addDays(cursor, -1);
  let n = 0;
  while (n <= HISTORY_DAYS && isFull(cursor)) {
    n += 1;
    cursor = addDays(cursor, -1);
  }
  return n;
}