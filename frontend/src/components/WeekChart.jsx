export default function WeekChart({ days }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <div>
      <div className="flex h-28 items-end gap-2">
        {days.map((d) => (
          <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-xs font-medium text-muted">{d.count || ""}</span>
            <div
              title={`${d.label}: ${d.count} completed`}
              className={`w-full rounded-t-md transition-all duration-500 ${d.isToday ? "bg-brand" : "bg-brand/35"}`}
              style={{ height: `${Math.max(6, (d.count / max) * 80)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {days.map((d) => (
          <span key={d.key} className={`flex-1 text-center text-xs ${d.isToday ? "font-semibold text-ink" : "text-muted"}`}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}