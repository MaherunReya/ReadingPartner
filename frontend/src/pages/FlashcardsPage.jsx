import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api, { errorMessage } from "../api";
import { useBilling } from "../billing";
import Card from "../components/Card";
import {
  DECK_COLORS, EMOJI, isDue, parseBulk, shuffle,
  useAddCard, useBulkAdd, useCards, useCreateDeck, useDecks, useDeleteCard, useDeleteDeck, useGenerateCards, useReview, useUpdateCard,
} from "../flashcards";

/* ---------- Deck list ---------- */

function NewDeckForm({ onDone, onCancel }) {
  const create = useCreateDeck();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [color, setColor] = useState("sun");

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate({ name: name.trim(), subject: subject.trim() || null, color }, { onSuccess: onDone });
  }

  return (
    <Card title="New lecture">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="deck-name" className="text-sm font-bold text-muted">Lecture title</label>
            <input id="deck-name" autoFocus maxLength={100} value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lecture 5: OSI model"
              className="mt-1 w-full border border-line bg-surface px-3 py-2" />
          </div>
          <div>
            <label htmlFor="deck-subject" className="text-sm font-bold text-muted">Course (optional)</label>
            <input id="deck-subject" maxLength={100} value={subject} onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Computer Networks"
              className="mt-1 w-full border border-line bg-surface px-3 py-2" />
          </div>
        </div>
        <fieldset>
          <legend className="text-sm font-bold text-muted">Colour</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(DECK_COLORS).map(([id, c]) => (
              <button key={id} type="button" aria-pressed={color === id} onClick={() => setColor(id)}
                className={`${c.bg} rounded-full border-2 px-4 py-1.5 text-sm font-bold text-on-sun transition-transform ${
                  color === id ? "scale-110 border-edge shadow-[2px_2px_0_var(--color-edge)]" : "border-transparent opacity-80 hover:opacity-100"
                }`}>
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </fieldset>
        <p className="text-xs text-muted">Next step: upload your lecture or paste its notes to make flashcards.</p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={!name.trim() || create.isPending}
            className="btn rounded-xl bg-brand px-5 py-2 font-display font-semibold text-white disabled:opacity-50">
            Add lecture
          </button>
          <button type="button" onClick={onCancel} className="rounded-xl px-3 py-2 font-bold text-muted hover:text-ink">Cancel</button>
          {create.isError && <span role="alert" className="text-sm text-overdue">{errorMessage(create.error)}</span>}
        </div>
      </form>
    </Card>
  );
}

function DeckTile({ deck, onOpen, onStudy }) {
  const c = DECK_COLORS[deck.color] ?? DECK_COLORS.sun;
  const pct = deck.card_count ? Math.round((deck.mastered_count / deck.card_count) * 100) : 0;
  const mode = deck.due_count > 0 ? "due" : "all";
  return (
    <div className="sticker flex flex-col overflow-hidden bg-surface transition-transform duration-200 hover:-translate-y-1 hover:-rotate-1">
      <div className={`${c.bg} flex items-center justify-between border-b-2 border-edge px-4 py-3 text-on-sun`}>
        <span className="text-3xl" aria-hidden="true">{c.emoji}</span>
        {deck.due_count > 0 ? (
          <span className="rounded-full border-2 border-edge bg-surface px-2.5 py-0.5 text-xs font-bold text-ink">
            {deck.due_count} due
          </span>
        ) : deck.card_count > 0 ? (
          <span className="rounded-full border-2 border-edge bg-surface px-2.5 py-0.5 text-xs font-bold text-done">All caught up</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h3 className="break-words text-xl font-bold leading-tight">{deck.name}</h3>
          {deck.subject && <p className="mt-0.5 text-sm text-muted">{deck.subject}</p>}
        </div>
        <div>
          <div className="h-2.5 overflow-hidden rounded-full border-2 border-edge bg-paper"
            role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Mastered">
            <div className="h-full bg-done transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {deck.card_count} card{deck.card_count === 1 ? "" : "s"} &middot; {deck.mastered_count} mastered
          </p>
        </div>
        <div className="mt-auto flex gap-2">
          <button onClick={() => onStudy(deck.id, mode)} disabled={deck.card_count === 0}
            className="btn flex-1 rounded-xl bg-brand px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
            {deck.card_count === 0 ? "Add cards first" : deck.due_count > 0 ? `Study ${deck.due_count} due` : "Practice all"}
          </button>
          <button onClick={() => onOpen(deck.id)} className="btn rounded-xl bg-surface px-3 py-2 text-sm font-bold">Edit</button>
        </div>
      </div>
    </div>
  );
}

function DeckList({ onOpen, onStudy }) {
  const decks = useDecks();
  const [creating, setCreating] = useState(false);
  const totalDue = (decks.data ?? []).reduce((n, d) => n + d.due_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Flashcards</h1>
          <p className="mt-1 text-muted">
            {totalDue > 0
              ? `${totalDue} card${totalDue === 1 ? "" : "s"} waiting for you today. Let's go!`
              : "Add a lecture, then flip your way to remembering it."}
          </p>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)}
            className="btn rounded-xl bg-sun px-5 py-2.5 font-display text-lg font-semibold text-on-sun">
            + New lecture
          </button>
        )}
      </div>

      {creating && <NewDeckForm onCancel={() => setCreating(false)} onDone={(deck) => { setCreating(false); onOpen(deck.id); }} />}

      {decks.isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-52 animate-pulse rounded-2xl bg-line/60" />)}
        </div>
      ) : decks.isError ? (
        <p role="alert" className="text-overdue">{errorMessage(decks.error)}</p>
      ) : decks.data.length === 0 && !creating ? (
        <div className="sticker bg-surface p-8 text-center">
          <p className="text-5xl" aria-hidden="true">{"\uD83C\uDCCF"}</p>
          <p className="mt-3 font-display text-xl font-bold">No lectures yet</p>
          <p className="mt-1 text-muted">Add your first lecture, then turn its notes into flashcards.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {decks.data.map((d) => <DeckTile key={d.id} deck={d} onOpen={onOpen} onStudy={onStudy} />)}
        </div>
      )}
    </div>
  );
}

