# TecVerde

TecVerde provides campus issue reporting and animal adoption for Tec campus Matamoros. The public uses both features anonymously. Staff accounts are limited to administration, maintenance and moderation.

- Write code, technical routes, filenames and Conventional Commits in English. Write all UI, validation and email copy in Mexican Spanish and use the typed dictionaries under `src/messages/es-MX`.
- Use short-lived branches and PRs. Rebase-merge atomic commits into `main` after CI passes. Leave automated attribution out of commits and PR descriptions. Keep Lefthook enabled.
- Use Bun 1.4.4 and exact dependency versions. Commit `bun.lock` with dependency changes.
- Keep routes thin under `src/app`. Put domain logic in `src/features` and infrastructure in `src/server`. Use `server-only` for infrastructure imported by the app and enforce authorization inside feature data-access functions.
- Run `bun install --frozen-lockfile`, copy `.env.example` to `.env.local`, then run `bun run dev`.
- Before opening a PR, run `bun run lint`, `bun run format:check`, `bun run typecheck`, `bun run test` and `bun run build`.
- Read `docs/architecture.md` and the version-matched Next.js docs before extending the app.
