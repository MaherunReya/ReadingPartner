import { useTheme } from "../theme";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const toDark = theme === "light";
  return (
    <button
      onClick={toggle}
      aria-label={toDark ? "Switch to dark mode" : "Switch to light mode"}
      className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:bg-paper"
    >
      {toDark ? "Dark mode" : "Light mode"}
    </button>
  );
}