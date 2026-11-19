# ADR 0001 — Turso and Drizzle

Use Turso with the libSQL driver and pin Drizzle ORM and Kit to `1.0.0-rc.5`. Keep queries inside feature data-access modules and review generated SQL in each pull request. Use expand-and-contract schema changes so shared preview and production databases remain compatible with overlapping deployments.

Generate and test migrations against an empty database before applying them on Vercel. Upgrade Drizzle to a stable 1.0 release in its own pull request after verifying Better Auth compatibility and migration behavior.
