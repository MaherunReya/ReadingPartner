import { shuffle } from "./flashcards";

export const TEST_TYPES = {
  mc: "Multiple choice",
  typed: "Type the answer",
  tf: "True or false",
  mixed: "Mixed",
};

// Lowercase, drop accents and punctuation, squash spaces, so "Layer 3!" matches "layer 3".
export const clean = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

function distance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

// Typed answers: exact after cleaning, a small typo on a longer answer, or most of the key words of a long answer.
const NEGATIONS = new Set(["not", "no", "never", "cannot", "without", "isnt", "doesnt", "dont", "cant"]);
const numbers = (s) => (s.match(/\d+/g) ?? []).join(",");
const negations = (s) => s.split(" ").filter((w) => NEGATIONS.has(w)).length;

export function isClose(given, expected) {
  const a = clean(given);
  const b = clean(expected);
  if (!a || !b) return false;
  if (a === b) return true;
  // A typo is fine, but "Layer 2" is not "Layer 3" and "is not reliable" is not "is reliable".
  if (numbers(a) !== numbers(b) || negations(a) % 2 !== negations(b) % 2) return false;
  if (b.length >= 5 && 1 - distance(a, b) / Math.max(a.length, b.length) >= 0.85) return true;
  const keys = b.split(" ").filter((w) => w.length > 3);
  if (keys.length >= 4) {
    const have = new Set(a.split(" "));
    return keys.filter((w) => have.has(w)).length / keys.length >= 0.8;
  }
  return false;
}

export function grade(q, given) {
  if (given === undefined || given === null) return false;
  if (q.type === "mc") return clean(given) === clean(q.answer);
  if (q.type === "tf") return given === q.isTrue;
  return isClose(given, q.answer);
}

export function availableTypes(cards) {
  const distinct = new Set(cards.map((c) => clean(c.back))).size;
  return { mc: distinct >= 4, tf: distinct >= 2, typed: cards.length > 0, mixed: cards.length > 0 };
}

// `pool` is every card in the lecture. Wrong options come from it, even when `cards` is just the ones you missed.
export function buildQuestions(cards, { type, count, order }, pool = cards) {
  const can = availableTypes(pool);
  const shuffled = shuffle(cards);
  const ordered = order === "weak" ? [...shuffled].sort((a, b) => a.box - b.box) : shuffled;
  const picked = ordered.slice(0, count === "all" ? ordered.length : count);
  const backs = [...new Map(pool.map((c) => [clean(c.back), c.back])).values()];

  return picked.map((card, index) => {
    const kinds = ["mc", "tf", "typed"].filter((k) => can[k]);
    let kind = type === "mixed" ? kinds[Math.floor(Math.random() * kinds.length)] : type;
    if (!can[kind]) kind = "typed";
    const others = shuffle(backs.filter((b) => clean(b) !== clean(card.back)));
    const base = { index, cardId: card.id, type: kind, prompt: card.front, answer: card.back };
    if (kind === "mc") return { ...base, options: shuffle([card.back, ...others.slice(0, 3)]) };
    if (kind === "tf") {
      const isTrue = Math.random() < 0.5;
      return { ...base, isTrue, shown: isTrue ? card.back : others[0] };
    }
    return base;
  });
}

// Questions the AI wrote from a lecture (see POST /ai/test), in the same shape as buildQuestions makes.
export function fromAi(list) {
  return list.map((q, index) => {
    const base = { index, cardId: null, type: q.type, prompt: q.prompt, answer: q.answer };
    if (q.type === "mc") return { ...base, options: q.options };
    if (q.type === "tf") return { ...base, isTrue: q.is_true, shown: q.shown };
    return base;
  });
}

// Shuffle the questions (and each question's options) and renumber them. Used to mix sources and for retakes.
export function finalize(list) {
  return shuffle(list).map((q, index) => ({ ...q, index, ...(q.options ? { options: shuffle(q.options) } : {}) }));
}
// ---- Attempt history, kept in this browser ----
const KEY = "studyguide_test_history";

export function loadHistory() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveAttempt(attempt) {
  const list = [attempt, ...loadHistory().filter((a) => a.id !== attempt.id)].slice(0, 30);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* private mode: history just isn't kept */
  }
  return list;
}