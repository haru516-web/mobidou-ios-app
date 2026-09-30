# Mobidou Cloudflare server

This is a local-first Cloudflare Workers + D1 foundation. It is not connected to a Cloudflare account and has not been deployed. No Apple account, certificate, private key, or production token is included.

## Local setup

From `server/`:

1. Use a current Node.js release with `node:sqlite` and type stripping available, then install the declared development dependencies with `npm install`.
2. Apply the schema to a local D1 database with `npm run db:apply`.
3. Start the Worker locally with `npm run dev` (Wrangler's local development mode).
4. Run the server tests with `npm test`; run the isolated TypeScript check with `npm run typecheck`.

The D1 binding uses a local-only placeholder database ID in `wrangler.toml`. Replace it only in a local, uncommitted Cloudflare configuration when a real account is intentionally configured. Do not put account credentials in this repository.

## Configuration names

Optional local `.dev.vars` / deployment settings are read by name only here; this file contains no values:

- `APPLE_ROOT_CERTIFICATES`: PEM-encoded trusted Apple certificate root(s), concatenated when there is more than one.
- `APPLE_BUNDLE_ID`: expected application bundle ID.
- `PRODUCT_CATALOG_JSON`: JSON object keyed by App Store product ID; values may contain `plan`, `monthlyTickets`, and/or `paidPulls`.
- `GIFTS_JSON`: JSON array of `{ id, title, tickets?, freePulls?, paidPulls? }` records.
- `CATALOG_JSON`: static public catalog JSON served from `/catalog.json`.
- `EVENT_STEPS_WINDOW_START` / `EVENT_STEPS_WINDOW_END`: Tokyo-local `HH:mm` submission window; default is 20:00 through (excluding) 20:30.
- `EVENT_STEPS_DAILY_MAX`: maximum accepted cumulative steps per user/day; default is 100000.

Wrangler local values belong in an ignored `.dev.vars` file. Never commit secrets or certificate material. Product and gift examples are intentionally omitted; configure only approved product identifiers and actual campaign records outside this source tree.

## D1 schema and event records

`schema.sql` defines the D1 tables, primary/unique constraints, indexes, and wallet triggers. For local setup, use `npm run db:apply`. An event can be added to local D1 with a prepared SQL insert into `events`; event identifiers and dates are operator-managed data. Event step submissions store the maximum cumulative value for the Tokyo server day, not a delta sent by the client.

## API surface

- `POST /auth/register` creates an anonymous account and returns its user ID plus a one-time random secret. Only the SHA-256 hash is stored. Send later credentials as `Authorization: Bearer <userId>.<secret>`.
- `GET /gifts.json` returns the configured static gift list; `POST /gifts/:id/claim` claims a configured gift once.
- `GET /catalog.json` returns configured catalog JSON.
- `GET /friends`, `POST /friend-requests`, `POST /friend-requests/:id/answer` list, request, and accept/decline friends by friend code.
- `POST /purchases/verify` verifies a StoreKit transaction JWS against configured `x5c` certificate roots, expected bundle ID, configured product IDs, and an `appAccountToken` equal to the authenticated user ID. Transactions without `appAccountToken` are rejected; clients must set the anonymous Mobidou user ID as the StoreKit app account token when purchasing. `POST /apple/notifications` verifies signed notification envelopes and reads `appAccountToken` from the verified `signedTransactionInfo` transaction.
- `POST /tickets/consume` consumes from the ticket ledger, rejecting insufficient balances. Subscription ticket grants are keyed by plan and period.
- `POST /pets/starter { petId }` records the player's first Mobby only while no Mobby is owned.
- `POST /free-pulls/claim { routeId }` grants one free pull once per user and pilgrimage route.
- `POST /gacha/pull { count, kind }` accepts one free draw or one/five paid draws. All configured Mobbies are equally likely; every 25th paid draw guarantees an unowned Mobby while one remains. Results include `isNew` and `guaranteed`, and a five-pull is committed atomically.
- `GET /gacha/odds` returns the equal per-Mobby rates and the paid-pity disclosure. The roster lives in `src/config/gacha.ts` and intentionally mirrors `src/petCatalog.ts` without importing app code.
- `GET /events/:id` returns event status; `POST /events/:id/steps` accepts the user's cumulative daily value inside the configured Tokyo-time window.

## Incomplete and placeholder behavior

- Real Apple roots, bundle ID, product IDs, App Store notification lifecycle mapping, and signed StoreKit test fixtures must be supplied/confirmed before production use. Tests create an ephemeral self-signed certificate in memory; that certificate is not an Apple certificate and is not committed.
- The product catalog configuration grants only the configured ticket/pull amounts. Full subscription status reconciliation, renewal grace periods, refunds/revocations after previously spent benefits, and App Store Server API lookups are not implemented.
- Gift and catalog JSON are operator configuration, not an admin UI. Event/team creation, team invitations, membership APIs, event rewards, anti-cheat validation against HealthKit, and device/account recovery are not implemented.
- Registration and friend request rate limits, abuse controls, account deletion/privacy workflows, and operational monitoring are not implemented. Before deployment, protect `POST /auth/register` with a Cloudflare WAF rate-limit rule keyed by source IP (for example, a small burst per minute plus a daily ceiling), return HTTP 429 when exceeded, and use Turnstile or an equivalent challenge after repeated attempts. Keep the exact thresholds in deployment configuration so they can be tuned without a code release.
- The project has not been deployed and has not contacted Cloudflare or Apple services. Local route tests use an in-memory Store; the D1 schema is provided for local Wrangler integration.
