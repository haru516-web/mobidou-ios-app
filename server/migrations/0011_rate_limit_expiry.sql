-- Each rate-limit counter now says when it may be dropped, so clean-up is by an indexed time and never has to scan the table.
-- Rows written before this have no expiry (NULL): the clean-up still removes them by their window number.
ALTER TABLE rate_limits ADD COLUMN expires_at INTEGER;
CREATE INDEX IF NOT EXISTS rate_limits_expiry ON rate_limits(expires_at);
