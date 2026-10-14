export default function TimerTomato({ progress = 0, status = "idle", mode = "focus", size = 150 }) {
  const running = status === "running";
  const paused = status === "paused";
  const p = Math.max(0, Math.min(1, progress));
  const blush = 0.45 + 0.45 * p; // cheeks get rosier the longer you work
  const happy = running || mode !== "focus";
  return (
    <svg viewBox="-8 -8 116 116" width={size} height={size} aria-hidden="true"
      className={running ? "tomato tomato-run" : "tomato"}>
      <defs>
        <radialGradient id="tomato-red" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ff6f61" />
          <stop offset="55%" stopColor="#ee3b32" />
          <stop offset="100%" stopColor="#c91f2b" />
        </radialGradient>
      </defs>
      <ellipse className="tomato-shadow" cx="50" cy="94" rx="26" ry="4" fill="rgba(0,0,0,0.18)" />
      <g className="tomato-body">
        <ellipse cx="50" cy="58" rx="38" ry="33" fill="url(#tomato-red)" stroke="var(--color-edge)" strokeWidth="3" />
        <ellipse cx="34" cy="44" rx="9" ry="5" fill="#fff" opacity="0.45" transform="rotate(-30 34 44)" />
        <circle cx="25" cy="54" r="2" fill="#fff" opacity="0.5" />
        <g className="tomato-leaf">
          <path d="M50 27 C42 14 30 15 25 22 C33 22 40 26 45 31 Z M50 27 C58 14 70 15 75 22 C67 22 60 26 55 31 Z"
            fill="#4caf50" stroke="var(--color-edge)" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M50 29 L50 15" stroke="var(--color-edge)" strokeWidth="4" strokeLinecap="round" />
          <path d="M50 16 q8 -10 16 -4" stroke="#4caf50" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
        {paused ? (
          <path d="M31 57 q6 4 12 0 M57 57 q6 4 12 0" stroke="var(--color-edge)" strokeWidth="3" fill="none" strokeLinecap="round" />
        ) : (
          <>
            <circle className="tomato-eye" cx="37" cy="56" r="5" fill="var(--color-edge)" />
            <circle className="tomato-eye" cx="63" cy="56" r="5" fill="var(--color-edge)" />
            <circle cx="38.8" cy="54.2" r="1.7" fill="#fff" />
            <circle cx="64.8" cy="54.2" r="1.7" fill="#fff" />
          </>
        )}
        <circle cx="28" cy="68" r="5.5" fill="#ff8fb8" opacity={blush} />
        <circle cx="72" cy="68" r="5.5" fill="#ff8fb8" opacity={blush} />
        <path d={happy ? "M40 69 q10 12 20 0 Z" : "M41 70 q9 7 18 0"}
          fill={happy ? "var(--color-edge)" : "none"}
          stroke="var(--color-edge)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {happy && <path d="M45 75 q5 4 10 0" stroke="#ff8fb8" strokeWidth="3" fill="none" strokeLinecap="round" />}
      </g>
      {running && (
        <g fill="#ffd43b" stroke="var(--color-edge)" strokeWidth="1.5" strokeLinejoin="round">
          <path className="tomato-sparkle" style={{ animationDelay: "0s" }} d="M8 28 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5 Z" />
          <path className="tomato-sparkle" style={{ animationDelay: "0.5s" }} d="M94 38 l2 4.5 4.5 2 -4.5 2 -2 4.5 -2 -4.5 -4.5 -2 4.5 -2 Z" />
          <path className="tomato-sparkle" style={{ animationDelay: "1s" }} d="M88 8 l1.6 3.6 3.6 1.6 -3.6 1.6 -1.6 3.6 -1.6 -3.6 -3.6 -1.6 3.6 -1.6 Z" />
        </g>
      )}
      {paused && (
        <g className="tomato-zzz" fill="var(--color-edge)" fontWeight="800" fontFamily="inherit">
          <text x="76" y="30" fontSize="14">z</text>
          <text x="86" y="18" fontSize="10">z</text>
        </g>
      )}
    </svg>
  );
}
