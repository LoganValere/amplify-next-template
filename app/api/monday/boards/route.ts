import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { jsonError } from "@/lib/http";
import { readMondayBoardsInput } from "@/lib/monday/requests";
import { listAccessibleMondayBoards } from "@/lib/monday/settings";

export async function GET() {
  try {
    await requireAdmin();
    const boards = await listAccessibleMondayBoards();
    return NextResponse.json({ boards });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const { token } = await readMondayBoardsInput(request);
    const boards = await listAccessibleMondayBoards(token);
    return NextResponse.json({ boards });
  } catch (error) {
    return jsonError(error);
  }
}
