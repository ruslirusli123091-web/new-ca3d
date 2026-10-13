import { getDB, getSession } from '$lib/server/auth';
import { rowToDonghua } from '$lib/server/db';
import type { LayoutServerLoad } from './$types';

/**
 * Loads the public catalogue + session once per navigation so every page has
 * data without each page re-fetching it (mirrors the original single-fetch
 * architecture). Hidden/scheduled items are filtered out for non-admins.
 */
export const load: LayoutServerLoad = async (event) => {
	const { platform } = event;
	const session = await getSession(event);
	const isAdmin = session?.role === 'admin';

	let donghua: ReturnType<typeof rowToDonghua>[] = [];
	if (platform?.env?.DB) {
		try {
			const { results } = await platform.env.DB.prepare(
				'SELECT * FROM donghua ORDER BY lastUpdated DESC'
			).all<Record<string, unknown>>();
			donghua = (results || []).map(rowToDonghua);
			if (!isAdmin) {
				donghua = donghua.filter((d) => !d.scheduledTime || Date.now() >= d.scheduledTime);
			}
		} catch {
			donghua = [];
		}
	}

	return {
		donghua,
		session: session ? { username: session.sub, displayName: session.name, role: session.role } : null,
		turnstileSiteKey: platform?.env?.TURNSTILE_SITE_KEY || ''
	};
};
