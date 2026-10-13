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

<div class="min-h-screen flex flex-col bg-surface-0 text-content">
	<Header data={data.donghua} onSearch={(v) => search.set(v)} />

	<main class="flex-1 pt-16">
		{@render children()}
	</main>

	<Footer />
	<BackToTop />
</div>
