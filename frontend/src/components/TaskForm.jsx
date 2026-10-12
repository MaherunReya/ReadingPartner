import { useState } from "react";
import { addDays, toLocalInput } from "../dates";

function endOfDay(offset) {
  const d = addDays(new Date(), offset);
  d.setHours(23, 59, 0, 0);
  return toLocalInput(d);
}

const CHIPS = [
  { label: "Today", offset: 0 },
  { label: "Tomorrow", offset: 1 },
  { label: "Next week", offset: 7 },
];

export default function TaskForm({ subjects, onAdd, busy }) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [deadline, setDeadline] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    onAdd({
      title: clean,
      subject: subject.trim() || null,
      deadline: deadline ? new Date(deadline).toISOString() : null,
    });
    setTitle("");
    setDeadline("");
  }

  const field = "rounded-md border border-line bg-surface px-3 py-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto]">
        <label className="sr-only" htmlFor="task-title">Task title</label>
        <input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="What do you need to do?" maxLength={200} className={field} />
        <label className="sr-only" htmlFor="task-subject">Subject</label>
        <input id="task-subject" list="subjects" value={subject} onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject" maxLength={100} className={field} />
        <datalist id="subjects">{subjects.map((s) => <option key={s} value={s} />)}</datalist>
        <button type="submit" disabled={busy || !title.trim()}
          className="rounded-md bg-brand px-5 py-2 font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-50">
          Add task
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Due</span>
        {CHIPS.map((chip) => {
          const value = endOfDay(chip.offset);
          const active = deadline === value;
          return (
            <button key={chip.label} type="button" aria-pressed={active}
              onClick={() => setDeadline(active ? "" : value)}
              className={`rounded-full border px-3 py-1 transition-colors ${
                active ? "border-brand bg-brand text-white" : "border-line hover:border-brand"
              }`}>
              {chip.label}
            </button>
          );
        })}
        <label className="sr-only" htmlFor="task-deadline">Custom deadline</label>
        <input id="task-deadline" type="datetime-local" value={deadline}
          onChange={(e) => setDeadline(e.target.value)} className={`${field} py-1`} />
      </div>
    </form>
  );
}