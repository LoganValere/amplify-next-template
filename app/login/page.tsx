"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = (await response.json()) as { error?: string; role?: string };
    setPending(false);
    if (!response.ok) {
      setError(payload.error ?? "Unable to sign in");
      return;
    }
    router.push(payload.role === "CLIENT" ? "/client/timesheets" : "/timer");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md border border-valere-border bg-valere-panel rounded-xl p-8">
        <p className="text-xs tracking-[0.3em] text-valere-muted">VALERE</p>
        <h1 className="mt-2 text-2xl font-semibold">Portal</h1>
        <p className="mt-2 text-sm text-valere-muted">
          Staff sign in with Google Workspace (@valere.io). Client contacts use the password from their invite.
        </p>
        <button
          type="button"
          className="mt-6 w-full rounded-md border border-valere-border py-2 text-sm"
          onClick={async () => {
            try {
              const { signInWithRedirect } = await import("aws-amplify/auth");
              await signInWithRedirect({ provider: "Google" });
            } catch {
              setError(
                "Google SSO needs Amplify Cognito. For local development set APP_DEV_AUTH=true and use the seeded password.",
              );
            }
          }}
        >
          Continue with Google (@valere.io)
        </button>
        <form className="mt-4 space-y-4" onSubmit={onSubmit}>
          <div className="flex flex-col gap-1">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-white text-black py-2 text-sm font-medium disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
