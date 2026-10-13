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
	import TypewriterText from '$components/common/TypewriterText.svelte';
	import CountUp from '$components/common/CountUp.svelte';

	let { data }: { data: { donghua: Donghua[]; meta: Record<string, string> } } = $props();

	// Catalogue is server-rendered into the page; the client only filters/paginates it.
	const catalogue = $derived(data.donghua ?? []);

	let bannerIndex = $state(0);
	let seriesPage = $state(1);
	let moviePage = $state(1);

	const itemsPerSeriesPage = 18;
	const itemsPerMoviePage = 10;

	const filtered = $derived(
		catalogue.filter((d) => d.title.toLowerCase().includes($search.toLowerCase()))
	);

	const seriesFull = $derived(
		filtered
			.filter((d) => (d.type || 'series') === 'series')
			.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0))
	);
	const moviesFull = $derived(
		filtered.filter((d) => d.type === 'movie').sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0))
	);

	const bannerItems = $derived(seriesFull.slice(0, 6));
	const totalSeriesPages = $derived(Math.ceil(seriesFull.length / itemsPerSeriesPage));
	const paginatedSeries = $derived(
		seriesFull.slice((seriesPage - 1) * itemsPerSeriesPage, seriesPage * itemsPerSeriesPage)
	);
	const totalMoviePages = $derived(Math.ceil(moviesFull.length / itemsPerMoviePage));
	const paginatedMovies = $derived(
		moviesFull.slice((moviePage - 1) * itemsPerMoviePage, moviePage * itemsPerMoviePage)
	);

	const popularList = $derived([...catalogue].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5));
	const randomList = $derived([...catalogue].sort(() => 0.5 - Math.random()).slice(0, 5));

	onMount(() => {
		const timer = setInterval(() => {
			if (bannerItems.length > 0) bannerIndex = (bannerIndex + 1) % bannerItems.length;
		}, 5000);
		return () => clearInterval(timer);
	});

	function handleSeriesPageChange(p: number) {
		seriesPage = p;
		document.getElementById('latest-series')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function handleMoviePageChange(p: number) {
		moviePage = p;
		document.getElementById('latest-movies')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
</script>

<svelte:head>
	<title>Chinese Anime 3D - Nonton Donghua Sub Indo</title>
	<meta
		name="description"
		content="Nonton streaming Chinese Anime 3D (Donghua) terbaru dengan subtitle Indonesia gratis. Update setiap hari."
	/>
	<link rel="canonical" href={data.meta.canonical as string} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Chinese Anime 3D - Nonton Donghua Sub Indo" />
	<meta
		property="og:description"
		content="Nonton streaming Chinese Anime 3D (Donghua) terbaru dengan subtitle Indonesia gratis."
	/>
	<meta property="og:url" content={data.meta.canonical} />
	<meta property="og:image" content={data.meta.image} />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

{#if catalogue.length === 0}
	<div class="pb-10 animate-pulse">
		<div class="w-full h-[280px] md:h-[450px] bg-bg-card mb-8 rounded-none md:rounded-b-2xl"></div>
		<div class="max-w-7xl mx-auto px-4">
			<div class="flex flex-col lg:flex-row gap-8">
				<div class="flex-1">
					<div class="h-8 w-48 bg-bg-card rounded mb-6"></div>
					<div
						class="stagger-fade-grid grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 gap-y-6 md:gap-x-4 md:gap-y-8"
					>
						{#each Array(10) as _, i (i)}
							<div class="flex flex-col gap-2">
								<div class="aspect-[3/4] bg-bg-card rounded-lg"></div>
								<div class="h-4 w-3/4 bg-bg-card rounded"></div>
								<div class="h-3 w-1/2 bg-bg-card rounded"></div>
							</div>
						{/each}
					</div>
				</div>
				<div class="w-full lg:w-80 flex-shrink-0 hidden lg:block">
					<div class="bg-bg-secondary rounded-xl p-4 h-96"></div>
				</div>
			</div>
		</div>
	</div>
{:else}
	<div class="pb-10">
		<div class="relative w-full h-[280px] md:h-[450px] overflow-hidden mb-8 group contain-content">
			{#each bannerItems as item, idx (item.id)}
				<div
					class={[
						'absolute inset-0 transition-opacity duration-700 ease-in-out',
						idx === bannerIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
					].join(' ')}
				>
					<div class="absolute inset-0">
						<img
							src={getOptimizedImageUrl(item.image, 800)}
							srcset={generateSrcSet(item.image, [400, 800, 1200])}
							sizes="100vw"
							alt=""
							width="1200"
							height="675"
							class="banner-bg-img w-full h-full object-cover opacity-60 scale-110"
							loading={idx === 0 ? 'eager' : 'lazy'}
						/>
					</div>
					<img
						src={getOptimizedImageUrl(item.image, 800)}
						srcset={generateSrcSet(item.image, [600, 800, 1200])}
						sizes="(min-width: 768px) 70vw, 100vw"
						alt={item.title}
						width="1200"
						height="675"
						class="banner-side-img absolute top-0 right-0 w-2/3 h-full object-cover mask-image-gradient opacity-80 hidden md:block"
						style="mask-image: linear-gradient(to left, black, transparent);"
					/>

					<div class="banner-fade-1 absolute inset-0 bg-gradient-to-t from-bg-main via-bg-main/60 to-transparent"></div>
					<div class="banner-fade-2 absolute inset-0 bg-gradient-to-r from-bg-main via-bg-main/40 to-transparent"></div>

					<div class="absolute bottom-0 left-0 w-full p-6 md:p-12 z-20 max-w-3xl">
						<span
							class="text-primary font-bold text-xs md:text-sm tracking-wider uppercase mb-2 block animate-fade-in"
							>Sedang Tayang</span
						>
						<h1
							class="font-display text-2xl md:text-5xl font-black mb-3 leading-tight drop-shadow text-text-main line-clamp-2"
						>
							<TypewriterText text={item.title} />
						</h1>
						<div class="flex items-center gap-3 text-xs md:text-sm text-text-muted mb-6 animate-fade-in">
							<span class="bg-primary/20 text-primary border-2 border-primary px-2 py-0.5"
								>Episode {getLatestEp(item.episodes)}</span
							>
							<span class="text-text-main"><CountUp value={item.views || 0} /> Views</span>
							<span class="text-text-main">{item.day || 'Random'}</span>
						</div>
						<p class="text-text-muted text-sm line-clamp-2 mb-6 max-w-lg hidden md:block">
							{item.synopsis?.length > 120 ? item.synopsis.substring(0, 120) + '...' : item.synopsis}
						</p>
						<button
							onclick={() => goto(`/watch/${item.id}/${getLatestEp(item.episodes)}`)}
							aria-label={`Nonton ${item.title}`}
							class="brutal-press bg-primary hover:bg-primary-dark text-text-on-primary px-6 py-2.5 text-sm font-bold inline-flex items-center gap-2 shadow-brutal-sm"
						>
							<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
							Nonton Sekarang
						</button>
					</div>
				</div>
			{/each}

			<div class="absolute top-4 right-4 flex gap-2 z-30">
				{#each bannerItems as _, i (i)}
					<button
						onclick={() => (bannerIndex = i)}
						aria-label={`Lihat slide ${i + 1}`}
						class="p-2 group focus:outline-none"
					>
						<span
							class={[
								'banner-dot block h-2 rounded-full transition-all',
								i === bannerIndex ? 'w-6 bg-primary' : 'w-2 bg-gray-600 group-hover:bg-white'
							].join(' ')}
						></span>
					</button>
				{/each}
			</div>
		</div>

		<div class="max-w-7xl mx-auto px-4">
			<div class="flex flex-col lg:flex-row gap-8">
				<div class="flex-1">
					<div id="latest-series" class="scroll-mt-20">
						<div class="flex justify-between items-end mb-6 border-b border-ink pb-3">
							<h2
								class="font-display text-xl font-bold text-text-main flex items-center gap-2 uppercase tracking-tight"
							>
								<span class="w-1.5 h-6 bg-primary"></span>
								Rilis Terbaru
							</h2>
							<a href="/category/series" class="text-xs font-bold text-primary hover:text-text-main transition-colors"
								>LIHAT SEMUA</a
							>
						</div>

						<div
							class="stagger-fade-grid grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 gap-y-6 md:gap-x-4 md:gap-y-8"
						>
							{#each paginatedSeries as item (item.id)}
								<MovieCard {item} />
							{/each}
						</div>

						<Pagination currentPage={seriesPage} totalPages={totalSeriesPages} onPageChange={handleSeriesPageChange} />
					</div>

					{#if moviesFull.length > 0}
						<div id="latest-movies" class="mt-12 scroll-mt-20">
							<div class="flex justify-between items-end mb-6 border-b border-ink pb-3">
								<h2
									class="font-display text-xl font-bold text-text-main flex items-center gap-2 uppercase tracking-tight"
								>
									<span class="w-1.5 h-6 bg-purple-600"></span>
									Movie Terbaru
								</h2>
								<a
									href="/category/movie"
									class="text-xs font-bold text-primary hover:text-text-main transition-colors">LIHAT SEMUA</a
								>
							</div>

							<div
								class="stagger-fade-grid grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 gap-y-6 md:gap-x-4 md:gap-y-8"
							>
								{#each paginatedMovies as item (item.id)}
									<MovieCard {item} />
								{/each}
							</div>

							<Pagination currentPage={moviePage} totalPages={totalMoviePages} onPageChange={handleMoviePageChange} />
						</div>
					{/if}
				</div>

				<div class="w-full lg:w-80 flex-shrink-0">
					<div class="sticky top-24 flex flex-col gap-6">
						<div class="bg-bg-secondary p-4 shadow-brutal-sm">
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

						<div class="bg-bg-secondary p-4 shadow-brutal-sm">
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
	</div>
{/if}
