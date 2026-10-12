import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth";
import Logo from "../components/Logo";
import ProgressRing from "../components/ProgressRing";
import ThemeToggle from "../components/ThemeToggle";

const WORDS = ["Assignments", "Labs", "Exams", "Thesis", "Group projects", "Quizzes", "Presentations", "Reports"];

const FEATURES = [
  { icon: "\u23F0", tint: "bg-sun", title: "Deadlines at a glance",
    body: "Add a subject and a due date in seconds. Quick chips for Today, Tomorrow and Next week, and overdue work turns red so nothing sneaks up." },
  { icon: "\uD83D\uDCC8", tint: "bg-sky", title: "Progress you can see",
    body: "A completion ring, a weekly chart and a bar for every subject turn your to-do list into a scoreboard." },
  { icon: "\uD83D\uDD25", tint: "bg-pink", title: "Streaks that feel good",
    body: "Finish one task a day to keep your streak alive. Small wins add up faster than you think." },
  { icon: "\uD83D\uDD4C", tint: "bg-mint", title: "Prayer tracker",
    body: "Prayer times for your city, a five-prayer checklist, a weekly grid and a full-day streak, right beside your study plan." },
  { icon: "\uD83C\uDFAF", tint: "bg-sun", title: "One clear next step",
    body: "The dashboard always shows what to do next. Tick it off in one tap and move on." },
  { icon: "\uD83C\uDF19", tint: "bg-sky", title: "Light and dark",
    body: "Easy on the eyes at 2 a.m. Flip the theme with a single tap, and it remembers your choice." },
];

const SOON = [
  { icon: "\u23F1\uFE0F", title: "Focus timer", body: "Pomodoro sessions that count toward your streak." },
  { icon: "\uD83E\uDD16", title: "AI study planner", body: "A plan built around your exam dates, your energy and your prayer times." },
  { icon: "\uD83D\uDCDD", title: "Notes", body: "Short notes that live next to each subject." },
];

const STEPS = [
  { n: "1", tint: "bg-sun", title: "Add what's due", body: "Type the task, pick a subject and a deadline." },
  { n: "2", tint: "bg-pink", title: "Tick things off", body: "Complete tasks, log your prayers, keep the streak going." },
  { n: "3", tint: "bg-mint", title: "Watch it add up", body: "Your ring fills, your week lights up, and you can see you're getting somewhere." },
];

const FAQ = [
  { q: "Is it free?", a: "Yes, creating an account is free." },
  { q: "Why do I get a code by email?", a: "We send a 6-digit code to confirm the address is yours. It takes a few seconds and keeps your account safe." },
  { q: "Where do the prayer times come from?", a: "They come from the Aladhan service, based on your city and the calculation method you pick in the tracker settings. Check them against your local mosque if you like." },
  { q: "Can other people see my tasks?", a: "No. Your tasks and prayer log are only visible to you when you're logged in." },
  { q: "Does it work on my phone?", a: "Yes, the site adapts to phones and laptops. An installable app is on the list for later." },
];

const DEMO_TASKS = ["Finish the lab report", "Read chapter 4", "Email the group about Friday", "Revise for the quiz"];
const DEMO_MESSAGES = [
  "Tap a task to tick it off.",
  "Nice start. Keep going.",
  "Halfway there!",
  "So close. One more!",
  "All done. Time for a snack.",
];

