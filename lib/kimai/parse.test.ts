import assert from "node:assert/strict";
import test from "node:test";
import { parseKimaiCsv } from "./parse";

test("parses Kimai timesheet CSV headers", () => {
  const csv = `Date,From,To,Email,User,Project,Customer,Activity,Description,Duration
2024-01-15,09:00:00,10:30:00,ada@valere.io,ada,Portal,Acme,Development,Build,5400`;
  const rows = parseKimaiCsv(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].customer, "Acme");
  assert.equal(rows[0].durationSeconds, 5400);
  assert.equal(rows[0].email, "ada@valere.io");
});
