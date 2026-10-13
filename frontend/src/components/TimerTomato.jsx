export default function TimerTomato({ progress = 0, status = "idle", mode = "focus", size = 72 }) {
  const running = status === "running";
  const paused = status === "paused";
  const p = Math.max(0, Math.min(1, progress));
  const body = mode === "focus" ? `hsl(${100 - 95 * p} 75% 52%)` : "hsl(0, 98%, 51%)";
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true"
      className={running ? "tomato tomato-run" : "tomato"}>
      <ellipse className="tomato-shadow" cx="50" cy="94" rx="26" ry="4" fill="rgba(0,0,0,0.18)" />
      <g className="tomato-body">
        <ellipse cx="50" cy="58" rx="38" ry="33" fill={body} stroke="var(--color-edge)" strokeWidth="3" />
        <ellipse cx="34" cy="44" rx="9" ry="5" fill="#fff" opacity="0.35" transform="rotate(-30 34 44)" />
        <path d="M50 27 C42 14 30 15 25 22 C33 22 40 26 45 31 Z M50 27 C58 14 70 15 75 22 C67 22 60 26 55 31 Z"
          fill="#4caf50" stroke="var(--color-edge)" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M50 29 L50 15" stroke="var(--color-edge)" strokeWidth="4" strokeLinecap="round" />
        {paused ? (
          <>
            <path d="M31 57 q6 4 12 0 M57 57 q6 4 12 0" stroke="var(--color-edge)" strokeWidth="3" fill="none" strokeLinecap="round" />
            <text x="78" y="40" fontSize="14" fontWeight="700" fill="var(--color-edge)">z</text>
          </>
        ) : (
          <>
            <circle className="tomato-eye" cx="37" cy="56" r="4.5" fill="var(--color-edge)" />
            <circle className="tomato-eye" cx="63" cy="56" r="4.5" fill="var(--color-edge)" />
          </>
        )}
        <circle cx="29" cy="68" r="5" fill="#ff8fb8" opacity="0.7" />
        <circle cx="71" cy="68" r="5" fill="#ff8fb8" opacity="0.7" />
        <path d={running || mode !== "focus" ? "M40 69 q10 12 20 0 Z" : "M41 70 q9 7 18 0"}
          fill={running || mode !== "focus" ? "var(--color-edge)" : "none"}
          stroke="var(--color-edge)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}