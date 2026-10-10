-- Keep Apple's refresh token so it can be revoked when the account is deleted (run once on an existing database).
ALTER TABLE apple_links ADD COLUMN refresh_token TEXT;
