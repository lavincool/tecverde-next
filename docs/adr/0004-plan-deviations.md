# ADR 0004 — Deliberate deviations from the implementation plan

The implementation plan listed specific tools and shapes for several features. These were changed during implementation for the reasons below.

## Hand-written service worker instead of Serwist

`public/sw.js` is a plain script, as in the Next.js PWA guide. It caches only the offline page, hashed static assets and optimized images, never navigations, `/dashboard`, `/api`, capability links or `POST` requests, and it handles push notifications. The logic is small enough that a build plugin would add more configuration than it removes, and it avoids a Turbopack integration in the build. Serwist can replace it later without changing the caching rules.

## React Email without the preview CLI

Templates use `@react-email/components` for rendering. The `react-email` preview CLI is not installed because the templates are covered by unit tests that render HTML and plain text. Under `bun --bun next dev`, a dev server started before the email dependencies were installed cannot resolve the optional `prettier` import of the renderer until it restarts; production builds are unaffected.

## Tracking links carry the token in the path

The tracking route is `/reports/track/<token>` rather than `/reports/track/<code>?t=<token>`. The report number is shown on the page, and keeping the secret in the path avoids query-string logging by analytics. The pages are `noindex` and send `no-referrer`.

## Single-page report form

The report form is one page with progressive sections (category, building, similar reports, photos, description, contact) instead of a multi-step sheet. It meets the same flow, keeps native form validation and works before hydration for the text fields.

## Open Graph images without the cover photo

Per-pet Open Graph images show the name, species and the cover's dominant color. Photos are stored as WebP, which the Open Graph renderer does not decode reliably, so embedding them would need a server-side conversion step.

## Email confirmation needs a click

`/verify/<token>` shows a button instead of confirming on page load, because corporate mail scanners prefetch links and would otherwise confirm addresses on behalf of their owners.
