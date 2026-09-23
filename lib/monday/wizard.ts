export function stableMondayWizardMode(connected: boolean): "view" | "token" {
  return connected ? "view" : "token";
}

export type MondayUiError = {
  title: string;
  message: string;
  missingColumnIds?: string[];
};

export function mondayErrorToCopy(error: {
  code?: string;
  error?: string;
  missingColumnIds?: string[];
  retryAfterMs?: number;
}): MondayUiError {
  switch (error.code) {
    case "MONDAY_OPERATION_IN_PROGRESS":
      return { title: "Monday is busy", message: "Another Monday operation is running. Wait a moment, then try again." };
    case "MONDAY_INVALID_TOKEN":
      return { title: "Token not accepted", message: "Create or copy a current Monday API token, then try again." };
    case "MONDAY_NOT_FOUND":
      return { title: "Board unavailable", message: "The selected board no longer exists or this token cannot access it." };
    case "MONDAY_RATE_LIMITED":
      return {
        title: "Monday rate limit reached",
        message: error.retryAfterMs
          ? `Try again in about ${Math.max(1, Math.ceil(error.retryAfterMs / 1000))} seconds.`
          : "Wait a minute, then try again.",
      };
    case "MONDAY_COLUMNS_INVALID":
      return {
        title: "Required columns are missing",
        message: "Add the required columns to the Accounts board, keeping these column IDs unchanged.",
        missingColumnIds: error.missingColumnIds,
      };
    case "MONDAY_TIMEOUT":
    case "MONDAY_UNAVAILABLE":
    case "MONDAY_HTTP_ERROR":
      return { title: "Monday could not be reached", message: "Check your connection and try again. Your settings were not changed." };
    default:
      return { title: "Monday request failed", message: error.error || "Try again. If this continues, contact an administrator." };
  }
}
