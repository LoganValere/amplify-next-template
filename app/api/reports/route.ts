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
    const userId = url.searchParams.get("userId") ?? undefined;
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
    const rows = await hoursReport({ from, to, clientId, userId, hourCategoryId });
    return NextResponse.json({ rows });
  } catch (error) {
    return jsonError(error);
  }
}
