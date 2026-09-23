# Architecture

Valere Portal is a single Next.js app on Amplify Hosting.

- **Accounts** come from Monday board `4476095209`. Time is logged to the account, not to Monday subitems or regional project boards.
- **Hour categories** are independent buckets. A resource’s default category is stamped on each time entry.
- **Prepaid grants** and **monthly retainers** are scoped to account + category.
- **Client contacts** are invited by admins (email + temporary password).
- **Drive folders** attach SOWs for RAG. They do not create extra hour pools.
- Domain logic lives in `lib/`. HTTP lives in `app/api`. Amplify Lambdas only invoke `/api/internal/cron` with `APP_CRON_SECRET`.

## Auth

HttpOnly JWT cookie (`valere_session`). Cognito/Google is configured in `amplify/auth`. Pre-signup rejects Google users who are not `@valere.io`. Local development may set `APP_DEV_AUTH=true` for password login of staff.
