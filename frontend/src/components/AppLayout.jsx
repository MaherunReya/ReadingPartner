import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api";
import { FocusProvider, MODES, formatClock, useFocus } from "../focusTimer";
import { useAuth } from "../auth";
import Icon from "./Icon";
import LogoLink from "./LogoLink";
import ThemeToggle, { Moon, Sun } from "./ThemeToggle";
import { useTheme } from "../theme";

const LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/flashcards", label: "Flashcards" },
  { to: "/tests", label: "Tests" },
  { to: "/mood", label: "Mood" },
  { to: "/notes", label: "Notes" },
  { to: "/focus", label: "Focus" },
  { to: "/prayers", label: "Prayers" },
];

function TimerChip() {
  const { timer, remainingMs } = useFocus();
  const { pathname } = useLocation();
  if (timer.status === "idle" || pathname === "/focus") return null;
  return (
    <Link to="/focus" className="sticker-sm inline-flex items-center gap-1.5 bg-sun px-3 py-1 text-sm font-bold tabular-nums text-on-sun"
      aria-label={`${MODES[timer.mode].label} timer: ${formatClock(remainingMs)} left`}>
      <Icon name="timer" className="size-4" /> {formatClock(remainingMs)}
    </Link>
  );
}

function UserMenu({ me, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-bold text-muted hover:bg-paper hover:text-ink";
  const { theme, toggle } = useTheme();
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border-2 border-edge bg-sun px-3 py-1.5 font-bold text-on-sun">
        <Icon name="settings" className="size-4" />
        <span className="hidden sm:inline">{me.data?.name || me.data?.email || "Account"}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div role="menu" className="sticker-sm absolute right-0 top-full z-50 mt-2 w-56 bg-surface p-2">
          <button role="menuitem" onClick={toggle} className={item}>
            {theme === "light" ? <Moon /> : <Sun />}
            {theme === "light" ? "Dark mode" : "Light mode"}
          </button>
          <Link to="/billing" role="menuitem" className={item}>Plan</Link>
          <Link to="/settings" role="menuitem" className={item}>Settings</Link>
          <button role="menuitem" onClick={onLogout} className={item}>Log out</button>
        </div>
      )}
    </div>
  );
}

function Shell() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => api.get("/auth/me").then((r) => r.data) });
  const [welcomeBack, setWelcomeBack] = useState(() => {
    try { return sessionStorage.getItem("studyguide_reactivated") === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { sessionStorage.removeItem("studyguide_reactivated"); } catch { /* ignore */ }
  }, []);
  
  function handleLogout() {
    queryClient.clear();
    logout();
  }

  return (
    <div className="min-h-screen">
      <header className="border-b-2 border-edge bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
          <LogoLink />
          <nav className="flex w-full gap-1 overflow-x-auto sm:w-auto" aria-label="Main">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to}
                className={({ isActive }) =>
                  `rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                    isActive ? "bg-sun text-on-sun" : "text-muted hover:bg-paper hover:text-ink"
                  }`}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <TimerChip />
            <UserMenu me={me} onLogout={handleLogout} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {welcomeBack && (
          <div role="status" className="sticker-sm mb-6 flex items-center justify-between gap-4 bg-mint px-5 py-3 font-bold text-on-sun">
            <span>Welcome back to Reading Partner. Your account has been reactivated.</span>
            <button onClick={() => setWelcomeBack(false)} aria-label="Dismiss" className="text-xl leading-none">&times;</button>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}

export default function AppLayout() {
  // The provider lives here so a running timer keeps going while you move between pages.
  return (
    <FocusProvider>
      <Shell />
    </FocusProvider>
  );
}