/* ---------- Deck editor ---------- */

function BoxDots({ box }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`Box ${box} of 5`} aria-label={`Box ${box} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`size-1.5 rounded-full ${n <= box ? "bg-brand" : "bg-[#1f1747]/20"}`} />
      ))}
    </span>
  );
}

const TILTS = ["-1.4deg", "1deg", "-0.7deg", "1.5deg", "-1deg", "0.6deg"];
const NOTE_COLORS = ["bg-mint", "bg-sun", "bg-sky", "bg-pink"];
const BADGE_COLORS = ["bg-pink", "bg-sky", "bg-sun", "bg-mint"];

function CardRow({ card, deckId, index = 0 }) {
  const update = useUpdateCard(deckId);
  const remove = useDeleteCard(deckId);
  const [editing, setEditing] = useState(false);
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);

  function save(e) {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    update.mutate({ id: card.id, front, back }, { onSuccess: () => setEditing(false) });
  }

  if (editing) {
    return (
      <li className="sticker-sm col-span-full bg-surface p-4">
        <form onSubmit={save} className="space-y-2">
          <textarea aria-label="Front" rows={2} maxLength={2000} value={front} onChange={(e) => setFront(e.target.value)}
            className="w-full resize-y border border-line bg-surface px-3 py-2" />
          <textarea aria-label="Back" rows={2} maxLength={2000} value={back} onChange={(e) => setBack(e.target.value)}
            className="w-full resize-y border border-line bg-surface px-3 py-2" />
          <div className="flex items-center gap-2">
            <button type="submit" disabled={update.isPending} className="btn rounded-xl bg-brand px-4 py-1.5 text-sm font-bold text-white">Save</button>
            <button type="button" onClick={() => { setEditing(false); setFront(card.front); setBack(card.back); }}
              className="px-3 py-1.5 text-sm font-bold text-muted hover:text-ink">Cancel</button>
            {update.isError && <span role="alert" className="text-sm text-overdue">{errorMessage(update.error)}</span>}
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="fun-card index-card card-tape sticker-sm flex flex-col"
      style={{ "--tilt": TILTS[index % TILTS.length], "--d": `${Math.min(index, 12) * 45}ms` }}>
      <div className="flex h-14 items-center justify-between px-4 pt-2">
        <span className={`fun-badge ${BADGE_COLORS[index % BADGE_COLORS.length]} rounded-full border-2 border-[#1f1747] px-3 py-0.5 font-display text-sm font-bold`}>
          {"\uD83C\uDCCF"} Card {index + 1}
        </span>
        <span className="flex items-center gap-2 text-xs font-bold text-[#1f1747]/70">
          Level {card.box}/5 <BoxDots box={card.box} />
        </span>
      </div>
      <div className="flex-1 space-y-3 px-4 pb-3 pt-3">
        <p className="whitespace-pre-wrap break-words font-display text-lg font-bold leading-snug">
          <span aria-hidden="true">{"\u2753"} </span>{card.front}
        </p>
        <div className={`fun-note ${NOTE_COLORS[index % NOTE_COLORS.length]} rounded-xl border-2 border-[#1f1747] p-3 shadow-[2px_2px_0_#1f1747]`}>
          <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed">
            <span aria-hidden="true">{"\uD83D\uDCA1"} </span>{card.back}
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2 px-4 pb-3">
        <button onClick={() => setEditing(true)}
          className="rounded-full border-2 border-[#1f1747] bg-white px-3 py-0.5 text-sm font-bold text-[#1f1747] transition-transform hover:-translate-y-0.5 hover:bg-[#ffd43b]">
          {"\u270F\uFE0F"} Edit
        </button>
        <button onClick={() => remove.mutate(card.id)} disabled={remove.isPending}
          aria-label={`Delete card: ${card.front}`}
          className="rounded-full border-2 border-[#1f1747] bg-white px-3 py-0.5 text-sm font-bold text-[#1f1747] transition-transform hover:-translate-y-0.5 hover:bg-[#ff8fb8] disabled:opacity-50">
          {"\uD83D\uDDD1\uFE0F"} Delete
        </button>
      </div>
    </li>
  );
}