function Demo() {
  const [done, setDone] = useState(DEMO_TASKS.map(() => false));
  const count = done.filter(Boolean).length;
  return (
    <div className="sticker bg-surface p-6">
      <div className="flex items-center gap-4">
        <ProgressRing value={Math.round((count / DEMO_TASKS.length) * 100)} size={84} stroke={9} />
        <p className="font-display text-xl font-semibold" role="status">{DEMO_MESSAGES[count]}</p>
      </div>
      <ul className="mt-5 space-y-2">
        {DEMO_TASKS.map((task, i) => (
          <li key={task}>
            <button
              role="checkbox"
              aria-checked={done[i]}
              onClick={() => setDone(done.map((d, j) => (j === i ? !d : d)))}
              className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left font-semibold transition-all active:scale-[0.98] ${
                done[i] ? "border-done bg-done/10 text-muted line-through" : "border-line hover:border-brand"
              }`}
            >
              <span className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${
                done[i] ? "border-done bg-done text-white" : "border-muted/50"
              }`}>
                {done[i] && (
                  <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
                    <path d="M3 8.5l3.2 3.2L13 5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              {task}
            </button>
          </li>
        ))}
      </ul>
      {count > 0 && (
        <button onClick={() => setDone(DEMO_TASKS.map(() => false))}
          className="mt-4 text-sm font-bold text-brand-ink underline">Start over</button>
      )}
    </div>
  );
}

function HeroCard() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden="true">
      <div className="sticker ruled relative rotate-1 p-6 pb-14">
        <div className="absolute inset-y-0 left-10 w-px bg-pink" />
        <div className="pl-8">
          <div className="flex items-center gap-4">
            <ProgressRing value={68} size={72} stroke={8} />
            <div>
              <p className="font-display text-lg font-semibold">Good evening</p>
              <p className="text-sm text-muted">2 to do &middot; 1 due this week</p>
            </div>
          </div>
          <ul className="mt-5 space-y-3">
            {[
              { t: "Lab report", m: "EEE \u00b7 due tomorrow", d: false },
              { t: "Read chapter 4", m: "CSE \u00b7 due Thursday", d: false },
              { t: "Quiz revision", m: "Math \u00b7 done", d: true },
            ].map((x) => (
              <li key={x.t} className="flex items-start gap-3">
                <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  x.d ? "border-done bg-done" : "border-brand"
                }`}>
                  {x.d && (
                    <svg viewBox="0 0 16 16" className="size-3 text-white">
                      <path d="M3 8.5l3.2 3.2L13 5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <div>
                  <p className={`font-bold ${x.d ? "text-muted line-through" : ""}`}>{x.t}</p>
                  <p className="text-sm text-muted">{x.m}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            {["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].map((p, i) => (
              <span key={p} className={`rounded-full border-2 px-3 py-0.5 text-sm font-bold ${
                i < 3 ? "border-done bg-done text-white" : "border-line"
              }`}>{p}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="sticker-sm absolute -right-2 -top-5 rotate-6 bg-pink px-3 py-2 font-display text-sm font-bold text-on-sun sm:-right-5">
        {"\uD83D\uDD25"} 4-day streak
      </div>
      <div className="sticker-sm absolute -bottom-6 -left-2 -rotate-3 bg-sun px-4 py-3 text-on-sun sm:-left-5">
        <p className="text-xs font-bold uppercase tracking-wide opacity-70">Up next</p>
        <p className="font-display font-semibold">Lab report &middot; due tomorrow</p>
      </div>
    </div>
  );
}

export default function Home() {
  const { token } = useAuth();
  const cta = "btn inline-block rounded-xl bg-brand px-6 py-3 font-display text-lg font-semibold text-white";
  const navLink = "hidden rounded-full px-3 py-1.5 text-sm font-bold text-muted hover:bg-surface hover:text-ink md:inline-block";

  return (
    <div className="min-h-screen overflow-x-clip">
      <header className="sticky top-0 z-40 border-b-2 border-edge bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <Link to="/" aria-label="Study Guide home" className="mr-4"><Logo /></Link>
          <nav className="flex flex-1 items-center gap-1" aria-label="Sections">
            <a href="#features" className={navLink}>Features</a>
            <a href="#how" className={navLink}>How it works</a>
            <a href="#try" className={navLink}>Try it</a>
            <a href="#faq" className={navLink}>FAQ</a>
          </nav>
          <div className="flex items-center gap-2 text-sm">
            <ThemeToggle />
            {token ? (
              <Link to="/dashboard" className="btn whitespace-nowrap rounded-xl bg-brand px-4 py-2 font-bold text-white">Open dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="hidden px-2 py-2 font-bold hover:underline sm:inline">Log in</Link>
                <Link to="/signup" className="btn whitespace-nowrap rounded-xl bg-brand px-4 py-2 font-bold text-white">Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-24 pt-14 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="sticker-sm inline-block -rotate-2 bg-pink px-3 py-1 font-display text-sm font-bold text-on-sun">
              For students with a lot going on
            </p>
            <h1 className="mt-5 text-5xl font-bold leading-[1.08] sm:text-6xl">
              Make studying feel like <span className="highlight">progress</span>.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted">
              Track assignments, build streaks and keep your daily prayers on the same page. Small wins, every single day.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to={token ? "/dashboard" : "/signup"} className={cta}>
                {token ? "Open dashboard" : "Start for free"}
              </Link>
              {!token && (
                <Link to="/login" className="font-bold underline underline-offset-4 hover:text-brand-ink">
                  I already have an account
                </Link>
              )}
            </div>
            <ul className="mt-8 flex flex-wrap gap-2 text-sm font-bold">
              {["Free to start", "Phone and laptop friendly", "Light and dark themes"].map((t) => (
                <li key={t} className="rounded-full border-2 border-line bg-surface px-3 py-1">{t}</li>
              ))}
            </ul>
          </div>
          <HeroCard />
        </section>

        <div className="overflow-hidden border-y-2 border-edge bg-brand py-3 text-white" aria-hidden="true">
          <div className="marquee flex w-max gap-8 font-display text-xl font-semibold">
            {[...WORDS, ...WORDS].map((w, i) => (
              <span key={i} className="flex items-center gap-8 whitespace-nowrap">
                {w}<span className="text-sun">{"\u2726"}</span>
              </span>
            ))}
          </div>
        </div>

        <section id="features" className="mx-auto max-w-6xl px-4 py-24">
          <h2 className="text-center text-4xl font-bold">Everything for your study day</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted">
            No clutter, no setup maze. Just the things that help you get through the week.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <article key={f.title} className="sticker bg-surface p-6 transition-transform hover:-translate-y-1">
                <div className={`grid size-12 place-items-center rounded-xl border-2 border-edge text-2xl ${f.tint}`} aria-hidden="true">
                  {f.icon}
                </div>
                <h3 className="mt-4 text-xl font-semibold">{f.title}</h3>
                <p className="mt-2 text-muted">{f.body}</p>
              </article>
            ))}
          </div>

          <h3 className="mt-20 text-center text-2xl font-semibold">Coming soon</h3>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {SOON.map((s) => (
              <div key={s.title} className="rounded-2xl border-2 border-dashed border-edge p-5">
                <p className="flex items-center gap-2 font-display text-lg font-semibold">
                  <span aria-hidden="true">{s.icon}</span> {s.title}
                  <span className="ml-auto rounded-full bg-sun px-2 py-0.5 text-xs font-bold text-on-sun">Soon</span>
                </p>
                <p className="mt-1 text-sm text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="border-y-2 border-edge bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-24">
            <h2 className="text-center text-4xl font-bold">How it works</h2>
            <ol className="mt-12 grid gap-8 md:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className="text-center">
                  <span className={`sticker-sm mx-auto grid size-14 place-items-center font-display text-2xl font-bold text-on-sun ${s.tint}`}>
                    {s.n}
                  </span>
                  <h3 className="mt-4 text-xl font-semibold">{s.title}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="try" className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 lg:grid-cols-2">
          <div>
            <h2 className="text-4xl font-bold">Go on, tick something off.</h2>
            <p className="mt-4 max-w-md text-lg text-muted">
              This is the feeling Study Guide is built around. Finish a task, watch the ring fill, and see how good a clean list feels.
            </p>
            {!token && (
              <Link to="/signup" className={`${cta} mt-8`}>Make my own list</Link>
            )}
          </div>
          <Demo />
        </section>

        <section id="faq" className="mx-auto max-w-3xl px-4 pb-24">
          <h2 className="text-center text-4xl font-bold">Questions</h2>
          <div className="mt-10 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="sticker-sm group bg-surface p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="text-2xl leading-none text-brand-ink transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="mt-3 text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {!token && (
          <section className="border-y-2 border-edge bg-brand">
            <div className="mx-auto max-w-3xl px-4 py-20 text-center text-white">
              <h2 className="text-4xl font-bold">Ready to feel on top of things?</h2>
              <p className="mt-3 text-lg text-white/85">Set up takes about a minute.</p>
              <Link to="/signup"
                className="btn mt-8 inline-block rounded-xl bg-sun px-7 py-3 font-display text-lg font-semibold text-on-sun">
                Create my account
              </Link>
            </div>
          </section>
        )}
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted">
        <Logo className="text-ink" />
        <nav className="flex gap-4 font-bold" aria-label="Footer">
          <a href="#features" className="hover:text-ink">Features</a>
          <a href="#how" className="hover:text-ink">How it works</a>
          <a href="#faq" className="hover:text-ink">FAQ</a>
          <Link to="/login" className="hover:text-ink">Log in</Link>
        </nav>
        <p>&copy; {new Date().getFullYear()} Study Guide. Made for students.</p>
      </footer>
    </div>
  );
}