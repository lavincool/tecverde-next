# ADR 0002 — Bun on Vercel

Pin the local Bun toolchain to `1.4.4` and set the Vercel runtime to `1.4.x` in `vercel.json`. Vercel manages the runtime patch version. Verify the runtime in a preview and smoke-test the database, storage, Web Push and Open Graph integrations as they land.

If a runtime incompatibility blocks deployment, remove `bunVersion` from `vercel.json`, select Node.js 24 in the Vercel project, and change the dev, build and start scripts to invoke `next` directly. Keep Bun for dependency installation, the lockfile, and tests.
