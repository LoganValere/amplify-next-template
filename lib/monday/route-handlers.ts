import { NextResponse } from "next/server";
import type { requireAdmin, requireStaff } from "@/lib/authz";
import { jsonError } from "@/lib/http";
import type { readMondaySettingsInput } from "@/lib/monday/requests";
import type {
  changeMondayBoard,
  configureMondayIntegration,
  disconnectMondayIntegration,
  getSafeMondaySettings,
  testMondayIntegration,
} from "@/lib/monday/settings";
import type { syncMondayAccounts } from "@/lib/monday/sync";

type SettingsRouteDeps = {
  authorize: typeof requireAdmin;
  readInput: typeof readMondaySettingsInput;
  getSettings: typeof getSafeMondaySettings;
  configure: typeof configureMondayIntegration;
  changeBoard: typeof changeMondayBoard;
  disconnect: typeof disconnectMondayIntegration;
};

export function createMondaySettingsHandlers(deps: SettingsRouteDeps) {
  return {
    GET: async () => {
      try {
        await deps.authorize();
        return NextResponse.json(await deps.getSettings(true));
      } catch (error) {
        return jsonError(error);
      }
    },
    PUT: async (request: Request) => {
      try {
        await deps.authorize();
        const input = await deps.readInput(request);
        return NextResponse.json(
          input.token
            ? await deps.configure({ token: input.token, boardId: input.boardId })
            : await deps.changeBoard(input.boardId),
        );
      } catch (error) {
        return jsonError(error);
      }
    },
    DELETE: async () => {
      try {
        await deps.authorize();
        return NextResponse.json(await deps.disconnect());
      } catch (error) {
        return jsonError(error);
      }
    },
  };
}

type StatusRouteDeps = {
  authorize: typeof requireStaff;
  getSettings: typeof getSafeMondaySettings;
};

export function createMondayStatusHandler(deps: StatusRouteDeps) {
  return async function GET() {
    try {
      const user = await deps.authorize();
      return NextResponse.json({
        ...(await deps.getSettings(user.role === "ADMIN")),
        canManage: user.role === "ADMIN",
      });
    } catch (error) {
      return jsonError(error);
    }
  };
}

type TestRouteDeps = {
  authorize: typeof requireAdmin;
  testConnection: typeof testMondayIntegration;
};

export function createMondayTestHandler(deps: TestRouteDeps) {
  return async function POST() {
    try {
      await deps.authorize();
      return NextResponse.json(await deps.testConnection());
    } catch (error) {
      return jsonError(error);
    }
  };
}

type SyncRouteDeps = {
  authorize: typeof requireAdmin;
  sync: typeof syncMondayAccounts;
};

export function createMondaySyncHandler(deps: SyncRouteDeps) {
  return async function POST() {
    try {
      await deps.authorize();
      const result = await deps.sync();
      return NextResponse.json({ ok: true, ...result });
    } catch (error) {
      return jsonError(error);
    }
  };
}
