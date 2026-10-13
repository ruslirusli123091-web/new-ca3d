-- ============================================================
-- CA3D (SvelteKit) - Cloudflare D1 schema
-- Run locally:  npm run db:migrate:local
-- Run remote:   npm run db:migrate:remote
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

-- ============================================================
-- NOTE: there is intentionally NO `users` table.
--
-- Public visitors are anonymous: bookmarks, watch history and the
-- comment nickname are stored in each visitor's own browser
-- (localStorage) and never reach the server. The only account in
-- this system is the site administrator (see `admins` below).
-- ============================================================

-- Admins --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
	username   TEXT PRIMARY KEY,
	password   TEXT NOT NULL
);

-- Banned users (comment/chat abuse) ----------------------------------------
CREATE TABLE IF NOT EXISTS banned_users (
	username TEXT PRIMARY KEY,
	bannedAt INTEGER
);

-- Comments / ratings --------------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
	id        TEXT PRIMARY KEY,
	user      TEXT NOT NULL,
	text      TEXT NOT NULL,
	timestamp INTEGER NOT NULL,
	avatar    TEXT DEFAULT '',
	donghuaId TEXT DEFAULT '',
	ep        TEXT DEFAULT '',
	rating    INTEGER
);
CREATE INDEX IF NOT EXISTS idx_comments_donghua ON comments (donghuaId, ep);
CREATE INDEX IF NOT EXISTS idx_comments_ts ON comments (timestamp DESC);

-- Persistent server-side sessions (optional hardening layer) ----------------
CREATE TABLE IF NOT EXISTS sessions (
	id         TEXT PRIMARY KEY,
	username   TEXT NOT NULL,
	role       TEXT NOT NULL,
	createdAt  INTEGER NOT NULL,
	expiresAt  INTEGER NOT NULL,
	ip         TEXT,
	userAgent  TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expiresAt);

-- Audit log (security monitoring) ------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
	id        INTEGER PRIMARY KEY AUTOINCREMENT,
	ts        INTEGER NOT NULL,
	event     TEXT NOT NULL,
	actor     TEXT,
	ip        TEXT,
	detail    TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log (ts DESC);

-- ============================================================
-- Create your admin account with a strong, salted hash.
--
--   1. Generate a hash:
--        node scripts/hash-password.mjs "YourStrongPassword"
--   2. Insert it (replace <USERNAME> and <HASH>):
--
--        INSERT OR REPLACE INTO admins (username, password)
--        VALUES ('<USERNAME>', '<HASH>');
--
-- Never store a plain or unsalted password. The app verifies PBKDF2
-- hashes and will refuse the legacy placeholder format.
-- ============================================================
