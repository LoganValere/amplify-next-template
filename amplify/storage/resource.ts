import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "valerePortalContracts",
  access: (allow) => ({
    "contracts/*": [allow.authenticated.to(["read", "write"])],
  }),
});
