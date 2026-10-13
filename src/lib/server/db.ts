import type { Donghua, Episode } from '$lib/types';

/** D1 row -> Donghua object (parses JSON columns defensively). */
export function rowToDonghua(row: Record<string, unknown>): Donghua {
	let episodes: Episode[] = [];
	try {
		const raw = row.episodes;
		episodes = typeof raw === 'string' ? JSON.parse(raw || '[]') : (raw as Episode[]) || [];
	} catch {
		episodes = [];
	}
	return {
		id: String(row.id),
		title: String(row.title ?? ''),
		type: (row.type as Donghua['type']) || 'series',
		image: String(row.image ?? ''),
		synopsis: String(row.synopsis ?? ''),
		day: String(row.day ?? ''),
		status: (row.status as string) || 'Ongoing',
		views: Number(row.views ?? 0),
		scheduledTime: row.scheduledTime ? Number(row.scheduledTime) : undefined,
		lastUpdated: row.lastUpdated ? Number(row.lastUpdated) : undefined,
		episodes
	};
}
