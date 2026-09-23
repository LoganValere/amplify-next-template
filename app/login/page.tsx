"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SsoOutcome = "completed" | "no-session" | "failed";

export default function LoginPage() {
  const router = useRouter();
  const exchangeInFlight = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const completeSso = useCallback(async (): Promise<SsoOutcome> => {
    if (exchangeInFlight.current) {
      return "no-session";
    }
    let started = false;
    try {
      const { fetchAuthSession } = await import("aws-amplify/auth");
      const authSession = await fetchAuthSession();
      const idToken = authSession.tokens?.idToken?.toString();
      if (!idToken) {
        return "no-session";
      }

      exchangeInFlight.current = true;
      started = true;
      setPending(true);
      const response = await fetch("/api/auth/sso/session", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const payload = (await response.json()) as { error?: string; role?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to complete Google Workspace sign-in");
      }
      router.replace(payload.role === "CLIENT" ? "/client/timesheets" : "/timer");
      router.refresh();
      return "completed";
    } catch (ssoError) {
      if (!started) {
        return "no-session";
      }
      setError(ssoError instanceof Error ? ssoError.message : "Unable to complete Google Workspace sign-in");
      setPending(false);
      return "failed";
    } finally {
      exchangeInFlight.current = false;
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const retryCallback = async () => {
      if (cancelled || (await completeSso()) !== "no-session") {
        return;
      }
      attempts += 1;
      if (attempts < 40 && window.location.search.includes("code=")) {
        retryTimer = setTimeout(retryCallback, 250);
      } else if (attempts >= 40 && window.location.search.includes("code=")) {
        setPending(false);
        setError("Google Workspace returned successfully, but the Cognito session could not be completed.");
      }
    };

    void retryCallback();
    let cancelHubListener: (() => void) | undefined;
    void import("aws-amplify/utils").then(({ Hub }) => {
      if (cancelled) {
        return;
      }
      cancelHubListener = Hub.listen("auth", ({ payload }) => {
        if (payload.event === "signedIn" || payload.event === "signInWithRedirect") {
          void completeSso();
        }
        if (payload.event === "signInWithRedirect_failure") {
          setPending(false);
          setError("Google Workspace sign-in failed. Please try again.");
        }
      });
    });

    return () => {
      cancelled = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      cancelHubListener?.();
    };
  }, [completeSso]);

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
          disabled={pending}
          className="mt-6 w-full rounded-md border border-valere-border py-2 text-sm"
          onClick={async () => {
            try {
              setPending(true);
              setError("");
              const { signInWithRedirect } = await import("aws-amplify/auth");
              await signInWithRedirect({ provider: { custom: "GoogleWorkspace" } });
            } catch (ssoError) {
              const alreadySignedIn =
                ssoError instanceof Error && ssoError.name === "UserAlreadyAuthenticatedException";
              if (alreadySignedIn) {
                // Amplify still holds tokens from an exchange that never finished.
                const outcome = await completeSso();
                if (outcome !== "no-session") {
                  return;
                }
                const { signOut } = await import("aws-amplify/auth");
                await signOut();
              }
              setPending(false);
              setError(
                alreadySignedIn
                  ? "Your previous Google session expired. Please try again."
                  : ssoError instanceof Error
                    ? ssoError.message
                    : "Unable to start Google Workspace sign-in.",
              );
            }
          }}
        >
          {pending ? "Signing in…" : "Continue with Google (@valere.io)"}
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
