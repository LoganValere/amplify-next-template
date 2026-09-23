import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { jsonError } from "@/lib/http";
import { syncMondayAccounts } from "@/lib/monday/sync";

export async function POST() {
  try {
    await requireAdmin();
    const result = await syncMondayAccounts();
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
