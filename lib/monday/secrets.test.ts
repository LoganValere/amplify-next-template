import assert from "node:assert/strict";
import test from "node:test";
import {
  createMondaySecretService,
  MondaySecretError,
  type SecretTransport,
} from "./secrets";

test("creates, updates, reads, and deletes a secret through the injected transport", async () => {
  const commandNames: string[] = [];
  const inputs: unknown[] = [];
  const transport: SecretTransport = {
    async send(command) {
      commandNames.push(command.constructor.name);
      inputs.push(command.input);
      if (command.constructor.name === "GetSecretValueCommand") {
        return { SecretString: "saved-token" };
      }
      return { ARN: "arn:aws:secretsmanager:us-east-1:123:secret:valere-portal/monday-test" };
    },
  };
  const service = createMondaySecretService(
    transport,
    { nodeEnv: "production" },
    () => "connection-one",
  );
  const arn = await service.save("new-token");
  await service.save("replacement-token", arn);
  assert.equal(await service.get(arn), "saved-token");
  await service.delete(arn);
  assert.deepEqual(commandNames, [
    "CreateSecretCommand",
    "PutSecretValueCommand",
    "GetSecretValueCommand",
    "DeleteSecretCommand",
  ]);
  assert.equal(
    (inputs[0] as { Name: string }).Name,
    "valere-portal/monday-connection-one",
  );
  assert.equal((inputs[3] as { ForceDeleteWithoutRecovery: boolean }).ForceDeleteWithoutRecovery, true);
});

test("uses local fallback only without a saved reference outside production", async () => {
  const unused: SecretTransport = {
    async send() {
      throw new Error("transport should not be called");
    },
  };
  const local = createMondaySecretService(unused, {
    nodeEnv: "development",
    fallbackToken: "local-token",
  });
  const production = createMondaySecretService(unused, {
    nodeEnv: "production",
    fallbackToken: "must-not-use",
  });
  assert.equal(await local.get(null), "local-token");
  assert.equal(await production.get(null), null);
});

test("redacts provider errors and token values", async () => {
  const token = "top-secret-token";
  const failing: SecretTransport = {
    async send() {
      throw new Error(`AWS failure containing ${token}`);
    },
  };
  const service = createMondaySecretService(failing);
  await assert.rejects(service.save(token), (error: unknown) => {
    assert.ok(error instanceof MondaySecretError);
    assert.doesNotMatch(error.message, new RegExp(token));
    assert.equal(error.code, "MONDAY_SECRET_ERROR");
    return true;
  });
});

test("disconnect permits an immediate reconnect with a new secret name", async () => {
  const names: string[] = [];
  const transport: SecretTransport = {
    async send(command) {
      if (command.constructor.name === "CreateSecretCommand") {
        const name = (command.input as { Name: string }).Name;
        names.push(name);
        return { ARN: `arn:aws:secretsmanager:us-east-1:123:secret:${name}` };
      }
      return {};
    },
  };
  const ids = ["first", "second"];
  const service = createMondaySecretService(transport, {}, () => ids.shift()!);
  const firstArn = await service.save("first-token");
  await service.delete(firstArn);
  await service.save("second-token");
  assert.deepEqual(names, ["valere-portal/monday-first", "valere-portal/monday-second"]);
});

test("rejects CreateSecret responses without an ARN and ignores missing delete ARN", async () => {
  let calls = 0;
  const transport: SecretTransport = {
    async send() {
      calls += 1;
      return {};
    },
  };
  const service = createMondaySecretService(transport, {}, () => "missing-arn");
  await assert.rejects(service.save("token"), MondaySecretError);
  await service.delete(null);
  assert.equal(calls, 1);
});
