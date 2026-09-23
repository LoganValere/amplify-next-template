import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { storage } from "./storage/resource";
import { mondaySync } from "./functions/monday-sync/resource";
import { retainerReplenish } from "./functions/retainer-replenish/resource";
import { driveIngest } from "./functions/drive-ingest/resource";

/**
 * Prisma/Aurora: provision Aurora Serverless v2 in this account (735948691025)
 * and point DATABASE_URL at it in Amplify Hosting env vars.
 * Local development uses SQLite via prisma/schema.prisma.
 */
defineBackend({
  auth,
  storage,
  mondaySync,
  retainerReplenish,
  driveIngest,
});
