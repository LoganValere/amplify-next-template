import { defineFunction, secret } from "@aws-amplify/backend";

export const driveIngest = defineFunction({
  name: "drive-ingest",
  schedule: "every 6h",
  environment: {
    APP_CRON_SECRET: secret("APP_CRON_SECRET"),
    APP_BASE_URL: process.env.APP_BASE_URL ?? "http://localhost:3000",
  },
});
