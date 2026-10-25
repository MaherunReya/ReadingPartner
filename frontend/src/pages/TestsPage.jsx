import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api, { errorMessage } from "../api";
import { useBilling } from "../billing";
import { useGenerateTest } from "../aiTest";
import Card from "../components/Card";
import Icon from "../components/Icon";
import { MAX_WORDS, countWords, trimToWords, useCards, useDecks } from "../flashcards";
import { TEST_TYPES, availableTypes, buildQuestions, clean, finalize, fromAi, grade, loadHistory, saveAttempt } from "../testEngine";

const MINUTES = [0, 5, 10, 20];
const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const SOURCES = [
  { value: "cards", label: "My flashcards" },
  { value: "lecture", label: "A lecture or PDF (AI)" },
  { value: "both", label: "Both mixed (AI)" },
];

function Pills({ label, value, onChange, options }) {
  return (
    <fieldset>
      <legend className="text-sm font-bold text-muted">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={String(o.value)} type="button" role="radio" aria-checked={value === o.value} disabled={o.disabled}
            title={o.hint} onClick={() => onChange(o.value)}
            className={`rounded-full border-2 px-4 py-1.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              value === o.value ? "border-edge bg-brand text-on-sun" : "border-line text-muted hover:border-edge hover:text-ink"
            }`}>
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/* ---------- 1. Setup ---------- */

function Setup({ decks, initialDeckId, onBegin }) {
  const billing = useBilling();
  const plan = billing.data?.plan;
  const allowance = billing.data?.usage.flashcards;
  const left = allowance ? Math.max(0, allowance.limit - allowance.used) : null;
  const maxQuestions = plan?.max_cards ?? 10;
  const maxWords = plan?.max_notes_words ?? MAX_WORDS;

  const [source, setSource] = useState(decks.length ? "cards" : "lecture");
  const [deckId, setDeckId] = useState(initialDeckId ?? decks[0]?.id ?? null);
  const usesCards = source !== "lecture";
  const usesAi = source !== "cards";
  const cardsQuery = useCards(deckId, { enabled: !!deckId && usesCards });
  const cards = usesCards ? (cardsQuery.data ?? []) : [];
  const deck = decks.find((d) => d.id === deckId);
  const gen = useGenerateTest();

  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileMsg, setFileMsg] = useState("");
  const [reading, setReading] = useState(false);
  const [type, setType] = useState("mc");
  const [count, setCount] = useState(10);
  const [order, setOrder] = useState("random");
  const [feedback, setFeedback] = useState("instant");
  const [minutes, setMinutes] = useState(0);
  const [history] = useState(() => loadHistory());

  const words = countWords(text);
  const over = words > maxWords;

  // Question types: with flashcards only, some need enough different answers. The AI can write any type.
  const can = source === "cards" ? availableTypes(cards) : { mc: true, tf: true, typed: true, mixed: true };
  const usableType = can[type] ? type : "typed";
  const counts = source === "cards"
    ? [...[5, 10, 20].filter((n) => n < cards.length), "all"]
    : [5, 10, 20, 30].filter((n) => n <= maxQuestions);
  const usableCount = counts.includes(count) ? count : counts[counts.length - 1];

  const mine = history
    .filter((h) => (source === "lecture" ? h.source === "lecture" : h.deckId === deckId))
    .slice(0, 5);

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setReading(true);
    setFileMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/ai/extract", fd);
      setText(data.text);
      setFileName(file.name);
      setFileMsg(data.truncated
        ? `Loaded the first ${maxWords.toLocaleString()} words of ${file.name}. Make a test from this part, then do the rest separately.`
        : `Loaded ${file.name}`);
    } catch (err) {
      setFileMsg(errorMessage(err));
    } finally {
      setReading(false);
    }
  }

  function start() {
    const settings = { type: usableType, count: usableCount, order, feedback, minutes };
    const title = source === "cards" ? deck.name : source === "lecture" ? (fileName || "Pasted notes") : `${deck.name} + notes`;
    const base = { title, deck: usesCards ? deck : null, source, settings };

    if (source === "cards") {
      const make = () => buildQuestions(cards, settings, cards);
      onBegin({ ...base, questions: make(), rebuild: make });
      return;
    }
    // Lecture or both: half the questions can still come from the flashcards, the rest are written by the AI.
    const fromCards = source === "both" ? Math.min(Math.floor(usableCount / 2), cards.length) : 0;
    gen.mutate({ text, count: usableCount - fromCards, type: usableType }, {
      onSuccess: (list) => {
        billing.refetch();
        const written = fromAi(list);
        const make = () => finalize([...(fromCards ? buildQuestions(cards, { ...settings, count: fromCards }, cards) : []), ...written]);
        onBegin({ ...base, questions: make(), rebuild: make });
      },
    });
  }

  const noDecks = decks.length === 0;
  const ready =
    (!usesCards || (cards.length > 0 && !cardsQuery.isLoading)) &&
    (!usesAi || (text.trim().length >= 20 && !over && left !== 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tests</h1>
        <p className="mt-1 text-muted">Test yourself on your flashcards, on a lecture or PDF, or on both. Choose how you want to take it.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <Card title="Test settings">
          <div className="space-y-5">
            <Pills label="Make the test from" value={source} onChange={setSource}
              options={SOURCES.map((s) => ({ ...s, disabled: noDecks && s.value !== "lecture", hint: noDecks && s.value !== "lecture" ? "Make a flashcard lecture first" : undefined }))} />

            {usesCards && !noDecks && (
              <div>
                <label htmlFor="test-deck" className="text-sm font-bold text-muted">Flashcard lecture</label>
                <select id="test-deck" value={deckId ?? ""} onChange={(e) => setDeckId(Number(e.target.value))}
                  className="mt-1 w-full border border-line bg-surface px-3 py-2">
                  {decks.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.card_count} cards)</option>)}
                </select>
              </div>
            )}

            {usesAi && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="btn inline-flex cursor-pointer items-center gap-2 rounded-xl bg-sun px-4 py-2 text-sm font-bold text-on-sun focus-within:ring-4 focus-within:ring-brand-dark">
                    {reading ? "Reading file..." : <><Icon name="upload" className="size-4" /> Upload PDF / PowerPoint / .txt</>}
                    <input type="file" accept=".pdf,.pptx,.txt,.md" onChange={onFile} disabled={reading} className="sr-only" />
                  </label>
                  {fileMsg && <span role="status" className="text-sm text-muted">{fileMsg}</span>}
                </div>
                <div>
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <label htmlFor="test-notes" className="text-sm font-bold text-muted">Or paste the lecture text</label>
                    <span className={`text-xs font-bold tabular-nums ${over ? "text-overdue" : "text-muted"}`}>
                      {words.toLocaleString()} / {maxWords.toLocaleString()} words
                    </span>
                  </div>
                  <textarea id="test-notes" rows={6} value={text} onChange={(e) => { setText(e.target.value); setFileName(""); }}
                    placeholder="Paste lecture notes or slide text. The test asks about what's in here, not just your flashcards."
                    className={`mt-1 w-full resize-y border bg-surface px-3 py-2 ${over ? "border-overdue" : "border-line"}`} />
                  {over && (
                    <p className="mt-1 text-xs">
                      <span className="font-bold text-overdue">{(words - maxWords).toLocaleString()} words over the limit.</span>{" "}
                      <button type="button" onClick={() => setText(trimToWords(text, maxWords))} className="font-bold text-brand-ink underline">
                        Trim to {maxWords.toLocaleString()} words
                      </button>
                    </p>
                  )}
                </div>
              </div>
            )}

            <Pills label="Question type" value={usableType} onChange={setType}
              options={Object.entries(TEST_TYPES).map(([value, label]) => ({
                value, label, disabled: !can[value],
                hint: value === "mc" && !can.mc ? "Needs at least 4 cards with different answers" : value === "tf" && !can.tf ? "Needs at least 2 cards with different answers" : undefined,
              }))} />
            <Pills label="Number of questions" value={usableCount} onChange={setCount}
              options={counts.map((n) => ({ value: n, label: n === "all" ? `All (${cards.length})` : String(n) }))} />
            {usesCards && (
              <Pills label="Flashcard order" value={order} onChange={setOrder}
                options={[{ value: "random", label: "Random" }, { value: "weak", label: "Weakest cards first" }]} />
            )}
            <Pills label="Feedback" value={feedback} onChange={setFeedback}
              options={[{ value: "instant", label: "After each answer" }, { value: "end", label: "At the end (exam style)" }]} />
            <Pills label="Time limit" value={minutes} onChange={setMinutes}
              options={MINUTES.map((m) => ({ value: m, label: m ? `${m} min` : "No limit" }))} />

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" disabled={!ready || gen.isPending} onClick={start}
                className="btn inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 font-display text-lg font-semibold text-on-sun disabled:opacity-50">
                {gen.isPending ? "Writing your test..." : usesAi
                  ? <><Icon name="sparkle" className="size-5" /> Write my test</>
                  : <><Icon name="play" filled className="size-5" /> Start test</>}
              </button>
              {usesAi && left !== null && (
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${left === 0 ? "text-overdue" : "text-muted"}`}>
                  <Icon name="bolt" className="size-3.5" /> {left} of {allowance.limit} AI uses left this month
                </span>
              )}
              {usesAi && left === 0 && (
                <span className="text-sm text-muted">Your AI uses come back next month. Tests from your flashcards still work.</span>
              )}
              {usesCards && cardsQuery.isLoading && <span className="text-sm text-muted">Loading cards...</span>}
              {usesCards && !cardsQuery.isLoading && !noDecks && cards.length === 0 && (
                <span className="text-sm text-muted">This lecture has no cards yet.</span>
              )}
              {gen.isError && <span role="alert" className="text-sm text-overdue">{errorMessage(gen.error)}</span>}
            </div>
          </div>
        </Card>

        <Card title="Your last attempts">
          {mine.length === 0 ? (
            <p className="text-sm text-muted">{source === "lecture" ? "No lecture or PDF tests yet." : "No attempts on this lecture yet."}</p>
          ) : (
            <ul className="divide-y divide-line">
              {mine.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="min-w-0 truncate text-muted">
                    {new Date(h.at).toLocaleDateString([], { month: "short", day: "numeric" })} &middot; {h.source === "lecture" ? h.deckName : TEST_TYPES[h.type]}
                  </span>
                  <span className="shrink-0 font-display font-bold">{h.correct}/{h.total}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ---------- 2. Taking the test ---------- */

function Runner({ run, onFinish, onQuit }) {
  const { questions, settings } = run;
  const instant = settings.feedback === "instant";
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState({});
  const [draft, setDraft] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const startedAt = useRef(Date.now());
  const answersRef = useRef(answers);
  const done = useRef(false);
  answersRef.current = answers;

  const deadline = settings.minutes ? startedAt.current + settings.minutes * 60000 : null;
  const secondsLeft = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null;
  const q = questions[i];
  const given = answers[i];
  const locked = instant && given !== undefined;
  const last = i === questions.length - 1;
  const answered = Object.keys(answers).length;

  function finish(timedOut = false) {
    if (done.current) return;
    done.current = true;
    onFinish({ answers: answersRef.current, seconds: Math.round((Date.now() - startedAt.current) / 1000), timedOut });
  }

  useEffect(() => {
    if (!deadline) return undefined;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [deadline]);
  useEffect(() => {
    if (deadline && now >= deadline) finish(true);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const setAnswer = (v) => setAnswers((a) => ({ ...a, [i]: v }));
  function go(n) {
    setI(n);
    setDraft(typeof answers[n] === "string" ? answers[n] : "");
  }
  function next() {
    if (last) finish(false);
    else go(i + 1);
  }
  const correctNow = locked && grade(q, given);

  const optionStyle = (chosen, isAnswer) => {
    if (locked) {
      if (isAnswer) return "border-edge bg-mint text-on-sun";
      if (chosen) return "border-edge bg-pink text-on-sun";
      return "border-line bg-surface opacity-60";
    }
    return chosen ? "border-edge bg-brand text-on-sun" : "border-line bg-surface hover:border-edge";
  };
  const optionBase = "rounded-xl border-2 px-4 py-3 text-left font-semibold transition-colors disabled:cursor-default";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => { if (window.confirm("Quit this test? Your answers won't be saved.")) onQuit(); }}
          className="text-sm font-bold text-muted hover:text-ink">&larr; Quit</button>
        <span className="min-w-0 truncate text-sm font-bold text-muted">{run.title}</span>
        {secondsLeft !== null && (
          <span role="timer" className={`sticker-sm inline-flex items-center gap-1.5 px-3 py-1 text-sm font-bold tabular-nums ${secondsLeft <= 30 ? "bg-pink text-on-sun" : "bg-surface"}`}>
            <Icon name="timer" className="size-4" /> {clock(secondsLeft)}
          </span>
        )}
      </div>

      <div>
        <div className="flex justify-between text-xs font-bold text-muted">
          <span>Question {i + 1} of {questions.length}</span>
          <span>{answered} answered</span>
        </div>
        <div className="mt-1 h-2.5 overflow-hidden rounded-full border-2 border-edge bg-line"
          role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={answered}>
          <div className="h-full bg-brand-dark transition-all" style={{ width: `${(answered / questions.length) * 100}%` }} />
        </div>
      </div>

      <Card>
        <p className="text-xs font-bold uppercase tracking-widest text-muted">
          {q.type === "mc" ? "Choose the answer" : q.type === "tf" ? "True or false?" : "Type the answer"}
        </p>
        <h2 className="mt-2 break-words font-display text-2xl font-bold leading-snug">{q.prompt}</h2>

        {q.type === "mc" && (
          <div role="radiogroup" aria-label="Answers" className="mt-5 grid gap-2">
            {q.options.map((opt) => (
              <button key={opt} role="radio" aria-checked={given === opt} disabled={locked} onClick={() => setAnswer(opt)}
                className={`${optionBase} ${optionStyle(given === opt, clean(opt) === clean(q.answer))}`}>{opt}</button>
            ))}
          </div>
        )}

        {q.type === "tf" && (
          <div className="mt-4">
            <p className="rounded-xl border-2 border-line bg-paper px-4 py-3 break-words">
              <span className="text-xs font-bold uppercase tracking-wide text-muted">Proposed answer</span><br />{q.shown}
            </p>
            <div role="radiogroup" aria-label="True or false" className="mt-3 grid grid-cols-2 gap-2">
              {[[true, "True"], [false, "False"]].map(([v, label]) => (
                <button key={label} role="radio" aria-checked={given === v} disabled={locked} onClick={() => setAnswer(v)}
                  className={`${optionBase} text-center ${optionStyle(given === v, v === q.isTrue)}`}>{label}</button>
              ))}
            </div>
          </div>
        )}

        {q.type === "typed" && (
          <form className="mt-5 space-y-3" onSubmit={(e) => { e.preventDefault(); if (instant && !locked && draft.trim()) setAnswer(draft); }}>
            <label htmlFor="typed-answer" className="sr-only">Your answer</label>
            <input id="typed-answer" autoFocus autoComplete="off" value={locked ? given : draft} disabled={locked} maxLength={500}
              onChange={(e) => { setDraft(e.target.value); if (!instant) setAnswer(e.target.value); }}
              placeholder="Type your answer"
              className="w-full border border-line bg-surface px-3 py-2" />
            {instant && !locked && (
              <button type="submit" disabled={!draft.trim()}
                className="btn rounded-xl bg-brand px-5 py-2 font-display font-semibold text-on-sun disabled:opacity-50">Check</button>
            )}
          </form>
        )}

        {locked && (
          <div role="status" className={`mt-4 rounded-xl border-2 border-edge px-4 py-3 text-on-sun ${correctNow ? "bg-mint" : "bg-pink"}`}>
            <p className="inline-flex items-center gap-2 font-bold">
              {correctNow ? <><Icon name="check" className="size-5" /> Correct</> : "Not quite"}
            </p>
            {!correctNow && <p className="mt-1 break-words text-sm">Answer: {q.answer}</p>}
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between gap-3">
        {instant ? <span /> : (
          <button onClick={() => go(i - 1)} disabled={i === 0}
            className="btn rounded-xl bg-surface px-5 py-2 font-bold disabled:opacity-50">Back</button>
        )}
        <div className="flex items-center gap-3">
          {!instant && last && answered < questions.length && (
            <span className="text-xs font-bold text-muted">{questions.length - answered} unanswered</span>
          )}
          {(!instant || locked) && (
            <button onClick={next}
              className="btn rounded-xl bg-brand px-6 py-2 font-display font-semibold text-on-sun">
              {last ? (instant ? "See results" : "Finish test") : "Next"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- 3. Results ---------- */

function Results({ run, outcome, onRetake, onRetryMissed, onNew }) {
  const [overrides, setOverrides] = useState({});
  const rows = run.questions.map((q, idx) => {
    const given = outcome.answers[idx];
    const auto = grade(q, given);
    return { q, idx, given, auto, correct: auto || !!overrides[idx] };
  });
  const total = rows.length;
  const correct = rows.filter((r) => r.correct).length;
  const pct = Math.round((correct / total) * 100);
  const missed = rows.filter((r) => !r.correct);

  useEffect(() => {
    saveAttempt({
      id: outcome.id, at: outcome.at, deckId: run.deck?.id ?? null, deckName: run.title, source: run.source,
      type: run.settings.type, total, correct, seconds: outcome.seconds,
    });
  }, [correct]); // eslint-disable-line react-hooks/exhaustive-deps

  const show = (r) => {
    if (r.given === undefined) return "No answer";
    if (r.q.type === "tf") return r.given ? "True" : "False";
    return r.given;
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="sticker bg-surface p-6 text-center">
        <div className="flex justify-center text-brand-dark">
          <Icon name={pct >= 90 ? "trophy" : pct >= 60 ? "check" : "bolt"} className="size-14" strokeWidth={1.4} />
        </div>
        <p className="mt-2 font-display text-5xl font-bold">{correct} / {total}</p>
        <p className="mt-1 text-lg font-bold">{pct}% &middot; {pct >= 90 ? "Excellent" : pct >= 60 ? "Good effort" : "Keep practising"}</p>
        <p className="mt-1 text-sm text-muted">
          {run.title} &middot; {clock(outcome.seconds)}{outcome.timedOut ? " \u00B7 Time ran out" : ""}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {missed.length > 0 && (
            <button onClick={() => onRetryMissed(missed.map((r) => r.q))}
              className="btn rounded-xl bg-brand px-5 py-2 font-display font-semibold text-on-sun">Retry the {missed.length} I missed</button>
          )}
          <button onClick={onRetake} className="btn inline-flex items-center gap-2 rounded-xl bg-surface px-5 py-2 font-bold">
            <Icon name="reset" className="size-4" /> Retake
          </button>
          <button onClick={onNew} className="rounded-xl px-4 py-2 font-bold text-muted hover:text-ink">New test</button>
        </div>
      </div>

      <Card title="Review">
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.idx} className="py-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 break-words font-bold">{r.idx + 1}. {r.q.prompt}</p>
                <span className={`shrink-0 rounded-full border-2 border-edge px-2.5 py-0.5 text-xs font-bold text-on-sun ${r.correct ? "bg-mint" : "bg-pink"}`}>
                  {r.correct ? "Correct" : "Wrong"}
                </span>
              </div>
              <p className="mt-1 break-words text-muted">Your answer: {show(r)}</p>
              {!r.correct && <p className="break-words">Correct answer: {r.q.answer}</p>}
              {r.q.type === "typed" && !r.auto && r.given !== undefined && (
                <button onClick={() => setOverrides((o) => ({ ...o, [r.idx]: !o[r.idx] }))}
                  className="mt-1 text-xs font-bold text-brand-ink underline">
                  {overrides[r.idx] ? "Undo" : "Mark as correct (I was right)"}
                </button>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ---------- Page ---------- */

export default function TestsPage() {
  const decks = useDecks();
  const [params] = useSearchParams();
  const [run, setRun] = useState(null);
  const [outcome, setOutcome] = useState(null);

  const begin = (r) => {
    setOutcome(null);
    setRun({ ...r, key: Date.now() });
  };

  if (decks.isLoading) return <div className="h-64 animate-pulse rounded-2xl bg-line/60" />;

  if (run && outcome) {
    return (
      <Results key={outcome.id} run={run} outcome={outcome}
        onRetake={() => begin({ ...run, questions: run.rebuild() })}
        onRetryMissed={(missed) => {
          const make = () => finalize(missed);
          begin({ ...run, questions: make(), rebuild: make });
        }}
        onNew={() => { setRun(null); setOutcome(null); }} />
    );
  }
  if (run) {
    return <Runner key={run.key} run={run} onQuit={() => setRun(null)}
      onFinish={(o) => setOutcome({ ...o, id: `${run.key}-${Date.now()}`, at: new Date().toISOString() })} />;
  }
  const wanted = Number(params.get("deck")) || undefined;
  return <Setup decks={decks.data ?? []} initialDeckId={decks.data?.some((d) => d.id === wanted) ? wanted : undefined} onBegin={begin} />;
}