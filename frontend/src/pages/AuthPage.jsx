import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { errorMessage, isUnverified, resendVerification, verifyEmail } from "../api";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";

const SAMPLE = [
  { title: "Lab report: op-amp gain stage", subject: "EEE", due: "Due tomorrow" },
  { title: "Packet Tracer: VLSM table", subject: "CSE", due: "Due Thursday" },
  { title: "Thesis: related work draft", subject: "Thesis", due: "Due in 6 days" },
];

const input = "mt-1 w-full rounded-md border border-line bg-surface px-3 py-2";
const primary =
  "w-full rounded-md bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60";

export default function AuthPage({ mode }) {
  const isLogin = mode === "login";
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [verifyFor, setVerifyFor] = useState(null); // email awaiting its code
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [wait, setWait] = useState(0); // seconds until a new code can be requested

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function sendNewCode(address) {
    setNote("");
    try {
      await resendVerification(address);
      setNote("We sent a new code. Check your inbox and spam folder.");
      setWait(60);
    } catch (err) {
      setNote(errorMessage(err));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!isLogin && password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      if (isLogin) {
        await login(email, password);
        navigate("/dashboard", { replace: true });
      } else {
        await signup(name.trim(), email, password); // the backend emails the code
        setVerifyFor(email);
        setWait(60);
      }
    } catch (err) {
      if (isLogin && isUnverified(err)) {
        // Correct password but unverified account: send them to the code step.
        setVerifyFor(email);
        sendNewCode(email);
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await verifyEmail(verifyFor, code);
      await login(verifyFor, password); // we still have the password: log them straight in
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function changeEmail() {
    setVerifyFor(null);
    setCode("");
    setError("");
    setNote("");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="ruled relative hidden flex-col justify-center border-r border-line px-16 lg:flex">
        <div className="absolute inset-y-0 left-12 w-px bg-[#e6a3ad]" aria-hidden="true" />
        <Link to="/" className="absolute left-16 top-6" aria-label="Study Guide home"><Logo /></Link>
        <div className="max-w-md pl-10">
          <h1 className="text-4xl font-bold leading-tight">Know what's due before it's due.</h1>
          <p className="mt-4 text-muted">One list for every assignment, lab and deadline.</p>
          <ul className="mt-10 space-y-3" aria-hidden="true">
            {SAMPLE.map((t) => (
              <li key={t.title} className="flex items-start gap-3">
                <span className="mt-1 size-4 shrink-0 rounded border-2 border-brand" />
                <div>
                  <p className="font-medium">{t.title}</p>
                  <p className="text-sm text-muted">{t.subject}, {t.due}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="relative flex items-center justify-center px-6 py-12">
        <Link to="/" className="absolute left-6 top-5 lg:hidden" aria-label="Study Guide home"><Logo /></Link>
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>

        {verifyFor ? (
          <form onSubmit={handleVerify} className="w-full max-w-sm">
            <h2 className="text-2xl font-bold">Enter your code</h2>
            <p className="mt-3 text-muted">
              We sent a 6-digit code to <span className="font-medium text-ink">{verifyFor}</span>.
              It expires in 10 minutes.
            </p>

            <label htmlFor="code" className="mt-8 block text-sm font-medium">Verification code</label>
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className={`${input} text-center text-2xl font-semibold tracking-[0.5em]`}
            />

            {error && (
              <p role="alert" className="mt-4 rounded-md bg-overdue/10 px-3 py-2 text-sm text-overdue">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy || code.length !== 6} className={`mt-6 ${primary}`}>
              {busy ? "Verifying..." : "Verify email"}
            </button>

            <div className="mt-6 text-sm text-muted">
              <button
                type="button"
                onClick={() => sendNewCode(verifyFor)}
                disabled={wait > 0}
                className="font-medium text-brand-ink underline disabled:opacity-60"
              >
                {wait > 0 ? `Send a new code (${wait}s)` : "Send a new code"}
              </button>
              {note && <p role="status" className="mt-2">{note}</p>}
              <p className="mt-4">
                Wrong address?{" "}
                <button type="button" onClick={changeEmail} className="font-medium text-brand-ink underline">
                  Use a different email
                </button>
              </p>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="w-full max-w-sm">
            <h2 className="text-2xl font-bold">
              {isLogin ? "Log in to Study Guide" : "Create your account"}
            </h2>

            {!isLogin && (
              <>
                <label htmlFor="name" className="mt-8 block text-sm font-medium">Name</label>
                <input id="name" required maxLength={100} autoComplete="name" value={name}
                  onChange={(e) => setName(e.target.value)} className={input} />
              </>
            )}

            <label htmlFor="email" className={`${isLogin ? "mt-8" : "mt-4"} block text-sm font-medium`}>Email</label>
            <input id="email" type="email" required autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} className={input} />

            <label htmlFor="password" className="mt-4 block text-sm font-medium">Password</label>
            <div className="relative">
              <input id="password" type={showPw ? "text" : "password"} required minLength={isLogin ? undefined : 8}
                autoComplete={isLogin ? "current-password" : "new-password"} value={password}
                onChange={(e) => setPassword(e.target.value)} className={`${input} pr-16`} />
              <button type="button" onClick={() => setShowPw((v) => !v)} aria-pressed={showPw}
                className="absolute right-2 top-1/2 mt-0.5 -translate-y-1/2 rounded px-2 py-1 text-sm text-muted hover:text-ink">
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
            {!isLogin && <p className="mt-1 text-sm text-muted">At least 8 characters.</p>}

            {!isLogin && (
              <>
                <label htmlFor="confirm" className="mt-4 block text-sm font-medium">Confirm password</label>
                <input id="confirm" type={showPw ? "text" : "password"} required autoComplete="new-password" value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} className={input} />
              </>
            )}

            {error && (
              <p role="alert" className="mt-4 rounded-md bg-overdue/10 px-3 py-2 text-sm text-overdue">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className={`mt-6 ${primary}`}>
              {busy ? "Please wait..." : isLogin ? "Log in" : "Create account"}
            </button>

            <p className="mt-6 text-sm text-muted">
              {isLogin ? "New here? " : "Already have an account? "}
              <Link to={isLogin ? "/signup" : "/login"} className="font-medium text-brand-ink underline">
                {isLogin ? "Create an account" : "Log in"}
              </Link>
            </p>
          </form>
        )}
      </main>
    </div>
  );
}