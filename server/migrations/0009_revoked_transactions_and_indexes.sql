-- Refunds are remembered even when the purchase was never seen, so a purchase that arrives after its refund credits nothing.
CREATE TABLE IF NOT EXISTS revoked_transactions (
  transaction_id TEXT PRIMARY KEY,
  revoked_at TEXT NOT NULL
);
-- Transactions already refunded stay refunded.
INSERT OR IGNORE INTO revoked_transactions (transaction_id, revoked_at)
  SELECT apple_transaction_id, revoked_at FROM purchases WHERE revoked_at IS NOT NULL;

-- The queries below filtered on columns no index started with, so each read the whole table.
CREATE INDEX IF NOT EXISTS event_steps_event ON event_steps(event_id, user_id, cumulative);
CREATE INDEX IF NOT EXISTS event_members_team ON event_members(team_id, joined_at);
CREATE INDEX IF NOT EXISTS purchases_user ON purchases(user_id, granted_at);
CREATE INDEX IF NOT EXISTS refund_events_user ON refund_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS friend_requests_from ON friend_requests(from_id, to_id);
