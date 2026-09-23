"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/utils";
import { SETTINGS_ROUTES, isSettingsRouteActive } from "@/lib/settings/config";

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings sections" className="-mx-1 overflow-x-auto pb-1">
      <div className="flex min-w-max gap-1 rounded-lg border bg-white p-1 shadow-editorial">
        {SETTINGS_ROUTES.map((item) => {
          const active = isSettingsRouteActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition",
                active ? "bg-valere-fg text-white" : "text-valere-muted hover:bg-valere-surface hover:text-valere-fg",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
