import { defineFunction, secret } from "@aws-amplify/backend";

export const mondaySync = defineFunction({
  name: "monday-sync",
  schedule: "every 5m",
  environment: {
    APP_CRON_SECRET: secret("APP_CRON_SECRET"),
    APP_BASE_URL: process.env.APP_BASE_URL ?? "http://localhost:3000",
  },
});
