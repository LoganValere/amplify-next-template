"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Shown when a background refresh fails after data has already loaded. The
 * surface stays mounted so completed work is not misread as a failure.
 */
export function StaleDataNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert tone="warning" className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <span>Showing the last loaded data. {message}</span>
      <Button size="sm" variant="secondary" onClick={onRetry}>
        Refresh now
      </Button>
    </Alert>
  );
}
