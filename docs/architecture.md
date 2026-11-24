# TecVerde architecture

TecVerde uses Next.js App Router, Bun, and Turso. Public visitors submit campus reports and adoption requests anonymously. Staff use invite-only accounts assigned to administration, maintenance, or moderation.

Routes under `src/app` render pages and call feature data-access functions. Domain validation, state transitions, mutations, and authorization belong in `src/features`. Database, auth, storage, security, and notifications belong in `src/server`. UI and email copy belongs in `src/messages/es-MX`.

Reports can be read by authorized staff, by the reporter's original device, or through a secret tracking link. Report photos use private object storage. Adoption posts become public after email verification and staff approval.

## Short links

Posters and QR codes use short paths on the production domain, such as `tecverde.lat/wc`. The proxy redirects them with a temporary `307`, matching case-insensitively and keeping the query string, so `/wc?building=library` also preselects the building.

| Path      | Opens                                                                         |
| --------- | ----------------------------------------------------------------------------- |
| `/wc`     | Report form with the restroom categories (`restroom-*`), visitor chooses one. |
| `/basura` | Report form with `full-bins` preselected.                                     |
| `/agua`   | Report form with `water-leak` preselected and `restroom-water` offered.       |
| `/aire`   | Report form with `air-conditioning` preselected.                              |
| `/adopta` | Adoption gallery.                                                             |

`src/lib/short-links.ts` holds the paths and `src/features/reports/topics.ts` maps each topic to category slugs. Topics match the active catalog by slug, so renaming a category keeps its link working, while changing or deactivating its slug makes the link fall back to the full category list. The admin catalog page lists the slugs each link depends on. A migration adds the `air-conditioning` category to catalogs that already have categories.

## Operations

- [Deployment](deployment.md): environments, variables, schedules and CI.
- [Runbook](runbook.md): smoke test, rollback, restore and abuse response.
- [Media storage](r2.md): R2 buckets, keys and CORS.

## Decisions

- [ADR 0001 — Turso and Drizzle](adr/0001-turso-drizzle-rc.md)
- [ADR 0002 — Bun on Vercel](adr/0002-bun-runtime-fallback.md)
- [ADR 0003 — Anonymous public access and invite-only staff](adr/0003-anonymous-identity.md)
- [ADR 0004 — Deliberate deviations from the implementation plan](adr/0004-plan-deviations.md)
