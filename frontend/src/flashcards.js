import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "./api";

// Emoji are written as escapes so they survive any editor encoding on Windows.
export const EMOJI = {
  think: "\uD83E\uDD14",
  eyes: "\uD83D\uDC40",
  party: "\uD83C\uDF89",
  sweat: "\uD83D\uDE05",
  fire: "\uD83D\uDD25",
  cool: "\uD83D\uDE0E",
  trophy: "\uD83C\uDFC6",
  muscle: "\uD83D\uDCAA",
  seedling: "\uD83C\uDF31",
  star: "\u2B50",
};

// Full class names so Tailwind can see them.
export const DECK_COLORS = {
  sun: { label: "Sunny", emoji: "\u2B50", bg: "bg-sun" },
  pink: { label: "Bubblegum", emoji: "\uD83D\uDC96", bg: "bg-pink" },
  sky: { label: "Sky", emoji: "\u2601\uFE0F", bg: "bg-sky" },
  mint: { label: "Mint", emoji: "\uD83C\uDF40", bg: "bg-mint" },
};

export const isDue = (card) => new Date(card.due_at) <= new Date();

export function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// One card per line: "front :: back" (a tab also works, handy when pasting from a spreadsheet).
export function parseBulk(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      let i = line.indexOf("::");
      let width = 2;
      if (i < 0) {
        i = line.indexOf("\t");
        width = 1;
      }
      if (i < 0) return null;
      const front = line.slice(0, i).trim();
      const back = line.slice(i + width).trim();
      return front && back ? { front, back } : null;
    })
    .filter(Boolean)
    .slice(0, 200);
}

export const useDecks = () =>
  useQuery({ queryKey: ["decks"], queryFn: () => api.get("/flashcards/decks").then((r) => r.data) });

export const useCards = (deckId, options = {}) =>
  useQuery({
    queryKey: ["cards", deckId],
    queryFn: () => api.get(`/flashcards/decks/${deckId}/cards`).then((r) => r.data),
    ...options,
  });

export function useCreateDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.post("/flashcards/decks", body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decks"] }),
  });
}

export function useDeleteDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/flashcards/decks/${id}`),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: ["cards", id] });
      qc.invalidateQueries({ queryKey: ["decks"] });
    },
  });
}

function useCardMutation(deckId, fn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cards", deckId] });
      qc.invalidateQueries({ queryKey: ["decks"] });
    },
  });
}

export const useAddCard = (deckId) =>
  useCardMutation(deckId, (body) => api.post(`/flashcards/decks/${deckId}/cards`, body).then((r) => r.data));

export const useBulkAdd = (deckId) =>
  useCardMutation(deckId, (cards) =>
    api.post(`/flashcards/decks/${deckId}/cards/bulk`, { cards }).then((r) => r.data)
  );

export const useUpdateCard = (deckId) =>
  useCardMutation(deckId, ({ id, ...body }) => api.patch(`/flashcards/cards/${id}`, body).then((r) => r.data));

export const useDeleteCard = (deckId) =>
  useCardMutation(deckId, (id) => api.delete(`/flashcards/cards/${id}`));

export const useGenerateCards = () =>
  useMutation({
    mutationFn: ({ text, count }) => api.post("/ai/flashcards", { text, count }).then((r) => r.data.cards),
  });
// No invalidation here on purpose: the study session keeps its own queue and
// refreshes the deck list once when you leave.
export const useReview = () =>
  useMutation({
    mutationFn: ({ id, correct }) => api.post(`/flashcards/cards/${id}/review`, { correct }).then((r) => r.data),
  });