<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import Header from '$components/layout/Header.svelte';
	import Footer from '$components/layout/Footer.svelte';
	import BackToTop from '$components/common/BackToTop.svelte';
	import { search } from '$lib/stores/search';
	import type { Donghua } from '$lib/types';

	let { data, children }: { data: { donghua: Donghua[] }; children: import('svelte').Snippet } =
		$props();

	/**
	 * Ad loader (popunder).
	 *
	 * The vendor script only initialises once per document, so in an SPA it would
	 * otherwise fire on the first load and stay quiet afterwards. To keep
	 * popunder impressions across client-side navigation, the loader node is
	 * removed and re-appended every time the route changes.
	 *
	 * Scope guarantees:
	 *  - ONLY this ad script is reloaded; the page itself never reloads, other
	 *    assets stay cached, and navigation stays instant.
	 *  - This layout does not wrap `/ca3d`, so the admin dashboard never loads
	 *    or re-runs the ad script.
	 *  - The script node is identified by `data-ca3d-ad`, so nothing else on the
	 *    page is touched.
	 */
	const AD_SRC = 'https://abscloud.org/1/45a058537afdc6637f4b27d76241566d';
	let lastAdPath = '';

	function reloadAdScript(path: string): void {
		// One reload per actual page change; skip redundant subscribe fires.
		if (path === lastAdPath) return;
		lastAdPath = path;

		document.querySelectorAll('script[data-ca3d-ad]').forEach((el) => el.remove());

		const script = document.createElement('script');
		script.dataset.ca3dAd = 'true';
		script.dataset.cfasync = 'false';
		script.async = true;
		script.src = AD_SRC;
		document.body.appendChild(script);
	}

	onMount(() => {
		// Restore scroll position on back/forward, otherwise start at the top.
		// Also reload the ad script on each route change (popunder impressions).
		// Note: `page` is a Svelte store, so its immediate value is read via
		// the subscribe callback itself — `page.url` does not exist on the store.
		const unsub = page.subscribe(($page) => {
			if ($page.url.hash) return;
			window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
			reloadAdScript($page.url.pathname);
		});

		return unsub;
	});
</script>

<div class="min-h-screen flex flex-col bg-surface-0 text-content">
	<Header data={data.donghua} onSearch={(v) => search.set(v)} />

	<main class="flex-1 pt-16">
		{@render children()}
	</main>

	<Footer />
	<BackToTop />
</div>
