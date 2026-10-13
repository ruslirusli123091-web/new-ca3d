import type { RequestHandler } from '@sveltejs/kit';
import { getDB } from '$lib/server/auth';
import { guard } from '$lib/server/guard';
import { error, json } from '$lib/server/response';
import { hashPassword, verifyPassword } from '$lib/server/crypto';
import { sanitizeUsername } from '$lib/server/validate';
import { createSession, SESSION_COOKIE } from '$lib/server/session';
import { verifyTurnstile } from '$lib/server/turnstile';
import { clientIp } from '$lib/server/rateLimit';

/** POST /api/member/login */
export const POST: RequestHandler = async (event) => {
	const blocked = await guard(event, { bucket: 'auth', sameOrigin: true });
	if (blocked) return blocked;

	let body: Record<string, unknown>;
	try {
		body = await event.request.json();
	} catch {
		return error('Body tidak valid', 400);
	}

	const turnstile = await verifyTurnstile(
		event.platform?.env,
		body.turnstileToken as string | undefined,
		clientIp(event.request)
	);
	if (!turnstile.ok) return error('Verifikasi bot gagal', 403);

	const username = sanitizeUsername(body.username);
	const password = String(body.password ?? '');
	if (!username || !password) return error('Username atau Password salah', 401);

	const db = getDB(event);

	// Block banned users from logging in at all.
	const banned = await db
		.prepare('SELECT 1 FROM banned_users WHERE username = ?')
		.bind(username)
		.first();
	if (banned) return error('Akun Anda dibanned', 403);

	const user = await db
		.prepare('SELECT username, password, bookmarks, history FROM users WHERE username = ?')
		.bind(username)
		.first<{ username: string; password: string; bookmarks: string; history: string }>();

	if (!user) {
		// Run a dummy verify to keep timing consistent (no user enumeration).
		await verifyPassword(password, 'pbkdf2$120000$00$00');
		return error('Username atau Password salah', 401);
	}

	const result = await verifyPassword(password, user.password);
	if (!result.ok) return error('Username atau Password salah', 401);

	// Transparently upgrade legacy/weak hashes on successful login.
	if (result.needsUpgrade) {
		const upgraded = await hashPassword(password);
		await db
			.prepare('UPDATE users SET password = ? WHERE username = ?')
			.bind(upgraded, username)
			.run();
	}

	const token = await createSession(event.platform, {
		sub: username,
		name: username,
		role: 'member'
	});
	event.cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: event.url.protocol === 'https:',
		maxAge: 60 * 60 * 24 * 7
	});

	return json({
		status: 'Success',
		user: {
			username,
			display_name: username,
			bookmarks: JSON.parse(user.bookmarks || '[]'),
			history: JSON.parse(user.history || '[]')
		}
	});
};
