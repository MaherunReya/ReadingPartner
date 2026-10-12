import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api, { errorMessage } from "../api";
import ThemeToggle from "../components/ThemeToggle";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState(token ? "loading" : "error");
  const [message, setMessage] = useState(token ? "" : "This verification link is incomplete.");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .post("/auth/verify-email", { token })
      .then((res) => {
        if (cancelled) return;
        setState("ok");
        setMessage(res.data.message);
      })
      .catch((err) => {
        if (cancelled) return;
        setState("error");
        setMessage(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        {state === "loading" && <h1 className="text-2xl font-bold">Verifying your email...</h1>}
        {state === "ok" && (
          <>
            <h1 className="text-2xl font-bold">Email verified</h1>
            <p className="mt-3 text-muted">{message}</p>
            <Link to="/login" className="mt-6 inline-block rounded-md bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark">
              Log in
            </Link>
          </>
        )}
        {state === "error" && (
          <>
            <h1 className="text-2xl font-bold">Couldn't verify your email</h1>
            <p role="alert" className="mt-3 text-muted">{message}</p>
            <p className="mt-3 text-sm text-muted">
              Log in with your email and password to get a new verification link.
            </p>
            <Link to="/login" className="mt-6 inline-block rounded-md bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark">
              Go to log in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}