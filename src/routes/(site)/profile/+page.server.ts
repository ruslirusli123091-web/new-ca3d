import type { PageServerLoad } from './$types';

/**
 * Profile / "Koleksi Saya" metadata.
 *
 * The page content is personal (localStorage), so the server only supplies the
 * canonical URL and keeps it out of search indexes. The surrounding lists come
 * from the parent layout catalogue.
 */
export const load: PageServerLoad = async ({ parent, platform, url }) => {
	const { siteUrl } = await parent();
	return {
		meta: {
			title: 'Koleksi Saya',
			description: 'Bookmark dan riwayat tontonan Chinese Anime 3D tersimpan di browser kamu.',
			canonical: `${platform?.env?.SITE_URL || url.origin}/profile`,
			image: `${siteUrl}/web-app-manifest-512x512.png`,
			noindex: true
		}
	};
};