function NotesPanel({ bulk, onDone }) {
  const gen = useGenerateCards();
  const [notes, setNotes] = useState("");
  const [count, setCount] = useState(10);
  const [draft, setDraft] = useState([]);
  const [reading, setReading] = useState(false);
  const [fileMsg, setFileMsg] = useState("");
  const billing = useBilling();
  const plan = billing.data?.plan;
  const sets = billing.data?.usage.flashcards;
  const setsLeft = sets ? Math.max(0, sets.limit - sets.used) : null;
  const countOptions = [5, 10, 15, 20, 30].filter((n) => !plan || n <= plan.max_cards);

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
      setNotes(data.text);
      setFileMsg(data.truncated ? "Loaded the first part of this file (it was long). Split big lectures into parts." : `Loaded ${file.name}`);
    } catch (err) {
      setFileMsg(errorMessage(err));
    } finally {
      setReading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="btn cursor-pointer rounded-xl bg-sun px-4 py-2 text-sm font-bold text-on-sun focus-within:ring-4 focus-within:ring-brand">
          {reading ? "Reading file..." : "\uD83D\uDCCE Upload PDF / PowerPoint / .txt"}
          <input type="file" accept=".pdf,.pptx,.txt,.md" onChange={onFile} disabled={reading} className="sr-only" />
        </label>
        {fileMsg && <span role="status" className="text-sm text-muted">{fileMsg}</span>}
      </div>
      <div>
        <label htmlFor="lecture-notes" className="text-sm font-bold text-muted">Paste your lecture notes or slide text</label>
        <textarea id="lecture-notes" rows={8} maxLength={20000} value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Paste a lecture's notes here and AI will turn them into flashcards..."
          className="mt-1 w-full resize-y border border-line bg-surface px-3 py-2" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-bold text-muted">
          Cards
          <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="border border-line bg-surface px-2 py-1">
            {countOptions.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <button type="button" disabled={notes.trim().length < 20 || gen.isPending || setsLeft === 0}
          onClick={() => gen.mutate({ text: notes, count }, { onSuccess: (cards) => { setDraft(cards); billing.refetch(); } })}
          className="btn rounded-xl bg-brand px-5 py-2 font-display font-semibold text-white disabled:opacity-50">
          {gen.isPending ? "Making cards..." : "\u2728 Make flashcards"}
        </button>
        {setsLeft !== null && (
          <span className={`text-xs font-bold ${setsLeft === 0 ? "text-overdue" : "text-muted"}`}>
            {"\u26A1"} {setsLeft} of {sets.limit} AI sets left this month
          </span>
        )}
        {gen.isError && <span role="alert" className="text-sm text-overdue">{errorMessage(gen.error)}</span>}
      </div>

      {draft.length > 0 && (
        <div className="space-y-3 rounded-xl border-2 border-line p-3">
          <p className="text-sm font-bold text-muted">Look them over. Remove any you don't want.</p>
          <ul className="divide-y divide-line">
            {draft.map((c, i) => (
              <li key={i} className="flex items-start gap-3 py-2 text-sm">
                <div className="min-w-0 flex-1"><p className="font-bold">{c.front}</p><p className="text-muted">{c.back}</p></div>
                <button type="button" onClick={() => setDraft(draft.filter((_, j) => j !== i))}
                  aria-label={`Remove card: ${c.front}`} className="rounded px-2 text-muted hover:text-overdue">&times;</button>
              </li>
            ))}
          </ul>
          <button type="button" disabled={bulk.isPending}
            onClick={() => bulk.mutate(draft, { onSuccess: () => { setDraft([]); setNotes(""); onDone(); } })}
            className="btn rounded-xl bg-mint px-5 py-2 font-display font-semibold text-on-sun">
            Add {draft.length} card{draft.length === 1 ? "" : "s"}
          </button>
        </div>
      )}
    </div>
  );
}

