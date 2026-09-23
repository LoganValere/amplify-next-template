"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Unable to sign out");
      try {
        const { signOut: signOutAmplify } = await import("aws-amplify/auth");
        await signOutAmplify();
      } catch {
        // The application session is already cleared; continue to login.
      }
      router.push("/login");
      router.refresh();
    } catch {
      setError("Unable to sign out. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        className="rounded-md text-xs font-medium text-valere-muted transition hover:text-valere-fg disabled:opacity-50"
        onClick={() => void signOut()}
        disabled={pending}
        aria-busy={pending || undefined}
      >
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {error ? (
        <p className="mt-1 text-xs text-valere-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
