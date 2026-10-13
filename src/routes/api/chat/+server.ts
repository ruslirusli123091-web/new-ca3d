import type { RequestHandler } from '@sveltejs/kit';
import { rowToChat } from '$lib/server/db';
import { getDB, requireAdmin } from '$lib/server/auth';
import { guard } from '$lib/server/guard';
import { error, json } from '$lib/server/response';
import { clientIp } from '$lib/server/rateLimit';
import { honeypotTripped } from '$lib/server/bot';
import { sanitizeText } from '$lib/server/validate';
import { verifyTurnstile } from '$lib/server/turnstile';

const PROFANITY = [
	'anjing',
	'babi',
	'kontol',
	'memek',
	'bangsat',
	'bajingan',
	'tolol',
	'goblok',
	'ngentot',
	'asu',
	'jembut',
	'toket'
];

/** GET /api/chat - public list of comments (newest first). */
export const GET: RequestHandler = async (event) => {
	const blocked = await guard(event, { bucket: 'read' });
	if (blocked) return blocked;

	const db = getDB(event);
	try {
		const { results } = await db
			.prepare('SELECT * FROM comments ORDER BY timestamp DESC LIMIT 2000')
			.all<Record<string, unknown>>();
		return json({ comments: (results || []).map(rowToChat) });
	} catch {
		return json({ comments: [] });
	}
};

/**
 * PUT /api/chat
 *
 * - `action: "add"` posts a comment. No account is required (visitors are
 *   anonymous), so abuse is controlled by: strict rate limiting, Turnstile
 *   when configured, a honeypot field, a profanity filter, and a per-user
 *   ban list keyed by the nickname they choose.
 * - `action: "delete"` is admin-only.
 */
export const PUT: RequestHandler = async (event) => {
	const blocked = await guard(event, { bucket: 'comment', sameOrigin: true });
	if (blocked) return blocked;

	let body: Record<string, unknown>;
	try {
		body = await event.request.json();
	} catch {
		return error('Body tidak valid', 400);
	}

	const db = getDB(event);
	const ip = clientIp(event.request);

	if (body.action === 'add') {
		// Honeypot: hidden field must stay empty.
		if (honeypotTripped(body)) return error('Ditolak', 403);

		const turnstile = await verifyTurnstile(
			event.platform?.env,
			body.turnstileToken as string | undefined,
			ip
		);
		if (!turnstile.ok) return error('Verifikasi bot gagal', 403);

		const c = (body.comment || {}) as Record<string, unknown>;
		const text = sanitizeText(c.text, 1000);
		const donghuaId = sanitizeText(c.donghuaId, 64);
		const ep = sanitizeText(c.ep, 16);
		const rating = c.rating != null ? Math.min(5, Math.max(1, Math.floor(Number(c.rating)))) : null;

		if (!text) return error('Komentar kosong', 400);

		// Nickname comes from the visitor's browser. Keep it safe and readable.
		let user = sanitizeText(c.user, 24).replace(/[<>"'`\\/]/g, '').trim();
		if (user.length < 2) user = 'Anonim';

		const banned = await db
			.prepare('SELECT 1 FROM banned_users WHERE username = ?')
			.bind(user.toLowerCase())
			.first();
		if (banned) return error('Nama ini diblokir oleh admin', 403);

		const lower = text.toLowerCase();
		if (PROFANITY.some((w) => lower.includes(w))) {
			return error('Kata kasar terdeteksi', 400);
		}

		const id = sanitizeText(c.id, 64) || `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

		await db
			.prepare(
				'INSERT INTO comments (id, user, text, timestamp, avatar, donghuaId, ep, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
			)
			.bind(id, user, text, Date.now(), '', donghuaId, ep, rating)
			.run();

		return json({ status: 'Chat Saved' });
	}

	if (body.action === 'delete') {
		if (!(await requireAdmin(event))) return error('Tidak diizinkan', 401);
		const commentId = sanitizeText(body.commentId, 64);
		if (!commentId) return error('ID komentar wajib', 400);
		await db.prepare('DELETE FROM comments WHERE id = ?').bind(commentId).run();
		return json({ status: 'Deleted' });
	}

	return error('Aksi tidak dikenal', 400);
};
