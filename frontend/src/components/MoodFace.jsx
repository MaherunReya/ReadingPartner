import { moodColor, useMoodPalette } from "../mood";

// Hand-drawn faces, 1 (rough) to 5 (great). The fill follows the chosen colour palette.
const INK = "var(--color-on-sun)";

const MOUTH = {
  1: "M17 35q7-6.5 14 0",
  2: "M18 34q6-3.5 12 0",
  3: "M18 33h12",
  4: "M17 31q7 5.5 14 0",
  5: "M16 29q8 10 16 0z",
};

export default function MoodFace({ value, size = 40, palette, className = "" }) {
  const [saved] = useMoodPalette();
  const fill = moodColor(value, palette ?? saved);
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={`shrink-0 ${className}`} aria-hidden="true">
      <circle cx="24" cy="24" r="21" style={{ fill }} stroke="var(--color-edge)" strokeWidth="2.5" />
      <g stroke={INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {value === 5 ? (
          <path d="M13 21q3.5-5 7 0M28 21q3.5-5 7 0" />
        ) : (
          <>
            <circle cx="16.5" cy="21" r="2.4" fill={INK} stroke="none" />
            <circle cx="31.5" cy="21" r="2.4" fill={INK} stroke="none" />
          </>
        )}
        {value === 1 && <path d="M11.5 15.5l6.5-2.5M36.5 15.5l-6.5-2.5" />}
        <path d={MOUTH[value] ?? MOUTH[3]} fill={value === 5 ? INK : "none"} />
      </g>
    </svg>
  );
}