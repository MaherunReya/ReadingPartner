import { useMutation, useQueryClient } from "@tanstack/react-query";
import api, { errorMessage } from "../api";
import Card from "../components/Card";
import Icon from "../components/Icon";
import { useBilling } from "../billing";

function resetText(m) {
  const at = new Date(m.resets_at);
  if (m.period === "day") {
    const hrs = Math.max(1, Math.ceil((at - Date.now()) / 36e5));
    return `Refills in about ${hrs}h (midnight)`;
  }
  return `Refills on ${at.toLocaleDateString([], { month: "short", day: "numeric" })}`;
}

function Meter({ icon, label, m }) {
  const pct = m.limit ? Math.min(100, Math.round((m.used / m.limit) * 100)) : 0;
  const left = Math.max(0, m.limit - m.used);
  const fill = pct >= 100 ? "bg-pink" : pct >= 70 ? "bg-sun" : "bg-mint";
  return (
    <div className="sticker-sm bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-display text-lg font-bold"><Icon name={icon} className="size-5" />{label}</p>
        <p className="text-sm font-bold tabular-nums">{m.used} / {m.limit}</p>
      </div>
      <div className="mt-3 h-6 overflow-hidden rounded-full border-2 border-edge bg-paper"
        role="progressbar" aria-valuenow={m.used} aria-valuemin={0} aria-valuemax={m.limit} aria-label={label}>
        <div className={`${fill} ${pct < 100 && pct > 0 ? "meter-stripes" : ""} h-full rounded-full border-r-2 border-edge transition-all duration-700`}
          style={{ width: `${pct}%`, borderRightWidth: pct ? 2 : 0 }} />
      </div>
      <p className="mt-2 text-xs text-muted">
        {left === 0 ? "All used up. " : `${left} left. `}{resetText(m)}
      </p>
    </div>
  );
}

function PlanCard({ plan, current, featured, onBuy, buying, canBuy }) {
  const perks = [
    `${plan.chat_per_day} study buddy messages a day`,
    `${plan.flashcards_per_month} AI flashcard sets a month`,
    `Up to ${plan.max_cards} cards per set`,
    `Notes up to ${plan.max_notes_words.toLocaleString()} words`,
    "Unlimited manual flashcards, tasks and focus timer",
  ];
  return (
    <div className={`sticker relative flex flex-col bg-surface p-6 transition-transform duration-200 hover:-translate-y-1 ${
      featured ? "card-tape rotate-1 hover:rotate-0" : "-rotate-1 hover:rotate-0"}`}>
      <p className="font-display text-2xl font-bold">
        <Icon name={featured ? "rocket" : "sparkle"} className="mr-2 size-6" />{plan.name}
      </p>
      <p className="mt-2 font-display text-4xl font-bold">
        <>&#2547;{plan.price_bdt}<span className="text-base font-semibold text-muted">{plan.price_bdt === 0 ? " forever" : " / 30 days"}</span></>
      </p>
      <ul className="mt-4 flex-1 space-y-2 text-sm font-semibold">
        {perks.map((p) => <li key={p} className="flex items-start gap-2"><Icon name="check" className="mt-0.5 size-4 text-done" strokeWidth={2.4} />{p}</li>)}
      </ul>
      {featured ? (
        <button onClick={onBuy} disabled={current || buying || !canBuy}
          className="btn mt-6 rounded-xl bg-brand px-5 py-3 font-display text-lg font-semibold text-on-sun disabled:opacity-60">
          {current ? "Your plan" : buying ? "One moment..." : "Get Pro"}
        </button>
      ) : (
        <div className="mt-6 rounded-xl border-2 border-dashed border-line px-5 py-3 text-center font-bold text-muted">
          {current ? "Your plan" : "Included for everyone"}
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  const q = useBilling();
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["billing"] });
  const checkout = useMutation({
    mutationFn: () => api.post("/billing/checkout", { plan: "pro" }).then((r) => r.data),
    onSuccess: (d) => { if (d?.url) window.location.assign(d.url); },
  });
  const devActivate = useMutation({ mutationFn: () => api.post("/billing/dev/activate-pro"), onSuccess: refresh });
  const devReset = useMutation({ mutationFn: () => api.post("/billing/dev/reset"), onSuccess: refresh });

  if (q.isLoading) return <div className="h-64 animate-pulse rounded-2xl bg-line/60" />;
  if (q.isError) return <p role="alert" className="text-overdue">{errorMessage(q.error)}</p>;

  const b = q.data;
  const isPro = b.plan.id === "pro";
  const free = b.plans.find((p) => p.id === "free");
  const pro = b.plans.find((p) => p.id === "pro");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Plans &amp; AI usage</h1>
          <p className="mt-1 text-muted">AI costs real money to run, so each plan has a fair daily and monthly allowance.</p>
        </div>
        <span className={`sticker-sm inline-flex items-center gap-2 px-4 py-2 font-display text-lg font-bold ${isPro ? "bg-sun text-on-sun" : "bg-surface"}`}>
          <Icon name={isPro ? "rocket" : "sparkle"} className="size-5" /> {isPro ? "Pro" : "Free plan"}
        </span>
      </div>

      {isPro && b.period_end && (
        <div role="status" className="sticker-sm bg-mint px-5 py-3 font-bold text-on-sun">
          <Icon name="gift" className="mr-1 size-5" /> Pro is active until {new Date(b.period_end).toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" })}.
          Your data stays safe if it ends. You just go back to Free limits.
        </div>
      )}

      <section aria-labelledby="usage-h" className="space-y-3">
        <h2 id="usage-h" className="font-display text-xl font-bold">Your AI energy</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Meter icon="chat" label="Study buddy messages today" m={b.usage.chat} />
          <Meter icon="cards" label="AI flashcard sets this month" m={b.usage.flashcards} />
        </div>
        <p className="text-xs text-muted">Failed AI requests don't count. Making flashcards by hand never uses your allowance.</p>
      </section>

      <section aria-labelledby="plans-h" className="space-y-4">
        <h2 id="plans-h" className="font-display text-xl font-bold">Choose your plan</h2>
        <div className="grid gap-8 px-2 pt-4 sm:grid-cols-2">
          <PlanCard plan={free} current={!isPro} />
          <PlanCard plan={pro} featured current={isPro} canBuy buying={checkout.isPending} onBuy={() => checkout.mutate()} />
        </div>
        {checkout.isError && <p role="alert" className="text-sm font-bold text-overdue">{errorMessage(checkout.error)}</p>}
      </section>

      <Card title="How it works">
        <ul className="space-y-1.5 text-sm text-muted">
          <li>Pro lasts 30 days from each payment. Paying early adds days on top, nothing is wasted.</li>
          <li>Study buddy messages refill every day at midnight (Dhaka time). Flashcard sets refill on the 1st.</li>
          <li>Longer chats cost more to run, so the study buddy only remembers your most recent messages.</li>
        </ul>
      </Card>

      {b.dev_mode && (
        <Card title="Developer tools (local testing only)">
          <div className="flex flex-wrap gap-3">
            <button onClick={() => devActivate.mutate()} className="btn rounded-xl bg-sun px-4 py-2 text-sm font-bold text-on-sun">Activate Pro (dev)</button>
            <button onClick={() => devReset.mutate()} className="btn rounded-xl bg-surface px-4 py-2 text-sm font-bold">Back to Free (dev)</button>
          </div>
          <p className="mt-2 text-xs text-muted">Shown because BILLING_DEV_MODE=1. Remove it from .env before you deploy.</p>
        </Card>
      )}
    </div>
  );
}
