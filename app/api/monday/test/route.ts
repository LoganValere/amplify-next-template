import { requireAdmin } from "@/lib/authz";
import { createMondayTestHandler } from "@/lib/monday/route-handlers";
import { testMondayIntegration } from "@/lib/monday/settings";

export const POST = createMondayTestHandler({
  authorize: requireAdmin,
  testConnection: testMondayIntegration,
});
