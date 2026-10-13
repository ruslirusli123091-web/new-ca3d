import type { RequestHandler } from '@sveltejs/kit';
import { getDB, requireAdmin } from '$lib/server/auth';
import { guard } from '$lib/server/guard';
import { error, json } from '$lib/server/response';
import { sanitizeUsername } from '$lib/server/validate';

/** GET /api/users - list of banned usernames. */
export const GET: RequestHandler = async (event) => {
	const blocked = await guard(event, { bucket: 'read' });
	if (blocked) return blocked;

	const db = getDB(event);
	const { results } = await db
		.prepare('SELECT username FROM banned_users')
		.all<{ username: string }>();
	return json({ banned_users: (results || []).map((r) => r.username) });
};

/** PUT /api/users - ban a user (admin only). */
export const PUT: RequestHandler = async (event) => {
	const blocked = await guard(event, { bucket: 'write', sameOrigin: true });
	if (blocked) return blocked;

	if (!(await requireAdmin(event))) return error('Tidak diizinkan', 401);

	let body: { action?: string; username?: string };
	try {
		body = await event.request.json();
	} catch {
		return error('Body tidak valid', 400);
	}

	if (body.action === 'ban') {
		const username = sanitizeUsername(body.username);
		if (!username) return error('Username tidak valid', 400);
		const db = getDB(event);
		await db
			.prepare('INSERT OR IGNORE INTO banned_users (username, bannedAt) VALUES (?, ?)')
			.bind(username, Date.now())
			.run();
		return json({ status: 'Banned' });
	}

	if (body.action === 'unban') {
		const username = sanitizeUsername(body.username);
		if (!username) return error('Username tidak valid', 400);
		const db = getDB(event);
		await db.prepare('DELETE FROM banned_users WHERE username = ?').bind(username).run();
		return json({ status: 'Unbanned' });
	}

	return error('Aksi tidak dikenal', 400);
};
