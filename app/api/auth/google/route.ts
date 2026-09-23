import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

export async function GET() {
  const base = getEnv().APP_BASE_URL;
  return NextResponse.json({
    googleSso: "Cognito uses the GoogleWorkspace SAML IdP. Staff must use an @valere.io Google account.",
    callback: `${base}/login`,
  });
}
