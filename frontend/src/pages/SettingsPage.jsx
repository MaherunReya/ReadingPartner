import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api, { errorMessage } from "../api";
import { useChangePassword, useDeactivate, useDeleteAccount, useUpdateProfile } from "../account";
import { useAuth } from "../auth";
import { useBilling } from "../billing";
import Card from "../components/Card";
import Icon from "../components/Icon";

const INPUT = "mt-1 w-full border border-line bg-surface px-3 py-2";
const BTN = "btn rounded-xl px-5 py-2 font-display font-semibold disabled:opacity-50";

function Field({ id, label, hint, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-bold text-muted">{label}</label>
      <input id={id} className={INPUT} {...props} />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/* ---------- Profile ---------- */

function ProfileCard({ me }) {
  const update = useUpdateProfile();
  const [name, setName] = useState(me.name ?? "");
  const [saved, setSaved] = useState(false);
  const changed = name.trim() !== "" && name.trim() !== (me.name ?? "");

  return (
    <Card title="Profile">
      <form className="space-y-4" onSubmit={(e) => {
        e.preventDefault();
        if (changed) update.mutate(name.trim(), { onSuccess: () => setSaved(true) });
      }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="profile-name" label="Name" maxLength={100} value={name}
            onChange={(e) => { setName(e.target.value); setSaved(false); }} />
          <Field id="profile-email" label="Email" value={me.email} readOnly disabled hint="Your email can't be changed." />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={!changed || update.isPending} className={`${BTN} bg-brand text-on-sun`}>Save name</button>
          {saved && <span role="status" className="text-sm font-bold text-done">Saved.</span>}
          {update.isError && <span role="alert" className="text-sm text-overdue">{errorMessage(update.error)}</span>}
        </div>
      </form>
    </Card>
  );
}

/* ---------- Password ---------- */

function PasswordCard() {
  const change = useChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [done, setDone] = useState(false);
  const mismatch = again !== "" && next !== again;
  const ready = current && next.length >= 8 && next === again;

  return (
    <Card title="Password">
      <form className="space-y-4" onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        change.mutate({ current_password: current, new_password: next }, {
          onSuccess: () => { setCurrent(""); setNext(""); setAgain(""); setDone(true); },
        });
      }}>
        <Field id="pw-current" label="Current password" type="password" autoComplete="current-password" value={current}
          onChange={(e) => { setCurrent(e.target.value); setDone(false); }} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="pw-new" label="New password" type="password" autoComplete="new-password" value={next}
            hint="At least 8 characters." onChange={(e) => { setNext(e.target.value); setDone(false); }} />
          <Field id="pw-again" label="Repeat new password" type="password" autoComplete="new-password" value={again}
            aria-invalid={mismatch} onChange={(e) => { setAgain(e.target.value); setDone(false); }} />
        </div>
        {mismatch && <p role="alert" className="text-sm text-overdue">The two new passwords don't match.</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={!ready || change.isPending} className={`${BTN} bg-brand text-on-sun`}>Change password</button>
          {done && <span role="status" className="text-sm font-bold text-done">Password changed.</span>}
          {change.isError && <span role="alert" className="text-sm text-overdue">{errorMessage(change.error)}</span>}
        </div>
      </form>
    </Card>
  );
}

/* ---------- Deactivate and delete ---------- */

function useLeave() {
  const { logout } = useAuth();
  const qc = useQueryClient();
  // Clear everything the app holds, then start fresh on the home page.
  return () => {
    qc.clear();
    logout();
    window.location.assign("/");
  };
}

function DeactivateForm({ isPro, onCancel }) {
  const deactivate = useDeactivate();
  const leave = useLeave();
  const [password, setPassword] = useState("");

  return (
    <form className="mt-4 space-y-3 rounded-xl border-2 border-line bg-paper p-4" onSubmit={(e) => {
      e.preventDefault();
      if (password) deactivate.mutate(password, { onSuccess: leave });
    }}>
      <p className="text-sm">Your account is hidden and you are signed out. Nothing is deleted. Log in again with your email and password to bring it back.</p>
      {isPro && <p className="text-sm font-bold">This does not cancel your Pro subscription. Manage that on the Billing page.</p>}
      <Field id="deactivate-password" label="Your password" type="password" autoComplete="current-password" autoFocus
        value={password} onChange={(e) => setPassword(e.target.value)} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={!password || deactivate.isPending} className={`${BTN} bg-pink text-on-sun`}>
          {deactivate.isPending ? "Deactivating..." : "Deactivate my account"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl px-3 py-2 font-bold text-muted hover:text-ink">Cancel</button>
        {deactivate.isError && <span role="alert" className="text-sm text-overdue">{errorMessage(deactivate.error)}</span>}
      </div>
    </form>
  );
}

function DeleteForm({ isPro, onCancel }) {
  const remove = useDeleteAccount();
  const leave = useLeave();
  const [password, setPassword] = useState("");
  const [word, setWord] = useState("");
  const ready = password && word === "DELETE";

  return (
    <form className="mt-4 space-y-3 rounded-xl border-2 border-overdue bg-paper p-4" onSubmit={(e) => {
      e.preventDefault();
      if (ready) remove.mutate(password, { onSuccess: leave });
    }}>
      <p className="text-sm font-bold">This is permanent and can't be undone.</p>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        <li>Your tasks, notes, flashcards, saved tests, mood check-ins, prayer logs and focus history are deleted.</li>
        <li>Your login stops working and your email can be used to sign up again later as a new account.</li>
        {isPro && <li>Your Pro subscription is cancelled right away.</li>}
      </ul>
      <Field id="delete-password" label="Your password" type="password" autoComplete="current-password" autoFocus
        value={password} onChange={(e) => setPassword(e.target.value)} />
      <Field id="delete-word" label="Type DELETE to confirm" autoComplete="off" value={word} onChange={(e) => setWord(e.target.value)} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={!ready || remove.isPending} className={`${BTN} bg-overdue text-paper`}>
          {remove.isPending ? "Deleting..." : "Delete my account forever"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl px-3 py-2 font-bold text-muted hover:text-ink">Cancel</button>
        {remove.isError && <span role="alert" className="text-sm text-overdue">{errorMessage(remove.error)}</span>}
      </div>
    </form>
  );
}

function DangerZone() {
  const billing = useBilling();
  const isPro = billing.data?.plan?.id === "pro";
  const [open, setOpen] = useState(null); // "deactivate" | "delete" | null

  return (
    <Card title="Deactivate or delete">
      <div className="space-y-6">
        <section aria-labelledby="deactivate-title">
          <h3 id="deactivate-title" className="font-display text-lg font-bold">Deactivate your account</h3>
          <p className="mt-1 text-sm text-muted">Take a break. Your data stays safe and you can come back any time by logging in.</p>
          {open === "deactivate" ? (
            <DeactivateForm isPro={isPro} onCancel={() => setOpen(null)} />
          ) : (
            <button type="button" onClick={() => setOpen("deactivate")}
              className="btn mt-3 rounded-xl bg-pink px-4 py-2 font-bold text-on-sun">Deactivate account</button>
          )}
        </section>

        <hr className="border-line" />

        <section aria-labelledby="delete-title">
          <h3 id="delete-title" className="font-display text-lg font-bold text-overdue">Delete your account</h3>
          <p className="mt-1 text-sm text-muted">Permanently remove your account and everything in it.</p>
          {open === "delete" ? (
            <DeleteForm isPro={isPro} onCancel={() => setOpen(null)} />
          ) : (
            <button type="button" onClick={() => setOpen("delete")}
              className="btn mt-3 rounded-xl border-overdue bg-surface px-4 py-2 font-bold text-overdue">Delete account...</button>
          )}
        </section>
      </div>
    </Card>
  );
}

/* ---------- Page ---------- */

export default function SettingsPage() {
  const me = useQuery({ queryKey: ["me"], queryFn: () => api.get("/auth/me").then((r) => r.data) });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold"><Icon name="settings" className="size-7" /> Settings</h1>
        <p className="mt-1 text-muted">Manage your account.</p>
      </div>
      {me.isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-line/60" />
      ) : me.isError ? (
        <p role="alert" className="text-overdue">{errorMessage(me.error)}</p>
      ) : (
        <>
          <ProfileCard me={me.data} />
          <PasswordCard />
          <DangerZone />
        </>
      )}
    </div>
  );
}