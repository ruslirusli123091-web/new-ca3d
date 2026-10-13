-- ============================================================
-- Migration 003: distributed rate limiting table.
--
-- WHY THIS IS NEEDED
-- An in-isolate (in-memory) rate limiter does not work on Cloudflare in
-- production: a Worker runs across many isolates, each with its own memory, so
-- counters never accumulate and the limit is never reached. That allowed
-- unlimited admin password guessing against the live deployment.
--
-- This table gives every isolate one shared counter, so the limit is enforced
-- globally. Writes are cheap and only happen on rate-limited buckets.
--
-- Run: npm run db:add-ratelimit:remote
-- ============================================================

CREATE TABLE IF NOT EXISTS rate_limits (
	key          TEXT PRIMARY KEY,
	window_start INTEGER NOT NULL,
	count        INTEGER NOT NULL DEFAULT 0
);

-- Supports the periodic cleanup of expired windows.
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits (window_start);
