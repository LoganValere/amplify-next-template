import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui/utils";
import { accountHealth, budgetUsageRatio, BUDGET_WARNING_RATIO } from "@/lib/accounts/health";
import type { AccountBalance, AccountHealthRecord } from "./types";

export function AccountHealthBadge({ account }: { account: AccountHealthRecord }) {
  const health = accountHealth(account);
  return <Badge tone={health.tone}>{health.label}</Badge>;
}

export function BudgetHealth({ row, compact = false }: { row: AccountBalance; compact?: boolean }) {
  const { balance, category } = row;
  const ratio = budgetUsageRatio(balance);
  const percentage = ratio === null ? null : ratio * 100;
  const boundedPercentage = Math.min(Math.max(percentage ?? 0, 0), 100);
  const isOver = balance.remainingHours < 0;
  const isWarning = !isOver && ratio !== null && ratio >= BUDGET_WARNING_RATIO;

  return (
    <div className={cn("min-w-0", !compact && "rounded-lg border bg-valere-surface/60 p-3")}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-xs font-medium">{category.name}</p>
        <p className={cn("shrink-0 text-xs font-semibold", isOver && "text-valere-danger", isWarning && "text-valere-warning")}>
          {balance.remainingHours.toFixed(2)}h left
        </p>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200"
        role="progressbar"
        aria-label={`${category.name} budget used`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage === null ? undefined : Math.round(boundedPercentage)}
      >
        <div
          className={cn("h-full rounded-full bg-valere-success", isWarning && "bg-valere-warning", isOver && "bg-valere-danger")}
          style={{ width: `${boundedPercentage}%` }}
        />
      </div>
      <p className="mt-1.5 text-[0.6875rem] text-valere-muted">
        {balance.usedHours.toFixed(2)}h used
        {balance.grantedHours > 0 ? ` of ${balance.grantedHours.toFixed(2)}h` : " · no grant recorded"}
        {balance.mode ? ` · ${balance.mode}` : ""}
      </p>
    </div>
  );
}
