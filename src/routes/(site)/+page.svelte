<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Donghua } from '$lib/types';
	import { getOptimizedImageUrl, getLatestEp, generateSrcSet } from '$lib/utils/helpers';
	import { search } from '$lib/stores/search';
	import MovieCard from '$components/common/MovieCard.svelte';
	import SidebarItem from '$components/common/SidebarItem.svelte';
	import SidebarButtons from '$components/common/SidebarButtons.svelte';
	import Pagination from '$components/common/Pagination.svelte';
	import Icon from '$components/common/Icon.svelte';

	let { data }: { data: { donghua: Donghua[]; meta: Record<string, string> } } = $props();

	const catalogue = $derived(data.donghua ?? []);

	let bannerIndex = $state(0);
	let seriesPage = $state(1);
	let moviePage = $state(1);

	const SERIES_PER_PAGE = 18;
	const MOVIE_PER_PAGE = 12;

	const filtered = $derived(
		catalogue.filter((d) => d.title.toLowerCase().includes($search.toLowerCase()))
	);
	const seriesAll = $derived(
		filtered
			.filter((d) => (d.type || 'series') === 'series')
			.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0))
	);
	const moviesAll = $derived(
		filtered.filter((d) => d.type === 'movie').sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0))
	);

	const featured = $derived(seriesAll.slice(0, 5));
	const seriesTotalPages = $derived(Math.ceil(seriesAll.length / SERIES_PER_PAGE));
	const seriesPageItems = $derived(
		seriesAll.slice((seriesPage - 1) * SERIES_PER_PAGE, seriesPage * SERIES_PER_PAGE)
	);
	const movieTotalPages = $derived(Math.ceil(moviesAll.length / MOVIE_PER_PAGE));
	const moviePageItems = $derived(
		moviesAll.slice((moviePage - 1) * MOVIE_PER_PAGE, moviePage * MOVIE_PER_PAGE)
	);

	const popular = $derived([...catalogue].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5));
	const suggestions = $derived([...catalogue].sort(() => 0.5 - Math.random()).slice(0, 5));

	const current = $derived(featured[bannerIndex]);

	// Autoplay pauses while the tab is hidden, so a background tab is not
	// cycling slides the visitor never sees.
	onMount(() => {
		let timer: ReturnType<typeof setInterval> | undefined;

		const start = () => {
			stop();
			timer = setInterval(() => {
				if (featured.length) bannerIndex = (bannerIndex + 1) % featured.length;
			}, 6000);
		};
		const stop = () => timer && clearInterval(timer);
		const onVisibility = () => (document.hidden ? stop() : start());

		start();
		document.addEventListener('visibilitychange', onVisibility);
		return () => {
			stop();
			document.removeEventListener('visibilitychange', onVisibility);
		};
	});

	function jumpTo(id: string, page: number) {
		if (id === 'latest-series') seriesPage = page;
		else moviePage = page;
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
</script>

<svelte:head>
	<title>{data.meta.title}</title>
	<meta name="description" content={data.meta.description} />
	<link rel="canonical" href={data.meta.canonical} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={data.meta.title} />
	<meta property="og:description" content={data.meta.description} />
	<meta property="og:image" content={data.meta.image} />
	<meta property="og:url" content={data.meta.canonical} />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

{#if catalogue.length === 0}
	<!-- Skeleton. Shapes match the real layout so the page does not jump when
	     content arrives, which the previous version did. -->
	<div class="max-w-7xl mx-auto px-4 py-8">
		<div class="h-[280px] md:h-[360px] rounded-2xl bg-surface-1 animate-pulse mb-10"></div>
		<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
			{#each Array(10) as _, i (i)}
				<div class="space-y-2">
					<div class="aspect-[2/3] rounded-xl bg-surface-1 animate-pulse"></div>
					<div class="h-3.5 w-4/5 rounded bg-surface-1 animate-pulse"></div>
					<div class="h-3 w-1/3 rounded bg-surface-1 animate-pulse"></div>
				</div>
			{/each}
		</div>
	</div>
{:else}
	<!-- Hero. The previous version stacked five gradient overlays, a blurred
	     backdrop image, a second masked image, a typewriter heading, an
	     animated counter and a coloured pill on top of one poster. -->
	{#if current}
		<section class="relative h-[300px] md:h-[400px] overflow-hidden" aria-label="Rekomendasi utama">
			{#each featured as item, i (item.id)}
				<div
					class="absolute inset-0 transition-opacity duration-700 ease-smooth
					       {i === bannerIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'}"
					aria-hidden={i !== bannerIndex}
				>
					<img
						src={getOptimizedImageUrl(item.image, 1200)}
						srcset={generateSrcSet(item.image, [640, 960, 1280])}
						sizes="100vw"
						alt=""
						width="1280"
						height="720"
						class="w-full h-full object-cover"
						loading={i === 0 ? 'eager' : 'lazy'}
						fetchpriority={i === 0 ? 'high' : 'low'}
					/>
					<div class="absolute inset-0 bg-gradient-to-t from-surface-0 via-surface-0/85 to-surface-0/30"></div>
				</div>
			{/each}

			<div class="relative h-full max-w-7xl mx-auto px-4 flex flex-col justify-end pb-8 md:pb-10">
				<span class="badge-accent w-fit mb-3">Baru ditambahkan</span>

				<h1 class="font-display text-2xl md:text-4xl font-bold text-content max-w-2xl line-clamp-2">
					{current.title}
				</h1>

				<div class="mt-3 flex items-center gap-3 text-sm text-content-muted">
					{#if getLatestEp(current.episodes)}
						<span class="tabular-nums">Episode {getLatestEp(current.episodes)}</span>
					{/if}
					{#if current.rating}
						<span class="inline-flex items-center gap-1 tabular-nums" style="color: var(--warning)">
							<Icon name="star" class="w-3.5 h-3.5" stroke={2} />
							{current.rating.toFixed(1)}
						</span>
					{/if}
					{#if current.day}
						<span>{current.day}</span>
					{/if}
				</div>

				<p class="mt-3 hidden md:block max-w-xl text-sm leading-relaxed text-content-muted line-clamp-2">
					{current.synopsis}
				</p>

				<div class="mt-5 flex items-center gap-3">
					<button
						type="button"
						onclick={() => goto(`/watch/${current.id}/${getLatestEp(current.episodes)}`)}
						class="btn-primary"
					>
						<Icon name="play" class="w-4 h-4" stroke={0} />
						Tonton sekarang
					</button>
					<a href={`/synopsis/${current.id}`} class="btn-secondary">Detail</a>
				</div>

				<!-- Slide indicators -->
				<div class="mt-6 flex gap-1.5">
					{#each featured as _, i (i)}
						<button
							type="button"
							onclick={() => (bannerIndex = i)}
							class="h-1 rounded-full transition-all duration-300 ease-smooth
							       {i === bannerIndex ? 'w-8 bg-accent' : 'w-4 bg-surface-3 hover:bg-line-strong'}"
							aria-label={`Slide ${i + 1}`}
							aria-current={i === bannerIndex}
						></button>
					{/each}
				</div>
			</div>
		</section>
	{/if}

	<div class="max-w-7xl mx-auto px-4 py-10">
		<div class="flex flex-col lg:flex-row gap-10">
			<div class="flex-1 min-w-0">
				<!-- Latest series -->
				<section id="latest-series" class="scroll-mt-20">
					<div class="flex items-baseline justify-between mb-5">
						<h2 class="section-title">Rilis terbaru</h2>
						<a
							href="/category/series"
							class="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
							>Lihat semua</a
						>
					</div>

					<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
						{#each seriesPageItems as item (item.id)}
							<MovieCard {item} />
						{/each}
					</div>

					<Pagination
						currentPage={seriesPage}
						totalPages={seriesTotalPages}
						onPageChange={(p) => jumpTo('latest-series', p)}
					/>
				</section>

				<!-- Movies -->
				{#if moviesAll.length}
					<section id="latest-movies" class="mt-14 scroll-mt-20">
						<div class="flex items-baseline justify-between mb-5">
							<h2 class="section-title">Movie</h2>
							<a
								href="/category/movie"
								class="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
								>Lihat semua</a
							>
						</div>

						<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
							{#each moviePageItems as item (item.id)}
								<MovieCard {item} />
							{/each}
						</div>

						<Pagination
							currentPage={moviePage}
							totalPages={movieTotalPages}
							onPageChange={(p) => jumpTo('latest-movies', p)}
						/>
					</section>
				{/if}
			</div>

			<!-- Sidebar -->
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
{/if}
