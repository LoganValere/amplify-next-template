import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { jsonError } from "@/lib/http";
import { burndownSeries, hoursReport } from "@/lib/reports/hours";
import { AppError, ForbiddenError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind") ?? "hours";
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    if (!from || !to) {
      throw new AppError("from and to are required");
    }
    let clientId = url.searchParams.get("clientId") ?? undefined;
    let userId = url.searchParams.get("userId") ?? undefined;
    const hourCategoryId = url.searchParams.get("hourCategoryId") ?? undefined;
    if (user.role === "CLIENT") {
      clientId = user.clientId ?? undefined;
      if (kind !== "burndown") {
        throw new ForbiddenError();
      }
    }
    if (kind === "burndown") {
      if (!clientId || !hourCategoryId) {
        throw new AppError("clientId and hourCategoryId are required for burndown");
      }
      const series = await burndownSeries(clientId, hourCategoryId, from, to);
      return NextResponse.json({ series });
    }
    // Non-admin staff see and export only their own time, so the hours table
    // matches what /api/export returns for the same filters.
    if (user.role === "STAFF") {
      userId = user.id;
    }
    const rows = await hoursReport({ from, to, clientId, userId, hourCategoryId });
    return NextResponse.json({ rows });
  } catch (error) {
    return jsonError(error);
  }
}
