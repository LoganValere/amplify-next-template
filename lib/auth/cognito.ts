import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { getEnv } from "@/lib/env";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

export type CognitoStaffIdentity = {
  sub: string;
  email: string;
  name: string;
};

let cachedIssuer = "";
let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function cognitoIssuer(): string {
  const env = getEnv();
  return `https://cognito-idp.${env.APP_COGNITO_REGION}.amazonaws.com/${env.APP_COGNITO_USER_POOL_ID}`;
}

function jwksForIssuer(issuer: string) {
  if (!cachedJwks || cachedIssuer !== issuer) {
    cachedIssuer = issuer;
    cachedJwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  }
  return cachedJwks;
}

function hasGoogleWorkspaceIdentity(payload: JWTPayload): boolean {
  let identities: unknown = payload.identities;
  if (typeof identities === "string") {
    try {
      identities = JSON.parse(identities);
    } catch {
      return false;
    }
  }
  return (
    Array.isArray(identities) &&
    identities.some(
      (identity) =>
        typeof identity === "object" &&
        identity !== null &&
        "providerName" in identity &&
        identity.providerName === "GoogleWorkspace",
    )
  );
}

/** Verifies a Cognito ID token came from the configured Google Workspace SAML IdP. */
export async function verifyGoogleWorkspaceIdToken(token: string): Promise<CognitoStaffIdentity> {
  try {
    const env = getEnv();
    const issuer = cognitoIssuer();
    const { payload } = await jwtVerify(token, jwksForIssuer(issuer), {
      issuer,
      audience: env.APP_COGNITO_CLIENT_ID,
    });
    if (payload.token_use !== "id" || !hasGoogleWorkspaceIdentity(payload)) {
      throw new UnauthorizedError("Google Workspace sign-in required");
    }

    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    if (!email.endsWith("@valere.io")) {
      throw new ForbiddenError("Google sign-in is limited to @valere.io accounts");
    }
    if (typeof payload.sub !== "string" || !payload.sub) {
      throw new UnauthorizedError("Cognito subject is missing");
    }

    const name =
      (typeof payload.name === "string" && payload.name.trim()) ||
      (typeof payload.given_name === "string" && payload.given_name.trim()) ||
      email;
    return { sub: payload.sub, email, name };
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof UnauthorizedError) {
      throw error;
    }
    console.error("Cognito ID token verification failed", error);
    throw new UnauthorizedError("Invalid or expired Cognito session");
  }
}
