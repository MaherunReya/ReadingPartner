export default function SubjectProgress({ subjects, selected, onSelect }) {
  if (subjects.length === 0) {
    return <p className="text-sm text-muted">Add a subject to a task to see progress per subject.</p>;
  }
  return (
    <ul className="space-y-1">
      {subjects.map((s) => {
        const pct = Math.round((s.done / s.total) * 100);
        const active = selected === s.name;
        return (
          <li key={s.name}>
            <button
              onClick={() => onSelect(active ? "" : s.name)}
              aria-pressed={active}
              className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${active ? "bg-brand/10" : "hover:bg-paper"}`}
            >
              <span className="flex items-center justify-between text-sm">
                <span className="font-medium">{s.name}</span>
                <span className="text-muted">{s.done}/{s.total}</span>
              </span>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-line">
                <span className="block h-full rounded-full bg-done transition-all duration-500" style={{ width: `${pct}%` }} />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}