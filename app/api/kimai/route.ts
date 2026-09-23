import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { jsonError } from "@/lib/http";
import { applyKimaiRow, stageKimaiCsv } from "@/lib/kimai/import";
import { AppError } from "@/lib/errors";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await prisma.kimaiImportRow.findMany({
      where: { status: "unmatched" },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ rows });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        rowId: string;
        clientId: string;
        hourCategoryId: string;
      };
      await applyKimaiRow(body.rowId, body.clientId, body.hourCategoryId);
      return NextResponse.json({ ok: true });
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new AppError("CSV file is required");
    }
    const text = await file.text();
    const result = await stageKimaiCsv(text);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
