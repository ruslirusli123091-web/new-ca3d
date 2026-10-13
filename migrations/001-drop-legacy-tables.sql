-- ============================================================
-- Migration: drop tables from the previous schema revision.
--
-- Run once on an existing database that was created before:
--   npm run db:cleanup:remote
-- (or execute the statements manually with wrangler d1 execute)
--
-- Safe to re-run: every statement uses IF EXISTS.
-- ============================================================

-- Public visitor accounts (replaced by browser-local bookmarks/history).
DROP TABLE IF EXISTS users;

-- Comments/ratings feature was removed entirely.
DROP TABLE IF EXISTS comments;

-- Comment ban list (no comments anymore).
DROP TABLE IF EXISTS banned_users;

-- Admin credentials now live in environment variables, not the database.
DROP TABLE IF EXISTS admins;

-- Stateless signed sessions replaced server-side session rows.
DROP TABLE IF EXISTS sessions;

-- Reclaim space in the SQLite file after dropping tables.
VACUUM;
