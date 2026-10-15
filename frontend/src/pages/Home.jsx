import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth";
import Icon from "../components/Icon";
import LogoLink from "../components/LogoLink";
import ProgressRing from "../components/ProgressRing";
import ThemeToggle from "../components/ThemeToggle";

const WORDS = ["Lectures", "Slides", "Definitions", "Formulas", "Exams", "Quizzes", "Vocabulary", "Revision"];

const FEATURES = [
  { icon: "cards", tint: "bg-mint", title: "Flashcards",
    body: "Turn a lecture into cards automatically or write them yourself. Cards you miss come back sooner, so the hard ones stick." },
  { icon: "note", tint: "bg-sun", title: "Notes",
    body: "Short notes tied to a subject. Pin the ones you need most, colour-code the rest, and search them in a second." },
  { icon: "clock", tint: "bg-pink", title: "Deadlines at a glance",
    body: "Add a subject and a due date in seconds. Overdue work turns red so nothing sneaks up on you." },
  { icon: "chart", tint: "bg-sky", title: "Progress you can see",
    body: "A completion ring, a weekly chart and a bar for every subject turn your to-do list into a scoreboard." },
  { icon: "flame", tint: "bg-pink", title: "Streaks that feel good",
    body: "Finish one task a day to keep your streak alive. Small wins add up faster than you think." },
  { icon: "moon", tint: "bg-mint", title: "Prayer tracker",
    body: "Prayer times for your city, a five-prayer checklist and a full-day streak, right beside your study plan." },
  { icon: "target", tint: "bg-sun", title: "One clear next step",
    body: "The dashboard always shows what to do next. Tick it off in one tap and move on." },
  { icon: "timer", tint: "bg-sky", title: "Pomodoro focus timer",
    body: "Work in focused rounds with breaks in between. Link a round to a task and see your minutes add up." },
];

const SOON = [
  { icon: "sparkle", title: "AI study planner", body: "A plan built around your exam dates, your energy and your prayer times." },
];

const WHY = [
  { icon: "book", tint: "bg-pink", problem: "You re-read your notes, then blank in the exam.",
    fix: "Flashcards make you recall the answer instead of just recognising it. That is exactly what exams ask of you." },
  { icon: "clock", tint: "bg-sun", problem: "You forget last week's lecture by the weekend.",
    fix: "Cards you miss come back sooner and cards you know come back later, so each day you review the right things." },
  { icon: "target", tint: "bg-mint", problem: "Deadlines, notes and revision are scattered everywhere.",
    fix: "Tasks, notes, a focus timer and your daily prayers live in one calm place, with a clear next step." },
];

const STEPS = [
  { n: "1", tint: "bg-sun", title: "Name a lecture", body: "Give it a title and a colour. You can rename or recolour it any time." },
  { n: "2", tint: "bg-pink", title: "Add your cards", body: "Let AI draft them from your notes, or write them yourself. Add as many as you like." },
  { n: "3", tint: "bg-mint", title: "Flip and remember", body: "Rate each card. The ones you miss come back sooner, the ones you know come back later." },
];

const PATHS = [
  {
    id: "auto", icon: "sparkle", tint: "bg-brand", title: "Automatic", sub: "Fastest. AI writes the first draft.",
    steps: [
      "Open a lecture and choose Automatic.",
      "Upload a PDF, PowerPoint or .txt, or paste your notes. Up to 8,000 words at a time.",
      "Pick how many cards you want and press Make flashcards.",
      "Look them over, remove any you don't want, then add them to your lecture.",
    ],
  },
  {
    id: "manual", icon: "pencil", tint: "bg-sun", title: "By yourself", sub: "Full control. Write exactly what you need.",
    steps: [
      "Open a lecture and choose By myself.",
      "Type the question on the front and the answer on the back, then press Add card.",
      "The form clears so you can keep going. Or paste a whole list, one card per line.",
      "Edit or delete any card later.",
    ],
  },
];

const DEMO_CARDS = [
  { q: "What does DHCP do?", a: "Hands out IP addresses to devices automatically." },
  { q: "Which OSI layer handles routing?", a: "Layer 3, the Network layer (IP)." },
  { q: "TCP vs UDP?", a: "TCP is reliable and ordered. UDP is faster but makes no delivery guarantee." },
];

