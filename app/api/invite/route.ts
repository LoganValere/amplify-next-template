import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import { jsonError } from "@/lib/http";
import { hashPassword } from "@/lib/auth/password";
import { AppError } from "@/lib/errors";

function tempPassword(): string {
  return `Valere-${Math.random().toString(36).slice(2, 10)}A1`;
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = (await request.json()) as { email: string; name: string; clientId: string };
    const email = body.email.trim().toLowerCase();
    if (!email || !body.clientId) {
      throw new AppError("email and clientId are required");
    }
    const password = tempPassword();
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: body.name || email,
        role: "CLIENT",
        clientId: body.clientId,
        passwordHash,
      },
      update: {
        clientId: body.clientId,
        role: "CLIENT",
        passwordHash,
        name: body.name || email,
      },
    });
    await prisma.clientContact.upsert({
      where: { email_clientId: { email, clientId: body.clientId } },
      create: {
        email,
        name: body.name || email,
        clientId: body.clientId,
        userId: user.id,
        status: "invited",
      },
      update: { userId: user.id, status: "invited", name: body.name || email },
    });
    return NextResponse.json({
      user: { id: user.id, email: user.email },
      temporaryPassword: password,
      note: "Share this password over a secure channel. SES invite wiring uses APP_BASE_URL when SES is configured.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
