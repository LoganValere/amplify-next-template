import { Effect, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import type { Construct } from "constructs";

const ACCOUNT_ID = "735948691025";
const AMPLIFY_APP_ID = "d1d1298kq4ckyb";
const REGION = "us-east-1";
export const MONDAY_SECRET_ARN =
  `arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:valere-portal/monday-*`;
export const BEDROCK_MODEL_ARN =
  `arn:aws:bedrock:${REGION}::foundation-model/amazon.nova-micro-v1:0`;
export const AMPLIFY_BRANCH_SOURCE_ARN =
  `arn:aws:amplify:${REGION}:${ACCOUNT_ID}:apps/${AMPLIFY_APP_ID}/branches/*`;

export function createSsrComputeRole(scope: Construct): Role {
  const role = new Role(scope, "SsrComputeRole", {
    assumedBy: new ServicePrincipal("amplify.amazonaws.com", {
      conditions: {
        StringEquals: {
          "aws:SourceAccount": ACCOUNT_ID,
        },
        ArnLike: {
          "aws:SourceArn": AMPLIFY_BRANCH_SOURCE_ARN,
        },
      },
    }),
    description: "Amplify SSR compute access for portal AWS services",
  });
  role.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        "secretsmanager:GetSecretValue",
        "secretsmanager:PutSecretValue",
        "secretsmanager:DeleteSecret",
      ],
      resources: [MONDAY_SECRET_ARN],
    }),
  );
  role.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["secretsmanager:CreateSecret"],
      resources: ["*"],
      conditions: {
        StringLike: { "secretsmanager:Name": "valere-portal/monday-*" },
      },
    }),
  );
  role.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["bedrock:InvokeModel"],
      resources: [BEDROCK_MODEL_ARN],
    }),
  );
  return role;
}
