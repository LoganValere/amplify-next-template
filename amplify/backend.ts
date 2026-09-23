import { defineBackend } from "@aws-amplify/backend";
import { CfnUserPoolIdentityProvider } from "aws-cdk-lib/aws-cognito";
import { auth } from "./auth/resource";
import { googleWorkspaceSamlMetadata } from "./auth/google-workspace-metadata";
import { createSsrComputeRole } from "./ssr-compute-role";
import { storage } from "./storage/resource";
import { mondaySync } from "./functions/monday-sync/resource";
import { retainerReplenish } from "./functions/retainer-replenish/resource";
import { driveIngest } from "./functions/drive-ingest/resource";

/**
 * Prisma/Aurora: provision Aurora Serverless v2 in this account (735948691025)
 * and point DATABASE_URL at it in Amplify Hosting env vars.
 * Local development uses SQLite via prisma/schema.prisma.
 */
const backend = defineBackend({
  auth,
  storage,
  mondaySync,
  retainerReplenish,
  driveIngest,
});

const googleWorkspace = new CfnUserPoolIdentityProvider(
  backend.auth.resources.userPool,
  "GoogleWorkspaceSamlIdentityProvider",
  {
    userPoolId: backend.auth.resources.userPool.userPoolId,
    providerName: "GoogleWorkspace",
    providerType: "SAML",
    providerDetails: {
      MetadataFile: googleWorkspaceSamlMetadata,
      IDPInit: "false",
      IDPSignout: "false",
    },
    attributeMapping: {
      email: "email",
      name: "name",
    },
    idpIdentifiers: ["GoogleWorkspace"],
  },
);

const { cfnUserPoolClient } = backend.auth.resources.cfnResources;
cfnUserPoolClient.supportedIdentityProviders = ["GoogleWorkspace"];
cfnUserPoolClient.addDependency(googleWorkspace);

const hostingStack = backend.createStack("hosting-compute");
const ssrComputeRole = createSsrComputeRole(hostingStack);

backend.addOutput({
  custom: {
    ssrComputeRoleArn: ssrComputeRole.roleArn,
  },
});
