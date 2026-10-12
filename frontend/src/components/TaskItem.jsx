import { useState } from "react";
import CheckButton from "./CheckButton";
import { toLocalInput } from "../dates";

const DAY = 24 * 60 * 60 * 1000;

function dueInfo(task) {
  if (!task.deadline) return null;
  const date = new Date(task.deadline);
  const diff = date - Date.now();
  const when = date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  if (task.completed) return { text: when, tone: "text-muted" };
  if (diff < 0) {
    const days = Math.max(1, Math.round(-diff / DAY));
    return { text: `Overdue by ${days} day${days > 1 ? "s" : ""} (${when})`, tone: "text-overdue font-medium" };
  }
  if (diff < DAY) return { text: `Due today, ${when}`, tone: "text-overdue" };
  const days = Math.ceil(diff / DAY);
  return { text: `Due in ${days} day${days > 1 ? "s" : ""} (${when})`, tone: "text-muted" };
}

const field = "rounded-md border border-line bg-surface px-3 py-1.5 text-sm";

export default function TaskItem({ task, onToggle, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const due = dueInfo(task);
  const overdue = !task.completed && task.deadline && new Date(task.deadline) < Date.now();

  function startEdit() {
    setDraft({
      title: task.title,
      subject: task.subject ?? "",
      deadline: task.deadline ? toLocalInput(new Date(task.deadline)) : "",
    });
    setEditing(true);
  }

  function save(e) {
    e.preventDefault();
    const title = draft.title.trim();
    if (!title) return;
    onEdit(task, {
      title,
      subject: draft.subject.trim() || null,
      deadline: draft.deadline ? new Date(draft.deadline).toISOString() : null,
    });
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="rounded-lg border border-brand/50 bg-surface px-4 py-3">
        <form onSubmit={save} onKeyDown={(e) => e.key === "Escape" && setEditing(false)} className="space-y-2">
          <label className="sr-only" htmlFor={`edit-title-${task.id}`}>Title</label>
          <input id={`edit-title-${task.id}`} autoFocus value={draft.title} maxLength={200}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={`${field} w-full`} />
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor={`edit-subject-${task.id}`}>Subject</label>
            <input id={`edit-subject-${task.id}`} placeholder="Subject" value={draft.subject} maxLength={100}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value })} className={`${field} w-36`} />
            <label className="sr-only" htmlFor={`edit-deadline-${task.id}`}>Deadline</label>
            <input id={`edit-deadline-${task.id}`} type="datetime-local" value={draft.deadline}
              onChange={(e) => setDraft({ ...draft, deadline: e.target.value })} className={field} />
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={() => setEditing(false)}
                className="rounded-md px-3 py-1.5 text-sm text-muted hover:text-ink">Cancel</button>
              <button type="submit" className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark">
                Save
              </button>
            </div>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={`flex items-start gap-3 rounded-lg border bg-surface px-4 py-3 transition-colors ${
      overdue ? "border-overdue/40 border-l-4 border-l-overdue" : "border-line"
    }`}>
      <CheckButton
        checked={task.completed}
        onClick={() => onToggle(task)}
        label={`Mark "${task.title}" as ${task.completed ? "not done" : "done"}`}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <p className={`break-words font-medium transition-colors ${task.completed ? "text-muted line-through" : ""}`}>
          {task.title}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm">
          {task.subject && <span className="rounded bg-brand/10 px-2 py-0.5 text-brand-ink">{task.subject}</span>}
          {due && <span className={due.tone}>{due.text}</span>}
        </p>
      </div>
      <div className="flex shrink-0 gap-1 text-sm">
        <button onClick={startEdit} aria-label={`Edit "${task.title}"`}
          className="rounded px-2 py-1 text-muted hover:bg-paper hover:text-ink">Edit</button>
        <button onClick={() => onDelete(task)} aria-label={`Delete "${task.title}"`}
          className="rounded px-2 py-1 text-muted hover:bg-overdue/10 hover:text-overdue">Delete</button>
      </div>
    </li>
  );
}