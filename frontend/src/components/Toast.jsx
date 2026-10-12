export default function Toast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-xl border-2 border-edge bg-ink px-4 py-3 text-sm font-semibold text-paper shadow-[4px_4px_0_0_var(--color-brand)]"
    >
      <span>{toast.message}</span>
      {toast.undo && (
        <button
          onClick={() => { toast.undo(); onClose(); }}
          className="font-semibold underline underline-offset-2"
        >
          Undo
        </button>
      )}
    </div>
  );
}