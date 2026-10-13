import { writable } from 'svelte/store';

/** Global search query shared between the Header and list pages. */
export const search = writable<string>('');
