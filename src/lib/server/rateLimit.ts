/**
 * Rate limiting for the CA3D API.
 *
 * WHY D1 AND NOT MEMORY
 * A Worker runs across many isolates, each with its own memory. An in-memory
 * counter therefore never accumulates across isolates, so limits are silently
 * never enforced in production — which is exactly what allowed unlimited admin
 * password guessing against the live deployment.
 *
 * The counter now lives in D1, which every isolate shares. A single atomic
 * UPSERT increments it and returns the new value, so the limit is enforced
 * globally. An in-memory limiter is kept only as a fallback for when the
 * database binding is unavailable, so the site still degrades safely.
 */

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	retryAfter: number;
}

export interface LimitRule {
	/** Max requests allowed per window. */
	limit: number;
	/** Window length in seconds. */
	windowSeconds: number;
	/**
	 * When true the counter is kept in D1 so the limit is enforced across every
	 * isolate. When false the cheaper per-isolate counter is used.
	 *
	 * Distributed enforcement is reserved for buckets where it actually matters
	 * (credential guessing, content mutation), because each D1 check is a write
	 * and read traffic is already covered by the bot filter.
	 */
	distributed: boolean;
}

export const LIMITS = {
	read: { limit: 120, windowSeconds: 60, distributed: false },
	write: { limit: 30, windowSeconds: 60, distributed: true },
	// Admin login is the only credential endpoint, so it gets the tightest
	// budget and must be enforced globally: 8 attempts per 5 minutes per IP.
	auth: { limit: 8, windowSeconds: 300, distributed: true },
	view: { limit: 60, windowSeconds: 60, distributed: false }
} satisfies Record<string, LimitRule>;

export function clientIp(request: Request): string {
	return (
		request.headers.get('CF-Connecting-IP') ||
		request.headers.get('X-Real-IP') ||
		request.headers.get('X-Forwarded-For')?.split(',')[0].trim() ||
		'unknown'
	);
}

// ---- In-memory fallback (only used when D1 is unreachable) ----
interface MemoryBucket {
	windowStart: number;
	count: number;
}
const memory = new Map<string, MemoryBucket>();
const MAX_KEYS = 5000;

function memoryLimit(key: string, rule: LimitRule): RateLimitResult {
	const now = Date.now();
	const windowMs = rule.windowSeconds * 1000;
	let entry = memory.get(key);

	if (!entry || now - entry.windowStart >= windowMs) {
		entry = { windowStart: now, count: 0 };
		memory.set(key, entry);
	}
	entry.count += 1;

	if (memory.size > MAX_KEYS) {
		for (const [k, v] of memory) {
			if (now - v.windowStart >= windowMs) memory.delete(k);
		}
	}

	const allowed = entry.count <= rule.limit;
	return {
		allowed,
		remaining: Math.max(0, rule.limit - entry.count),
		retryAfter: allowed ? 0 : Math.ceil((entry.windowStart + windowMs - now) / 1000)
	};
}

/** Occasionally drop expired windows so the table does not grow forever. */
async function cleanup(db: D1Database, threshold: number): Promise<void> {
	// Only ~2% of requests trigger cleanup, keeping the write volume negligible.
	if (Math.random() > 0.02) return;
	try {
		await db.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(threshold).run();
	} catch {
		/* cleanup is best-effort */
	}
}

/**
 * The limiter must work even if the migration was never run, otherwise it would
 * silently fall back to the per-isolate memory counter and enforce nothing.
 * The table is created once per isolate on first use, then remembered.
 */
let tableReady = false;

async function ensureTable(db: D1Database): Promise<boolean> {
	if (tableReady) return true;
	try {
		await db
			.prepare(
				`CREATE TABLE IF NOT EXISTS rate_limits (
				   key TEXT PRIMARY KEY,
				   window_start INTEGER NOT NULL,
				   count INTEGER NOT NULL DEFAULT 0
				 )`
			)
			.run();
		tableReady = true;
		return true;
	} catch {
		return false;
	}
}

/**
 * Atomically increment the shared counter and decide whether the request is
 * allowed. Returns null when D1 is unavailable so the caller can fall back.
 */
async function d1Limit(
	db: D1Database,
	key: string,
	rule: LimitRule
): Promise<RateLimitResult | null> {
	const now = Date.now();
	const windowMs = rule.windowSeconds * 1000;
	const threshold = now - windowMs;

	const run = async (): Promise<RateLimitResult | null> => {
		// One atomic statement: start a fresh window when the old one expired,
		// otherwise increment. RETURNING gives the post-increment value.
		const row = await db
			.prepare(
				`INSERT INTO rate_limits (key, window_start, count)
				 VALUES (?, ?, 1)
				 ON CONFLICT(key) DO UPDATE SET
				   count = CASE WHEN rate_limits.window_start < ? THEN 1 ELSE rate_limits.count + 1 END,
				   window_start = CASE WHEN rate_limits.window_start < ? THEN ? ELSE rate_limits.window_start END
				 RETURNING count, window_start`
			)
			.bind(key, now, threshold, threshold, now)
			.first<{ count: number; window_start: number }>();

		if (!row) return null;

		const allowed = row.count <= rule.limit;
		const retryAfter = allowed
			? 0
			: Math.max(1, Math.ceil((row.window_start + windowMs - now) / 1000));

		void cleanup(db, threshold);

		return {
			allowed,
			remaining: Math.max(0, rule.limit - row.count),
			retryAfter
		};
	};

	try {
		return await run();
	} catch {
		// Most likely the table is missing — create it once, then retry.
		const created = await ensureTable(db);
		if (!created) return null;
		try {
			return await run();
		} catch {
			return null;
		}
	}
}

export async function checkRateLimit(
	env: App.Platform['env'] | undefined,
	bucket: string,
	ip: string,
	rule: LimitRule
): Promise<RateLimitResult> {
	const key = `${bucket}:${ip}`;

	// Distributed buckets must hold across isolates, so the counter lives in D1.
	// Everything else uses the cheap per-isolate counter.
	if (rule.distributed) {
		const db = env?.DB;
		if (db) {
			const result = await d1Limit(db, key, rule);
			if (result) return result;
		}
	}

	return memoryLimit(key, rule);
}