function DeckEditor({ deckId, onBack, onStudy }) {
  const decks = useDecks();
  const cards = useCards(deckId);
  const addCard = useAddCard(deckId);
  const bulk = useBulkAdd(deckId);
  const deleteDeck = useDeleteDeck();
  const deck = decks.data?.find((d) => d.id === deckId);

  const [tab, setTab] = useState("notes");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [text, setText] = useState("");
  const [added, setAdded] = useState(0);
  const frontRef = useRef(null);
  const parsed = useMemo(() => parseBulk(text), [text]);

  function submitOne(e) {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    addCard.mutate({ front: front.trim(), back: back.trim() }, {
      onSuccess: () => { setFront(""); setBack(""); setAdded((n) => n + 1); frontRef.current?.focus(); },
    });
  }

  function submitBulk(e) {
    e.preventDefault();
    if (!parsed.length) return;
    bulk.mutate(parsed, { onSuccess: (res) => { setText(""); setAdded((n) => n + res.length); } });
  }

  function removeDeck() {
    if (window.confirm(`Delete "${deck?.name}" and all its cards?`)) {
      deleteDeck.mutate(deckId, { onSuccess: onBack });
    }
  }

  if (decks.isLoading) return <div className="h-64 animate-pulse rounded-2xl bg-line/60" />;
  if (!deck) {
    return (
      <div className="space-y-4">
        <p>That lecture doesn't exist anymore.</p>
        <button onClick={onBack} className="btn rounded-xl bg-surface px-4 py-2 font-bold">Back to lectures</button>
      </div>
    );
  }

  const c = DECK_COLORS[deck.color] ?? DECK_COLORS.sun;
  const mode = deck.due_count > 0 ? "due" : "all";

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm font-bold text-muted hover:text-ink">&larr; All lectures</button>

      <div className={`${c.bg} sticker flex flex-wrap items-center gap-4 p-5 text-on-sun`}>
        <span className="text-4xl" aria-hidden="true">{c.emoji}</span>
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-3xl font-bold leading-tight">{deck.name}</h1>
          <p className="text-sm font-semibold text-on-sun/70">
            {deck.subject ? `${deck.subject} \u00B7 ` : ""}{deck.card_count} card{deck.card_count === 1 ? "" : "s"} &middot; {deck.due_count} due
          </p>
        </div>
        <button onClick={() => onStudy(deckId, mode)} disabled={deck.card_count === 0}
          className="btn rounded-xl bg-brand px-5 py-2.5 font-display text-lg font-semibold text-white disabled:opacity-50">
          {deck.due_count > 0 ? `Study ${deck.due_count} due` : "Practice all"}
        </button>
      </div>

      <Card title="Add cards">
        <div className="mb-4 flex gap-2" role="tablist">
          {[["notes", "\u2728 From notes"], ["one", "One at a time"], ["bulk", "Paste many"]].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold ${tab === id ? "bg-brand text-white" : "text-muted hover:bg-line/60"}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "notes" ? (
          <NotesPanel bulk={bulk} onDone={() => setTab("one")} />
        ) : tab === "one" ? (
          <form onSubmit={submitOne} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="card-front" className="text-sm font-bold text-muted">Front (question or term)</label>
                <textarea id="card-front" ref={frontRef} rows={3} maxLength={2000} value={front} onChange={(e) => setFront(e.target.value)}
                  placeholder="What does TCP's three-way handshake do?"
                  className="mt-1 w-full resize-y border border-line bg-surface px-3 py-2" />
              </div>
              <div>
                <label htmlFor="card-back" className="text-sm font-bold text-muted">Back (answer)</label>
                <textarea id="card-back" rows={3} maxLength={2000} value={back} onChange={(e) => setBack(e.target.value)}
                  placeholder="Sets up a reliable connection: SYN, SYN-ACK, ACK."
                  className="mt-1 w-full resize-y border border-line bg-surface px-3 py-2" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={!front.trim() || !back.trim() || addCard.isPending}
                className="btn rounded-xl bg-brand px-5 py-2 font-display font-semibold text-white disabled:opacity-50">Add card</button>
              {added > 0 && <span role="status" className="text-sm font-bold text-done">{added} added this visit</span>}
              {addCard.isError && <span role="alert" className="text-sm text-overdue">{errorMessage(addCard.error)}</span>}
            </div>
          </form>
        ) : (
          <form onSubmit={submitBulk} className="space-y-3">
            <div>
              <label htmlFor="bulk" className="text-sm font-bold text-muted">One card per line: front :: back</label>
              <textarea id="bulk" rows={7} value={text} onChange={(e) => setText(e.target.value)}
                placeholder={"OSI layer 3 :: Network (IP, routing)\nOSI layer 4 :: Transport (TCP, UDP)\nWhat does DHCP do? :: Hands out IP addresses automatically"}
                className="mt-1 w-full resize-y border border-line bg-surface px-3 py-2 font-mono text-sm" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={!parsed.length || bulk.isPending}
                className="btn rounded-xl bg-brand px-5 py-2 font-display font-semibold text-white disabled:opacity-50">
                {parsed.length ? `Add ${parsed.length} card${parsed.length === 1 ? "" : "s"}` : "Add cards"}
              </button>
              {text.trim() && !parsed.length && <span className="text-sm text-muted">Put :: between the front and the back of each line.</span>}
              {bulk.isError && <span role="alert" className="text-sm text-overdue">{errorMessage(bulk.error)}</span>}
            </div>
          </form>
        )}
      </Card>

      <Card title={`Cards (${cards.data?.length ?? 0})`}>
        {cards.isLoading ? (
          <div className="h-24 animate-pulse rounded-xl bg-line/60" />
        ) : cards.data?.length ? (
          <ul className="grid gap-x-6 gap-y-8 px-1 pt-4 sm:grid-cols-2">
            {cards.data.map((card, i) => <CardRow key={`${card.id}-${card.front}-${card.back}`} card={card} deckId={deckId} index={i} />)}
          </ul>
        ) : (
          <p className="text-sm text-muted">Nothing here yet. Add your first card above.</p>
        )}
      </Card>

      <div className="flex justify-end">
        <button onClick={removeDeck} disabled={deleteDeck.isPending}
          className="rounded-xl px-3 py-2 text-sm font-bold text-muted hover:bg-overdue/10 hover:text-overdue">Delete lecture</button>
      </div>
    </div>
  );
}

