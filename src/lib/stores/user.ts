import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { PublicUser } from '$lib/types';

function readSession(): PublicUser | null {
	if (!browser) return null;
	try {
		const raw = localStorage.getItem('user_session');
		return raw ? (JSON.parse(raw) as PublicUser) : null;
	} catch {
		return null;
	}
}

export const user = writable<PublicUser | null>(readSession());

// Persist whenever the store changes so refreshes keep the session.
user.subscribe((value) => {
	if (!browser) return;
	if (value) localStorage.setItem('user_session', JSON.stringify(value));
	else localStorage.removeItem('user_session');
});

export const isAdmin = writable<boolean>(false);
