import { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-white px-6 py-12 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-valere-surface" aria-hidden>
        <span className="text-lg text-valere-muted">—</span>
      </div>
      <h2 className="mt-4 text-base font-semibold">{title}</h2>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm text-valere-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
