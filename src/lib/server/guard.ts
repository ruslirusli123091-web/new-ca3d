import type { RequestEvent } from '@sveltejs/kit';
import { isLikelyBot, isSameOrigin } from './bot';
import { checkRateLimit, clientIp, LIMITS, type LimitRule } from './rateLimit';
import { error, tooMany } from './response';

export interface GuardOptions {
	/** Rate-limit bucket name (e.g. "auth", "write"). */
	bucket: keyof typeof LIMITS;
	/** Skip the automated-client heuristic (used for HTML-facing endpoints). */
	allowBots?: boolean;
	/** Require same-origin (blocks cross-site abuse of cookie-authenticated writes). */
	sameOrigin?: boolean;
}

/**
 * Runs the shared API guardrails in order:
 *   1. automated-client heuristic (anti-scraping / anti-bot)
 *   2. same-origin check (CSRF / cross-site write protection)
 *   3. rate limiting (anti brute-force / flooding)
 * Returns a Response to short-circuit with, or null to continue.
 */
export async function guard(event: RequestEvent, opts: GuardOptions): Promise<Response | null> {
	const { request, url, platform } = event;
	const ip = clientIp(request);

	if (!opts.allowBots && isLikelyBot(request)) {
		return error('Forbidden', 403);
	}

	if (opts.sameOrigin && !isSameOrigin(request, url)) {
		return error('Cross-site request blocked', 403);
	}

	const rule: LimitRule = LIMITS[opts.bucket];
	const rl = await checkRateLimit(platform?.env, opts.bucket, ip, rule);
	if (!rl.allowed) return tooMany(rl.retryAfter || rule.windowSeconds);

	return null;
}
