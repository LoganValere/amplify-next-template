import assert from "node:assert/strict";
import test from "node:test";
import { App, Stack } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import {
  AMPLIFY_BRANCH_SOURCE_ARN,
  BEDROCK_MODEL_ARN,
  createSsrComputeRole,
  MONDAY_SECRET_ARN,
} from "../../amplify/ssr-compute-role";

test("SSR compute role trust and AWS access are scoped to the approved app and resources", () => {
  const stack = new Stack(new App(), "MondayRoleTest");
  createSsrComputeRole(stack);
  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::IAM::Role", {
    AssumeRolePolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Principal: { Service: "amplify.amazonaws.com" },
          Condition: {
            StringEquals: {
              "aws:SourceAccount": "735948691025",
            },
            ArnLike: {
              "aws:SourceArn": AMPLIFY_BRANCH_SOURCE_ARN,
            },
          },
        }),
      ]),
    },
  });
  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Action: Match.arrayWith([
            "secretsmanager:GetSecretValue",
            "secretsmanager:PutSecretValue",
            "secretsmanager:DeleteSecret",
          ]),
          Resource: MONDAY_SECRET_ARN,
        }),
        Match.objectLike({
          Action: "secretsmanager:CreateSecret",
          Resource: "*",
          Condition: {
            StringLike: { "secretsmanager:Name": "valere-portal/monday-*" },
          },
        }),
        Match.objectLike({
          Action: "bedrock:InvokeModel",
          Resource: BEDROCK_MODEL_ARN,
        }),
      ]),
    },
  });
  assert.doesNotMatch(JSON.stringify(template.toJSON()), /DescribeSecret/);
  assert.equal(
    BEDROCK_MODEL_ARN,
    "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-micro-v1:0",
  );
  assert.match(AMPLIFY_BRANCH_SOURCE_ARN, /d1d1298kq4ckyb\/branches\/\*$/);
});
