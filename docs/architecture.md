# TecVerde architecture

TecVerde uses Next.js App Router, Bun, and Turso. Public visitors submit campus reports and adoption requests anonymously. Staff use invite-only accounts assigned to administration, maintenance, or moderation.

Routes under `src/app` render pages and call feature data-access functions. Domain validation, state transitions, mutations, and authorization belong in `src/features`. Database, auth, storage, security, and notifications belong in `src/server`. UI and email copy belongs in `src/messages/es-MX`.

Reports can be read by authorized staff, by the reporter's original device, or through a secret tracking link. Report photos use private object storage. Adoption posts become public after email verification and staff approval.

## Decisions

- [ADR 0001 — Turso and Drizzle](adr/0001-turso-drizzle-rc.md)
- [ADR 0002 — Bun on Vercel](adr/0002-bun-runtime-fallback.md)
