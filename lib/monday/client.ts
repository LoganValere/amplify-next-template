import { getEnv } from "@/lib/env";

const ACCOUNTS_QUERY = `
  query ($boardId: [ID!]!, $cursor: String) {
    boards(ids: $boardId) {
      items_page(limit: 100, cursor: $cursor) {
        cursor
        items {
          id
          name
          column_values {
            id
            text
            value
          }
        }
      }
    }
  }
`;

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

function columnText(columns: Array<{ id: string; text: string | null }>, id: string): string {
  return columns.find((column) => column.id === id)?.text?.trim() ?? "";
}

export async function fetchMondayAccounts(): Promise<MondayAccountItem[]> {
  const env = getEnv();
  if (!env.APP_MONDAY_API_TOKEN) {
    throw new Error("APP_MONDAY_API_TOKEN is not set");
  }
  const items: MondayAccountItem[] = [];
  let cursor: string | null = null;
  do {
    const response = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: env.APP_MONDAY_API_TOKEN,
      },
      body: JSON.stringify({
        query: ACCOUNTS_QUERY,
        variables: { boardId: [env.APP_MONDAY_ACCOUNTS_BOARD_ID], cursor },
      }),
    });
    if (!response.ok) {
      throw new Error(`Monday API failed: ${response.status}`);
    }
    const payload = (await response.json()) as {
      data?: {
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
      errors?: Array<{ message: string }>;
    };
    if (payload.errors?.length) {
      throw new Error(payload.errors[0].message);
    }
    const page = payload.data?.boards[0]?.items_page;
    if (!page) {
      break;
    }
    for (const item of page.items) {
      const status = columnText(item.column_values, "status0") || "Active";
      const dead = status === "Dead" || status === "Completed";
      items.push({
        id: item.id,
        name: item.name,
        clientLabel: columnText(item.column_values, "text"),
        status,
        office: columnText(item.column_values, "status2"),
        projectManager: columnText(item.column_values, "dropdown4"),
        accountManager: columnText(item.column_values, "people"),
        projectedEnd: columnText(item.column_values, "date_mknb6xq3") || null,
      });
      void dead;
    }
    cursor = page.cursor;
  } while (cursor);
  return items;
}
