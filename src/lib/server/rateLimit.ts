/**
 * Rate limiting for the CA3D API.
 *
 * Strategy (defence in depth):
 *  1. If a Cloudflare Rate Limiting binding (`env.RATE_LIMITER`) is configured,
 *     use it — distributed and cheap.
 *  2. Otherwise fall back to an in-isolate sliding window keyed by IP + bucket.
 *     Per-isolate, so best-effort, but it still stops naive brute-force and
 *     scraping floods hitting one colo.
 */

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	retryAfter: number;
}

interface Bucket {
	windowStart: number;
	count: number;
}

const memory = new Map<string, Bucket>();
const MAX_KEYS = 5000;

export interface LimitRule {
	/** Max requests allowed per window. */
	limit: number;
	/** Window length in seconds. */
	windowSeconds: number;
}

export const LIMITS = {
	read: { limit: 120, windowSeconds: 60 },
	write: { limit: 30, windowSeconds: 60 },
	// Admin login is the only credential endpoint left, so it gets the tightest
	// budget: 8 attempts per 5 minutes per IP.
	auth: { limit: 8, windowSeconds: 300 },
	view: { limit: 60, windowSeconds: 60 }
} satisfies Record<string, LimitRule>;

export function clientIp(request: Request): string {
	return (
		request.headers.get('CF-Connecting-IP') ||
		request.headers.get('X-Real-IP') ||
		request.headers.get('X-Forwarded-For')?.split(',')[0].trim() ||
		'unknown'
	);
}

export async function checkRateLimit(
	env: App.Platform['env'] | undefined,
	bucket: string,
	ip: string,
	rule: LimitRule
): Promise<RateLimitResult> {
	const key = `${bucket}:${ip}`;

	// 1) Cloudflare's native rate limiter (when bound) acts as a coarse,
	//    distributed ceiling shared across all isolates.
	let nativeAllowed = true;
	let nativeRetry = 0;
	const native = (env as Record<string, unknown> | undefined)?.RATE_LIMITER as
		| { limit: (opts: { key: string }) => Promise<{ success: boolean }> }
		| undefined;
	if (native && typeof native.limit === 'function') {
		try {
			const { success } = await native.limit({ key });
			nativeAllowed = success;
			nativeRetry = rule.windowSeconds;
		} catch {
			/* binding unavailable — rely on the in-isolate limiter below */
		}
	}

	// 2) In-isolate sliding window, which enforces the precise per-bucket rule.
	//    This always runs: the native binding has one fixed limit, so it cannot
	//    express the much tighter budget the auth bucket needs.
	const now = Date.now();
	const windowMs = rule.windowSeconds * 1000;
	let entry = memory.get(key);

	if (!entry || now - entry.windowStart >= windowMs) {
		entry = { windowStart: now, count: 0 };
		memory.set(key, entry);
	}

	entry.count += 1;

	// Opportunistic cleanup to bound memory usage.
	if (memory.size > MAX_KEYS) {
		for (const [k, v] of memory) {
			if (now - v.windowStart >= windowMs) memory.delete(k);
		}
	}

	const localAllowed = entry.count <= rule.limit;
	const allowed = localAllowed && nativeAllowed;
	const retryAfter = allowed
		? 0
		: Math.max(nativeRetry, Math.ceil((entry.windowStart + windowMs - now) / 1000));

	return {
		allowed,
		remaining: Math.max(0, rule.limit - entry.count),
		retryAfter: Math.max(0, retryAfter)
	};
}
