export default function CheckButton({ checked, onClick, label, disabled = false, className = "" }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150 active:scale-90 disabled:opacity-40 ${
        checked ? "border-done bg-done text-white" : "border-muted/50 hover:border-brand"
      } ${className}`}
    >
      {checked && (
        <svg viewBox="0 0 16 16" className="size-3" aria-hidden="true">
          <path d="M3 8.5l3.2 3.2L13 5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}