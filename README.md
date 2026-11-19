# TecVerde

Campus reporting and animal adoption for Tec campus Matamoros. The public interface uses Mexican Spanish. See [architecture](docs/architecture.md) for the application boundaries and technical decisions.

## Local setup

1. Install [Bun](https://bun.sh/) 1.4.4.
2. Run `bun install --frozen-lockfile`. This installs the required Git hooks.
3. Copy `.env.example` to `.env.local`.
4. Run `bun run dev` and open [localhost:3000](http://localhost:3000).

Run the verification checks before opening a pull request.

```sh
bun run lint
bun run format:check
bun run typecheck
bun run test
bun run build
```

Run `bun run format` to apply formatting. Use `bun run start` to serve a completed production build locally.

## Local database and staff

1. Run `mkdir -p .data` and start `turso dev --db-file .data/local.db --port 3180`.
2. Set `TURSO_DATABASE_URL` to `http://127.0.0.1:3180` in `.env.local`. Generate separate values for `BETTER_AUTH_SECRET` and `HASH_SECRET` with `openssl rand -hex 32`.
3. Run `bun run db:migrate` and `bun run db:seed`. The catalog seeds contain placeholders until the campus approves the real list.
4. Run `bun run staff:bootstrap person@example.com` and open the one-time URL. Sign in with the new password, then configure TOTP in the staff settings. Save the recovery codes when they appear.

Use `bun run db:generate --name=<name>` to generate a migration and review the SQL before committing it. `bun run db:studio` opens Drizzle Studio. To recreate the local database from its migrations and seed data, stop Turso dev and run `bun run db:reset:local --confirm`.

For hosted environments, configure the Turso endpoint and token, independent auth and hash secrets, and both Upstash Redis credentials in Vercel. The Vercel build runs migrations before compiling. Set the Better Auth URL to the corresponding HTTPS origin, or leave it unset to use the Vercel deployment hostname.
