import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "./api";
import { addDays, toISODate } from "./dates";

export const MOODS = [
  { value: 1, label: "Rough", emoji: "\uD83D\uDE23", color: "var(--color-overdue)" },
  { value: 2, label: "Meh", emoji: "\uD83D\uDE15", color: "var(--color-pink)" },
  { value: 3, label: "Okay", emoji: "\uD83D\uDE10", color: "var(--color-sun)" },
  { value: 4, label: "Good", emoji: "\uD83D\uDE42", color: "var(--color-sky)" },
  { value: 5, label: "Great", emoji: "\uD83D\uDE04", color: "var(--color-mint)" },
];

export const TAGS = [
  { id: "energized", label: "Energized" },
  { id: "calm", label: "Calm" },
  { id: "focused", label: "Focused" },
  { id: "motivated", label: "Motivated" },
  { id: "tired", label: "Tired" },
  { id: "stressed", label: "Stressed" },
  { id: "distracted", label: "Distracted" },
  { id: "overwhelmed", label: "Overwhelmed" },
];

export const moodInfo = (value) => MOODS.find((m) => m.value === value) ?? MOODS[2];
export const tagLabel = (id) => TAGS.find((t) => t.id === id)?.label ?? id;

export function suggestion(mood) {
  if (mood <= 2) return "Go gentle today. Try shorter 15-minute focus rounds and pick one small task to start.";
  if (mood === 3) return "A steady day. A standard 25-minute round and a short to-do list should work well.";
  return "You've got energy today. Tackle your hardest task first while it lasts.";
}

export function useMoodEntries(days = 60) {
  const end = toISODate(new Date());
  const start = toISODate(addDays(new Date(), -(days - 1)));
  const query = useQuery({
    queryKey: ["mood", start, end],
    queryFn: () => api.get("/mood", { params: { start, end } }).then((r) => r.data),
  });
  const byDate = useMemo(() => new Map((query.data ?? []).map((e) => [e.date, e])), [query.data]);
  return { ...query, byDate };
}

export function useSaveMood() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ date, mood, tags = [], note = null }) =>
      api.put(`/mood/${date}`, { mood, tags, note }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mood"] }),
  });
}

export function useDeleteMood() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (date) => api.delete(`/mood/${date}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mood"] }),
  });
}

// Days in a row with a check-in. Today not being done yet doesn't break the streak.
export function checkInStreak(byDate) {
  let cursor = new Date();
  if (!byDate.has(toISODate(cursor))) cursor = addDays(cursor, -1);
  let n = 0;
  while (n < 400 && byDate.has(toISODate(cursor))) {
    n += 1;
    cursor = addDays(cursor, -1);
  }
  return n;
}