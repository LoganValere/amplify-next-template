import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { jsonError } from "@/lib/http";
import { loadExportRows, toCsv } from "@/lib/exports/csv";
import { renderTimesheetPdf } from "@/lib/exports/pdf";
import { AppError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireUser();
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const format = url.searchParams.get("format") ?? "csv";
    const clientId = url.searchParams.get("clientId") ?? undefined;
    const hourCategoryId = url.searchParams.get("hourCategoryId") ?? undefined;
    const scope = url.searchParams.get("scope");
    if (!from || !to) {
      throw new AppError("from and to are required");
    }
    const filters = {
      from,
      to,
      clientId: scope === "all" && actor.role === "ADMIN" ? undefined : clientId,
      hourCategoryId,
    };
    const rows = await loadExportRows(actor, filters);
    if (format === "pdf") {
      if (rows.length > 2000) {
        throw new AppError("PDF is limited to 2,000 rows. Export CSV for this range.");
      }
          const pdf = await renderTimesheetPdf(rows, from, to);
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="valere-timesheets-${from}-${to}.pdf"`,
        },
      });
    }
    const csv = toCsv(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="valere-timesheets-${from}-${to}.csv"`,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
