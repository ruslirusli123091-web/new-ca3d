-- ============================================================
-- Migration 002: add the manual rating column.
--
-- Run on an existing database created before ratings were introduced:
--   npm run db:add-rating:remote
--
-- `rating` is entered manually by the admin in the panel (1.0 - 10.0).
-- It is NOT collected from visitors.
-- ============================================================

ALTER TABLE donghua ADD COLUMN rating REAL;
