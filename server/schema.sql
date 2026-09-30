PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  secret_hash TEXT NOT NULL,
  friend_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  pet_id TEXT,
  goshuin_count INTEGER NOT NULL DEFAULT 0 CHECK (goshuin_count >= 0),
  route_name TEXT,
  last_seen TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS friendships (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  CHECK (user_id <> friend_id),
  PRIMARY KEY (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS friend_requests (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TEXT NOT NULL,
  CHECK (from_id <> to_id)
);
CREATE INDEX IF NOT EXISTS friend_requests_inbox ON friend_requests(to_id, status, created_at);

CREATE TABLE IF NOT EXISTS purchases (
  apple_transaction_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  original_transaction_id TEXT,
  granted_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS entitlements (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  tickets_granted_period INTEGER NOT NULL DEFAULT 0 CHECK (tickets_granted_period >= 0),
  PRIMARY KEY (user_id, plan, period_start)
);

CREATE TABLE IF NOT EXISTS ticket_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL CHECK (delta <> 0),
  reason TEXT NOT NULL,
  ref TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, reason, ref)
);

CREATE TABLE IF NOT EXISTS gift_claims (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gift_id TEXT NOT NULL,
  claimed_at TEXT NOT NULL,
  UNIQUE (user_id, gift_id)
);

CREATE TABLE IF NOT EXISTS gacha_wallet (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  paid_balance INTEGER NOT NULL DEFAULT 0 CHECK (paid_balance >= 0),
  free_balance INTEGER NOT NULL DEFAULT 0 CHECK (free_balance >= 0)
);

CREATE TABLE IF NOT EXISTS gacha_wallet_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL CHECK (currency IN ('paid', 'free')),
  delta INTEGER NOT NULL CHECK (delta <> 0),
  reason TEXT NOT NULL,
  ref TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, currency, reason, ref)
);

CREATE TABLE IF NOT EXISTS gacha_pulls (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  result_pet_id TEXT NOT NULL,
  pulled_at TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('free', 'paid')),
  is_new INTEGER NOT NULL CHECK (is_new IN (0, 1)),
  guaranteed INTEGER NOT NULL CHECK (guaranteed IN (0, 1))
);
CREATE INDEX IF NOT EXISTS gacha_pulls_history ON gacha_pulls(user_id, pulled_at);

CREATE TABLE IF NOT EXISTS gacha_state (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  paid_pull_count INTEGER NOT NULL DEFAULT 0 CHECK (paid_pull_count >= 0)
);

CREATE TABLE IF NOT EXISTS user_pets (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id TEXT NOT NULL,
  copies INTEGER NOT NULL DEFAULT 1 CHECK (copies >= 1),
  PRIMARY KEY (user_id, pet_id)
);

CREATE TABLE IF NOT EXISTS free_pull_claims (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route_id TEXT NOT NULL,
  claimed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, route_id)
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  map_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_teams (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_members (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES event_teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS event_steps (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  cumulative INTEGER NOT NULL CHECK (cumulative >= 0),
  updated_at TEXT NOT NULL,
  UNIQUE (user_id, event_id, day)
);

CREATE TRIGGER IF NOT EXISTS gacha_wallet_no_overspend
BEFORE UPDATE OF paid_balance, free_balance ON gacha_wallet
WHEN NEW.paid_balance < 0 OR NEW.free_balance < 0
BEGIN
  SELECT RAISE(ABORT, 'insufficient gacha balance');
END;

CREATE TRIGGER IF NOT EXISTS gacha_wallet_apply_ledger
AFTER INSERT ON gacha_wallet_ledger
BEGIN
  UPDATE gacha_wallet SET
    paid_balance = paid_balance + CASE WHEN NEW.currency = 'paid' THEN NEW.delta ELSE 0 END,
    free_balance = free_balance + CASE WHEN NEW.currency = 'free' THEN NEW.delta ELSE 0 END
  WHERE user_id = NEW.user_id;
END;

CREATE TRIGGER IF NOT EXISTS free_pull_claim_grant
AFTER INSERT ON free_pull_claims
BEGIN
  INSERT INTO gacha_wallet_ledger (id, user_id, currency, delta, reason, ref, created_at)
  VALUES ('free:' || NEW.user_id || ':' || NEW.route_id, NEW.user_id, 'free', 1, 'first_route_clear', NEW.route_id, NEW.claimed_at);
END;
