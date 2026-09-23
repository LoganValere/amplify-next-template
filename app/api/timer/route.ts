import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/authz";
import { jsonError } from "@/lib/http";
import { discardTimer, getTimer, startTimer, stopTimer } from "@/lib/time/timer";
import { AppError } from "@/lib/errors";

export async function GET() {
  try {
    const actor = await requireStaff();
    const timer = await getTimer(actor);
    return NextResponse.json({ timer });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireStaff();
    const body = (await request.json()) as { action: string; clientId?: string; note?: string };
    if (body.action === "start") {
      if (!body.clientId) {
        throw new AppError("clientId is required");
      }
      const timer = await startTimer(actor, body.clientId, body.note ?? "");
      return NextResponse.json({ timer });
    }
    if (body.action === "stop") {
      const entries = await stopTimer(actor);
      return NextResponse.json({ entries });
    }
    if (body.action === "discard") {
      await discardTimer(actor);
      return NextResponse.json({ ok: true });
    }
    throw new AppError("Unknown timer action");
  } catch (error) {
    return jsonError(error);
  }
}
