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

Set Hosting environment variables: `DATABASE_URL` (Aurora), `APP_SESSION_SECRET`, `APP_CRON_SECRET`, `APP_ADMIN_EMAILS`, `APP_MONDAY_API_TOKEN`, `APP_BASE_URL`.
