# Valere Portal

Time tracking and client portal for Valere. Staff log hours to Monday-synced **accounts**. Clients see timesheets, burndown, and a grounded SOW chatbot.

## Stack

- Next.js 14 App Router, Tailwind, Prisma
- Local database: SQLite
- Production: Aurora PostgreSQL via `DATABASE_URL` on Amplify Hosting (AWS account `735948691025`)
- Auth: Cognito (Amplify Gen 2) with Google Workspace SAML for `@valere.io`, email/password for invited clients
- Cron: Amplify functions call `/api/internal/cron` (Monday sync, retainers, Drive ingest)

## Local setup

```bash
cp .env.example .env
# set APP_DEV_AUTH=true so @valere.io password login works without Cognito
npm install
npx prisma db push
npm run db:seed
npm run test
npm run dev
```

Seed users (change these passwords immediately):

- Admin: `logan@valere.io` / `ChangeMe-Admin-1`
- Staff: `staff@valere.io` / `ChangeMe-Staff-1`
- Client: `client@acme.example` / `ChangeMe-Client-1`

Open http://localhost:3000

## Amplify

1. Configure AWS CLI for account `735948691025`.
2. Set the Amplify secrets required by `amplify/auth/resource.ts` and `APP_CRON_SECRET`.
3. `npx ampx sandbox --once` provisions the `GoogleWorkspace` SAML IdP from `amplify/auth/google-workspace-metadata.ts`.
4. Connect `Valerelabs/TimeTracker2.0` in Amplify Hosting. Set `DATABASE_URL`, `APP_SESSION_SECRET`, `APP_CRON_SECRET`, `APP_ADMIN_EMAILS`, `APP_MONDAY_API_TOKEN`, and the `APP_COGNITO_*` variables.
5. Keep the Google Workspace SAML app enabled for the intended Valere organizational units.

See [docs/architecture.md](docs/architecture.md), [docs/monday-mapping.md](docs/monday-mapping.md), [docs/chatbot-prompt.md](docs/chatbot-prompt.md), and [docs/amplify-deploy.md](docs/amplify-deploy.md).
