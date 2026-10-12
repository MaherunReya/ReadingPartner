import { Link } from "react-router-dom";
import { useAuth } from "../auth";
import Logo from "../components/Logo";
import ProgressRing from "../components/ProgressRing";
import ThemeToggle from "../components/ThemeToggle";

const FEATURES = [
  {
    title: "Deadlines that don't sneak up",
    body: "Add assignments with a subject and a due date. Overdue work is flagged in red, and the next thing to do is always at the top.",
  },
  {
    title: "Progress you can see",
    body: "A completion ring, a weekly activity chart, a daily streak and a progress bar for every subject show how far you've come.",
  },
  {
    title: "A prayer tracker built in",
    body: "Daily prayer times for your city, a five-prayer checklist, a weekly grid and a full-day streak, right next to your study plan.",
  },
];

const PREVIEW = [
  { title: "Lab report: op-amp gain stage", meta: "EEE, due tomorrow", done: false },
  { title: "Packet Tracer: VLSM table", meta: "CSE, due Thursday", done: false },
  { title: "Thesis: related work draft", meta: "Thesis, done", done: true },
];

export default function Home() {
  const { token } = useAuth();
  const cta = "rounded-md bg-brand px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-dark";

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <Link to="/" aria-label="Study Guide home"><Logo /></Link>
        <nav className="flex items-center gap-3 text-sm" aria-label="Account">
          <ThemeToggle />
          {token ? (
            <Link to="/dashboard" className="rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="px-2 py-2 font-medium hover:underline">Log in</Link>
              <Link to="/signup" className="rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark">
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-5xl items-center gap-12 px-4 pb-20 pt-10 lg:grid-cols-2">
          <div>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Stay on top of every deadline.</h1>
            <p className="mt-5 max-w-md text-lg text-muted">
              Study Guide keeps your assignments, your progress and your five daily prayers in one calm place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={token ? "/dashboard" : "/signup"} className={cta}>
                {token ? "Open dashboard" : "Create a free account"}
              </Link>
              {!token && (
                <Link to="/login" className="rounded-md border border-line bg-surface px-6 py-3 font-semibold hover:bg-paper">
                  Log in
                </Link>
              )}
            </div>
          </div>

          <div className="ruled relative rounded-2xl border border-line p-6 shadow-sm" aria-hidden="true">
            <div className="absolute inset-y-0 left-10 w-px bg-[#e6a3ad]" />
            <div className="pl-8">
              <div className="flex items-center gap-4">
                <ProgressRing value={68} size={72} stroke={8} />
                <div>
                  <p className="font-semibold">Good evening</p>
                  <p className="text-sm text-muted">2 to do &middot; 4-day streak</p>
                </div>
              </div>
              <ul className="mt-5 space-y-3">
                {PREVIEW.map((t) => (
                  <li key={t.title} className="flex items-start gap-3">
                    <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      t.done ? "border-done bg-done" : "border-brand"
                    }`}>
                      {t.done && (
                        <svg viewBox="0 0 16 16" className="size-3 text-white">
                          <path d="M3 8.5l3.2 3.2L13 5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <div>
                      <p className={`font-medium ${t.done ? "text-muted line-through" : ""}`}>{t.title}</p>
                      <p className="text-sm text-muted">{t.meta}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap gap-2">
                {["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].map((p, i) => (
                  <span key={p} className={`rounded-full border px-3 py-1 text-sm font-medium ${
                    i < 3 ? "border-done bg-done text-white" : "border-line"
                  }`}>{p}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-line bg-surface">
          <div className="mx-auto grid max-w-5xl gap-8 px-4 py-16 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <h2 className="text-lg font-bold">{f.title}</h2>
                <p className="mt-2 text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {!token && (
          <section className="mx-auto max-w-5xl px-4 py-20 text-center">
            <h2 className="text-3xl font-bold">Start with your first assignment.</h2>
            <p className="mt-3 text-muted">It takes a minute to set up, and it's free.</p>
            <Link to="/signup" className={`${cta} mt-8 inline-block`}>Create a free account</Link>
          </section>
        )}
      </main>

      <footer className="border-t border-line px-4 py-6 text-center text-sm text-muted">
        Study Guide
      </footer>
    </div>
  );
}