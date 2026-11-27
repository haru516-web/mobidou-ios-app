-- Moves the end of 「時をめぐる道」 to 23 December: it now ends at (not including) 2026-12-24 00:00 JST.
-- Run once on the database that already holds migrations/0003:
--   npx wrangler d1 execute <database> --remote --file migrations/0013_end_toki_meguru_on_dec23.sql
UPDATE events SET ends_at = '2026-12-23T15:00:00.000Z' WHERE id = 'toki-meguru';
