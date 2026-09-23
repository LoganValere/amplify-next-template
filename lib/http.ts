import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";

export function jsonError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  const message = error instanceof Error ? error.message : "Unexpected error";
  return NextResponse.json({ error: message, code: "INTERNAL" }, { status: 500 });
}
