import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { syncMondayAccounts } from "@/lib/monday/sync";
import { runRetainerReplenish } from "@/lib/retainers/run";
import { prisma } from "@/lib/db";
import { ingestDriveFolder } from "@/lib/drive/ingest";

const cronBodySchema = z.object({
  job: z.enum(["monday", "retainers", "drive"]),
});

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get("x-cron-secret");
    if (secret !== getEnv().APP_CRON_SECRET) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new AppError("Request body must be valid JSON", 400, "INVALID_REQUEST");
    }
    const parsed = cronBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("Unknown job", 400, "INVALID_REQUEST");
    }
    if (parsed.data.job === "monday") {
      return NextResponse.json(await syncMondayAccounts());
    }
    if (parsed.data.job === "retainers") {
      const created = await runRetainerReplenish();
      return NextResponse.json({ created });
    }
    const links = await prisma.integrationLink.findMany({
      where: { kind: "drive_folder" },
    });
    let ingested = 0;
    for (const link of links) {
      ingested += await ingestDriveFolder(link.clientId, link.externalId);
    }
    return NextResponse.json({ ingested });
  } catch (error) {
    return jsonError(error);
  }
}
