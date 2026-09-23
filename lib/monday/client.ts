import { AppError } from "@/lib/errors";
import {
  ACCOUNT_COLUMN_MAPPING,
  MondayApiError,
  type MondayAccountItem,
  type MondayBoard,
  type MondayBoardColumn,
  type MondayBoardInspection,
  MondayInvalidTokenError,
  MondayNotFoundError,
  MondayPaginationError,
  MondayRateLimitError,
  MondayTimeoutError,
  type MondayIdentity,
  validateRequiredColumns,
} from "./client-types";

export * from "./client-types";

const MONDAY_API_URL = "https://api.monday.com/v2";
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_MAX_PAGES = 50;
const MAX_RETRY_DELAY_MS = 30_000;

type Fetcher = typeof fetch;
type Sleeper = (milliseconds: number) => Promise<void>;
type GraphQlError = { message?: string; extensions?: { code?: string } };
type GraphQlPayload<T> = { data?: T; errors?: GraphQlError[] };

export function createMondayClient(
  token: string,
  options: {
    fetcher?: Fetcher;
    timeoutMs?: number;
    maxRetries?: number;
    maxPages?: number;
    sleep?: Sleeper;
  } = {},
) {
  const request = createRequester(token, options);
  const maxPages = Math.min(Math.max(options.maxPages ?? DEFAULT_MAX_PAGES, 1), DEFAULT_MAX_PAGES);
  return {
    validateToken: async (): Promise<MondayIdentity> => {
      const data = await request<{ me: MondayIdentity }>(
        "query { me { id name email account { id name } } }",
      );
      if (!data.me) {
        throw new MondayInvalidTokenError();
      }
      return data.me;
    },

    listBoards: async (hooks: { onPage?: () => Promise<void> } = {}): Promise<MondayBoard[]> => {
      const boards: MondayBoard[] = [];
      for (let page = 1; page <= maxPages; page += 1) {
        const data = await request<{ boards: MondayBoard[] }>(
          "query ($page: Int!) { boards(limit: 100, page: $page) { id name state } }",
          { page },
        );
        boards.push(...data.boards);
        await hooks.onPage?.();
        if (data.boards.length < 100) {
          return boards;
        }
      }
      throw new MondayPaginationError();
    },

    inspectBoard: async (boardId: string): Promise<MondayBoardInspection> => {
      const data = await request<{
        boards: Array<MondayBoard & { columns: MondayBoardColumn[] }>;
      }>(
        "query ($boardId: [ID!]!) { boards(ids: $boardId) { id name state columns { id title type } } }",
        { boardId: [boardId] },
      );
      const board = data.boards[0];
      if (!board) {
        throw new MondayNotFoundError();
      }
      return {
        board: { id: board.id, name: board.name, state: board.state },
        columns: board.columns,
        missingColumnIds: validateRequiredColumns(board.columns),
      };
    },

    fetchAccounts: (boardId: string, hooks: { onPage?: () => Promise<void> } = {}) =>
      fetchAllAccounts(request, boardId, maxPages, hooks.onPage),
  };
}

function createRequester(
  token: string,
  options: {
    fetcher?: Fetcher;
    timeoutMs?: number;
    maxRetries?: number;
    sleep?: Sleeper;
  },
) {
  const fetcher = options.fetcher ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = Math.min(Math.max(options.maxRetries ?? DEFAULT_MAX_RETRIES, 0), 5);
  const sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  return async <T>(query: string, variables: Record<string, unknown> = {}): Promise<T> => {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await requestOnce<T>(token, query, variables, fetcher, timeoutMs);
      } catch (error) {
        if (!(error instanceof MondayApiError) || !error.retryable || attempt >= maxRetries) {
          throw error;
        }
        await sleep(Math.min(error.retryAfterMs ?? 250 * 2 ** attempt, MAX_RETRY_DELAY_MS));
      }
    }
  };
}

