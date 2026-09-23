import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { jsonError } from "@/lib/http";
import { runRetainerReplenish } from "@/lib/retainers/run";

export async function GET() {
  try {
    await requireAdmin();
    const retainers = await prisma.retainer.findMany({
      include: { client: true, hourCategory: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ retainers });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = (await request.json()) as {
      clientId: string;
      hourCategoryId: string;
      hoursPerPeriod: number;
      replenishDayOfMonth: number;
      startDate: string;
      endDate?: string;
      rolloverPolicy?: "expire" | "accumulate";
      rolloverCapHours?: number;
      timezone?: string;
    };
    const retainer = await prisma.retainer.create({
      data: {
        clientId: body.clientId,
        hourCategoryId: body.hourCategoryId,
        hoursPerPeriod: body.hoursPerPeriod,
        replenishDayOfMonth: body.replenishDayOfMonth,
        startDate: body.startDate,
        endDate: body.endDate,
        rolloverPolicy: body.rolloverPolicy === "accumulate" ? "accumulate" : "expire",
        rolloverCapHours: body.rolloverCapHours,
        timezone: body.timezone ?? "America/New_York",
      },
    });
    await runRetainerReplenish(new Date());
    return NextResponse.json({ retainer });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = (await request.json()) as { id: string; active?: boolean };
    const retainer = await prisma.retainer.update({
      where: { id: body.id },
      data: { active: body.active },
    });
    return NextResponse.json({ retainer });
  } catch (error) {
    return jsonError(error);
  }
}
