<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Donghua } from '$lib/types';
	import { getOptimizedImageUrl, getLatestEp } from '$lib/utils/helpers';
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
		<div class="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
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
	<!--
	  Hero.

	  Desktop (lg+): the whole visual — blurred backdrop included — is wrapped in
	  a container that matches the grid below, so the banner's left and right
	  edges line up with "Rilis terbaru" and "Paling banyak ditonton". The blur is
	  clipped by that container instead of bleeding to the screen edges, so the
	  area outside it is plain page background.

	  Mobile: the wrapper has no max-width and no rounding, so the backdrop stays
	  edge-to-edge exactly as before.
	-->
	{#if current}
		<section class="relative" aria-label="Rekomendasi utama">
			<div class="lg:max-w-7xl lg:mx-auto lg:px-4 lg:py-6">
				<!--
				  .hero-slide has a FIXED height (set in app.css per breakpoint).
				  Everything inside is positioned against that fixed box, so the
				  slider cannot change height when the slide changes.
				-->
				<div class="hero-slide lg:rounded-2xl lg:shadow-neu-md">
					<!-- Backdrop: blurred + darkened copy of the current poster -->
					{#each featured as item, i (item.id)}
						<div
							class="absolute inset-0 transition-opacity duration-700 ease-smooth
							       {i === bannerIndex ? 'opacity-100' : 'opacity-0'}"
							aria-hidden="true"
						>
							<img
								src={getOptimizedImageUrl(item.image, 400)}
								alt=""
								class="w-full h-full object-cover blur-3xl scale-125"
								loading={i === 0 ? 'eager' : 'lazy'}
							/>
							<div class="absolute inset-0 bg-surface-0/85"></div>
						</div>
					{/each}

					<div class="relative h-full px-4 py-5 sm:py-6 lg:px-6">
						<div class="hero-panel">
					<!-- Poster column: fixed width from CSS, so the panel height is
					     never driven by the image aspect ratio. -->
					<div class="hero-poster">
						<div class="aspect-[2/3] rounded-xl overflow-hidden bg-surface-2 shadow-xl h-full">
							<img
								src={getOptimizedImageUrl(current.image, 400)}
								alt={current.title}
								width="400"
								height="600"
								class="w-full h-full object-cover"
								loading="eager"
								fetchpriority="high"
							/>
						</div>
					</div>

					<!-- Text column: min-height is set in CSS so the panel height is
					     identical for every slide. -->
					<div class="hero-text text-center sm:text-left">
						<span class="badge-accent mb-1.5 sm:mb-3 self-start">Baru ditambahkan</span>

						<h1
							class="font-display text-xl sm:text-2xl md:text-3xl font-bold leading-tight
							       text-content line-clamp-2 hero-title"
						>
							{current.title}
						</h1>

						<!-- Metadata on its own inset panel so it never sits directly
						     on the artwork. -->
						<div class="hero-meta mt-2 sm:mt-3.5">
							{#if current.rating}
								<span
									class="inline-flex items-center gap-1 font-semibold tabular-nums"
									style="color: var(--warning)"
								>
									<Icon name="star" class="w-3.5 h-3.5" />
									{current.rating.toFixed(1)}
									<span class="text-content-subtle font-normal">/ 10</span>
								</span>
							{/if}
							{#if getLatestEp(current.episodes)}
								<span class="text-content tabular-nums font-medium">
									Episode {getLatestEp(current.episodes)}
								</span>
							{/if}
							<span class="text-content-muted tabular-nums">
								{(current.views || 0).toLocaleString('id-ID')} tayangan
							</span>
							{#if current.day}
								<span class="text-content-muted">{current.day}</span>
							{/if}
						</div>

						<div class="mt-3 sm:mt-4 flex items-center gap-2">
							<button
								type="button"
								onclick={() => goto(`/watch/${current.id}/${getLatestEp(current.episodes)}`)}
								class="btn-primary !px-3 !py-2 !text-xs sm:!px-4 sm:!py-2.5 sm:!text-sm"
							>
								<Icon name="play" class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
								Tonton sekarang
							</button>
							<a
								href={`/synopsis/${current.id}`}
								class="btn-secondary !px-3 !py-2 !text-xs sm:!px-4 sm:!py-2.5 sm:!text-sm"
								>Detail</a
							>
						</div>
					</div>
					</div>

					<!--
					  Slide indicators are pinned to the bottom edge of the fixed-height
					  slide, so they never move when the slide changes.
					-->
					<div class="absolute inset-x-0 bottom-2 flex justify-center gap-1.5 pointer-events-none">
						{#each featured as _, i (i)}
							<button
								type="button"
								onclick={() => (bannerIndex = i)}
								class="pointer-events-auto h-1.5 rounded-full transition-all duration-300 ease-smooth
								       {i === bannerIndex ? 'w-8 bg-accent' : 'w-4 bg-line-strong hover:bg-content-subtle'}"
								aria-label={`Slide ${i + 1}`}
								aria-current={i === bannerIndex}
							></button>
						{/each}
					</div>
				</div>
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

					<div class="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
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

						<div class="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
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
