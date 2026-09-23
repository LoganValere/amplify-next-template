# Amplify Hosting (account 735948691025)

Local AWS CLI currently needs credentials (`aws login` or an IAM profile) before sandbox/hosting can run.

```bash
export AWS_REGION=us-east-1
aws sts get-caller-identity   # must show 735948691025

# Secrets for Gen 2
echo "$GOOGLE_CLIENT_ID" | npx ampx sandbox secret set GOOGLE_CLIENT_ID
echo "$GOOGLE_CLIENT_SECRET" | npx ampx sandbox secret set GOOGLE_CLIENT_SECRET
echo "$APP_CRON_SECRET" | npx ampx sandbox secret set APP_CRON_SECRET

npx ampx sandbox --once

# Hosting app (GitHub repo Valerelabs/TimeTracker2.0)
REPO="github.com/Valerelabs/TimeTracker2.0"
APP_ID=$(aws amplify create-app --name valere-portal --repository "$REPO" --access-token "$(gh auth token)" --query 'app.appId' --output text)
ROLE_NAME="AmplifyBackendRole-${APP_ID}"
aws iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"amplify.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
aws iam attach-role-policy --role-name "$ROLE_NAME" --policy-arn arn:aws:iam::aws:policy/service-role/AmplifyBackendDeployFullAccess
ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)
aws amplify update-app --app-id "$APP_ID" --iam-service-role-arn "$ROLE_ARN"
```

Set Hosting environment variables: `DATABASE_URL` (Aurora), `APP_SESSION_SECRET`,
`APP_CRON_SECRET`, `APP_ADMIN_EMAILS`, and `APP_BASE_URL`. Before building, remove
any legacy `APP_MONDAY_API_TOKEN` and `APP_MONDAY_ACCOUNTS_BOARD_ID` Hosting
variables. Monday credentials and board selection are managed by the integration UI.

## SSR compute role

`amplify/backend.ts` defines one SSR compute role. Secrets Manager access remains
limited to `arn:aws:secretsmanager:us-east-1:735948691025:secret:valere-portal/monday-*`,
and Bedrock access is limited to `bedrock:InvokeModel` on
`arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-micro-v1:0`. These are the
only server-rendered AWS SDK clients that use the default credential chain. The
deployment output `custom.ssrComputeRoleArn` contains the role ARN.

After the backend stack is deployed, copy that output ARN into the Amplify
Hosting app's SSR compute role setting during Task 6 rollout:

```bash
SSR_COMPUTE_ROLE_ARN="<custom.ssrComputeRoleArn output>"
aws amplify update-app \
  --app-id d1d1298kq4ckyb \
  --compute-role-arn "$SSR_COMPUTE_ROLE_ARN"
```

Do not run this command until rollout. The role trust uses
`aws:SourceAccount=735948691025` and `ArnLike aws:SourceArn`
`arn:aws:amplify:us-east-1:735948691025:apps/d1d1298kq4ckyb/branches/*`.
This repository intentionally does not attach it automatically.
