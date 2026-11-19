# ADR 0003 — Anonymous public access and invite-only staff

People submit reports and use the adoption feature without an account. The Next.js proxy signs a random 128-bit device ID in an HTTP-only cookie. Feature code will persist a separate HMAC of the device ID for device-scoped access. Tracking and management links will use independent capability tokens, stored only as hashes.

Only maintenance, moderation and administration roles have staff accounts. An admin issues a single-use 72-hour invitation. Invite acceptance creates the user and credential account in the same database transaction that consumes the token and records the audit event. The initial admin receives an invitation through a server-side bootstrap script.

The dashboard checks roles and session validity against the database. Admins can access enrollment settings before activating two-factor authentication. After enrollment, the dashboard requires a session issued through successful two-factor verification. Previously issued password-only sessions do not gain admin access when another session completes enrollment. The public auth handler exposes only the allowed staff sign-in, password and two-factor routes.
