import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { jsonError } from "@/lib/http";
import { UnauthorizedError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      throw new UnauthorizedError();
    }
    return NextResponse.json(session);
  } catch (error) {
    return jsonError(error);
  }
}
