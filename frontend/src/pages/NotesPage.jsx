import { useId, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api, { errorMessage } from "../api";
import Card from "../components/Card";
import Icon from "../components/Icon";
import { MAX_NOTE_CHARS, NOTE_COLORS, useCreateNote, useDeleteNote, useNotes, useUpdateNote } from "../notes";

const LONG_NOTE = 320; // characters before a note is folded with "Show more"

/* ---------- Form (used for both new and edit) ---------- */

function NoteForm({ initial, subjects, busy, error, submitLabel, onSave, onCancel }) {
  const id = useId();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [color, setColor] = useState(initial?.color ?? "sun");
  const [pinned, setPinned] = useState(initial?.pinned ?? false);
  const empty = !title.trim() && !content.trim();

  function submit(e) {
    e.preventDefault();
    if (empty || busy) return;
    onSave({ title: title.trim(), content: content.trim(), subject: subject.trim() || null, color, pinned });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
        <div>
          <label htmlFor={`${id}-title`} className="text-sm font-bold text-muted">Title (optional)</label>
          <input id={`${id}-title`} autoFocus maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Week 5: Subnetting"
            className="mt-1 w-full border border-line bg-surface px-3 py-2" />
        </div>
        <div>
          <label htmlFor={`${id}-subject`} className="text-sm font-bold text-muted">Subject (optional)</label>
          <input id={`${id}-subject`} list={`${id}-subjects`} maxLength={100} value={subject} onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Computer Networks"
            className="mt-1 w-full border border-line bg-surface px-3 py-2" />
          <datalist id={`${id}-subjects`}>{subjects.map((s) => <option key={s} value={s} />)}</datalist>
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between gap-2">
          <label htmlFor={`${id}-content`} className="text-sm font-bold text-muted">Note</label>
          <span className="text-xs font-bold tabular-nums text-muted">{content.length.toLocaleString()} / {MAX_NOTE_CHARS.toLocaleString()}</span>
        </div>
        <textarea id={`${id}-content`} rows={6} maxLength={MAX_NOTE_CHARS} value={content} onChange={(e) => setContent(e.target.value)}
          placeholder="Write anything you want to remember..."
          className="mt-1 w-full resize-y border border-line bg-surface px-3 py-2" />
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <fieldset>
          <legend className="sr-only">Colour</legend>
          <div className="flex items-center gap-2" role="radiogroup" aria-label="Colour">
            {Object.entries(NOTE_COLORS).map(([key, c]) => (
              <button key={key} type="button" role="radio" aria-checked={color === key} aria-label={c.label} title={c.label}
                onClick={() => setColor(key)}
                className={`${c.bg} size-8 rounded-full border-2 transition-transform ${color === key ? "scale-110 border-edge shadow-[2px_2px_0_var(--color-edge)]" : "border-transparent hover:scale-105"}`} />
            ))}
          </div>
        </fieldset>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-muted">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="size-4 accent-[var(--color-brand-dark)]" />
          Pin to the top
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={empty || busy}
          className="btn rounded-xl bg-brand px-5 py-2 font-display font-semibold text-on-sun disabled:opacity-50">{submitLabel}</button>
        <button type="button" onClick={onCancel} className="rounded-xl px-3 py-2 font-bold text-muted hover:text-ink">Cancel</button>
        {empty && <span className="text-xs text-muted">Write a title or some text first.</span>}
        {error && <span role="alert" className="text-sm text-overdue">{errorMessage(error)}</span>}
      </div>
    </form>
  );
}

/* ---------- One note ---------- */

function NoteItem({ note, subjects }) {
  const update = useUpdateNote();
  const remove = useDeleteNote();
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const c = NOTE_COLORS[note.color] ?? NOTE_COLORS.sun;
  const long = note.content.length > LONG_NOTE;
  const when = new Date(note.updated_at ?? note.created_at).toLocaleDateString([], { month: "short", day: "numeric" });

  if (editing) {
    return (
      <li className="sticker-sm col-span-full bg-surface p-4">
        <NoteForm initial={note} subjects={subjects} busy={update.isPending} error={update.isError ? update.error : null}
          submitLabel="Save changes" onCancel={() => setEditing(false)}
          onSave={(body) => update.mutate({ id: note.id, ...body }, { onSuccess: () => setEditing(false) })} />
      </li>
    );
  }

  const iconBtn = "grid size-8 place-items-center rounded-full border-2 border-transparent text-on-sun/80 transition-colors hover:border-edge hover:bg-surface/60 hover:text-on-sun";

  return (
    <li className={`${c.bg} sticker-sm flex flex-col p-4 text-on-sun`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {note.title && <h3 className="break-words font-display text-lg font-bold leading-snug">{note.title}</h3>}
          {note.subject && (
            <span className="mt-1 inline-block rounded-full border-2 border-edge bg-surface/60 px-2.5 py-0.5 text-xs font-bold">{note.subject}</span>
          )}
        </div>
        <button type="button" aria-pressed={note.pinned} aria-label={note.pinned ? "Unpin note" : "Pin note"} title={note.pinned ? "Unpin" : "Pin to top"}
          disabled={update.isPending} onClick={() => update.mutate({ id: note.id, pinned: !note.pinned })}
          className={`${iconBtn} ${note.pinned ? "border-edge bg-surface/60 !text-on-sun" : ""}`}>
          <Icon name="pin" filled={note.pinned} className="size-4" />
        </button>
      </div>

      {note.content && (
        <p className={`mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed ${long && !open ? "line-clamp-6" : ""}`}>{note.content}</p>
      )}
      {long && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="mt-1 self-start text-xs font-bold underline underline-offset-2">
          {open ? "Show less" : "Show more"}
        </button>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <span className="text-xs font-bold text-on-sun/70">{when}</span>
        <div className="flex gap-1">
          <button type="button" onClick={() => setEditing(true)} aria-label={`Edit note${note.title ? `: ${note.title}` : ""}`} title="Edit" className={iconBtn}>
            <Icon name="pencil" className="size-4" />
          </button>
          <button type="button" disabled={remove.isPending} aria-label={`Delete note${note.title ? `: ${note.title}` : ""}`} title="Delete"
            onClick={() => { if (window.confirm("Delete this note?")) remove.mutate(note.id); }}
            className={`${iconBtn} disabled:opacity-50`}>
            <Icon name="trash" className="size-4" />
          </button>
        </div>
      </div>
      {(update.isError || remove.isError) && (
        <p role="alert" className="mt-2 text-xs font-bold text-overdue">{errorMessage(update.error ?? remove.error)}</p>
      )}
    </li>
  );
}

/* ---------- Page ---------- */

export default function NotesPage() {
  const notes = useNotes();
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => api.get("/tasks").then((r) => r.data) });
  const create = useCreateNote();
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");

  const all = notes.data ?? [];
  // Subjects you've already used on notes or tasks, offered as suggestions in the form.
  const subjects = useMemo(
    () => [...new Set([...all.map((n) => n.subject), ...(tasks.data ?? []).map((t) => t.subject)].filter(Boolean))].sort(),
    [all, tasks.data]
  );
  const noteSubjects = useMemo(() => [...new Set(all.map((n) => n.subject).filter(Boolean))].sort(), [all]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((n) =>
      (!subject || n.subject === subject) &&
      (!q || `${n.title}\n${n.content}\n${n.subject ?? ""}`.toLowerCase().includes(q))
    );
  }, [all, query, subject]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Notes</h1>
          <p className="mt-1 text-muted">Quick notes for each subject. Pin the important ones to the top.</p>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)}
            className="btn inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 font-display text-lg font-semibold text-on-sun">
            <Icon name="plus" className="size-5" /> New note
          </button>
        )}
      </div>

      {creating && (
        <Card title="New note">
          <NoteForm subjects={subjects} busy={create.isPending} error={create.isError ? create.error : null} submitLabel="Save note"
            onCancel={() => { setCreating(false); create.reset(); }}
            onSave={(body) => create.mutate(body, { onSuccess: () => setCreating(false) })} />
        </Card>
      )}

      {all.length > 0 && (
        <div className="space-y-3">
          <div className="relative max-w-md">
            <label htmlFor="note-search" className="sr-only">Search notes</label>
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input id="note-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes"
              className="w-full border border-line bg-surface py-2 pl-9 pr-3" />
          </div>
          {noteSubjects.length > 0 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by subject">
              {["", ...noteSubjects].map((s) => (
                <button key={s || "all"} type="button" aria-pressed={subject === s} onClick={() => setSubject(s)}
                  className={`rounded-full border-2 px-3 py-1 text-sm font-bold ${subject === s ? "border-edge bg-brand text-on-sun" : "border-line text-muted hover:border-edge hover:text-ink"}`}>
                  {s || "All"}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {notes.isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-line/60" />)}
        </div>
      ) : notes.isError ? (
        <p role="alert" className="text-overdue">{errorMessage(notes.error)}</p>
      ) : all.length === 0 && !creating ? (
        <div className="sticker bg-surface p-8 text-center">
          <div className="flex justify-center text-muted"><Icon name="note" className="size-12" strokeWidth={1.4} /></div>
          <p className="mt-3 font-display text-xl font-bold">No notes yet</p>
          <p className="mt-1 text-muted">Jot down a definition, a formula or a lecture takeaway. You can tag it with a subject and pin it.</p>
        </div>
      ) : shown.length === 0 && all.length > 0 ? (
        <p className="text-muted">No notes match that. Try a different search or subject.</p>
      ) : (
        <ul className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((n) => <NoteItem key={`${n.id}-${n.updated_at}`} note={n} subjects={subjects} />)}
        </ul>
      )}
    </div>
  );
}
