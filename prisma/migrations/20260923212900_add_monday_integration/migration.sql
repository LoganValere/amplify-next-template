-- CreateTable
CREATE TABLE "MondayIntegration" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "boardId" TEXT,
    "boardName" TEXT,
    "secretArn" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "lastTestedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MondayIntegration_pkey" PRIMARY KEY ("id")
);
