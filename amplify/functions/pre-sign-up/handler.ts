import type { PreSignUpTriggerHandler } from "aws-lambda";

export const handler: PreSignUpTriggerHandler = async (event) => {
  const email = event.request.userAttributes.email?.toLowerCase() ?? "";
  const isGoogle = event.triggerSource === "PreSignUp_ExternalProvider";
  if (isGoogle && !email.endsWith("@valere.io")) {
    throw new Error("Google sign-in is limited to @valere.io accounts");
  }
  return event;
};
