import { NextRequest, NextResponse } from "next/server";
import { verifyGoogleWorkspaceIdToken } from "@/lib/auth/cognito";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { adminEmails } from "@/lib/env";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { jsonError } from "@/lib/http";
import type { Role } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) {
      throw new UnauthorizedError("Cognito ID token is required");
    }
    const identity = await verifyGoogleWorkspaceIdToken(authorization.slice(7));

    const user = await prisma.$transaction(async (tx) => {
      const [emailUser, subjectUser] = await Promise.all([
        tx.user.findUnique({ where: { email: identity.email } }),
        tx.user.findUnique({ where: { cognitoSub: identity.sub } }),
      ]);
      if (subjectUser && subjectUser.email !== identity.email) {
        throw new ForbiddenError("Cognito identity is linked to another user");
      }
      if (emailUser?.cognitoSub && emailUser.cognitoSub !== identity.sub) {
        throw new ForbiddenError("This email is linked to another Cognito identity");
      }
      if (emailUser?.role === "CLIENT") {
        throw new ForbiddenError("Client contacts must use password sign-in");
      }

      const role: Role =
        adminEmails().includes(identity.email) || emailUser?.role === "ADMIN" ? "ADMIN" : "STAFF";
      if (emailUser) {
        return tx.user.update({
          where: { id: emailUser.id },
          data: { cognitoSub: identity.sub, name: identity.name, role },
        });
      }
      return tx.user.create({
        data: {
          cognitoSub: identity.sub,
          email: identity.email,
          name: identity.name,
          role,
        },
      });
    });

    const role = user.role as Role;
    const session = await signSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role,
      clientId: user.clientId,
      hourCategoryId: user.hourCategoryId,
    });
    const response = NextResponse.json({ ok: true, role });
    response.cookies.set(SESSION_COOKIE, session, sessionCookieOptions());
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
