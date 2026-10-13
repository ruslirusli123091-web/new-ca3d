import type { RequestEvent } from '@sveltejs/kit';
import { rowToDonghua } from './db';
import { getDB } from './auth';
import type { Donghua } from '$lib/types';

/**
 * Server-side catalogue readers used by page load functions.
 *
 * Only published items are returned (scheduled-but-future entries are hidden
 * from everyone except an authenticated admin). These run on Cloudflare, so the
 * HTML arrives with real content for crawlers instead of an empty shell.
 */

export async function listDonghua(event: RequestEvent): Promise<Donghua[]> {
	try {
		const db = getDB(event);
		const { results } = await db
			.prepare('SELECT * FROM donghua ORDER BY lastUpdated DESC')
			.all<Record<string, unknown>>();
		const list = (results || []).map(rowToDonghua);
		const isAdmin = event.locals.session?.role === 'admin';
		return isAdmin ? list : list.filter((d) => !d.scheduledTime || Date.now() >= d.scheduledTime);
	} catch {
		return [];
	}
}

export async function getDonghua(event: RequestEvent, id: string): Promise<Donghua | null> {
	try {
		const db = getDB(event);
		const row = await db
			.prepare('SELECT * FROM donghua WHERE id = ?')
			.bind(id)
			.first<Record<string, unknown>>();
		if (!row) return null;
		const item = rowToDonghua(row);
		const isAdmin = event.locals.session?.role === 'admin';
		if (item.scheduledTime && Date.now() < item.scheduledTime && !isAdmin) return null;
		return item;
	} catch {
		return null;
	}
}

/** Trim a synopsis down to a meta-description friendly length. */
export function metaDescription(text: string | undefined, max = 160): string {
	if (!text) return '';
	const clean = text.replace(/\s+/g, ' ').trim();
	if (clean.length <= max) return clean;
	return clean.slice(0, max - 1).trimEnd() + '…';
}
