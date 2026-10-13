import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			routes: {
				include: ['/*'],
				exclude: ['/_app/*', '/favicon.ico', '/*.png', '/*.jpg', '/*.jpeg', '/*.webp', '/manifest.json', '/sw.js']
			}
		}),
		// CSRF protection: SvelteKit verifies the Origin header on form
		// submissions and non-GET requests. We additionally enforce it inside
		// hooks.server.ts for API routes.
		csrf: {
			trustedOrigins: []
		},
		alias: {
			$components: 'src/components',
			$lib: 'src/lib'
		}
	}
};

export default config;
