import type { RequestHandler } from '@sveltejs/kit';
import { getDB } from '$lib/server/auth';
import { guard } from '$lib/server/guard';
import { error, json } from '$lib/server/response';
import { hashPassword, verifyPassword } from '$lib/server/crypto';
import { sanitizeUsername } from '$lib/server/validate';
import { createSession, SESSION_COOKIE } from '$lib/server/session';
import { verifyTurnstile } from '$lib/server/turnstile';
import { clientIp } from '$lib/server/rateLimit';

async function audit(
	event: Parameters<RequestHandler>[0],
	actor: string,
	detail: string
): Promise<void> {
	try {
		const db = getDB(event);
		await db
			.prepare('INSERT INTO audit_log (ts, event, actor, ip, detail) VALUES (?, ?, ?, ?, ?)')
			.bind(Date.now(), 'admin_login', actor, clientIp(event.request), detail)
			.run();
	} catch {
		/* audit must never break the request */
	}
}

/** POST /api/auth/login - admin login (rate limited + Turnstile + audit). */
export const POST: RequestHandler = async (event) => {
	const blocked = await guard(event, { bucket: 'auth', sameOrigin: true });
	if (blocked) return blocked;

	let body: Record<string, unknown>;
	try {
		body = await event.request.json();
	} catch {
		return error('Body tidak valid', 400);
	}

	const ip = clientIp(event.request);
	const turnstile = await verifyTurnstile(
		event.platform?.env,
		body.turnstileToken as string | undefined,
		ip
	);
	if (!turnstile.ok) return error('Verifikasi bot gagal', 403);

	const username = sanitizeUsername(body.username);
	const password = String(body.password ?? '');
	if (!username || !password) return error('Username atau Password salah', 401);

	const db = getDB(event);
	const admin = await db
		.prepare('SELECT username, password FROM admins WHERE username = ?')
		.bind(username)
		.first<{ username: string; password: string }>();

	if (!admin) {
		await verifyPassword(password, 'pbkdf2$120000$00$00');
		await audit(event, username, 'failed:no-such-admin');
		return error('Username atau Password salah', 401);
	}

	const result = await verifyPassword(password, admin.password);
	if (!result.ok) {
		await audit(event, username, 'failed:bad-password');
		return error('Username atau Password salah', 401);
	}

	if (result.needsUpgrade) {
		const upgraded = await hashPassword(password);
		await db
			.prepare('UPDATE admins SET password = ? WHERE username = ?')
			.bind(upgraded, username)
			.run();
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
