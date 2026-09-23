"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { cn } from "@/components/ui/utils";

export type PortalNavItem = { href: string; label: string; activePrefix?: string };

type PortalShellProps = {
  children: ReactNode;
  nav: PortalNavItem[];
  user: { name: string; email: string; role: string };
  portalLabel: string;
  homeHref: string;
  utility?: ReactNode;
};

const DRAWER_ID = "portal-mobile-navigation";

function Mark() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-valere-fg text-sm font-semibold text-white">
      V
    </span>
  );
}

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

export function PortalShell({ children, nav, user, portalLabel, homeHref, utility }: PortalShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const roleLabel = formatRole(user.role);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  // showModal gives focus trapping, Escape handling, and focus restore for free.
  useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) return;
    if (menuOpen && !drawer.open) {
      drawer.showModal();
      closeButtonRef.current?.focus();
    }
    if (!menuOpen && drawer.open) {
      drawer.close();
    }
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  function isActive(item: PortalNavItem) {
    const match = item.activePrefix ?? item.href;
    return match === "/" ? pathname === "/" : pathname === match || pathname.startsWith(`${match}/`);
  }

  function renderNavigation(label: string, onNavigate?: () => void) {
    return (
      <nav aria-label={label} className="space-y-1">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive(item) ? "page" : undefined}
            className={cn(
              "block rounded-md px-3 py-2 text-sm font-medium transition",
              isActive(item)
                ? "bg-valere-fg text-white"
                : "text-valere-muted hover:bg-valere-surface hover:text-valere-fg",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    );
  }

  function renderAccount() {
    return (
      <>
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-valere-muted">{user.email}</p>
        <p className="mt-1 text-[0.625rem] font-semibold uppercase tracking-wider text-valere-muted">{roleLabel}</p>
        <SignOutButton />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-valere-bg lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="hidden border-r bg-white lg:flex lg:min-h-screen lg:flex-col lg:p-5">
        <Link href={homeHref} className="flex items-center gap-3 rounded-md">
          <Mark />
          <span>
            <span className="block text-sm font-semibold tracking-tight">Valere</span>
            <span className="block text-xs text-valere-muted">{portalLabel}</span>
          </span>
        </Link>
        <div className="mt-9 flex-1">{renderNavigation(`${portalLabel} navigation`)}</div>
        <div className="border-t pt-4">{renderAccount()}</div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              className="rounded-md border p-2 text-valere-muted hover:bg-valere-surface hover:text-valere-fg"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation"
              aria-expanded={menuOpen}
              aria-controls={DRAWER_ID}
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M3 5h14M3 10h14M3 15h14" />
              </svg>
            </button>
            <Link href={homeHref} className="flex items-center gap-2 font-semibold">
              <Mark />
              <span className="hidden sm:inline">Valere</span>
            </Link>
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-3">{utility}</div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      <dialog
        id={DRAWER_ID}
        ref={drawerRef}
        aria-label={`${portalLabel} navigation`}
        className="m-0 h-full max-h-none w-[min(20rem,86vw)] max-w-none rounded-none border-r bg-white p-0 text-valere-fg backdrop:bg-black/30 lg:hidden"
        onClose={closeMenu}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMenu();
        }}
      >
        <div className="flex h-full flex-col p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mark />
              <div>
                <p className="text-sm font-semibold">Valere</p>
                <p className="text-xs text-valere-muted">{portalLabel}</p>
              </div>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeMenu}
              className="rounded-md p-2 text-valere-muted hover:bg-valere-surface hover:text-valere-fg"
              aria-label="Close navigation"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>
          <div className="mt-8 flex-1 overflow-y-auto">
            {renderNavigation(`${portalLabel} mobile navigation`, closeMenu)}
          </div>
          <div className="border-t pt-4">{renderAccount()}</div>
        </div>
      </dialog>
    </div>
  );
}
