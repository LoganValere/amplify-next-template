import { HTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-neutral-200", className)}
      {...props}
    />
  );
}

/** Skeleton with the busy state announced to assistive technology. */
export function LoadingBlock({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      {children ?? <Skeleton className={cn("h-48 w-full", className)} />}
      <span className="sr-only">{label}</span>
    </div>
  );
}
