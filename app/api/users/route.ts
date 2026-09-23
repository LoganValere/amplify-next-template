import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    await requireAdmin();
    const users = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "STAFF"] } },
      include: { hourCategory: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ users });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = (await request.json()) as { id: string; hourCategoryId: string };
    const user = await prisma.user.update({
      where: { id: body.id },
      data: { hourCategoryId: body.hourCategoryId },
    });
    return NextResponse.json({ user });
  } catch (error) {
    return jsonError(error);
  }
}
