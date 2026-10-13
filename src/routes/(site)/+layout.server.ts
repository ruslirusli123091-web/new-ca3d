import { listDonghua } from '$lib/server/data';
import type { LayoutServerLoad } from './$types';

/**
 * Public site layout load — the single source of the catalogue.
 *
 * Every public page needs the full catalogue (header search, sidebars, grids),
 * so it is fetched exactly once here and reused by child pages via `parent()`.
 * That keeps SSR to one D1 query per request instead of one per component, and
 * means the HTML ships with real content for search engines.
 */
export const load: LayoutServerLoad = async (event) => {
	const donghua = await listDonghua(event);
	return {
		donghua,
		siteUrl: event.platform?.env?.SITE_URL || event.url.origin
	};
};
