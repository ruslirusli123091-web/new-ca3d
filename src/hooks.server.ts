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
 * Content-Security-Policy.
 *
 * No Turnstile and no third-party scripts are needed anymore, so script-src is
 * locked to our own origin. frame-src stays permissive because the video player
 * embeds external iframes, and img-src allows https for the image CDN.
 */
function buildCsp(dev: boolean): string {
	const scriptSrc = dev
		? "'self' 'unsafe-inline' 'unsafe-eval'"
		: "'self' 'unsafe-inline'";
	return [
		"default-src 'self'",
		`script-src ${scriptSrc}`,
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"font-src 'self' https://fonts.gstatic.com data:",
		"img-src 'self' data: blob: https:",
		"media-src 'self' https: blob:",
		"frame-src 'self' https:",
		"connect-src 'self'",
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'self'",
		'upgrade-insecure-requests'
	].join('; ');
}

export const handle: Handle = async ({ event, resolve }) => {
	const dev = event.url.hostname === 'localhost' || event.url.hostname === '127.0.0.1';

	// `/geni/*` is an internal JSON transport used by the hydrated web app,
	// not a browsable/public route. Every client-side request to it carries the
	// marker below; an address-bar visit, normal link, crawler, or generic API
	// client gets a real 404 before SvelteKit resolves the route. This applies to
	// every future `/geni/` endpoint, not only `/geni/donghua`.
	if (event.url.pathname.startsWith('/geni/') && event.request.headers.get('X-CA3D-App') !== 'web') {
		return new Response('Not Found', {
			status: 404,
			headers: {
				...SECURITY_HEADERS,
				'Cache-Control': 'no-store'
			}
		});
	}

	// Attach the admin session (if any) for load functions and endpoints.
	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.session = await readSession(event.platform, token);

	const response = await resolve(event);

	for (const [k, v] of Object.entries(SECURITY_HEADERS)) response.headers.set(k, v);

	// CSP only on HTML documents (JSON endpoints set their own headers).
	const contentType = response.headers.get('Content-Type') || '';
	if (contentType.includes('text/html')) {
		response.headers.set('Content-Security-Policy', buildCsp(dev));
	}

	// HSTS in production (Cloudflare also sets this; belt and braces).
	if (!dev) {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}

	return response;
};
