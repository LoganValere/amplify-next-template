import type { Role } from "@/lib/auth/roles";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { getSession, type SessionUser } from "@/lib/auth/session";

export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}

export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new ForbiddenError();
  }
  return user;
}

export async function requireStaff(): Promise<SessionUser> {
  return requireRole(["ADMIN", "STAFF"]);
}

export async function requireAdmin(): Promise<SessionUser> {
  return requireRole(["ADMIN"]);
}

export function assertClientScope(user: SessionUser, clientId: string) {
  if (user.role === "CLIENT" && user.clientId !== clientId) {
    throw new ForbiddenError("Cannot access another account");
  }
}

export function isStaff(user: SessionUser): boolean {
  return user.role === "ADMIN" || user.role === "STAFF";
}
