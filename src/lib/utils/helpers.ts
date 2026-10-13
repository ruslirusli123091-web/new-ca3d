import type { Episode } from '$lib/types';

/**
 * Route images through the wsrv.nl image CDN for resizing + webp conversion.
 * Mirrors the original React helper 1:1.
 */
export const getOptimizedImageUrl = (url: string, width: number, quality = 60) => {
	if (!url) return 'https://via.placeholder.com/200x300?text=No+Image';
	if (url.includes('gstatic.com') || url.includes('googleusercontent.com')) return url;
	const cleanUrl = url.replace(/^https?:\/\//, '');
	return `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&w=${width}&q=${quality}&output=webp`;
};

/**
 * Very small admin-only thumbnails. The dashboard shows many posters at once,
 * so using the public card's 300px/quality-60 preset made the admin reload
 * needlessly expensive. A 120px WebP at quality 42 is enough for a 2:3 card
 * preview and is typically 4-8x smaller than the old request.
 */
export const getAdminThumbnailUrl = (url: string, width = 120) =>
	getOptimizedImageUrl(url, width, 42);

export const generateSrcSet = (url: string, widths: number[], quality = 60) => {
	return widths.map((w) => `${getOptimizedImageUrl(url, w, quality)} ${w}w`).join(', ');
};

export const getLatestEp = (eps: Episode[]) => {
	if (!eps || eps.length === 0) return 0;
	return [...eps].sort((a, b) => parseFloat(b.ep) - parseFloat(a.ep))[0].ep;
};

export const timeAgo = (timestamp?: number) => {
	if (!timestamp) return '';
	const seconds = Math.floor((Date.now() - timestamp) / 1000);
	let interval = seconds / 31536000;
	if (interval > 1) return Math.floor(interval) + ' tahun lalu';
	interval = seconds / 2592000;
	if (interval > 1) return Math.floor(interval) + ' bulan lalu';
	interval = seconds / 86400;
	if (interval > 1) return Math.floor(interval) + ' hari lalu';
	interval = seconds / 3600;
	if (interval > 1) return Math.floor(interval) + ' jam lalu';
	interval = seconds / 60;
	if (interval > 1) return Math.floor(interval) + ' menit lalu';
	return Math.floor(seconds) + ' detik lalu';
};
