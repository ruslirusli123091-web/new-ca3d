export const SITE_NAME = 'Chinese Anime 3D';
export const SITE_URL = 'https://ca3d.site';
export const DEFAULT_DESCRIPTION =
	'Nonton streaming Chinese Anime 3D (Donghua) terbaru dengan subtitle Indonesia gratis.';

/**
 * Client-side SEO updater. Mirrors the original React util so SPA navigation
 * keeps meta tags fresh. SSR meta is injected separately via <svelte:head>
 * and the Cloudflare worker (see src/hooks.server.ts).
 */
export const updateSEO = (title: string, description?: string, image?: string) => {
	if (typeof document === 'undefined') return;
	const fullTitle = title.includes(SITE_NAME) ? title : `${title} - ${SITE_NAME}`;
	const finalDesc = description || DEFAULT_DESCRIPTION;
	const finalImage = image || `${window.location.origin}/logo.png`;
	const finalUrl = window.location.href;

	document.title = fullTitle;

	const setMeta = (name: string, content: string, isProperty = false) => {
		let el = isProperty
			? document.querySelector(`meta[property="${name}"]`)
			: document.querySelector(`meta[name="${name}"]`);

		if (!el) {
			el = document.createElement('meta');
			if (isProperty) el.setAttribute('property', name);
			else el.setAttribute('name', name);
			document.head.appendChild(el);
		}
		el.setAttribute('content', content);
	};

	setMeta('description', finalDesc);
	setMeta('og:type', 'website', true);
	setMeta('og:url', finalUrl, true);
	setMeta('og:title', fullTitle, true);
	setMeta('og:description', finalDesc, true);
	setMeta('og:image', finalImage, true);
	setMeta('twitter:card', 'summary_large_image');
	setMeta('twitter:url', finalUrl);
	setMeta('twitter:title', fullTitle);
	setMeta('twitter:description', finalDesc);
	setMeta('twitter:image', finalImage);
};
