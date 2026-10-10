-- The first event, 「時をめぐる道」. Run once after migrations/0002 (or after schema.sql on a new database):
--   npx wrangler d1 execute <database> --remote --file migrations/0003_seed_toki_meguru.sql
--
-- BEFORE RUNNING, set the real period. starts_at / ends_at are UTC instants (ISO 8601). The app and the server judge
-- "the event is running" by them: teams can be made and joined, and steps are accepted, only inside the period.
-- The dates below are placeholders (about one month from the release) and must be replaced.
--
-- The numbers match src/data/events.ts: a team of 2 to 4 walks 360,000 steps together.
INSERT OR IGNORE INTO events (id, name, starts_at, ends_at, map_id, min_members, max_members, goal_steps)
VALUES ('toki-meguru', '時をめぐる道', '2026-10-20T00:00:00.000Z', '2026-11-20T00:00:00.000Z', 'toki-meguru-map', 2, 4, 360000);
