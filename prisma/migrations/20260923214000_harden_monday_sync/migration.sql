-- AlterTable
ALTER TABLE "Client" ADD COLUMN "mondayBoardId" TEXT;

-- Historical production rows came from the original Accounts board. Local seed
-- rows use a non-Monday "local-" item ID and must remain unassociated.
UPDATE "Client"
SET "mondayBoardId" = '4476095209'
WHERE "mondayBoardId" IS NULL
  AND "mondayItemId" NOT LIKE 'local-%';

-- AlterTable
ALTER TABLE "MondayIntegration"
ADD COLUMN "pendingDeleteSecretArn" TEXT,
ADD COLUMN "leaseToken" TEXT,
ADD COLUMN "leaseExpiresAt" TIMESTAMP(3);
