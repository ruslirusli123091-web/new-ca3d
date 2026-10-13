import type { Chat, Donghua } from '$lib/types';

/**
 * All requests go to our own origin (`/api/...`) so the admin session cookie is
 * sent automatically and no CORS `*` is needed. `credentials: 'same-origin'`
 * keeps the session cookie attached while blocking cross-site credential leaks.
 *
 * Public visitors are anonymous: bookmarks, history and the comment nickname
 * are stored in their browser only, never on the server.
 */
const jsonHeaders = (extra: Record<string, string> = {}) => ({
	'Content-Type': 'application/json',
	'X-Requested-With': 'ca3d-fetch',
	...extra
});

let _chatsCache: { data: Chat[]; fetchedAt: number } | null = null;
const CHAT_CACHE_TTL_MS = 45000;

export interface ApiError extends Error {
	status?: number;
}

async function parse<T>(res: Response): Promise<T> {
	const json = await res.json().catch(() => ({}));
	if (!res.ok) {
		const err = new Error((json as { error?: string }).error || 'Request gagal') as ApiError;
		err.status = res.status;
		throw err;
	}
	return json as T;
}

export const api = {
	fetchDonghua: async (): Promise<Donghua[]> => {
		try {
			const res = await fetch('/api/donghua', { credentials: 'same-origin' });
			const json = (await res.json()) as Record<string, any>;
			return json.donghua || [];
		} catch (error) {
			console.warn('API Error', error);
			return [];
		}
	},

	fetchOneDonghua: async (id: string): Promise<Donghua | null> => {
		try {
			const res = await fetch(`/api/donghua?id=${encodeURIComponent(id)}`, {
				credentials: 'same-origin'
			});
			if (!res.ok) return null;
			const json = (await res.json()) as Record<string, any>;
			if (json.donghua) return json.donghua as Donghua;
			return json.donghuaList?.find((d: Donghua) => String(d.id) === String(id)) || null;
		} catch {
			return null;
		}
	},

	fetchChats: async (): Promise<Chat[]> => {
		if (_chatsCache && Date.now() - _chatsCache.fetchedAt < CHAT_CACHE_TTL_MS) {
			return _chatsCache.data;
		}
		try {
			const res = await fetch('/api/chat', { credentials: 'same-origin' });
			const json = (await res.json()) as Record<string, any>;
			const data = json.comments || [];
			_chatsCache = { data, fetchedAt: Date.now() };
			return data;
		} catch {
			return [];
		}
	},

	fetchBannedUsers: async (): Promise<string[]> => {
		try {
			const res = await fetch('/api/users', { credentials: 'same-origin' });
			const json = (await res.json()) as Record<string, any>;
			return json.banned_users || [];
		} catch {
			return [];
		}
	},

	// ---- Admin actions (session cookie authorises these; no password in body) ----
	saveDonghua: async (data: Donghua[]) => {
		return fetch('/api/donghua', {
			method: 'PUT',
			headers: jsonHeaders(),
			credentials: 'same-origin',
			body: JSON.stringify({ donghua: data })
		});
	},

	deleteDonghua: async (id: string) => {
		return fetch('/api/donghua', {
			method: 'DELETE',
			headers: jsonHeaders(),
			credentials: 'same-origin',
			body: JSON.stringify({ id })
		});
	},

	banUser: async (username: string) => {
		return fetch('/api/users', {
			method: 'PUT',
			headers: jsonHeaders(),
			credentials: 'same-origin',
			body: JSON.stringify({ action: 'ban', username })
		});
	},

	deleteChat: async (commentId: string) => {
		return fetch('/api/chat', {
			method: 'PUT',
			headers: jsonHeaders(),
			credentials: 'same-origin',
			body: JSON.stringify({ action: 'delete', commentId })
		});
	},

	// NOTE: there is intentionally no member login/register/sync API.
	// Bookmarks, watch history and the comment nickname live entirely in the
	// visitor's browser (see $lib/stores/library.ts). The only authenticated
	// account left is the site administrator.

	// ---- Comments (public, but rate limited + Turnstile + honeypot) ----
	sendChat: async (chat: Partial<Chat>, turnstileToken?: string) => {
		_chatsCache = null;
		const res = await fetch('/api/chat', {
			method: 'PUT',
			headers: jsonHeaders(),
			credentials: 'same-origin',
			body: JSON.stringify({ action: 'add', comment: chat, turnstileToken })
		});
		return parse<{ status: string }>(res);
	},

	trackView: async (id: string) => {
		return fetch('/api/view', {
			method: 'POST',
			headers: jsonHeaders(),
			credentials: 'same-origin',
			body: JSON.stringify({ id })
		}).catch(() => {});
	},

	// ---- Admin session (cookie based) ----
	adminLogin: async (username: string, password: string, turnstileToken?: string) => {
		const res = await fetch('/api/auth/login', {
			method: 'POST',
			headers: jsonHeaders(),
			credentials: 'same-origin',
			body: JSON.stringify({ username, password, turnstileToken })
		});
		return parse<{ status: string; user: { username: string; display_name: string } }>(res);
	},

	adminVerify: async (): Promise<boolean> => {
		try {
			const res = await fetch('/api/auth/verify', { credentials: 'same-origin' });
			return res.ok;
		} catch {
			return false;
		}
	},

	adminLogout: async () => {
		await fetch('/api/auth/logout', {
			method: 'POST',
			headers: jsonHeaders(),
			credentials: 'same-origin'
		});
	}
};
