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
- `EVENT_STEPS_WINDOW_START`: Tokyo-local `HH:mm` when a day's submission window opens; default 20:00. The window for day D runs until the same time on D+1, so a submission before that time on D+1 is recorded for D.
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
- `POST /gacha/pull { count, kind }` accepts one free draw or one/five paid draws. All configured Mobbies are equally likely, for free and paid draws alike (there is no guarantee). Results include `isNew` and a `guaranteed` field that is always false, and a five-pull is committed atomically.
- `GET /gacha/odds` returns the equal per-Mobby rates. The roster lives in `src/config/gacha.ts` and intentionally mirrors `src/petCatalog.ts` without importing app code.
- `POST /gacha/pull` takes an optional `opId` (8-64 letters, digits or hyphens). The answer is stored with the draw, so asking again with the same id returns it without drawing again; the app keeps the id until it has the result. A stale paid-pull count makes the draw fail (409) instead of double-spending.
- `POST /blocks` / `POST /blocks/remove` with `{ userId }`, `GET /blocks`: blocking ends the friendship and pending requests and hides both players from each other (friends, requests, team joins). `POST /reports` with `{ userId, reason: name|behavior|other, note? }` stores a report in `user_reports` (10 a day per player). Display names containing words from `src/config/ngWords.ts` (plus `NG_WORDS`) are refused with `inappropriate_name`.
- `POST /purchases/verify` credits Production and Sandbox purchases by default; set `PURCHASE_ENVIRONMENTS=Production` to refuse Sandbox ones. The environment is stored on each purchase.
- `POST /account/delete` revokes the Sign in with Apple token first when `APPLE_TEAM_ID`, `APPLE_SIGN_IN_KEY_ID` and `APPLE_SIGN_IN_PRIVATE_KEY` are set (the app sends the authorization code with the sign-in); if Apple refuses, the account is kept (502 `apple_revoke_failed`) so deletion can be tried again.
- A cron trigger (hourly) removes finished rate-limit counters and stored draw answers older than 30 days.
- Event teams (all need the sign-in header; the player needs a profile name to make or join one):
  - `GET /events/:id/team` the player's team (code, status `recruiting` / `active` / `cleared`, members with their total steps, whether the reward was taken) and the event's limits; `team` is `null` when the player has none.
  - `POST /events/:id/teams` makes a team (201). `POST /events/:id/teams/join` with `{ code }` joins one (and becomes friends with its maker); 30 tries an hour. Both only while the event is running.
  - `POST /events/:id/teams/start` (the member who joined first, with at least `min_members` in the team), `POST /events/:id/leave` (only while recruiting), `POST /events/:id/claim` (the team has reached `goal_steps`; each member takes it once).
  - `GET /t/:code` is the page a team link opens; it hands the code to the app (`mobidou://team?code=…`).
  - `POST /events/:id/steps` now needs a team that has set out (409 `no_active_team` otherwise). A member's steps are the sum of what they sent for each day; the team's are the sum of its members'.
  - Database: `migrations/0002_event_teams.sql` upgrades an existing database, `migrations/0003_seed_toki_meguru.sql` adds the first event (set its dates first).
- `GET /events/:id` returns event status; `POST /events/:id/steps` accepts the user's cumulative daily value for the currently open day. Send `day` (`YYYY-MM-DD`) to name the day the value belongs to; a mismatch returns 409 `steps_day_mismatch` with `openDay`. `GET /events/:id` also returns `openDay`, the day that can currently be submitted.

## Incomplete and placeholder behavior

- Real Apple roots, bundle ID, product IDs, App Store notification lifecycle mapping, and signed StoreKit test fixtures must be supplied/confirmed before production use. Tests create an ephemeral self-signed certificate in memory; that certificate is not an Apple certificate and is not committed.
- The product catalog configuration grants only the configured ticket/pull amounts. Full subscription status reconciliation, renewal grace periods, refunds/revocations after previously spent benefits, and App Store Server API lookups are not implemented.
- Gift and catalog JSON are operator configuration, not an admin UI. Event/team creation, team invitations, membership APIs, event rewards, anti-cheat validation against HealthKit, and device/account recovery are not implemented.
- `POST /auth/register` is limited per source IP (CF-Connecting-IP) to 5 per minute and 30 per day, returning HTTP 429 `rate_limited`; counters live in the D1 `rate_limits` table (`REGISTER_PER_MINUTE` / `REGISTER_PER_DAY` in `src/worker.ts`). Friend request rate limits, other abuse controls, account deletion/privacy workflows, and operational monitoring are not implemented; consider Turnstile or an equivalent challenge after repeated attempts.
- The project has not been deployed and has not contacted Cloudflare or Apple services. Local route tests use an in-memory Store; the D1 schema is provided for local Wrangler integration.
