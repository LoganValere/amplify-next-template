import { AppError } from "@/lib/errors";

export const ACCOUNT_COLUMN_MAPPING = {
  clientLabel: "text",
  status: "status0",
  office: "status2",
  projectManager: "dropdown4",
  accountManager: "people",
  projectedEnd: "date_mknb6xq3",
} as const;

export type MondayIdentity = {
  id: string;
  name: string;
  email: string;
  account: { id: string; name: string };
};

export type MondayBoard = { id: string; name: string; state: string };
export type MondayBoardColumn = { id: string; title: string; type: string };
export type MondayBoardInspection = {
  board: MondayBoard;
  columns: MondayBoardColumn[];
  missingColumnIds: string[];
};

export type MondayAccountItem = {
  id: string;
  name: string;
  clientLabel: string;
  status: string;
  office: string;
  projectManager: string;
  accountManager: string;
  projectedEnd: string | null;
};

export class MondayApiError extends AppError {
  constructor(
    message: string,
    status: number,
    code: string,
    readonly retryable = false,
    readonly retryAfterMs?: number,
  ) {
    super(message, status, code);
  }
}
export class MondayInvalidTokenError extends MondayApiError {
  constructor() {
    super("Monday rejected the API token", 401, "MONDAY_INVALID_TOKEN");
  }
}
export class MondayRateLimitError extends MondayApiError {
  constructor(retryAfterMs?: number) {
    super("Monday rate limit reached; try again later", 429, "MONDAY_RATE_LIMITED", true, retryAfterMs);
  }
}
export class MondayNotFoundError extends MondayApiError {
  constructor() {
    super("Monday board was not found or is not accessible", 404, "MONDAY_NOT_FOUND");
  }
}
export class MondayTimeoutError extends MondayApiError {
  constructor() {
    super("Monday request timed out", 504, "MONDAY_TIMEOUT", true);
  }
}
export class MondayPaginationError extends MondayApiError {
  constructor() {
    super("Monday pagination limit reached", 502, "MONDAY_PAGINATION_LIMIT");
  }
}
export class MondayColumnsError extends MondayApiError {
  readonly missingColumnIds: string[];

  constructor(missingColumnIds: string[]) {
    super(
      `Monday board is missing required columns: ${missingColumnIds.join(", ")}`,
      422,
      "MONDAY_COLUMNS_INVALID",
    );
    this.missingColumnIds = missingColumnIds;
  }
}

export function validateRequiredColumns(columns: MondayBoardColumn[]): string[] {
  const actual = new Set(columns.map((column) => column.id));
  return Object.values(ACCOUNT_COLUMN_MAPPING).filter((id) => !actual.has(id));
}
