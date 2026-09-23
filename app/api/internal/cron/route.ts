import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { syncMondayAccounts } from "@/lib/monday/sync";
import { runRetainerReplenish } from "@/lib/retainers/run";
import { prisma } from "@/lib/db";
import { ingestDriveFolder } from "@/lib/drive/ingest";

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get("x-cron-secret");
    if (secret !== getEnv().APP_CRON_SECRET) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    const body = (await request.json()) as { job: string };
    if (body.job === "monday") {
      return NextResponse.json(await syncMondayAccounts());
    }
    if (body.job === "retainers") {
      const created = await runRetainerReplenish();
      return NextResponse.json({ created });
    }
    if (body.job === "drive") {
      const links = await prisma.integrationLink.findMany({
        where: { kind: "drive_folder" },
      });
      let ingested = 0;
      for (const link of links) {
        ingested += await ingestDriveFolder(link.clientId, link.externalId);
      }
      return NextResponse.json({ ingested });
    }
    throw new AppError("Unknown job");
  } catch (error) {
    return jsonError(error);
  }
}