const FAQ = [
  { q: "Is it free?", a: "Yes, creating an account is free. Free accounts can make 3 automatic flashcard sets a month, and writing cards yourself has no monthly limit." },
  { q: "How long can my notes be?", a: "Up to 8,000 words at a time, pasted or uploaded. For a longer lecture, make cards from one part, then come back for the next." },
  { q: "What is the difference between notes and flashcards?", a: "Notes are where you write things down. Flashcards are where you test yourself on them. Use notes to capture a lecture, then turn the important parts into cards." },
  { q: "Can I make flashcards myself?", a: "Yes. Choose By myself in any lecture and write each card, or paste a list with one card per line. You can edit the lecture name, course, colour and every card afterwards." },
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

function FlashcardDemo() {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = DEMO_CARDS[i];
  function next() {
    setFlipped(false);
    setI((i + 1) % DEMO_CARDS.length);
  }
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="card-tape">
        <button type="button" onClick={() => setFlipped((f) => !f)}
          className="sticker index-card relative flex min-h-56 w-full cursor-pointer flex-col items-center justify-center p-6 pb-9 pt-10 text-center">
          <span className="absolute left-4 top-3 text-xs font-bold uppercase tracking-widest text-muted">{flipped ? "Answer" : "Question"}</span>
          <span aria-live="polite" className="font-display text-2xl font-semibold leading-snug">{flipped ? card.a : card.q}</span>
          <span className="absolute bottom-3 text-xs font-bold text-muted">{flipped ? "tap to flip back" : "tap to show answer"}</span>
        </button>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-sm font-bold tabular-nums text-muted">Try it &middot; card {i + 1} of {DEMO_CARDS.length}</span>
        <button type="button" onClick={next}
          className="btn rounded-xl bg-mint px-5 py-2 font-display font-semibold text-on-sun">Next card</button>
      </div>
      <div className="sticker-sm absolute -right-2 -top-6 inline-flex rotate-6 items-center gap-1.5 bg-pink px-3 py-2 font-display text-sm font-bold text-on-sun sm:-right-5" aria-hidden="true">
        <Icon name="sparkle" className="size-4" /> Made in seconds
      </div>
    </div>
  );
}

