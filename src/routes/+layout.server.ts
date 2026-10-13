import { getSession } from '$lib/server/auth';
import type { LayoutServerLoad } from './$types';

/**
 * Layout load — minimal on purpose.
 *
 * It only exposes the admin session flag and the canonical site URL. The
 * donghua catalogue is NOT loaded here: each page fetches exactly what it needs
 * so SSR stays cheap and no page ships data it doesn't render.
 */
export const load: LayoutServerLoad = async (event) => {
	const session = await getSession(event);
	return {
		session: session ? { username: session.sub, role: session.role } : null,
		siteUrl: event.platform?.env?.SITE_URL || event.url.origin
	};
};
