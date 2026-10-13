export interface Episode {
	ep: string;
	url?: string;
	id?: string;
	title: string;
	video: string | string[];
}

export interface Donghua {
	id: string;
	title: string;
	type?: 'series' | 'movie';
	image: string;
	coverImage?: string;
	synopsis: string;
	description?: string;
	day: string;
	schedule?: string[];
	scheduledTime?: number;
	episodes: Episode[];
	views?: number;
	lastUpdated?: number;
	genres?: string[];
	status?: string;
}

export interface Chat {
	id: string;
	timestamp: number;
	user: string;
	text: string;
	donghuaId: string;
	ep: string;
	rating?: number;
}

export interface HistoryItem {
	id: string;
	ep: string;
}
