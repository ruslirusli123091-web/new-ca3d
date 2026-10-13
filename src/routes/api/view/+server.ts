import type { RequestHandler } from '@sveltejs/kit';
import { getDB } from '$lib/server/auth';
import { guard } from '$lib/server/guard';
import { error, json } from '$lib/server/response';
import { sanitizeText } from '$lib/server/validate';

/**
 * POST /api/view — increment a view counter.
 *
 * Throttled harder than reads so view counts can't be inflated by scripts, and
 * restricted to same-origin requests.
 */
export const POST: RequestHandler = async (event) => {
	const blocked = await guard(event, { bucket: 'view', sameOrigin: true });
	if (blocked) return blocked;

	let body: { id?: string };
	try {
		body = await event.request.json();
	} catch {
		return error('Body tidak valid', 400);
	}
	const id = sanitizeText(body.id, 64);
	if (!id) return error('ID wajib', 400);

	const db = getDB(event);
	const res = await db
		.prepare('UPDATE donghua SET views = views + 1 WHERE id = ? RETURNING views')
		.bind(id)
		.first<{ views: number }>();

	return res ? json({ status: 'Counted', views: res.views }) : error('Not Found', 404);
};
