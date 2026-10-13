import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * Theme = one accent colour + a light/dark mode.
 *
 * Persistence notes (this was previously broken):
 *
 * `writable('slate')` fires its subscriber immediately with the default value.
 * Because the subscriber wrote to localStorage, it overwrote the visitor's
 * saved theme with 'slate' on every page load, so the choice never survived a
 * refresh.
 *
 * Two changes fix that:
 *   1. The stores are initialised FROM localStorage, so the first subscriber
 *      call already carries the saved value.
 *   2. Persistence happens only inside the setters, never in a subscriber.
 */

const THEME_IDS = ['slate', 'ocean', 'forest', 'amber'] as const;

export const THEMES = [
	{ id: 'slate', label: 'Slate', swatch: '#5b8def' },
	{ id: 'ocean', label: 'Ocean', swatch: '#22d3ee' },
	{ id: 'forest', label: 'Forest', swatch: '#34d399' },
	{ id: 'amber', label: 'Amber', swatch: '#f0b429' }
] as const;

function readStoredColor(): string {
	if (!browser) return 'slate';
	try {
		const saved = localStorage.getItem('themeColor');
		return THEME_IDS.includes(saved as (typeof THEME_IDS)[number]) ? (saved as string) : 'slate';
	} catch {
		return 'slate';
	}
}

function readStoredMode(): 'dark' | 'light' {
	if (!browser) return 'dark';
	try {
		return localStorage.getItem('themeMode') === 'light' ? 'light' : 'dark';
	} catch {
		return 'dark';
	}
}

export const themeColor = writable<string>(readStoredColor());
export const themeMode = writable<'dark' | 'light'>(readStoredMode());

/** The value used for the `data-theme` attribute on <html>. */
export function appliedTheme(color: string, mode: string): string {
	return mode === 'light' ? `${color}-light` : color;
}

/** Write the theme to the document and to localStorage. */
export function persistTheme(): void {
	if (!browser) return;
	const color = get(themeColor);
	const mode = get(themeMode);

	document.documentElement.setAttribute('data-theme', appliedTheme(color, mode));

	try {
		localStorage.setItem('themeColor', color);
		localStorage.setItem('themeMode', mode);
	} catch {
		/* storage blocked — the theme still applies for this session */
	}
}

/** Change the accent colour. Persists immediately. */
export function setThemeColor(color: string): void {
	if (!THEME_IDS.includes(color as (typeof THEME_IDS)[number])) return;
	themeColor.set(color);
	persistTheme();
}

/** Change light/dark mode. Persists immediately. */
export function setThemeMode(mode: 'dark' | 'light'): void {
	themeMode.set(mode);
	persistTheme();
}

/**
 * Re-apply the stored theme to the document.
 *
 * The inline script in app.html already does this before first paint; this is
 * a safety net for when that script was blocked, and it must never write to
 * storage or it would clobber the saved value.
 */
export function applyStoredTheme(): void {
	if (!browser) return;
	const color = readStoredColor();
	const mode = readStoredMode();
	themeColor.set(color);
	themeMode.set(mode);
	document.documentElement.setAttribute('data-theme', appliedTheme(color, mode));
}
