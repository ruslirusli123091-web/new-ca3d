import type { Donghua } from '$lib/types';

/**
 * All requests go to our own origin (`/api/...`) so the admin session cookie is
 * sent automatically and no CORS `*` is needed. `credentials: 'same-origin'`
 * keeps the session cookie attached while blocking cross-site credential leaks.
 *
 * Public visitors are anonymous: bookmarks, history and the display nickname
 * are stored in their browser only, never on the server.
 */
const jsonHeaders = (extra: Record<string, string> = {}) => ({
	'Content-Type': 'application/json',
	'X-Requested-With': 'ca3d-fetch',
	...extra
});

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
			const res = await fetch('/geni/donghua', { credentials: 'same-origin' });
			const json = (await res.json()) as { donghua?: Donghua[] };
			return json.donghua || [];
		} catch (error) {
			console.warn('API Error', error);
			return [];
		}
	},

	fetchOneDonghua: async (id: string): Promise<Donghua | null> => {
		try {
			const res = await fetch(`/geni/donghua?id=${encodeURIComponent(id)}`, {
				credentials: 'same-origin'
			});
			if (!res.ok) return null;
			const json = (await res.json()) as { donghua?: Donghua };
			return json.donghua ?? null;
		} catch {
			return null;
		}
	},

	// ---- Admin actions (session cookie authorises these; no password in body) ----
	saveDonghua: async (data: Donghua[]) => {
		return fetch('/geni/donghua', {
			method: 'PUT',
			headers: jsonHeaders(),
			credentials: 'same-origin',
			body: JSON.stringify({ donghua: data })
		});
	},

	deleteDonghua: async (id: string) => {
		return fetch('/geni/donghua', {
			method: 'DELETE',
			headers: jsonHeaders(),
			credentials: 'same-origin',
			body: JSON.stringify({ id })
		});
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
	adminLogin: async (username: string, password: string) => {
		const res = await fetch('/api/auth/login', {
			method: 'POST',
			headers: jsonHeaders(),
			credentials: 'same-origin',
			body: JSON.stringify({ username, password })
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
