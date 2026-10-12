import { Link, NavLink, Outlet } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api";
import { useAuth } from "../auth";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/prayers", label: "Prayers" },
];

export default function AppLayout() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => api.get("/auth/me").then((r) => r.data) });

  function handleLogout() {
    queryClient.clear();
    logout();
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to="/dashboard" aria-label="Study Guide dashboard"><Logo /></Link>
          <nav className="flex gap-1" aria-label="Main">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive ? "bg-brand/10 text-brand-ink" : "text-muted hover:text-ink"
                  }`}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">{me.data?.name || me.data?.email}</span>
            <ThemeToggle />
            <button onClick={handleLogout}
              className="rounded-md border border-line bg-surface px-3 py-1.5 font-medium hover:bg-paper">
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}