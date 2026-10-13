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
  revoked_at TEXT,
  -- 'Production' for a real purchase, 'Sandbox' for TestFlight and App Review; kept so test grants can be told apart.
  environment TEXT NOT NULL DEFAULT 'Production'
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

-- A player stops seeing, and being seen by, another player. One way: the blocker's choice.
CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  CHECK (blocker_id <> blocked_id),
  PRIMARY KEY (blocker_id, blocked_id)
);

-- A report about another player's name or behaviour, kept for the operator to read and act on.
CREATE TABLE IF NOT EXISTS user_reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('name', 'behavior', 'other')),
  note TEXT,
  created_at TEXT NOT NULL,
  handled_at TEXT
);
CREATE INDEX IF NOT EXISTS user_reports_open ON user_reports(handled_at, created_at);

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
  map_id TEXT NOT NULL,
  min_members INTEGER NOT NULL DEFAULT 2,
  max_members INTEGER NOT NULL DEFAULT 4,
  goal_steps INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS event_teams (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  invite_code TEXT,
  status TEXT NOT NULL DEFAULT 'recruiting' CHECK (status IN ('recruiting', 'active')),
  started_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS event_teams_invite ON event_teams(event_id, invite_code);

CREATE TABLE IF NOT EXISTS event_claims (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  claimed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, event_id)
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

CREATE TABLE IF NOT EXISTS user_limits (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  age_group TEXT NOT NULL CHECK (age_group IN ('under16', '16to19', 'adult')),
  set_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS apple_links (
  apple_sub TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  linked_at TEXT NOT NULL,
  -- Apple's refresh token from the sign-in, kept only to revoke it when the account is deleted.
  refresh_token TEXT
);

CREATE TABLE IF NOT EXISTS cloud_saves (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  version INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

-- A refund takes back the unspent tickets of that purchase; what was already spent becomes a debt that the next purchase pays off first.
CREATE TABLE IF NOT EXISTS refund_debt (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  pulls INTEGER NOT NULL CHECK (pulls >= 0)
);

CREATE TABLE IF NOT EXISTS refund_events (
  transaction_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pulls INTEGER NOT NULL,
  taken INTEGER NOT NULL,
  debt INTEGER NOT NULL,
  debt_applied INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- How a purchase's tickets were split between paying off a debt and the wallet.
CREATE TABLE IF NOT EXISTS purchase_settlements (
  transaction_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pulls INTEGER NOT NULL,
  paid_off INTEGER NOT NULL,
  credited INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT NOT NULL,
  window INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window)
);

-- Asking to join an event team: the player who made the team answers each request (accepted ones become members and are removed here).
CREATE TABLE IF NOT EXISTS event_join_requests (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES event_teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  UNIQUE (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS event_join_requests_team ON event_join_requests(team_id, created_at);
