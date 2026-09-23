import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { jsonError } from "@/lib/http";
import { connectDriveFolder, connectMondayWorkspace, ingestDriveFolder } from "@/lib/drive/ingest";
import { AppError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const clientId = new URL(request.url).searchParams.get("clientId");
    const links = await prisma.integrationLink.findMany({
      where: clientId ? { clientId } : undefined,
      include: { client: true },
    });
    return NextResponse.json({ links });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = (await request.json()) as {
      clientId: string;
      kind: "drive_folder" | "monday_workspace";
      externalId: string;
      ingest?: boolean;
    };
    if (body.kind === "drive_folder") {
      const link = await connectDriveFolder(body.clientId, body.externalId);
      let ingested = 0;
      if (body.ingest) {
        ingested = await ingestDriveFolder(body.clientId, link.externalId);
      }
      return NextResponse.json({ link, ingested });
    }
    if (body.kind === "monday_workspace") {
      const link = await connectMondayWorkspace(body.clientId, body.externalId);
      return NextResponse.json({ link });
    }
    throw new AppError("Unknown integration kind");
  } catch (error) {
    return jsonError(error);
  }
}
