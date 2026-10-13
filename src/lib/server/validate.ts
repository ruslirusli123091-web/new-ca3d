import type { Episode } from '$lib/types';

/** Strip control characters and trim; clamp to a max length. */
export function sanitizeText(input: unknown, maxLength = 2000): string {
	if (typeof input !== 'string') return '';
	const cleaned = input
		// eslint-disable-next-line no-control-regex
		.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
		.trim();
	return cleaned.slice(0, maxLength);
}

/** Block javascript:, data:, vbscript: URLs and enforce http(s). */
export function safeUrl(input: unknown): string {
	const raw = sanitizeText(input, 2048);
	if (!raw) return '';
	if (/^(javascript|data|vbscript|file):/i.test(raw)) return '';
	return raw;
}

const ALLOWED_DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu', 'Random'];

export function sanitizeDays(input: unknown): string {
	const raw = sanitizeText(input, 128);
	return raw
		.split(',')
		.map((d) => d.trim())
		.filter((d) => ALLOWED_DAYS.includes(d))
		.join(',');
}

export function sanitizeEpisodes(input: unknown): Episode[] {
	if (!Array.isArray(input)) return [];
	return input
		.slice(0, 5000)
		.map((e) => {
			const ep = sanitizeText((e as Episode)?.ep, 12);
			const url = sanitizeText((e as Episode)?.url, 8000);
			return {
				ep,
				url,
				title: sanitizeText((e as Episode)?.title, 200) || `Episode ${ep}`,
				video: url
			} as Episode;
		})
		.filter((e) => e.ep !== '');
}

export interface ValidatedDonghua {
	id: string;
	title: string;
	type: 'series' | 'movie';
	image: string;
	synopsis: string;
	day: string;
	status: string;
	views: number;
	scheduledTime: number | null;
	lastUpdated: number;
	episodes: Episode[];
}

/**
 * Validate + normalise an admin-submitted catalogue item.
 * Returns null when the entry is unusable (missing id or title).
 */
export function validateDonghua(input: unknown, now = Date.now()): ValidatedDonghua | null {
	if (!input || typeof input !== 'object') return null;
	const d = input as Record<string, unknown>;
	const title = sanitizeText(d.title, 300);
	const id = sanitizeText(d.id, 64).replace(/[^a-zA-Z0-9_-]/g, '');
	if (!title || !id) return null;
	return {
		id,
		title,
		type: d.type === 'movie' ? 'movie' : 'series',
		image: safeUrl(d.image),
		synopsis: sanitizeText(d.synopsis, 8000),
		day: sanitizeDays(d.day),
		status: ['Ongoing', 'Completed', 'Dropped'].includes(String(d.status))
			? String(d.status)
			: 'Ongoing',
		views: Math.max(0, Math.floor(Number(d.views) || 0)),
		scheduledTime: d.scheduledTime ? Math.floor(Number(d.scheduledTime)) : null,
		lastUpdated: Math.floor(Number(d.lastUpdated) || now),
		episodes: sanitizeEpisodes(d.episodes)
	};
}
