import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff, requireUser } from "@/lib/authz";
import { jsonError } from "@/lib/http";
import { createManualEntry, deleteEntry, updateEntry } from "@/lib/time/entries";
import { AppError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const clientId = url.searchParams.get("clientId") ?? undefined;
    const where = {
      ...(from && to ? { date: { gte: from, lte: to } } : {}),
      ...(user.role === "CLIENT" ? { clientId: user.clientId ?? "__none__" } : {}),
      ...(user.role === "STAFF" ? { userId: user.id } : {}),
      ...(clientId && user.role !== "CLIENT" ? { clientId } : {}),
    };
    const entries = await prisma.timeEntry.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, role: true } }, client: true, hourCategory: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 200,
    });
    return NextResponse.json({ entries });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireStaff();
    const body = (await request.json()) as {
      clientId: string;
      date: string;
      durationHours?: number;
      durationMinutes?: number;
      startTime?: string;
      endTime?: string;
      description?: string;
      hourCategoryId?: string;
      allowOverage?: boolean;
    };
    const categoryId = actor.role === "ADMIN" ? body.hourCategoryId ?? actor.hourCategoryId : actor.hourCategoryId;
    if (!categoryId) {
      throw new AppError("Hour category is required on your profile");
    }
    const durationMinutes =
      body.durationMinutes ?? (body.durationHours ? Math.round(body.durationHours * 60) : 0);
    const entry = await createManualEntry({
      actor,
      userId: actor.id,
      clientId: body.clientId,
      hourCategoryId: categoryId,
      date: body.date,
      startTime: body.startTime,
      endTime: body.endTime,
      durationMinutes,
      description: body.description ?? "",
      allowOverage: Boolean(body.allowOverage && actor.role === "ADMIN"),
    });
    return NextResponse.json({ entry });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireStaff();
    const body = (await request.json()) as {
      id: string;
      date?: string;
      durationMinutes?: number;
      description?: string;
      hourCategoryId?: string;
    };
    const entry = await updateEntry(actor, body.id, {
      date: body.date,
      durationMinutes: body.durationMinutes,
      description: body.description,
      hourCategoryId: actor.role === "ADMIN" ? body.hourCategoryId : undefined,
    });
    return NextResponse.json({ entry });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = await requireStaff();
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      throw new AppError("id is required");
    }
    await deleteEntry(actor, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