function WhySection() {
  return (
    <section id="why" className="mx-auto max-w-6xl px-4 py-24">
      <h2 className="text-center text-4xl font-bold">Why Reading Partner?</h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-muted">
        Built for university students who put in the hours and want it to actually pay off.
      </p>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {WHY.map((w) => (
          <article key={w.problem} className="sticker bg-surface p-6">
            <div className={`grid size-12 place-items-center rounded-xl border-2 border-edge text-on-sun ${w.tint}`} aria-hidden="true">
              <Icon name={w.icon} className="size-6" />
            </div>
            <h3 className="mt-4 text-xl font-semibold leading-snug">{w.problem}</h3>
            <p className="mt-2 text-muted">{w.fix}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function HowToFlashcards({ token }) {
  return (
    <section id="flashcards" className="border-y-2 border-edge bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-24">
        <h2 className="text-center text-4xl font-bold">How to make flashcards</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted">
          Three steps. Pick the automatic way or the by-yourself way for each lecture, and mix them whenever you like.
        </p>

        <ol className="mt-12 grid gap-8 md:grid-cols-3">
          {STEPS.map((st) => (
            <li key={st.n} className="text-center">
              <span className={`sticker-sm mx-auto grid size-14 place-items-center font-display text-2xl font-bold text-on-sun ${st.tint}`}>
                {st.n}
              </span>
              <h3 className="mt-4 text-xl font-semibold">{st.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-muted">{st.body}</p>
            </li>
          ))}
        </ol>

        <h3 className="mt-16 text-center text-2xl font-semibold">Two ways to add cards</h3>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {PATHS.map((p) => (
            <article key={p.id} className="sticker bg-paper p-6">
              <div className="flex items-center gap-3">
                <span className={`grid size-12 place-items-center rounded-xl border-2 border-edge text-on-sun ${p.tint}`} aria-hidden="true"><Icon name={p.icon} className="size-6" /></span>
                <div>
                  <h4 className="font-display text-xl font-semibold">{p.title}</h4>
                  <p className="text-sm text-muted">{p.sub}</p>
                </div>
              </div>
              <ol className="mt-5 space-y-3">
                {p.steps.map((t, n) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 border-edge bg-surface text-xs font-bold">{n + 1}</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link to={token ? "/flashcards" : "/signup"}
            className="btn inline-block rounded-xl bg-brand px-6 py-3 font-display text-lg font-semibold text-on-sun">
            {token ? "Go to my flashcards" : "Make my first flashcards"}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { token } = useAuth();
  const cta = "btn inline-block rounded-xl bg-brand px-6 py-3 font-display text-lg font-semibold text-on-sun";
  const navLink = "hidden rounded-full px-3 py-1.5 text-sm font-bold text-muted hover:bg-surface hover:text-ink md:inline-block";

  return (
    <div className="min-h-screen overflow-x-clip">
      <header className="sticky top-0 z-40 border-b-2 border-edge bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <LogoLink className="mr-4" />
          <nav className="flex flex-1 items-center gap-1" aria-label="Sections">
            <a href="#why" className={navLink}>Why</a>
            <a href="#flashcards" className={navLink}>Flashcards</a>
            <a href="#features" className={navLink}>Features</a>
            <a href="#try" className={navLink}>Try it</a>
            <a href="#faq" className={navLink}>FAQ</a>
          </nav>
          <div className="flex items-center gap-2 text-sm">
            <ThemeToggle />
            {token ? (
              <Link to="/dashboard" className="btn whitespace-nowrap rounded-xl bg-brand px-4 py-2 font-bold text-on-sun">Open dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="hidden px-2 py-2 font-bold hover:underline sm:inline">Log in</Link>
                <Link to="/signup" className="btn whitespace-nowrap rounded-xl bg-brand px-4 py-2 font-bold text-on-sun">Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-24 pt-14 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="sticker-sm inline-block -rotate-2 bg-pink px-3 py-1 font-display text-sm font-bold text-on-sun">
              Study smarter, not longer
            </p>
            <h1 className="mt-5 text-5xl font-bold leading-[1.08] sm:text-6xl">
              Turn any lecture into <span className="highlight">flashcards</span>.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted">
              Re-reading your notes feels productive but rarely sticks. Testing yourself does. Reading Partner turns your slides and notes into flashcards in seconds, then shows you what to review today.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to={token ? "/flashcards" : "/signup"} className={cta}>
                {token ? "Open my flashcards" : "Make my first flashcards"}
              </Link>
              <a href="#flashcards" className="font-bold underline underline-offset-4 hover:text-brand-ink">See how it works</a>
              {!token && (
                <Link to="/login" className="font-bold underline underline-offset-4 hover:text-brand-ink">
                  I already have an account
                </Link>
              )}
            </div>
            <ul className="mt-8 flex flex-wrap gap-2 text-sm font-bold">
              {["Up to 8,000 words per lecture", "Automatic or by hand", "Calm colours, easy on the eyes"].map((t) => (
                <li key={t} className="rounded-full border-2 border-line bg-surface px-3 py-1">{t}</li>
              ))}
            </ul>
          </div>
          <FlashcardDemo />
        </section>

        <div className="overflow-hidden border-y-2 border-edge bg-brand py-3 text-on-sun" aria-hidden="true">
          <div className="marquee flex w-max gap-8 font-display text-xl font-semibold">
            {[...WORDS, ...WORDS].map((w, i) => (
              <span key={i} className="flex items-center gap-8 whitespace-nowrap">
                {w}<span className="size-1.5 rounded-full bg-on-sun/40" />
              </span>
            ))}
          </div>
        </div>

        <WhySection />

        <HowToFlashcards token={token} />

        <section id="features" className="mx-auto max-w-6xl px-4 py-24">
          <h2 className="text-center text-4xl font-bold">And everything else for your study day</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted">
            No clutter, no setup maze. Just the things that help you get through the week.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <article key={f.title} className="sticker bg-surface p-5 transition-transform hover:-translate-y-1">
                <div className={`grid size-12 place-items-center rounded-xl border-2 border-edge text-on-sun ${f.tint}`} aria-hidden="true">
                  <Icon name={f.icon} className="size-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted">{f.body}</p>
              </article>
            ))}
          </div>

          <h3 className="mt-20 text-center text-2xl font-semibold">Coming soon</h3>
          <div className="mx-auto mt-6 grid max-w-md gap-4">
            {SOON.map((s) => (
              <div key={s.title} className="rounded-2xl border-2 border-dashed border-edge p-5">
                <p className="flex items-center gap-2 font-display text-lg font-semibold">
                  <Icon name={s.icon} className="size-5" /> {s.title}
                  <span className="ml-auto rounded-full bg-sun px-2 py-0.5 text-xs font-bold text-on-sun">Soon</span>
                </p>
                <p className="mt-1 text-sm text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="try" className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-24 lg:grid-cols-2">
          <div>
            <h2 className="text-4xl font-bold">Go on, tick something off.</h2>
            <p className="mt-4 max-w-md text-lg text-muted">
              This is the feeling Reading Partner is built around. Finish a task, watch the ring fill, and see how good a clean list feels.
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
            <div className="mx-auto max-w-3xl px-4 py-20 text-center text-on-sun">
              <h2 className="text-4xl font-bold">Ready to feel on top of things?</h2>
              <p className="mt-3 text-lg text-on-sun/80">Set up takes about a minute.</p>
              <Link to="/signup"
                className="btn mt-8 inline-block rounded-xl bg-sun px-7 py-3 font-display text-lg font-semibold text-on-sun">
                Create my account
              </Link>
            </div>
          </section>
        )}
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted">
        <LogoLink className="text-ink" />
        <nav className="flex gap-4 font-bold" aria-label="Footer">
          <a href="#features" className="hover:text-ink">Features</a>
          <a href="#flashcards" className="hover:text-ink">Flashcards</a>
          <a href="#faq" className="hover:text-ink">FAQ</a>
          <Link to="/login" className="hover:text-ink">Log in</Link>
        </nav>
        <p>&copy; {new Date().getFullYear()} Reading Partner. Made for students.</p>
      </footer>
    </div>
  );
}