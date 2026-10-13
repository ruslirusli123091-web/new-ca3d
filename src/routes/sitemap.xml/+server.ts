import type { RequestHandler } from '@sveltejs/kit';
import { getDB } from '$lib/server/auth';
import { rowToDonghua } from '$lib/server/db';

/** GET /sitemap.xml - dynamic sitemap built from D1. */
export const GET: RequestHandler = async (event) => {
	const base = event.platform?.env?.SITE_URL || event.url.origin;
	const now = new Date().toISOString();

	let items: ReturnType<typeof rowToDonghua>[] = [];
	try {
		const db = getDB(event);
		const { results } = await db
			.prepare('SELECT * FROM donghua ORDER BY lastUpdated DESC')
			.all<Record<string, unknown>>();
		items = (results || []).map(rowToDonghua);
	} catch {
		items = [];
	}

	const urls: string[] = [
		`  <url><loc>${base}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
		`  <url><loc>${base}/category/series</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`,
		`  <url><loc>${base}/category/movie</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`,
		`  <url><loc>${base}/schedule</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`
	];

	for (const item of items) {
		// Skip items that are scheduled but not yet published.
		if (item.scheduledTime && Date.now() < item.scheduledTime) continue;
		const lastmod = item.lastUpdated ? new Date(item.lastUpdated).toISOString() : now;
		const safeId = encodeURIComponent(item.id);
		urls.push(
			`  <url><loc>${base}/synopsis/${safeId}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`
		);
	}

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
