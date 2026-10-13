import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** Category archive metadata; the catalogue comes from the parent layout. */
export const load: PageServerLoad = async ({ params, parent, platform, url }) => {
	const type = params.type;
	if (type !== 'series' && type !== 'movie') {
		throw error(404, 'Kategori tidak ditemukan');
	}

	const { donghua, siteUrl } = await parent();
	const count = donghua.filter((d) => (d.type || 'series') === type).length;

	return {
		meta: {
			title: type === 'movie' ? 'Daftar Movie Donghua Sub Indo' : 'Daftar Series Donghua Sub Indo',
			description:
				type === 'movie'
					? `Kumpulan ${count} movie Chinese Anime 3D (Donghua) subtitle Indonesia lengkap dan terbaru.`
					: `Kumpulan ${count} series Chinese Anime 3D (Donghua) subtitle Indonesia lengkap dan terbaru.`,
			canonical: `${platform?.env?.SITE_URL || url.origin}/category/${type}`,
			image: `${siteUrl}/web-app-manifest-512x512.png`
		}
	};
};
