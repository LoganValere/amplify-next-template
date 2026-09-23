import { requireAdmin } from "@/lib/authz";
import { readMondaySettingsInput } from "@/lib/monday/requests";
import { createMondaySettingsHandlers } from "@/lib/monday/route-handlers";
import {
  changeMondayBoard,
  configureMondayIntegration,
  disconnectMondayIntegration,
  getSafeMondaySettings,
} from "@/lib/monday/settings";

const handlers = createMondaySettingsHandlers({
  authorize: requireAdmin,
  readInput: readMondaySettingsInput,
  getSettings: getSafeMondaySettings,
  configure: configureMondayIntegration,
  changeBoard: changeMondayBoard,
  disconnect: disconnectMondayIntegration,
});

export const { GET, PUT, DELETE } = handlers;
