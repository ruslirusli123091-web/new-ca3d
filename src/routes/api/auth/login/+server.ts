import type { RequestHandler } from '@sveltejs/kit';
import { verifyAdminCredentials, getAdminCredentials } from '$lib/server/auth';
import { guard } from '$lib/server/guard';
import { error, json } from '$lib/server/response';
import { sanitizeText } from '$lib/server/validate';
import { createSession, SESSION_COOKIE } from '$lib/server/session';
import { clientIp } from '$lib/server/rateLimit';

/**
 * POST /api/auth/login — admin login.
 *
 * Credentials come from environment variables (ADMIN_USERNAME / ADMIN_PASSWORD),
 * so there is no admin row in D1 to leak. Protection: tight rate limit bucket
 * (8 attempts / 5 minutes per IP), same-origin check, and constant-time
 * credential comparison.
 */
export const POST: RequestHandler = async (event) => {
	const blocked = await guard(event, { bucket: 'auth', sameOrigin: true });
	if (blocked) return blocked;

	if (!getAdminCredentials(event.platform?.env)) {
		return error('Login admin belum dikonfigurasi di server', 503);
	}

	let body: Record<string, unknown>;
	try {
		body = await event.request.json();
	} catch {
		return error('Body tidak valid', 400);
	}

	const username = sanitizeText(body.username, 64);
	const password = String(body.password ?? '');
	if (!username || !password) return error('Username atau Password salah', 401);

	const ok = await verifyAdminCredentials(event.platform?.env, username, password);
	if (!ok) {
		await audit(event, username, 'failed');
		return error('Username atau Password salah', 401);
	}

	const token = await createSession(event.platform, {
		sub: username,
		name: username,
		role: 'admin'
	});
	event.cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: event.url.protocol === 'https:',
		maxAge: 60 * 60 * 24 * 7
	});

	await audit(event, username, 'success');
	return json({ status: 'Success', user: { username, display_name: 'Administrator' } });
};

/** Best-effort security log; never breaks the request. */
async function audit(
	event: Parameters<RequestHandler>[0],
	actor: string,
	result: string
): Promise<void> {
	try {
		await event.platform?.env?.DB?.prepare(
			'INSERT INTO audit_log (ts, event, actor, ip, detail) VALUES (?, ?, ?, ?, ?)'
		)
			.bind(Date.now(), 'admin_login', actor, clientIp(event.request), result)
			.run();
	} catch {
		/* audit must never break login */
	}
}
