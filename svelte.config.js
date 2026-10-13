import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			routes: {
				include: ['/*'],
				// Static files served straight from the edge, bypassing the Worker.
				// Excluding them keeps SSR cost down. NOTE: robots.txt and
				// manifest.json must be listed here, otherwise the Worker would
				// render HTML for them instead of serving the real file.
				exclude: [
					'/_app/*',
					'/favicon.ico',
					'/*.png',
					'/*.jpg',
					'/*.jpeg',
					'/*.webp',
					'/*.svg',
					'/manifest.json',
					'/robots.txt',
					'/sw.js'
				]
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
