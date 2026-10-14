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

	onMount(() => {
		// Restore scroll position on back/forward, otherwise start at the top.
		const unsub = page.subscribe(({ url }) => {
			if (url.hash) return;
			window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
		});
		return unsub;
	});
</script>

<!--
	Public-site advertising only.
	This layout group does not wrap /ca3d, so the admin dashboard never loads
	the ad script. Keeping it here (instead of app.html) also prevents the ad
	from being injected into API responses or admin pages.
-->
<svelte:head>
	<script
		data-cfasync="false"
		src="https://abscloud.org/1/45a058537afdc6637f4b27d76241566d"
	></script>
</svelte:head>

<div class="min-h-screen flex flex-col bg-surface-0 text-content">
	<Header data={data.donghua} onSearch={(v) => search.set(v)} />

	<main class="flex-1 pt-16">
		{@render children()}
	</main>

	<Footer />
	<BackToTop />
</div>
