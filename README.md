# Valere Portal

Time tracking and client portal for Valere. Staff log hours to Monday-synced **accounts**. Clients see timesheets, burndown, and a grounded SOW chatbot.

## Stack

- Next.js 14 App Router, Tailwind, Prisma
- Database: Aurora Serverless v2 PostgreSQL cluster `valere-portal` (AWS account `735948691025`)
  - Production uses the `valere_portal` database, local development uses `valere_portal_dev`
  - Amplify Hosting SSR compute cannot join a VPC, so the cluster has a public
    endpoint with TLS enforced (`rds.force_ssl=1`); always connect with `sslmode=require`
- Auth: Cognito (Amplify Gen 2) with Google Workspace SAML for `@valere.io`, email/password for invited clients
- Cron: Amplify functions call `/api/internal/cron` (Monday sync, retainers, Drive ingest)

## Local setup

```bash
cp .env.example .env
# point DATABASE_URL at the valere_portal_dev database (never valere_portal)
# set APP_DEV_AUTH=true so @valere.io password login works without Cognito
npm install
npx prisma migrate deploy
npm run db:seed
npm run test
npm run dev
```

The master credentials are managed by RDS in Secrets Manager:

```bash
aws secretsmanager get-secret-value --region us-east-1 --secret-id \
  "$(aws rds describe-db-clusters --region us-east-1 --db-cluster-identifier valere-portal \
     --query 'DBClusters[0].MasterUserSecret.SecretArn' --output text)"
```

Seed users. These exist only in `valere_portal_dev` and must never be seeded into
production, where staff accounts are created by Google Workspace SSO:

- Admin: `logan@valere.io` / `ChangeMe-Admin-1`
- Staff: `staff@valere.io` / `ChangeMe-Staff-1`
- Client: `client@acme.example` / `ChangeMe-Client-1`

Open http://localhost:3000

## Amplify

1. Configure AWS CLI for account `735948691025`.
2. Set the Amplify secrets required by `amplify/auth/resource.ts` and `APP_CRON_SECRET`.
3. `npx ampx sandbox --once` provisions the `GoogleWorkspace` SAML IdP from `amplify/auth/google-workspace-metadata.ts`.
4. Connect `Valerelabs/TimeTracker2.0` in Amplify Hosting. Set `DATABASE_URL`, `APP_SESSION_SECRET`, `APP_CRON_SECRET`, `APP_ADMIN_EMAILS`, and the `APP_COGNITO_*` variables. `APP_MONDAY_API_TOKEN` is a local-development fallback only and must not be configured in Hosting.
5. Keep the Google Workspace SAML app enabled for the intended Valere organizational units.

See [docs/architecture.md](docs/architecture.md), [docs/monday-mapping.md](docs/monday-mapping.md), [docs/chatbot-prompt.md](docs/chatbot-prompt.md), and [docs/amplify-deploy.md](docs/amplify-deploy.md).
