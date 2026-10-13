import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * Local-only library: bookmarks, watch history and a display nickname.
 *
 * Everything is stored in the visitor's own browser (localStorage). There is
 * no account, no server-side profile, and nothing to leak — which is also why
 * member login/register endpoints no longer exist.
 */

const KEY_BOOKMARKS = 'ca3d_bookmarks';
const KEY_HISTORY = 'ca3d_history';
const KEY_NICKNAME = 'ca3d_nickname';

export interface HistoryItem {
	id: string;
	ep: string;
	ts: number;
}

const MAX_HISTORY = 100;
const MAX_BOOKMARKS = 500;

function readArray<T>(key: string): T[] {
	if (!browser) return [];
	try {
		const raw = localStorage.getItem(key);
		const parsed = raw ? JSON.parse(raw) : [];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function readString(key: string): string {
	if (!browser) return '';
	try {
		return localStorage.getItem(key) || '';
	} catch {
		return '';
	}
}

// ---- Bookmarks ----
export const bookmarks = writable<string[]>(readArray<string>(KEY_BOOKMARKS));

bookmarks.subscribe((list) => {
	if (!browser) return;
	try {
		localStorage.setItem(KEY_BOOKMARKS, JSON.stringify(list.slice(0, MAX_BOOKMARKS)));
	} catch {
		/* storage full or blocked — silently ignore */
	}
});

export function toggleBookmark(id: string): boolean {
	let added = false;
	bookmarks.update((list) => {
		if (list.includes(id)) return list.filter((b) => b !== id);
		added = true;
		return [id, ...list].slice(0, MAX_BOOKMARKS);
	});
	return added;
}

export function isBookmarked(id: string): boolean {
	return get(bookmarks).includes(id);
}

// ---- History ----
export const history = writable<HistoryItem[]>(readArray<HistoryItem>(KEY_HISTORY));

history.subscribe((list) => {
	if (!browser) return;
	try {
		localStorage.setItem(KEY_HISTORY, JSON.stringify(list.slice(0, MAX_HISTORY)));
	} catch {
		/* noop */
	}
});

export function pushHistory(id: string, ep: string) {
	history.update((list) => {
		const withoutCurrent = list.filter((h) => h.id !== id);
		return [{ id, ep, ts: Date.now() }, ...withoutCurrent].slice(0, MAX_HISTORY);
	});
}

export function clearHistory() {
	history.set([]);
}

export function removeHistory(id: string) {
	history.update((list) => list.filter((h) => h.id !== id));
}

// ---- Nickname (used for comments, since there is no login) ----
export const nickname = writable<string>(readString(KEY_NICKNAME));

nickname.subscribe((name) => {
	if (!browser) return;
	try {
		const clean = name.trim().slice(0, 24);
		if (clean) localStorage.setItem(KEY_NICKNAME, clean);
		else localStorage.removeItem(KEY_NICKNAME);
	} catch {
		/* noop */
	}
});

export function setNickname(name: string) {
	nickname.set(name.trim().slice(0, 24));
}

export function getNickname(): string {
	return get(nickname);
}

// ---- Import / export (so users can move their library between devices) ----
export function exportLibrary(): string {
	return JSON.stringify(
		{
			version: 1,
			exportedAt: new Date().toISOString(),
			bookmarks: get(bookmarks),
			history: get(history),
			nickname: get(nickname)
		},
		null,
		2
	);
}

export function importLibrary(json: string): { ok: boolean; error?: string } {
	try {
		const data = JSON.parse(json);
		if (Array.isArray(data.bookmarks)) {
			bookmarks.set(
				data.bookmarks.filter((b: unknown) => typeof b === 'string').slice(0, MAX_BOOKMARKS)
			);
		}
		if (Array.isArray(data.history)) {
			history.set(
				data.history
					.filter((h: unknown) => h && typeof h === 'object' && typeof (h as HistoryItem).id === 'string')
					.slice(0, MAX_HISTORY)
			);
		}
		if (typeof data.nickname === 'string') setNickname(data.nickname);
		return { ok: true };
	} catch {
		return { ok: false, error: 'File tidak valid' };
	}
}
