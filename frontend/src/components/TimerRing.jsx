import { useId } from "react";

export default function TimerRing({ progress, color = "var(--color-brand)", gradient, size = 280, stroke = 16, children }) {
  const gid = useId().replace(/:/g, "");
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  const mid = size / 2;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size, maxWidth: "100%" }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90" aria-hidden="true">
        {gradient && (
          <defs>
            <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
              {gradient.map((col, i) => (
                <stop key={i} offset={`${(i / (gradient.length - 1)) * 100}%`} stopColor={col} />
              ))}
            </linearGradient>
          </defs>
        )}
        <circle cx={mid} cy={mid} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle cx={mid} cy={mid} r={r - stroke} fill="none" stroke="var(--color-line)" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" opacity="0.8" />
        <circle
          cx={mid} cy={mid} r={r} fill="none" stroke={gradient ? `url(#${gid})` : color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)}
          style={{ transition: "stroke-dashoffset 300ms linear" }}
        />
        {p > 0.004 && (
          <g style={{ transform: `rotate(${p * 360}deg)`, transformOrigin: `${mid}px ${mid}px`, transition: "transform 300ms linear" }}>
            <circle cx={mid + r} cy={mid} r={stroke / 2 + 3} fill="#fff" stroke="var(--color-edge)" strokeWidth="3" />
          </g>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
