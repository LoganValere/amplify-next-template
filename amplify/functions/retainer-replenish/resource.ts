import { defineFunction, secret } from "@aws-amplify/backend";

export const retainerReplenish = defineFunction({
  name: "retainer-replenish",
  schedule: "every day",
  environment: {
    APP_CRON_SECRET: secret("APP_CRON_SECRET"),
    APP_BASE_URL: process.env.APP_BASE_URL ?? "http://localhost:3000",
  },
});
