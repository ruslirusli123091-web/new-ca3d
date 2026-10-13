import type { RequestHandler } from '@sveltejs/kit';
import { guard } from '$lib/server/guard';
import { json } from '$lib/server/response';
import { SESSION_COOKIE } from '$lib/server/session';

/** POST /api/auth/logout */
export const POST: RequestHandler = async (event) => {
	const blocked = await guard(event, { bucket: 'write', sameOrigin: true });
	if (blocked) return blocked;

	event.cookies.delete(SESSION_COOKIE, { path: '/' });
	return json({ status: 'LoggedOut' });
};
