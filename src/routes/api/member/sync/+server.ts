import type { RequestHandler } from '@sveltejs/kit';
import { getDB, requireMember } from '$lib/server/auth';
import { guard } from '$lib/server/guard';
import { error, json } from '$lib/server/response';

interface HistoryItem {
	id: string;
	ep: string;
}

function cleanBookmarks(input: unknown): string[] {
	if (!Array.isArray(input)) return [];
	return input
		.filter((b) => typeof b === 'string')
		.map((b) => String(b).replace(/[^a-zA-Z0-9_-]/g, ''))
		.filter(Boolean)
		.slice(0, 500);
}

function cleanHistory(input: unknown): HistoryItem[] {
	if (!Array.isArray(input)) return [];
	return input
		.filter((h) => h && typeof h === 'object')
		.map((h) => ({
			id: String((h as HistoryItem).id || '').replace(/[^a-zA-Z0-9_-]/g, ''),
			ep: String((h as HistoryItem).ep || '').slice(0, 16)
		}))
		.filter((h) => h.id)
		.slice(0, 200);
}

/** POST /api/member/sync - persist bookmarks + history for the logged-in member. */
export const POST: RequestHandler = async (event) => {
	const blocked = await guard(event, { bucket: 'write', sameOrigin: true });
	if (blocked) return blocked;

	const session = await requireMember(event);
	if (!session) return error('Sesi tidak valid', 401);

	let body: Record<string, unknown>;
	try {
		body = await event.request.json();
	} catch {
		return error('Body tidak valid', 400);
	}

	const bookmarks = cleanBookmarks(body.bookmarks);
	const history = cleanHistory(body.history);

	const db = getDB(event);
	await db
		.prepare('UPDATE users SET bookmarks = ?, history = ? WHERE username = ?')
		.bind(JSON.stringify(bookmarks), JSON.stringify(history), session.sub)
		.run();

	return json({ status: 'Saved' });
};
