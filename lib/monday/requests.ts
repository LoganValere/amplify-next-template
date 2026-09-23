import { z } from "zod";
import { AppError } from "@/lib/errors";

const settingsSchema = z.object({
  token: z.string().trim().min(1).max(10_000).optional(),
  boardId: z.string().trim().regex(/^\d+$/, "Board ID must be numeric"),
});
const boardsSchema = z.object({
  token: z.string().trim().min(1).max(10_000),
});

export async function readMondaySettingsInput(request: Request) {
  const body = await readJson(request);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError("A numeric boardId is required", 400, "INVALID_REQUEST");
  }
  return parsed.data;
}

export async function readMondayBoardsInput(request: Request) {
  const parsed = boardsSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    throw new AppError("Monday token is required", 400, "INVALID_REQUEST");
  }
  return parsed.data;
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("Request body must be valid JSON", 400, "INVALID_REQUEST");
  }
}
