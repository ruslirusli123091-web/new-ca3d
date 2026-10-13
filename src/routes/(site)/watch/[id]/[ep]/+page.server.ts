import { error } from '@sveltejs/kit';
import { metaDescription } from '$lib/server/data';
import { getOptimizedImageUrl } from '$lib/utils/helpers';
import type { PageServerLoad } from './$types';

/**
 * Watch page — server-rendered for SEO.
 *
 * The episode list, prev/next navigation and metadata are rendered on the
 * server. Only the stream URL resolution happens in the browser, which keeps
 * the HTML light while still giving crawlers full episode context.
 *
 * The catalogue is already loaded once by the parent layout, so this performs
 * no extra database query.
 */
export const load: PageServerLoad = async ({ params, parent, platform, url }) => {
	const { donghua, siteUrl } = await parent();

	const item = donghua.find((d) => String(d.id) === String(params.id));
	if (!item) throw error(404, 'Donghua tidak ditemukan');

	const episode = item.episodes.find((e) => e.ep === params.ep);
	if (!episode) throw error(404, 'Episode tidak ditemukan');

	const canonical = `${platform?.env?.SITE_URL || url.origin}/watch/${item.id}/${params.ep}`;
	const title = `Nonton ${item.title} Episode ${params.ep} Sub Indo`;
	const description =
		metaDescription(item.synopsis) ||
		`Streaming online ${item.title} episode ${params.ep} sub indo gratis di Chinese Anime 3D.`;
	const image = item.image
		? getOptimizedImageUrl(item.image, 800)
		: `${siteUrl}/web-app-manifest-512x512.png`;

	const sorted = [...item.episodes].sort((a, b) => parseFloat(a.ep) - parseFloat(b.ep));
	const index = sorted.findIndex((e) => e.ep === params.ep);

	return {
		item,
		episode,
		prevEp: index > 0 ? sorted[index - 1].ep : null,
		nextEp: index < sorted.length - 1 ? sorted[index + 1].ep : null,
		popular: [...donghua].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5),
		recommended: donghua.filter((d) => d.id !== item.id).slice(0, 5),
		meta: { title, description, canonical, image, type: 'video.episode' },
		jsonLd: {
			'@context': 'https://schema.org',
			'@type': 'TVEpisode',
			name: `${item.title} Episode ${params.ep}`,
			episodeNumber: params.ep,
			partOfSeries: { '@type': 'TVSeries', name: item.title },
			description,
			image: item.image,
			url: canonical,
			inLanguage: 'id'
		}
	};
};
