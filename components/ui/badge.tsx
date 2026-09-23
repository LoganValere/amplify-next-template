import { HTMLAttributes } from "react";
import { cn } from "./utils";

type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-valere-surface text-valere-muted",
  accent: "bg-valere-accent-soft text-valere-accent",
  success: "bg-green-50 text-valere-success",
  warning: "bg-amber-50 text-valere-warning",
  danger: "bg-red-50 text-valere-danger",
};

export function Badge({ tone = "neutral", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", tones[tone], className)}
      {...props}
    />
  );
}
