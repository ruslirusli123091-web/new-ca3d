import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * Theme = one accent colour + a light/dark mode. Both are stored locally and
 * applied by setting `data-theme` on <html>, which swaps the CSS variables in
 * app.css. Nothing here is decorative: each theme only changes the accent and
 * the surface palette.
 */
export const THEMES = [
	{ id: 'slate', label: 'Slate', swatch: '#5b8def' },
	{ id: 'ocean', label: 'Ocean', swatch: '#22d3ee' },
	{ id: 'forest', label: 'Forest', swatch: '#34d399' },
	{ id: 'amber', label: 'Amber', swatch: '#f0b429' }
] as const;

export const themeColor = writable<string>('slate');
export const themeMode = writable<'dark' | 'light'>('dark');

function applied(color: string, mode: string) {
	return mode === 'light' ? `${color}-light` : color;
}

function apply() {
	if (!browser) return;
	const color = get(themeColor);
	const mode = get(themeMode);
	document.documentElement.setAttribute('data-theme', applied(color, mode));
	try {
		localStorage.setItem('themeColor', color);
		localStorage.setItem('themeMode', mode);
	} catch {
		/* storage blocked — the theme still applies for this session */
	}
}

themeColor.subscribe(apply);
themeMode.subscribe(apply);

export function applyStoredTheme() {
	if (!browser) return;
	let color = 'slate';
	let mode: 'dark' | 'light' = 'dark';
	try {
		color = localStorage.getItem('themeColor') || 'slate';
		mode = localStorage.getItem('themeMode') === 'light' ? 'light' : 'dark';
	} catch {
		/* ignore */
	}
	themeColor.set(color);
	themeMode.set(mode);
}
