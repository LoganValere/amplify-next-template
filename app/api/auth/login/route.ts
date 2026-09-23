import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth/session";
import { adminEmails, isDevAuthEnabled } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { AppError } from "@/lib/errors";
import type { Role } from "@/lib/auth/roles";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    if (!email || !password) {
      throw new AppError("Email and password are required");
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }
    const staffEmail = email.endsWith("@valere.io");
    if (user.role !== "CLIENT" && !isDevAuthEnabled() && staffEmail) {
      throw new AppError("Staff must sign in with Google SSO", 401, "GOOGLE_REQUIRED");
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }
    let role = user.role as Role;
    if (adminEmails().includes(email)) {
      role = "ADMIN";
      if (user.role !== "ADMIN") {
        await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      }
    }
    const token = await signSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role,
      clientId: user.clientId,
      hourCategoryId: user.hourCategoryId,
    });
    const response = NextResponse.json({ ok: true, role });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
