/** JSON response helpers with hardened headers. */

export const SECURITY_HEADERS: Record<string, string> = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'X-Robots-Tag': 'noindex, nofollow',
	'Cross-Origin-Resource-Policy': 'same-origin',
	'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
};

export function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			...SECURITY_HEADERS,
			...extra
		}
	});
}

export function error(message: string, status = 400, extra: Record<string, string> = {}): Response {
	return json({ error: message }, status, extra);
}

export function tooMany(retryAfter: number): Response {
	return json(
		{ error: 'Terlalu banyak permintaan. Coba lagi nanti.' },
		429,
		{ 'Retry-After': String(retryAfter) }
	);
}

export function notFound(): Response {
	return json({ error: 'Not Found' }, 404);
}