async function requestOnce<T>(
  token: string,
  query: string,
  variables: Record<string, unknown>,
  fetcher: Fetcher,
  timeoutMs: number,
): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetcher(MONDAY_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw httpError(response.status, response.headers.get("retry-after"));
      }
      const payload = (await response.json()) as GraphQlPayload<T>;
      if (payload.errors?.length) {
        throw graphQlError(payload.errors);
      }
      if (!payload.data) {
        throw new MondayApiError("Monday returned an invalid response", 502, "MONDAY_BAD_RESPONSE");
      }
      return payload.data;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new MondayTimeoutError();
      }
      throw new MondayApiError("Unable to contact Monday", 502, "MONDAY_UNAVAILABLE", true);
    } finally {
      clearTimeout(timeout);
    }
}

function httpError(status: number, retryAfter: string | null): MondayApiError {
  if (status === 401 || status === 403) return new MondayInvalidTokenError();
  if (status === 404) return new MondayNotFoundError();
  if (status === 429) return new MondayRateLimitError(parseRetryAfter(retryAfter));
  if ([500, 502, 503, 504].includes(status)) {
    return new MondayApiError("Monday request failed", 502, "MONDAY_HTTP_ERROR", true);
  }
  return new MondayApiError("Monday request failed", 502, "MONDAY_HTTP_ERROR");
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

function graphQlError(errors: GraphQlError[]): MondayApiError {
  const code = errors[0]?.extensions?.code?.toLowerCase() ?? "";
  const message = errors[0]?.message?.toLowerCase() ?? "";
  if (code.includes("auth") || message.includes("authentication")) return new MondayInvalidTokenError();
  if (code.includes("rate") || message.includes("rate limit")) return new MondayRateLimitError();
  if (code.includes("not_found") || message.includes("not found")) return new MondayNotFoundError();
  return new MondayApiError("Monday rejected the request", 502, "MONDAY_GRAPHQL_ERROR");
}

type AccountPageData = {
  boards: Array<{
    items_page: {
      cursor: string | null;
      items: Array<{
        id: string;
        name: string;
        column_values: Array<{ id: string; text: string | null }>;
      }>;
    };
  }>;
};

async function fetchAllAccounts(
  request: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>,
  boardId?: string,
  maxPages = DEFAULT_MAX_PAGES,
  onPage?: () => Promise<void>,
): Promise<MondayAccountItem[]> {
  if (!boardId) {
    throw new MondayNotFoundError();
  }
  const items: MondayAccountItem[] = [];
  let cursor: string | null = null;
  const seenCursors = new Set<string>();
  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
    const data: AccountPageData = await request<AccountPageData>(
      `query ($boardId: [ID!]!, $cursor: String) {
        boards(ids: $boardId) {
          items_page(limit: 100, cursor: $cursor) {
            cursor
            items { id name column_values { id text } }
          }
        }
      }`,
      { boardId: [boardId], cursor },
    );
    const page: AccountPageData["boards"][number]["items_page"] | undefined =
      data.boards[0]?.items_page;
    if (!page) throw new MondayNotFoundError();
    items.push(...page.items.map(mapAccount));
    await onPage?.();
    cursor = page.cursor;
    if (!cursor) return items;
    if (seenCursors.has(cursor)) throw new MondayPaginationError();
    seenCursors.add(cursor);
  }
  throw new MondayPaginationError();
}

function mapAccount(item: {
  id: string;
  name: string;
  column_values: Array<{ id: string; text: string | null }>;
}): MondayAccountItem {
  const text = (id: string) =>
    item.column_values.find((column) => column.id === id)?.text?.trim() ?? "";
  return {
    id: item.id,
    name: item.name,
    clientLabel: text(ACCOUNT_COLUMN_MAPPING.clientLabel),
    status: text(ACCOUNT_COLUMN_MAPPING.status) || "Active",
    office: text(ACCOUNT_COLUMN_MAPPING.office),
    projectManager: text(ACCOUNT_COLUMN_MAPPING.projectManager),
    accountManager: text(ACCOUNT_COLUMN_MAPPING.accountManager),
    projectedEnd: text(ACCOUNT_COLUMN_MAPPING.projectedEnd) || null,
  };
}
