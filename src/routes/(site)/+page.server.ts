import type { PageServerLoad } from './$types';

/**
 * Home page metadata. The catalogue itself comes from the parent layout load,
 * so this adds only what is unique to the home page.
 */
export const load: PageServerLoad = async ({ parent, url, platform }) => {
	const { siteUrl } = await parent();
	return {
		meta: {
			title: 'Chinese Anime 3D - Nonton Donghua Sub Indo',
			description:
				'Nonton streaming Chinese Anime 3D (Donghua) terbaru dengan subtitle Indonesia gratis. Update setiap hari.',
			canonical: `${platform?.env?.SITE_URL || url.origin}/`,
			image: `${siteUrl}/web-app-manifest-512x512.png`
		}
	};
};
