import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_SESSION_SECRET: z.string().min(16),
  APP_ADMIN_EMAILS: z.string().default(""),
  APP_CRON_SECRET: z.string().min(8),
  APP_MONDAY_API_TOKEN: z.string().optional().default(""),
  APP_MONDAY_ACCOUNTS_BOARD_ID: z.string().default("4476095209"),
  APP_DEV_AUTH: z.string().optional().default("false"),
  APP_BEDROCK_REGION: z.string().default("us-east-1"),
  APP_BEDROCK_MODEL_ID: z.string().default("amazon.nova-micro-v1:0"),
  APP_GOOGLE_CLIENT_ID: z.string().optional().default(""),
  APP_GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  APP_GOOGLE_REFRESH_TOKEN: z.string().optional().default(""),
  APP_BASE_URL: z.string().default("http://localhost:3000"),
  APP_AWS_ACCOUNT_ID: z.string().default("735948691025"),
  APP_COGNITO_REGION: z.string().default("us-east-1"),
  APP_COGNITO_USER_POOL_ID: z.string().default("us-east-1_Ct7xz39IV"),
  APP_COGNITO_CLIENT_ID: z.string().default("58p23lr1o6cbm1lh0erhhcljq9"),
  NODE_ENV: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) {
    return cached;
  }
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${details}`);
  }
  cached = parsed.data;
  return cached;
}

export function adminEmails(): string[] {
  return getEnv()
    .APP_ADMIN_EMAILS.split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isDevAuthEnabled(): boolean {
  return getEnv().APP_DEV_AUTH === "true" && process.env.NODE_ENV !== "production";
}
