import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/authz";
import { jsonError } from "@/lib/http";
import { accountBalances } from "@/lib/budgets/balance";

export async function GET() {
  try {
    const user = await requireUser();
    const where = user.role === "CLIENT" ? { id: user.clientId ?? "__none__" } : { archived: false };
    const accounts = await prisma.client.findMany({
      where,
      orderBy: { name: "asc" },
    });
    const withBalances = await Promise.all(
      accounts.map(async (account) => ({
        ...account,
        balances: await accountBalances(account.id),
      })),
    );
    return NextResponse.json({ accounts: withBalances });
  } catch (error) {
    return jsonError(error);
  }
}
