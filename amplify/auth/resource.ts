import { defineAuth, secret } from "@aws-amplify/backend";
import { preSignUp } from "../functions/pre-sign-up/resource";

export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: secret("GOOGLE_CLIENT_ID"),
        clientSecret: secret("GOOGLE_CLIENT_SECRET"),
        scopes: ["email", "profile", "openid"],
        attributeMapping: {
          email: "email",
          fullname: "name",
        },
      },
      callbackUrls: [
        "http://localhost:3000/login",
        "https://localhost:3000/login",
        "https://main.d1d1298kq4ckyb.amplifyapp.com/login",
      ],
      logoutUrls: [
        "http://localhost:3000/login",
        "https://localhost:3000/login",
        "https://main.d1d1298kq4ckyb.amplifyapp.com/login",
      ],
    },
  },
  groups: ["ADMIN", "STAFF", "CLIENT"],
  triggers: {
    preSignUp,
  },
});
