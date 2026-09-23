import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";

export function jsonError(error: unknown) {
  if (error instanceof AppError) {
    const details = error as AppError & {
      missingColumnIds?: string[];
      retryAfterMs?: number;
    };
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(details.missingColumnIds ? { missingColumnIds: details.missingColumnIds } : {}),
        ...(details.retryAfterMs !== undefined ? { retryAfterMs: details.retryAfterMs } : {}),
      },
      { status: error.status },
    );
  }
  console.error("Unhandled route error", error);
  return NextResponse.json(
    { error: "An unexpected error occurred", code: "INTERNAL" },
    { status: 500 },
  );
}
