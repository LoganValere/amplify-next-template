import {
  CreateSecretCommand,
  DeleteSecretCommand,
  GetSecretValueCommand,
  PutSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { randomUUID } from "node:crypto";
import { AppError } from "@/lib/errors";

export const MONDAY_SECRET_PREFIX = "valere-portal/monday-";
const DEFAULT_REGION = "us-east-1";

type SecretCommand = {
  constructor: { name: string };
  input: unknown;
};

type SecretResult = { ARN?: unknown; SecretString?: unknown };

export type SecretTransport = {
  send(command: SecretCommand): Promise<SecretResult>;
};

export type SecretEnvironment = {
  nodeEnv?: string;
  fallbackToken?: string;
};

export class MondaySecretError extends AppError {
  constructor(operation: string) {
    super(`Unable to ${operation} Monday credentials`, 502, "MONDAY_SECRET_ERROR");
  }
}

export function createMondaySecretService(
  transport: SecretTransport,
  environment: SecretEnvironment = {
    nodeEnv: process.env.NODE_ENV,
    fallbackToken: process.env.APP_MONDAY_API_TOKEN,
  },
  createId: () => string = randomUUID,
) {
  return {
    async save(token: string, secretArn?: string | null): Promise<string> {
      try {
        if (secretArn) {
          const result = await transport.send(
            new PutSecretValueCommand({ SecretId: secretArn, SecretString: token }) as SecretCommand,
          );
          return String(result.ARN ?? secretArn);
        }
        const result = await transport.send(
          new CreateSecretCommand({
            Name: `${MONDAY_SECRET_PREFIX}${createId()}`,
            Description: "Monday API token for the Valere portal",
            SecretString: token,
          }) as SecretCommand,
        );
        if (typeof result.ARN !== "string" || !result.ARN.startsWith("arn:")) {
          throw new MondaySecretError("store");
        }
        return result.ARN;
      } catch {
        throw new MondaySecretError("store");
      }
    },

    async get(secretArn?: string | null): Promise<string | null> {
      if (!secretArn) {
        return environment.nodeEnv !== "production" && environment.fallbackToken
          ? environment.fallbackToken
          : null;
      }
      try {
        const result = await transport.send(
          new GetSecretValueCommand({ SecretId: secretArn }) as SecretCommand,
        );
        return typeof result.SecretString === "string" ? result.SecretString : null;
      } catch {
        throw new MondaySecretError("read");
      }
    },

    async delete(secretArn?: string | null): Promise<void> {
      if (!secretArn) {
        return;
      }
      try {
        await transport.send(
          new DeleteSecretCommand({
            SecretId: secretArn,
            ForceDeleteWithoutRecovery: true,
          }) as SecretCommand,
        );
      } catch (error) {
        if (!isResourceNotFound(error)) {
          throw new MondaySecretError("delete");
        }
      }
    },
  };
}

function isResourceNotFound(error: unknown): boolean {
  return error instanceof Error && error.name === "ResourceNotFoundException";
}

const sdkClient = new SecretsManagerClient({ region: process.env.AWS_REGION ?? DEFAULT_REGION });
const transport: SecretTransport = {
  send: (command) => sdkClient.send(command as never) as unknown as Promise<SecretResult>,
};

export const mondaySecrets = createMondaySecretService(transport);
