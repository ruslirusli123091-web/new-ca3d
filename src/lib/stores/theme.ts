import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

export interface ThemeState {
	color: string;
	mode: string;
}

function readInitial(): ThemeState {
	if (!browser) return { color: 'slate', mode: 'dark' };
	return {
		color: localStorage.getItem('themeColor') || 'slate',
		mode: localStorage.getItem('themeMode') || 'dark'
	};
}

const initial = readInitial();

export const themeColor = writable<string>(initial.color);
export const themeMode = writable<string>(initial.mode);

export function appliedTheme(color: string, mode: string): string {
	return mode === 'light' ? `${color}-light` : color;
}

function apply() {
	if (!browser) return;
	const color = get(themeColor);
	const mode = get(themeMode);
	document.documentElement.setAttribute('data-theme', appliedTheme(color, mode));
	localStorage.setItem('themeColor', color);
	localStorage.setItem('themeMode', mode);
}

themeColor.subscribe(apply);
themeMode.subscribe(apply);

export function applyStoredTheme() {
	if (!browser) return;
	const color = localStorage.getItem('themeColor') || 'slate';
	const mode = localStorage.getItem('themeMode') || 'dark';
	themeColor.set(color);
	themeMode.set(mode);
}

export const THEMES = [
	{ id: 'slate', label: 'Slate', color: '#5b8def' },
	{ id: 'ocean', label: 'Ocean', color: '#22d3ee' },
	{ id: 'forest', label: 'Forest', color: '#4ade80' },
	{ id: 'amber', label: 'Amber', color: '#fbbf24' }
];
