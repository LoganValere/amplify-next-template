import { requireAdmin } from "@/lib/authz";
import { createMondaySyncHandler } from "@/lib/monday/route-handlers";
import { syncMondayAccounts } from "@/lib/monday/sync";

export const POST = createMondaySyncHandler({
  authorize: requireAdmin,
  sync: syncMondayAccounts,
});
