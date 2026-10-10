-- Event teams (docs/event-plan.md §4). Run once on a database that was created before this change:
--   npx wrangler d1 execute <database> --remote --file migrations/0002_event_teams.sql
-- A fresh database gets the same shape from schema.sql, so do not run this on one.

ALTER TABLE events ADD COLUMN min_members INTEGER NOT NULL DEFAULT 2;
ALTER TABLE events ADD COLUMN max_members INTEGER NOT NULL DEFAULT 4;
ALTER TABLE events ADD COLUMN goal_steps INTEGER NOT NULL DEFAULT 0;

ALTER TABLE event_teams ADD COLUMN invite_code TEXT;
ALTER TABLE event_teams ADD COLUMN status TEXT NOT NULL DEFAULT 'recruiting';
ALTER TABLE event_teams ADD COLUMN started_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS event_teams_invite ON event_teams(event_id, invite_code);

CREATE TABLE IF NOT EXISTS event_claims (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  claimed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, event_id)
);
