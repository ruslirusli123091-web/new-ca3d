import type { RequestHandler } from '@sveltejs/kit';
import { getDB } from '$lib/server/auth';
import { guard } from '$lib/server/guard';
import { error, json } from '$lib/server/response';
import { hashPassword } from '$lib/server/crypto';
import { isValidPassword, isValidUsername, sanitizeUsername } from '$lib/server/validate';
import { verifyTurnstile } from '$lib/server/turnstile';
import { clientIp } from '$lib/server/rateLimit';
import { honeypotTripped } from '$lib/server/bot';

/** POST /api/member/register */
export const POST: RequestHandler = async (event) => {
	const blocked = await guard(event, { bucket: 'auth', sameOrigin: true });
	if (blocked) return blocked;

	let body: Record<string, unknown>;
	try {
		body = await event.request.json();
	} catch {
		return error('Body tidak valid', 400);
	}

	if (honeypotTripped(body)) return error('Ditolak', 403);

	const turnstile = await verifyTurnstile(
		event.platform?.env,
		body.turnstileToken as string | undefined,
		clientIp(event.request)
	);
	if (!turnstile.ok) return error('Verifikasi bot gagal', 403);

	const username = sanitizeUsername(body.username);
	const password = String(body.password ?? '');

	if (!isValidUsername(username)) {
		return error('Username harus 3-32 karakter (huruf, angka, . _ -)', 400);
	}
	if (!isValidPassword(password)) {
		return error('Password minimal 6 karakter', 400);
	}

	const db = getDB(event);
	const exists = await db.prepare('SELECT 1 FROM users WHERE username = ?').bind(username).first();
	if (exists) return error('Username sudah dipakai', 400);

	const hash = await hashPassword(password);
	await db
		.prepare(
			'INSERT INTO users (username, password, bookmarks, history, joinedAt) VALUES (?, ?, ?, ?, ?)'
		)
		.bind(username, hash, '[]', '[]', Date.now())
		.run();

	return json({ status: 'Success', user: { username, display_name: username, bookmarks: [], history: [] } });
};
