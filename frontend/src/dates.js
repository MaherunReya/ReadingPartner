export const pad = (n) => String(n).padStart(2, "0");

// Local calendar date as YYYY-MM-DD (not UTC, so "today" matches the user's clock).
export const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

// The last n days ending at `end`, oldest first.
export const lastNDays = (n, end = new Date()) =>
  Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));

// Value format for <input type="datetime-local">
export const toLocalInput = (d) => `${toISODate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;