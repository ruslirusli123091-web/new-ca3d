<script lang="ts">
	import { page } from '$app/stores';
	import type { Donghua } from '$lib/types';
	import { search } from '$lib/stores/search';
	import MovieCard from '$components/common/MovieCard.svelte';
	import SidebarItem from '$components/common/SidebarItem.svelte';
	import SidebarButtons from '$components/common/SidebarButtons.svelte';
	import Pagination from '$components/common/Pagination.svelte';
	import Icon from '$components/common/Icon.svelte';

	let { data }: { data: { donghua: Donghua[]; meta: Record<string, string> } } = $props();

	const PER_PAGE = 18;
	let pageNum = $state(1);

	const catalogue = $derived(data.donghua ?? []);
	const type = $derived($page.params.type);

	const items = $derived(
		catalogue
			.filter((d) => (d.type || 'series') === type)
			.filter((d) => d.title.toLowerCase().includes($search.toLowerCase()))
	);
	const totalPages = $derived(Math.ceil(items.length / PER_PAGE));
	const pageItems = $derived(items.slice((pageNum - 1) * PER_PAGE, pageNum * PER_PAGE));

	const popular = $derived([...catalogue].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5));
	const suggestions = $derived([...catalogue].sort(() => 0.5 - Math.random()).slice(0, 5));

	// Reset to page 1 when the category changes.
	$effect(() => {
		type;
		pageNum = 1;
	});

	function changePage(p: number) {
		pageNum = p;
		document.getElementById('category-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
</script>

<svelte:head>
	<title>{data.meta.title} — Chinese Anime 3D</title>
	<meta name="description" content={data.meta.description} />
	<link rel="canonical" href={data.meta.canonical} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={data.meta.title} />
	<meta property="og:description" content={data.meta.description} />
	<meta property="og:url" content={data.meta.canonical} />
</svelte:head>

<div class="max-w-7xl mx-auto px-4 py-8">
	<div class="flex flex-col lg:flex-row gap-10">
		<div class="flex-1 min-w-0">
			<header class="mb-6">
				<h1 class="font-display text-2xl font-bold text-content capitalize">
					{type === 'movie' ? 'Movie' : 'Series'}
				</h1>
				<p class="mt-1 text-sm text-content-subtle">
					{items.length} judul ditemukan
				</p>
			</header>

			{#if items.length === 0}
				<div class="card p-10 text-center">
					<Icon name="inbox" class="w-8 h-8 mx-auto text-content-subtle mb-3" />
					<p class="text-sm text-content-muted">Belum ada judul untuk kategori ini.</p>
				</div>
			{:else}
				<div id="category-grid" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 scroll-mt-20">
					{#each pageItems as item (item.id)}
						<MovieCard {item} />
					{/each}
				</div>

				<Pagination currentPage={pageNum} totalPages={totalPages} onPageChange={changePage} />
			{/if}
		</div>

		<aside class="w-full lg:w-72 flex-shrink-0">
			<div class="sticky top-24 flex flex-col gap-5">
				<section class="card p-4">
					<h2 class="flex items-center gap-2 text-sm font-semibold text-content mb-3">
						<Icon name="trending-up" class="w-4 h-4 text-accent" />
						Paling banyak ditonton
					</h2>
					<div class="flex flex-col gap-0.5">
						{#each popular as item, i (item.id)}
							<SidebarItem {item} rank={i + 1} />
						{/each}
					</div>
				</section>

				<section class="card p-4">
					<h2 class="flex items-center gap-2 text-sm font-semibold text-content mb-3">
						<Icon name="film" class="w-4 h-4 text-accent" />
						Mungkin kamu suka
					</h2>
					<div class="flex flex-col gap-0.5">
						{#each suggestions as item, i (item.id)}
							<SidebarItem {item} rank={i + 1} />
						{/each}
					</div>
					<SidebarButtons />
				</section>
			</div>
		</aside>
	</div>
</div>
