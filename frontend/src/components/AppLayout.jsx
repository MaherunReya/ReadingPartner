import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api";
import { FocusProvider, MODES, formatClock, useFocus } from "../focusTimer";
import { useAuth } from "../auth";
import Icon from "./Icon";
import LogoLink from "./LogoLink";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/flashcards", label: "Flashcards" },
  { to: "/tests", label: "Tests" },
  { to: "/mood", label: "Mood" },
  { to: "/notes", label: "Notes" },
  { to: "/focus", label: "Focus" },
  { to: "/prayers", label: "Prayers" },
  { to: "/billing", label: "Billing" },
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

function Shell() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => api.get("/auth/me").then((r) => r.data) });

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
            <span className="hidden text-muted sm:inline">{me.data?.name || me.data?.email}</span>
            <ThemeToggle />
            <button onClick={handleLogout}
              className="btn rounded-xl bg-surface px-3 py-1.5 font-bold">
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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