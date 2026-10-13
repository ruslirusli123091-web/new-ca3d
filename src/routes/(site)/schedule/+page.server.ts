import type { PageServerLoad } from './$types';

/** Release schedule metadata; the catalogue comes from the parent layout. */
export const load: PageServerLoad = async ({ parent, platform, url }) => {
	const { siteUrl } = await parent();
	return {
		meta: {
			title: 'Jadwal Rilis Donghua Terlengkap',
			description:
				'Jadwal rilis donghua 3D sub indo setiap hari dari Senin sampai Minggu. Pantau episode terbaru di Chinese Anime 3D.',
			canonical: `${platform?.env?.SITE_URL || url.origin}/schedule`,
			image: `${siteUrl}/web-app-manifest-512x512.png`
		}
	};
};
