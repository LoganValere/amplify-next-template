import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, requireStaff } from "@/lib/authz";
import { jsonError } from "@/lib/http";
import { AppError } from "@/lib/errors";

export async function GET() {
  try {
    await requireStaff();
    const categories = await prisma.hourCategory.findMany({ orderBy: { sortOrder: "asc" } });
    return NextResponse.json({ categories });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = (await request.json()) as { name: string; color?: string };
    const slug = body.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const category = await prisma.hourCategory.create({
      data: {
        name: body.name.trim(),
        slug,
        color: body.color ?? "#5b8def",
        sortOrder: 99,
      },
    });
    return NextResponse.json({ category });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = (await request.json()) as { id: string; name?: string; active?: boolean; color?: string };
    if (!body.id) {
      throw new AppError("id is required");
    }
    const category = await prisma.hourCategory.update({
      where: { id: body.id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(typeof body.active === "boolean" ? { active: body.active } : {}),
        ...(body.color ? { color: body.color } : {}),
      },
    });
    return NextResponse.json({ category });
  } catch (error) {
    return jsonError(error);
  }
}
