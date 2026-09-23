import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { jsonError } from "@/lib/http";
import { accountBalances } from "@/lib/budgets/balance";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const clientId = new URL(request.url).searchParams.get("clientId");
    if (!clientId) {
      return NextResponse.json({ balances: [] });
    }
    const balances = await accountBalances(clientId);
    return NextResponse.json({ balances });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as {
      clientId: string;
      hourCategoryId: string;
      hours: number;
      type: "initial" | "replenish";
      note?: string;
    };
    const grant = await prisma.budgetGrant.create({
      data: {
        clientId: body.clientId,
        hourCategoryId: body.hourCategoryId,
        hours: body.hours,
        type: body.type === "replenish" ? "replenish" : "initial",
        note: body.note ?? "",
        createdById: admin.id,
      },
    });
    return NextResponse.json({ grant });
  } catch (error) {
    return jsonError(error);
  }
}
