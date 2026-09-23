import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Monday hardening migration safely backfills only historical production clients", async () => {
  const sql = await readFile(
    new URL("../../prisma/migrations/20260923214000_harden_monday_sync/migration.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /SET "mondayBoardId" = '4476095209'/);
  assert.match(sql, /WHERE "mondayBoardId" IS NULL/);
  assert.match(sql, /"mondayItemId" NOT LIKE 'local-%'/);
});
