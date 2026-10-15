-- Devices that may be sent a notification (Expo push tokens), one row per device; a player may have a few.
CREATE TABLE IF NOT EXISTS push_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_notify INTEGER NOT NULL DEFAULT 1,
  friend_notify INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS push_tokens_user ON push_tokens(user_id, updated_at);

-- Notifications that go out once (a team set out, a goal reached): the key is written when it is sent.
CREATE TABLE IF NOT EXISTS push_sent (
  key TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);
