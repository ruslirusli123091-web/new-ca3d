<script lang="ts">
	import { page } from '$app/stores';
	import type { Donghua } from '$lib/types';
	import MovieCard from '$components/common/MovieCard.svelte';
	import SidebarItem from '$components/common/SidebarItem.svelte';
	import SidebarButtons from '$components/common/SidebarButtons.svelte';
	import Pagination from '$components/common/Pagination.svelte';
	import { search } from '$lib/stores/search';

	let { data }: { data: Donghua[] } = $props();

	const ITEMS_PER_PAGE = 18;
	let pageNum = $state(1);

	const type = $derived($page.params.type);
	const filtered = $derived(
		data
			.filter((d) => (d.type || 'series') === type)
			.filter((d) => d.title.toLowerCase().includes($search.toLowerCase()))
	);
	const totalPages = $derived(Math.ceil(filtered.length / ITEMS_PER_PAGE));
	const paginated = $derived(filtered.slice((pageNum - 1) * ITEMS_PER_PAGE, pageNum * ITEMS_PER_PAGE));

	const popularList = $derived([...data].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5));
	const randomList = $derived([...data].sort(() => 0.5 - Math.random()).slice(0, 5));

	// Reset page when category changes
	$effect(() => {
		type;
		pageNum = 1;
	});

	function handlePageChange(p: number) {
		pageNum = p;
		document.getElementById('category-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
</script>

<svelte:head>
	<title>Arsip {type} - Chinese Anime 3D</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 py-8 min-h-screen">
	<div class="flex flex-col lg:flex-row gap-8">
		<div class="flex-1">
			<div class="flex items-center gap-3 mb-8">
				<div class="p-2 bg-bg-secondary rounded-lg shadow-sm">
					<svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
						/></svg
					>
				</div>
				<h1 class="font-display text-2xl font-bold capitalize text-text-main uppercase tracking-tight">
					Arsip {type}
				</h1>
			</div>

			{#if filtered.length === 0}
				<div class="text-center p-10 bg-bg-secondary rounded-xl text-text-muted shadow-sm">
					Belum ada data untuk kategori ini.
				</div>
			{:else}
				<div
					id="category-grid"
					class="stagger-fade-grid grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 gap-3 gap-y-6 md:gap-x-4 md:gap-y-8 scroll-mt-20"
				>
					{#each paginated as item (item.id)}
						<MovieCard {item} />
					{/each}
				</div>
				<Pagination currentPage={pageNum} totalPages={totalPages} onPageChange={handlePageChange} />
			{/if}
		</div>

		<div class="w-full lg:w-80 flex-shrink-0">
			<div class="sticky top-24 flex flex-col gap-6">
				<div class="bg-bg-secondary rounded-xl p-4 shadow-sm">
					<h3 class="font-bold text-text-main mb-4 flex items-center gap-2">
						<svg class="w-5 h-5 text-red-hot" fill="none" stroke="currentColor" viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
							/><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"
							/></svg
						>
						Top Popular
					</h3>
					<div class="flex flex-col gap-1">
						{#each popularList as item, i (item.id)}
							<SidebarItem {item} rank={i + 1} />
						{/each}
					</div>
				</div>

				<div class="bg-bg-secondary rounded-xl p-4 shadow-sm">
					<h3 class="font-bold text-text-main mb-4 flex items-center gap-2 text-sm">
						<span class="text-red-500">❤</span> You May Like
					</h3>
					<div class="flex flex-col gap-1">
						{#each randomList as item, i (item.id)}
							<SidebarItem {item} rank={i + 1} />
						{/each}
					</div>
					<SidebarButtons />
				</div>
			</div>
		</div>
	</div>
</div>
