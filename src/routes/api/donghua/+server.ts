import type { RequestHandler } from '@sveltejs/kit';
import { rowToDonghua } from '$lib/server/db';
import { getDB, requireAdmin } from '$lib/server/auth';
import { guard } from '$lib/server/guard';
import { error, json, notFound } from '$lib/server/response';
import { validateDonghua } from '$lib/server/validate';
import { isSearchCrawler } from '$lib/server/bot';

/**
 * GET /api/donghua — public catalogue (also optionally ?id=...).
 *
 * Normally the HTML pages render this data server-side, so browsers rarely need
 * this endpoint. It exists for the admin panel and for programmatic access, and
 * is protected against bulk scraping: crawler UAs are rejected and the bucket is
 * rate limited per IP.
 */
export const GET: RequestHandler = async (event) => {
	const { url, request } = event;

	// Search crawlers may read the site HTML but not bulk-scrape this API.
	if (isSearchCrawler(request)) return error('Forbidden', 403);

	const blocked = await guard(event, { bucket: 'read' });
	if (blocked) return blocked;

	const db = getDB(event);
	const isAdmin = !!(await requireAdmin(event));

	try {
		const id = url.searchParams.get('id');

		if (id) {
			const row = await db
				.prepare('SELECT * FROM donghua WHERE id = ?')
				.bind(id)
				.first<Record<string, unknown>>();
			if (!row) return notFound();
			const item = rowToDonghua(row);
			if (item.scheduledTime && Date.now() < item.scheduledTime && !isAdmin) return notFound();
			return json({ donghua: item });
		}

		const { results } = await db
			.prepare('SELECT * FROM donghua ORDER BY lastUpdated DESC')
			.all<Record<string, unknown>>();

		let list = (results || []).map(rowToDonghua);
		if (!isAdmin) {
			list = list.filter((item) => !item.scheduledTime || Date.now() >= item.scheduledTime);
		}
		// SECURITY: this must NOT be publicly cacheable. A shared/edge cache hit
		// is served before the Worker runs, which would let an attacker warm the
		// cache with a browser request and then scrape it with any client,
		// bypassing the bot filter and rate limiter entirely. `private` keeps the
		// response out of Cloudflare's shared cache while still allowing the
		// visitor's own browser to reuse it briefly.
		return json({ donghua: list }, 200, {
			'Cache-Control': 'private, max-age=30'
		});
	} catch {
		return error('Gagal memuat data', 500);
	}
};

/** PUT /api/donghua — replace the full catalogue (admin only). */
export const PUT: RequestHandler = async (event) => {
	const blocked = await guard(event, { bucket: 'write', sameOrigin: true });
	if (blocked) return blocked;

	if (!(await requireAdmin(event))) return error('Tidak diizinkan', 401);

	let body: { donghua?: unknown };
	try {
		body = await event.request.json();
	} catch {
		return error('Body tidak valid', 400);
	}

	if (!Array.isArray(body.donghua)) return error('Format data salah', 400);
	if (body.donghua.length > 20000) return error('Terlalu banyak item', 413);

	const now = Date.now();
	const items = body.donghua
		.map((d) => validateDonghua(d, now))
		.filter((d): d is NonNullable<typeof d> => d !== null);

	if (items.length === 0) return error('Tidak ada data valid', 400);

	const db = getDB(event);
	const stmt = db.prepare(
		`INSERT OR REPLACE INTO donghua
		 (id, title, type, image, synopsis, views, scheduledTime, lastUpdated, episodes, day, status)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	);
	const batch = items.map((item) =>
		stmt.bind(
			item.id,
			item.title,
			item.type,
			item.image,
			item.synopsis,
			item.views,
			item.scheduledTime,
			item.lastUpdated,
			JSON.stringify(item.episodes),
			item.day,
			item.status
		)
	);

	await db.batch(batch);
	return json({ status: 'Saved', count: items.length });
};

/** DELETE /api/donghua — remove one item (admin only). */
export const DELETE: RequestHandler = async (event) => {
	const blocked = await guard(event, { bucket: 'write', sameOrigin: true });
	if (blocked) return blocked;

	if (!(await requireAdmin(event))) return error('Tidak diizinkan', 401);

	let body: { id?: string };
	try {
		body = await event.request.json();
	} catch {
		return error('Body tidak valid', 400);
	}
	const id = String(body.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
	if (!id) return error('ID wajib diisi', 400);

	const db = getDB(event);
	await db.prepare('DELETE FROM donghua WHERE id = ?').bind(id).run();
	return json({ status: 'Deleted' });
};
