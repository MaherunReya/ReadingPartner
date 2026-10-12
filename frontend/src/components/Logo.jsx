export default function Logo({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold ${className}`}>
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <rect width="26" height="26" rx="7" fill="var(--color-brand)" />
        <path d="M7 13.5l4 4 8-9" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Study Guide
    </span>
  );
}