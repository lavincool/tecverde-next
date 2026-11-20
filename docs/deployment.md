# Deployment

TecVerde deploys to Vercel from GitHub. Every pull request gets a preview deployment, and `main` deploys to production. `vercel-build` runs the database migrations before `next build`, so each environment migrates its own Turso database.

## Environments

| Environment | Database           | R2 buckets                                    | Email     | Turnstile                        |
| ----------- | ------------------ | --------------------------------------------- | --------- | -------------------------------- |
| Local       | `turso dev` file   | none, or the dev buckets                      | `console` | none                             |
| Preview     | `tecverde-preview` | `tecverde-dev-public`, `tecverde-dev-private` | `resend`  | Cloudflare test keys             |
| Production  | `tecverde-prod`    | `tecverde-public`, `tecverde-private`         | `resend`  | Production keys, hostname-locked |

Preview deployments share one database, so migrations must follow expand and contract: add new columns and tables first, ship the code that uses them, and only then remove the old ones in a later release.

## Environment variables

Set these in Vercel, scoped to the environment they belong to. `.env.example` documents each one.

| Variable                                                             | Notes                                                                                                                                        |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`                             | From the Turso Marketplace integration.                                                                                                      |
| `BETTER_AUTH_SECRET`, `HASH_SECRET`                                  | Independent random values of at least 32 characters. Rotating `HASH_SECRET` invalidates device cookies, tracking links and management links. |
| `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`                             | The HTTPS origin. Leave empty on previews to use the deployment URL.                                                                         |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN`                               | Upstash Redis for rate limits. Required on Vercel.                                                                                           |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`             | Production fails closed when the secret is missing. Use the always-pass test keys on previews so the e2e suite can run.                      |
| `RESEND_API_KEY`, `EMAIL_FROM`                                       | `EMAIL_FROM` must use the verified Resend domain.                                                                                            |
| `R2_*`, `NEXT_PUBLIC_MEDIA_BASE_URL`                                 | See [r2.md](r2.md).                                                                                                                          |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Generate once with `bunx web-push generate-vapid-keys`. Changing them invalidates every push subscription.                                   |
| `CRON_SECRET`                                                        | Vercel sends it as a bearer token to `/api/schedules/*`.                                                                                     |
| `PUBLIC_SUBMISSIONS_ENABLED`                                         | Set to `false` to pause anonymous submissions.                                                                                               |

## Schedules

`vercel.json` declares three path schedules in `America/Matamoros` time. Each route accepts only `Authorization: Bearer $CRON_SECRET`.

| Schedule        | When              | What                                                                                                                                                                           |
| --------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cleanup-media` | Every 6 hours     | Deletes uploads never attached after 24 hours and media of entities soft-deleted more than 30 days ago.                                                                        |
| `purge`         | Daily at 03:30    | Runs the media cleanup, hard-deletes reports and pets soft-deleted more than 30 days ago, clears contact data 180 days after closure and removes used or expired email tokens. |
| `staff-digest`  | Weekdays at 07:00 | Emails maintenance staff when new reports arrived in the last 24 hours.                                                                                                        |

Vercel Schedules is in beta. If it is unavailable for the account, replace `schedules` with the equivalent `crons` entries and keep the routes unchanged, since they accept `GET` as well as `POST`.

## Continuous integration

- `ci.yml` runs lint, format, typecheck, unit tests and the build on every pull request and checks commit messages for automated attribution. It is the required check for `main`.
- `e2e.yml` runs Playwright on Desktop Chrome, Pixel and iPhone profiles against each successful preview deployment. Add the repository secret `VERCEL_AUTOMATION_BYPASS_SECRET` (Vercel → Project → Deployment Protection → Protection Bypass for Automation) so the suite can reach protected previews. Make it a required check once it is stable.

## First production release

1. Choose the domain, add it to Vercel and connect `media.<domain>` to the public R2 bucket. Update `NEXT_PUBLIC_APP_URL`, `BETTER_AUTH_URL` and `NEXT_PUBLIC_MEDIA_BASE_URL`.
2. Verify the Resend domain (SPF, DKIM and DMARC) and send a test message to a campus Microsoft 365 inbox.
3. Lock the Turnstile production keys to the production hostname.
4. Restrict R2 CORS to the production origin.
5. Deploy `main`, then run `bun run staff:bootstrap <email>` against production and complete TOTP enrollment for the first admin.
6. Replace the placeholder buildings and categories with the catalog approved by the campus.
7. Trigger each schedule once from the Vercel dashboard and check the function logs.
8. Run the smoke test in the [runbook](runbook.md), then tag the release.
