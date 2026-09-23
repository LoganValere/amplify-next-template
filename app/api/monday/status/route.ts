import { requireStaff } from "@/lib/authz";
import { createMondayStatusHandler } from "@/lib/monday/route-handlers";
import { getSafeMondaySettings } from "@/lib/monday/settings";

export const GET = createMondayStatusHandler({
  authorize: requireStaff,
  getSettings: getSafeMondaySettings,
});
