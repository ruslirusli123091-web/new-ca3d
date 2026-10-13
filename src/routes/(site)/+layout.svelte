<script lang="ts">
	import Header from '$components/layout/Header.svelte';
	import Footer from '$components/layout/Footer.svelte';
	import BackToTop from '$components/common/BackToTop.svelte';
	import { search } from '$lib/stores/search';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	let { data, children } = $props();

	let searchQuery = $state('');
	search.subscribe((v) => (searchQuery = v));

	onMount(() => {
		// Scroll to top on navigation, like the original ClientApp.
		const unsub = page.subscribe(() => window.scrollTo(0, 0));
		return unsub;
	});
</script>

<div
	class="public-site-root min-h-screen bg-bg-main text-text-main font-sans selection:bg-primary selection:text-white pb-0 transition-colors duration-300 flex flex-col"
>
	<Header data={data.donghua} onSearch={(v) => search.set(v)} />
	<main class="pt-16 flex-grow">
		{@render children()}
	</main>
	<Footer />
	<BackToTop />
</div>