/* ---------- Study mode ---------- */

function Confetti() {
  const pieces = useMemo(() => {
    const colors = ["var(--color-sun)", "var(--color-pink)", "var(--color-sky)", "var(--color-mint)", "var(--color-brand)"];
    return Array.from({ length: 48 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 2.4 + Math.random() * 1.8,
      size: 8 + Math.random() * 8,
      color: colors[i % colors.length],
      round: i % 3 === 0,
    }));
  }, []);
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <span key={p.id} className="confetti-piece absolute top-0 block"
          style={{
            left: `${p.left}%`, width: p.size, height: p.size * (p.round ? 1 : 0.5), background: p.color,
            borderRadius: p.round ? "9999px" : "2px", animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s`,
          }} />
      ))}
    </div>
  );
}

function StudySession({ deck, initialCards, onExit }) {
  const review = useReview();
  const c = DECK_COLORS[deck.color] ?? DECK_COLORS.sun;

  const [queue, setQueue] = useState(() => shuffle(initialCards));
  const [total, setTotal] = useState(initialCards.length);
  const [seen, setSeen] = useState(() => new Set());
  const [missed, setMissed] = useState([]);
  const [right, setRight] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [exit, setExit] = useState(null); // "right" | "left" while the card flies away
  const [turn, setTurn] = useState(0);
  const timer = useRef(null);

  const current = queue[0];
  const uniqueLeft = new Set(queue.map((q) => q.id)).size;
  const progress = total ? ((total - uniqueLeft) / total) * 100 : 0;
  const finished = !current;

  useEffect(() => () => clearTimeout(timer.current), []);

  function answer(correct) {
    if (!flipped || exit || !current) return;
    setExit(correct ? "right" : "left");

    if (!seen.has(current.id)) {
      // Only your first try on a card counts toward the schedule and the score.
      review.mutate({ id: current.id, correct });
      setSeen(new Set(seen).add(current.id));
      if (correct) setRight((n) => n + 1);
      else setMissed((m) => [...m, current]);
    }
    const nextCombo = correct ? combo + 1 : 0;
    setCombo(nextCombo);
    setBestCombo((b) => Math.max(b, nextCombo));

    timer.current = setTimeout(() => {
      setQueue((q) => {
        const [head, ...rest] = q;
        return correct ? rest : [...rest, head]; // missed cards come back around
      });
      setFlipped(false);
      setExit(null);
      setTurn((t) => t + 1);
    }, 380);
  }

  useEffect(() => {
    function onKey(e) {
      if (e.target.closest?.("button, a, input, textarea, select")) return;
      if (e.code === "Space" || e.key === "Enter") { e.preventDefault(); if (!exit) setFlipped((f) => !f); }
      else if (e.key === "ArrowRight" || e.key === "2") answer(true);
      else if (e.key === "ArrowLeft" || e.key === "1") answer(false);
      else if (e.key === "Escape") onExit();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function restart(cards) {
    clearTimeout(timer.current);
    setQueue(shuffle(cards));
    setTotal(cards.length);
    setSeen(new Set());
    setMissed([]);
    setRight(0);
    setCombo(0);
    setBestCombo(0);
    setFlipped(false);
    setExit(null);
    setTurn((t) => t + 1);
  }

  /* --- Finished --- */
  if (finished) {
    const pct = total ? Math.round((right / total) * 100) : 0;
    const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : 1;
    const message = pct >= 90 ? "Absolutely crushed it!" : pct >= 60 ? "Solid session. Keep it up!" : "Every miss is a memory in the making.";
    return (
      <div className="mx-auto max-w-lg space-y-6 text-center">
        <Confetti />
        <div className="sticker bg-surface p-8">
          <p className="text-6xl" aria-hidden="true">{pct >= 90 ? EMOJI.trophy : pct >= 60 ? EMOJI.party : EMOJI.muscle}</p>
          <div className="mt-3 flex justify-center gap-1 text-3xl" aria-label={`${stars} out of 3 stars`}>
            {[1, 2, 3].map((n) => (
              <span key={n} className={n <= stars ? "star-pop" : "opacity-25 grayscale"}
                style={{ animationDelay: `${n * 0.18}s` }} aria-hidden="true">{EMOJI.star}</span>
            ))}
          </div>
          <h2 className="mt-3 text-3xl font-bold">{message}</h2>
          <p className="mt-1 text-muted">{deck.name}</p>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="sticker-sm bg-mint px-2 py-3 text-on-sun">
              <p className="font-display text-2xl font-bold">{right}</p><p className="text-xs font-bold">Got it first try</p>
            </div>
            <div className="sticker-sm bg-pink px-2 py-3 text-on-sun">
              <p className="font-display text-2xl font-bold">{missed.length}</p><p className="text-xs font-bold">To revisit</p>
            </div>
            <div className="sticker-sm bg-sun px-2 py-3 text-on-sun">
              <p className="font-display text-2xl font-bold">{bestCombo}</p><p className="text-xs font-bold">Best streak</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {missed.length > 0 && (
            <button onClick={() => restart(missed)} className="btn rounded-xl bg-pink px-5 py-2.5 font-display font-semibold text-on-sun">
              Retry {missed.length} missed
            </button>
          )}
          <button onClick={() => restart(initialCards)} className="btn rounded-xl bg-brand px-5 py-2.5 font-display font-semibold text-white">
            Go again
          </button>
          <button onClick={onExit} className="btn rounded-xl bg-surface px-5 py-2.5 font-display font-semibold">Back to lectures</button>
        </div>
      </div>
    );
  }

  /* --- Studying --- */
  const done = total - uniqueLeft;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-4">
        <button onClick={onExit} className="shrink-0 text-sm font-bold text-muted hover:text-ink">&times; Exit</button>
        <div className="h-4 flex-1 overflow-hidden rounded-full border-2 border-edge bg-surface"
          role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Session progress">
          <div className={`${c.bg} h-full border-r-2 border-edge transition-all duration-500`} style={{ width: `${progress}%` }} />
        </div>
        <span className="shrink-0 text-sm font-bold tabular-nums text-muted">{done} / {total}</span>
      </div>

      {combo >= 2 && (
        <div className="flex justify-end">
          <span key={combo} className="pop sticker-sm bg-sun px-3 py-1 text-sm font-bold text-on-sun">
            {combo} in a row
          </span>
        </div>
      )}

      <div key={`${current.id}-${turn}`}
        className={`space-y-5 ${exit === "right" ? "fly-right" : exit === "left" ? "fly-left" : "card-in"}`}>
        <div className="card-tape">
          <div className="sticker index-card relative flex min-h-48 cursor-pointer flex-col items-center justify-center p-6 pb-9 pt-10 text-center"
            onClick={() => !exit && setFlipped((f) => !f)}>
            <span className="absolute left-4 top-3 text-xs font-bold uppercase tracking-widest text-on-sun/60">Question</span>
            <p className="whitespace-pre-wrap break-words font-display text-2xl font-semibold leading-snug sm:text-3xl">{current.front}</p>
            {!flipped && <span className="absolute bottom-3 text-xs font-bold text-on-sun/60">tap to show answer</span>}
          </div>
        </div>
        {flipped && (
          <div className={`answer-card sticker ${c.bg} relative flex min-h-48 flex-col items-center justify-center p-6 pt-10 text-center text-on-sun`}>
            <span className="absolute left-4 top-3 text-xs font-bold uppercase tracking-widest text-on-sun/70">Answer</span>
            <p className="whitespace-pre-wrap break-words font-display text-2xl font-semibold leading-snug sm:text-3xl">{current.back}</p>
          </div>
        )}
      </div>

      <div className="min-h-[3.5rem]">
        {flipped ? (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => answer(false)} disabled={!!exit}
              className="btn rounded-2xl bg-pink px-4 py-3 font-display text-lg font-semibold text-on-sun">
              Again <kbd className="ml-1 hidden text-xs opacity-60 sm:inline">&larr;</kbd>
            </button>
            <button onClick={() => answer(true)} disabled={!!exit}
              className="btn rounded-2xl bg-mint px-4 py-3 font-display text-lg font-semibold text-on-sun">
              Got it <kbd className="ml-1 hidden text-xs opacity-60 sm:inline">&rarr;</kbd>
            </button>
          </div>
        ) : (
          <button onClick={() => setFlipped(true)}
            className="btn w-full rounded-2xl bg-brand px-4 py-3 font-display text-lg font-semibold text-white">
            Show answer <kbd className="ml-1 hidden text-xs opacity-60 sm:inline">space</kbd>
          </button>
        )}
      </div>
    </div>
  );
}

function StudyLoader({ deckId, mode, onExit }) {
  const decks = useDecks();
  const cards = useCards(deckId, { refetchOnMount: "always" });
  const [initial, setInitial] = useState(null);
  const [practiceAll, setPracticeAll] = useState(mode === "all");
  const deck = decks.data?.find((d) => d.id === deckId);

  // Take one snapshot of the cards when the session starts so background refetches can't reshuffle it.
  useEffect(() => {
    if (initial || !cards.isSuccess || cards.isFetching) return;
    setInitial(practiceAll ? cards.data : cards.data.filter(isDue));
  }, [initial, cards.isSuccess, cards.isFetching, cards.data, practiceAll]);

  if (!deck || !initial) return <div className="mx-auto h-72 max-w-2xl animate-pulse rounded-2xl bg-line/60" />;

  if (initial.length === 0) {
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <div className="sticker bg-surface p-8">
          <p className="text-5xl" aria-hidden="true">{EMOJI.party}</p>
          <h2 className="mt-3 text-2xl font-bold">All caught up!</h2>
          <p className="mt-1 text-muted">Nothing is due in this lecture right now.</p>
        </div>
        <div className="flex justify-center gap-3">
          <button onClick={() => { setPracticeAll(true); setInitial(cards.data); }}
            className="btn rounded-xl bg-brand px-5 py-2.5 font-bold text-white">Practice all anyway</button>
          <button onClick={onExit} className="btn rounded-xl bg-surface px-5 py-2.5 font-bold">Back</button>
        </div>
      </div>
    );
  }
  return <StudySession deck={deck} initialCards={initial} onExit={onExit} />;
}

/* ---------- Page ---------- */

export default function FlashcardsPage() {
  const qc = useQueryClient();
  const [view, setView] = useState({ type: "decks" });

  const goDecks = () => {
    qc.invalidateQueries({ queryKey: ["decks"] });
    qc.invalidateQueries({ queryKey: ["cards"] });
    setView({ type: "decks" });
  };

  if (view.type === "study") {
    return <StudyLoader key={`${view.id}-${view.mode}`} deckId={view.id} mode={view.mode}
      onExit={() => (view.from === "deck" ? (qc.invalidateQueries({ queryKey: ["decks"] }), setView({ type: "deck", id: view.id })) : goDecks())} />;
  }
  if (view.type === "deck") {
    return <DeckEditor deckId={view.id} onBack={goDecks}
      onStudy={(id, mode) => setView({ type: "study", id, mode, from: "deck" })} />;
  }
  return <DeckList onOpen={(id) => setView({ type: "deck", id })}
    onStudy={(id, mode) => setView({ type: "study", id, mode, from: "decks" })} />;
}