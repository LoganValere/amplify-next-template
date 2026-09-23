"use client";

import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="mt-3 text-valere-muted hover:text-white"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        try {
          const { signOut } = await import("aws-amplify/auth");
          await signOut();
        } catch {
          // The application session is already cleared; continue to login.
        }
        router.push("/login");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
