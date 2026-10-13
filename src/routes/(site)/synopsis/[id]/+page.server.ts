import { error } from '@sveltejs/kit';
import { metaDescription } from '$lib/server/data';
import { getOptimizedImageUrl } from '$lib/utils/helpers';
import type { PageServerLoad } from './$types';

/**
 * Synopsis/detail page — the most valuable page for SEO.
 *
 * Title, synopsis, status, episode list, Open Graph tags and JSON-LD are all
 * present in the initial HTML response, so search engines and social previews
 * get real content without executing JavaScript.
 *
 * The catalogue is already loaded once by the parent layout, so this performs
 * no extra database query.
 */
export const load: PageServerLoad = async ({ params, parent, platform, url }) => {
	const { donghua, siteUrl } = await parent();

	const item = donghua.find((d) => String(d.id) === String(params.id));
	if (!item) throw error(404, 'Donghua tidak ditemukan');

	const canonical = `${platform?.env?.SITE_URL || url.origin}/synopsis/${item.id}`;
	const description =
		metaDescription(item.synopsis) || `Nonton donghua ${item.title} sub indo gratis di Chinese Anime 3D.`;
	const image = item.image
		? getOptimizedImageUrl(item.image, 800)
		: `${siteUrl}/web-app-manifest-512x512.png`;

	return {
		item,
		related: donghua.filter((d) => d.id !== item.id).slice(0, 12),
		popular: [...donghua].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5),
		meta: {
			title: `${item.title} - Nonton Donghua Sub Indo`,
			description,
			canonical,
			image,
			type: 'video.tv_show'
		},
		jsonLd: {
			'@context': 'https://schema.org',
			'@type': item.type === 'movie' ? 'Movie' : 'TVSeries',
			name: item.title,
			description,
			image: item.image,
			url: canonical,
			inLanguage: 'id',
			numberOfEpisodes: item.episodes.length
		}
	};
};
