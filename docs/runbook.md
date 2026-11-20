# Runbook

## Production smoke test

Run this after every production deployment that changes a user flow.

1. Open `/` on a phone. The theme follows the system and the bottom navigation is visible.
2. Send a report with a photo from `/reports/new?building=<slug>`. The success screen shows the report number and the tracking link.
3. Open `/reports/mine` on the same phone and the tracking link in a private window. Both show the report.
4. Sign in as maintenance staff, find the report in `/dashboard/reports`, move it to _En proceso_, then resolve it with a note and an after photo. The tracking link shows the resolution.
5. Post an animal from `/adopt/new`, confirm the email, approve it in `/dashboard/adoption`, then send an adoption request and confirm it. The management link lists the request.
6. Check the Vercel function logs for errors during the test.

## Rollback

1. In Vercel → Deployments, open the last good production deployment and choose **Instant Rollback**. Traffic switches without a rebuild.
2. Migrations are not rolled back automatically. Because migrations are expand and contract, the previous deployment keeps working against the newer schema. If a migration itself is faulty, restore the database (below) before rolling forward with a fix.
3. Open an issue describing the cause, and revert the offending commits on `main` through a pull request.

## Database restore

Turso keeps point-in-time history for the production database.

1. Create a branch database from a timestamp before the incident with `turso db create tecverde-restore --from-db tecverde-prod --timestamp <RFC3339>`.
2. Verify the data in the branch with `turso db shell tecverde-restore`.
3. Point a preview deployment at the branch to test, then swap `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in production and redeploy.

Practice this drill before launch and record the date here.

## Abuse response

1. Set `PUBLIC_SUBMISSIONS_ENABLED=false` in production and redeploy. Reports, confirmations, pet posts and adoption requests return a Spanish "paused" message; browsing and staff tools keep working.
2. Review recent rows by `ip_hash` and `device_hash`, and soft-delete spam from the dashboard.
3. Tighten the rate-limit constants in `src/features/*/actions.ts` if needed, or enable Vercel Attack Challenge Mode.
4. Re-enable submissions.

## Staff access

- Invite staff from `/dashboard/staff`. Links expire after 72 hours.
- Suspend a compromised account from the same page; its sessions stop working on the next request.
- Admins must keep TOTP enabled. If an admin loses their authenticator and backup codes, another admin suspends the account and sends a new invite.

## QR codes for buildings

Each building has a slug in the catalog. Print a QR code per building that links to `https://<domain>/reports/new?building=<slug>`; the form preselects the building. Regenerate the codes whenever a slug changes.

## Accessibility checks

Automated axe scans run in the e2e suite. Before launch and after major UI changes, also do:

- a keyboard-only pass through report creation, the adoption request and the staff inbox;
- a VoiceOver pass on iOS Safari and a TalkBack pass on Android Chrome;
- a contrast check of both themes.

Record the date and findings here.
