-- ============================================================
-- CA3D (SvelteKit) — Cloudflare D1 schema
--
-- Run locally:  npm run db:migrate:local
-- Run remote:   npm run db:migrate:remote
--
-- NOTE: there is no `users` table and no `admins` table.
--
--  * Public visitors are anonymous. Bookmarks, watch history and the display
--    nickname live in each visitor's browser (localStorage), so no personal
--    data is stored server-side.
--  * Admin credentials come from environment variables
--    (ADMIN_USERNAME / ADMIN_PASSWORD), so a leaked database dump exposes no
--    credentials at all.
-- ============================================================

-- Donghua / anime catalogue ------------------------------------------------
CREATE TABLE IF NOT EXISTS donghua (
	id            TEXT PRIMARY KEY,
	title         TEXT NOT NULL,
	type          TEXT NOT NULL DEFAULT 'series',
	image         TEXT DEFAULT '',
	synopsis      TEXT DEFAULT '',
	views         INTEGER NOT NULL DEFAULT 0,
	scheduledTime INTEGER,
	lastUpdated   INTEGER,
	episodes      TEXT NOT NULL DEFAULT '[]',
	day           TEXT DEFAULT '',
	status        TEXT DEFAULT 'Ongoing'
);
CREATE INDEX IF NOT EXISTS idx_donghua_lastUpdated ON donghua (lastUpdated DESC);
CREATE INDEX IF NOT EXISTS idx_donghua_views ON donghua (views DESC);
CREATE INDEX IF NOT EXISTS idx_donghua_type ON donghua (type);

-- Audit log (security monitoring: admin logins, failures) ------------------
CREATE TABLE IF NOT EXISTS audit_log (
	id        INTEGER PRIMARY KEY AUTOINCREMENT,
	ts        INTEGER NOT NULL,
	event     TEXT NOT NULL,
	actor     TEXT,
	ip        TEXT,
	detail    TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log (ts DESC);
