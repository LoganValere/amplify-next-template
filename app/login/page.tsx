"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-field";

type SsoOutcome = "completed" | "no-session" | "failed";

export default function LoginPage() {
  const router = useRouter();
  const exchangeInFlight = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ssoError, setSsoError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [ssoPending, setSsoPending] = useState(false);
  const [passwordPending, setPasswordPending] = useState(false);

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
      setSsoPending(true);
      const response = await fetch("/api/auth/sso/session", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const payload = (await response.json()) as { error?: string; role?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to complete Google Workspace sign-in");
      }
      router.replace(payload.role === "CLIENT" ? "/client/timesheets" : "/overview");
      router.refresh();
      return "completed";
    } catch (error) {
      if (!started) {
        return "no-session";
      }
      setSsoError(error instanceof Error ? error.message : "Unable to complete Google Workspace sign-in");
      setSsoPending(false);
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
        setSsoPending(false);
        setSsoError("Google Workspace returned successfully, but the Cognito session could not be completed.");
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
          setSsoPending(false);
          setSsoError("Google Workspace sign-in failed. Please try again.");
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
    if (passwordPending || ssoPending) {
      return;
    }
    setPasswordPending(true);
    setPasswordError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as { error?: string; role?: string };
      if (!response.ok) {
        setPasswordError(payload.error ?? "Unable to sign in");
        setPasswordPending(false);
        return;
      }
      router.push(payload.role === "CLIENT" ? "/client/timesheets" : "/overview");
      router.refresh();
      setPasswordPending(false);
    } catch {
      setPasswordError("Unable to sign in. Please check your connection and try again.");
      setPasswordPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-valere-bg px-4 py-10 sm:flex sm:items-center sm:justify-center sm:px-6">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border bg-white shadow-editorial lg:grid lg:grid-cols-[0.85fr_1.15fr]">
        <section className="flex flex-col justify-between bg-valere-fg p-8 text-white sm:p-10 lg:p-12">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-lg font-semibold text-valere-fg">
              V
            </div>
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-400">Valere</p>
            <h1 className="mt-3 max-w-md text-3xl font-semibold tracking-tight sm:text-4xl">
              Time, projects, and progress in one place.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-neutral-300">
              A secure workspace for the Valere team and the clients we partner with.
            </p>
          </div>
          <p className="mt-12 text-xs text-neutral-400">Valere · Staff and client portal</p>
        </section>

        <div className="p-6 sm:p-10 lg:p-12">
          <p className="editorial-kicker">Welcome back</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Choose how you access the portal</h2>
          <p className="mt-2 text-sm text-valere-muted">Use the sign-in path assigned to your account.</p>

          <section className="mt-7 rounded-xl border bg-valere-surface/60 p-5">
            <p className="text-sm font-semibold">Valere Team</p>
            <p className="mt-1 text-sm text-valere-muted">For staff using a @valere.io Google Workspace account.</p>
            {ssoError ? (
              <Alert tone="danger" className="mt-4">
                {ssoError}
              </Alert>
            ) : null}
            <Button
              variant="secondary"
              loading={ssoPending}
              disabled={passwordPending}
              className="mt-5 w-full bg-white"
              onClick={async () => {
                if (ssoPending || passwordPending) {
                  return;
                }
                try {
                  setSsoPending(true);
                  setSsoError("");
                  const { signInWithRedirect } = await import("aws-amplify/auth");
                  await signInWithRedirect({ provider: { custom: "GoogleWorkspace" } });
                } catch (error) {
                  const alreadySignedIn =
                    error instanceof Error && error.name === "UserAlreadyAuthenticatedException";
                  if (alreadySignedIn) {
                    // Amplify still holds tokens from an exchange that never finished.
                    const outcome = await completeSso();
                    if (outcome !== "no-session") {
                      return;
                    }
                    const { signOut } = await import("aws-amplify/auth");
                    await signOut();
                  }
                  setSsoPending(false);
                  setSsoError(
                    alreadySignedIn
                      ? "Your previous Google session expired. Please try again."
                      : error instanceof Error
                        ? error.message
                        : "Unable to start Google Workspace sign-in.",
                  );
                }
              }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
                <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.25-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
                <path fill="#FBBC05" d="M6.39 13.93A6.02 6.02 0 0 1 6.07 12c0-.67.12-1.32.32-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.55l3.35-2.62Z" />
                <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" />
              </svg>
              Continue with Google
            </Button>
          </section>

          <section className="mt-4 rounded-xl border p-5">
            <p className="text-sm font-semibold">Client Access</p>
            <p className="mt-1 text-sm text-valere-muted">Use the email and password included in your invitation.</p>
            {passwordError ? (
              <Alert tone="danger" className="mt-4">
                {passwordError}
              </Alert>
            ) : null}
            <form className="mt-5 space-y-4" onSubmit={onSubmit}>
              <Input
                id="email"
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={passwordPending}
                required
              />
              <Input
                id="password"
                label="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={passwordPending}
                required
              />
              <Button type="submit" loading={passwordPending} disabled={ssoPending} className="w-full">
                Sign in to client portal
              </Button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
