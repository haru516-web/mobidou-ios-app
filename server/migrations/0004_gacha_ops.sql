-- Idempotent paid draws and a guard against two draws racing (run once on an existing database).
-- A draw the player asked for with an operation id: the answer is kept, so asking again (after a lost reply)
-- returns the same result instead of drawing again.
CREATE TABLE IF NOT EXISTS gacha_ops (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  op_id TEXT NOT NULL,
  result TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, op_id)
);

-- One row that a draw touches to prove its paid-pull count was still current; a stale one writes NULL and the whole batch aborts.
CREATE TABLE IF NOT EXISTS gacha_guard (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  ok INTEGER NOT NULL
);
INSERT OR IGNORE INTO gacha_guard (id, ok) VALUES (1, 1);
