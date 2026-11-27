-- Extends 「時をめぐる道」 to run through 25 December: it now ends at (not including) 2026-12-26 00:00 JST.
-- Run once on the database that already holds migrations/0003:
--   npx wrangler d1 execute <database> --remote --file migrations/0012_extend_toki_meguru_to_dec25.sql
UPDATE events SET ends_at = '2026-12-25T15:00:00.000Z' WHERE id = 'toki-meguru';
