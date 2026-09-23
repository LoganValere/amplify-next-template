import assert from "node:assert/strict";
import test from "node:test";
import { SETTINGS_ROUTES, isSettingsRouteActive } from "./config";

test("settings navigation contains each destination", () => {
  assert.deepEqual(
    SETTINGS_ROUTES.map((route) => route.href),
    ["/admin/integrations", "/admin/people", "/admin/categories", "/admin/budgets", "/admin/imports"],
  );
});

test("settings route matching avoids sibling prefixes", () => {
  assert.equal(isSettingsRouteActive("/admin/integrations", "/admin/integrations"), true);
  assert.equal(isSettingsRouteActive("/admin/integrations/detail", "/admin/integrations"), true);
  assert.equal(isSettingsRouteActive("/admin/integrations-old", "/admin/integrations"), false);
});
