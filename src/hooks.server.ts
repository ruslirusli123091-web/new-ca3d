import type { Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, readSession } from '$lib/server/session';

const SECURITY_HEADERS: Record<string, string> = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'SAMEORIGIN',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
	'Cross-Origin-Opener-Policy': 'same-origin',
	'X-DNS-Prefetch-Control': 'on'
};

/**
 * Content-Security-Policy. Note: the video player embeds third-party iframes
 * (configurable), so frame-src is intentionally permissive; everything else is
 * locked to our own origin plus the image/font CDNs we actually use.
 */
function buildCsp(dev: boolean): string {
	const scriptSrc = dev
		? "'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com"
		: "'self' 'unsafe-inline' https://challenges.cloudflare.com";
	return [
		"default-src 'self'",
		`script-src ${scriptSrc}`,
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"font-src 'self' https://fonts.gstatic.com data:",
		"img-src 'self' data: blob: https:",
		"media-src 'self' https: blob:",
		"frame-src 'self' https:",
		"connect-src 'self' https://challenges.cloudflare.com",
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'self'",
		'upgrade-insecure-requests'
	].join('; ');
}

export const handle: Handle = async ({ event, resolve }) => {
	const dev = event.url.hostname === 'localhost' || event.url.hostname === '127.0.0.1';

	// Attach session (if any) for use in load functions / endpoints.
	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.session = await readSession(event.platform, token);

	const response = await resolve(event);

	// Global security headers on every response.
	for (const [k, v] of Object.entries(SECURITY_HEADERS)) response.headers.set(k, v);

	// CSP only on HTML documents (JSON APIs already set their own headers).
	const contentType = response.headers.get('Content-Type') || '';
	if (contentType.includes('text/html')) {
		response.headers.set('Content-Security-Policy', buildCsp(dev));
	}

	// HSTS in production (Cloudflare also sets this, belt and braces).
	if (!dev) {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}

	return response;
};
