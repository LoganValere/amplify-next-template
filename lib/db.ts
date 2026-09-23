import { copyFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

function prepareSqliteUrl(): void {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.startsWith("file:")) {
    return;
  }
  const relative = url.replace(/^file:/, "");
  // Prisma resolves relative SQLite paths against the schema directory, not cwd.
  const source = path.isAbsolute(relative)
    ? relative
    : path.join(process.cwd(), "prisma", relative);
  if (process.env.AWS_LAMBDA_FUNCTION_NAME && existsSync(source)) {
    const dest = "/tmp/valere-portal.db";
    if (!existsSync(dest)) {
      mkdirSync("/tmp", { recursive: true });
      copyFileSync(source, dest);
    }
    process.env.DATABASE_URL = `file:${dest}`;
  }
}

prepareSqliteUrl();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
