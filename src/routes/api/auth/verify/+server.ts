import type { RequestHandler } from '@sveltejs/kit';
import { guard } from '$lib/server/guard';
import { json } from '$lib/server/response';
import { SESSION_COOKIE } from '$lib/server/session';
import { requireAdmin } from '$lib/server/auth';

/** GET /api/auth/verify - is the current session an admin? */
export const GET: RequestHandler = async (event) => {
	const blocked = await guard(event, { bucket: 'read' });
	if (blocked) return blocked;

	const admin = await requireAdmin(event);
	if (!admin) return json({ status: 'Unauthorized' }, 401);
	return json({ status: 'OK', user: { username: admin.sub, display_name: admin.name } });
};

/** POST /api/auth/logout */
export const POST: RequestHandler = async (event) => {
	event.cookies.delete(SESSION_COOKIE, { path: '/' });
	return json({ status: 'LoggedOut' });
};
