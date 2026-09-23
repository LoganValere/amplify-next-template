import assert from "node:assert/strict";
import test from "node:test";
import {
  ACCOUNT_COLUMN_MAPPING,
  createMondayClient,
  MondayInvalidTokenError,
  MondayPaginationError,
  MondayRateLimitError,
  validateRequiredColumns,
} from "./client";

const allColumns = Object.values(ACCOUNT_COLUMN_MAPPING).map((id) => ({
  id,
  title: id,
  type: "text",
}));

test("validates token identity and maps account fields without exposing token", async () => {
  const token = "secret-monday-token";
  const payloads = [
    { data: { me: { id: "1", name: "Admin", email: "a@example.com", account: { id: "2", name: "Valere" } } } },
    {
      data: {
        boards: [{
          items_page: {
            cursor: null,
            items: [{
              id: "10",
              name: "Acme",
              column_values: [
                { id: ACCOUNT_COLUMN_MAPPING.status, text: "Active" },
                { id: ACCOUNT_COLUMN_MAPPING.clientLabel, text: "ACME" },
              ],
            }],
          },
        }],
      },
    },
  ];
  const fetcher: typeof fetch = async () =>
    new Response(JSON.stringify(payloads.shift()), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  const client = createMondayClient(token, { fetcher });

  assert.equal((await client.validateToken()).account.name, "Valere");
  assert.deepEqual(await client.fetchAccounts("99"), [{
    id: "10",
    name: "Acme",
    clientLabel: "ACME",
    status: "Active",
    office: "",
    projectManager: "",
    accountManager: "",
    projectedEnd: null,
  }]);
});

test("maps invalid-token and rate-limit responses to structured errors", async () => {
  const invalid = createMondayClient("never-print-me", {
    fetcher: async () => new Response("denied", { status: 401 }),
  });
  await assert.rejects(invalid.validateToken(), (error: unknown) => {
    assert.ok(error instanceof MondayInvalidTokenError);
    assert.equal(error.code, "MONDAY_INVALID_TOKEN");
    assert.doesNotMatch(error.message, /never-print-me/);
    return true;
  });

  const limited = createMondayClient("also-secret", {
    fetcher: async () => new Response("slow down", { status: 429 }),
    maxRetries: 0,
  });
  await assert.rejects(limited.listBoards(), MondayRateLimitError);
});

test("redacts GraphQL error details that could contain the token", async () => {
  const token = "sensitive-value";
  const client = createMondayClient(token, {
    fetcher: async () =>
      new Response(JSON.stringify({ errors: [{ message: `failure ${token}` }] }), { status: 200 }),
  });
  await assert.rejects(client.validateToken(), (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.doesNotMatch(error.message, new RegExp(token));
    return true;
  });
});

test("reports exactly the missing required Monday columns", () => {
  assert.deepEqual(validateRequiredColumns(allColumns), []);
  assert.deepEqual(
    validateRequiredColumns(
      allColumns.filter((column) => column.id !== ACCOUNT_COLUMN_MAPPING.accountManager),
    ),
    [ACCOUNT_COLUMN_MAPPING.accountManager],
  );
});

test("caps board pagination instead of looping indefinitely", async () => {
  let requests = 0;
  const boards = Array.from({ length: 100 }, (_, index) => ({
    id: String(index),
    name: `Board ${index}`,
    state: "active",
  }));
  const client = createMondayClient("secret", {
    maxPages: 2,
    fetcher: async () => {
      requests += 1;
      return new Response(JSON.stringify({ data: { boards } }), { status: 200 });
    },
  });
  await assert.rejects(client.listBoards(), MondayPaginationError);
  assert.equal(requests, 2);
});

test("retries rate limits using Retry-After without exposing the token", async () => {
  const delays: number[] = [];
  let requests = 0;
  const client = createMondayClient("retry-secret", {
    maxRetries: 1,
    sleep: async (milliseconds) => {
      delays.push(milliseconds);
    },
    fetcher: async () => {
      requests += 1;
      if (requests === 1) {
        return new Response("limited retry-secret", {
          status: 429,
          headers: { "Retry-After": "0" },
        });
      }
      return new Response(JSON.stringify({ data: { boards: [] } }), { status: 200 });
    },
  });
  assert.deepEqual(await client.listBoards(), []);
  assert.deepEqual(delays, [0]);
  assert.equal(requests, 2);
});

test("renews a sync lease after each fetched accounts page", async () => {
  let pages = 0;
  const client = createMondayClient("secret", {
    fetcher: async () => {
      pages += 1;
      return new Response(
        JSON.stringify({
          data: {
            boards: [{
              items_page: {
                cursor: pages === 1 ? "next" : null,
                items: [{ id: String(pages), name: "Item", column_values: [] }],
              },
            }],
          },
        }),
        { status: 200 },
      );
    },
  });
  const renewals: number[] = [];
  await client.fetchAccounts("99", {
    onPage: async () => {
      renewals.push(pages);
    },
  });
  assert.deepEqual(renewals, [1, 2]);
});

test("keeps GraphQL rate-limit failures structured and redacted", async () => {
  const client = createMondayClient("graphql-secret", {
    maxRetries: 0,
    fetcher: async () =>
      new Response(
        JSON.stringify({
          errors: [{ message: "rate limit graphql-secret", extensions: { code: "RATE_LIMIT" } }],
        }),
        { status: 200 },
      ),
  });
  await assert.rejects(client.listBoards(), (error: unknown) => {
    assert.ok(error instanceof MondayRateLimitError);
    assert.doesNotMatch(error.message, /graphql-secret/);
    return true;
  });
});
