-- Asking to join an event team (run once on an existing database).
-- The player who made the team answers each request; an accepted request becomes a member and is removed here.
-- One open request per player per event.
CREATE TABLE IF NOT EXISTS event_join_requests (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES event_teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  UNIQUE (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS event_join_requests_team ON event_join_requests(team_id, created_at);
