// An open book with a little spark: study + good ideas.
export function LogoMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect x="1" y="1" width="30" height="30" rx="9" fill="var(--color-brand)" stroke="var(--color-edge)" strokeWidth="2" />
      <path d="M5.5 11 Q10.5 9 15.5 11.5 V24 Q10.5 22 5.5 24 Z" fill="#fff" />
      <path d="M26.5 11 Q21.5 9 16.5 11.5 V24 Q21.5 22 26.5 24 Z" fill="#fff" />
      <path d="M25 3.5l1.1 2.6 2.6 1.1-2.6 1.1L25 10.9l-1.1-2.6-2.6-1.1 2.6-1.1z" fill="#FFD43B" stroke="var(--color-edge)" strokeWidth="1" />
    </svg>
  );
}

export default function Logo({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2 whitespace-nowrap font-display text-lg font-bold ${className}`}>
      <LogoMark />
      Study Guide
    </span>
  );
}