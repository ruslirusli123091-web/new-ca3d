<script lang="ts">
	import type { Donghua } from '$lib/types';
	import { search } from '$lib/stores/search';
	import MovieCard from '$components/common/MovieCard.svelte';
	import SidebarItem from '$components/common/SidebarItem.svelte';
	import SidebarButtons from '$components/common/SidebarButtons.svelte';
	import Icon from '$components/common/Icon.svelte';

	let { data }: { data: { donghua: Donghua[]; meta: Record<string, string> } } = $props();

	const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'] as const;
	const todayIndex = new Date().getDay();
	const defaultDay = DAYS[todayIndex === 0 ? 6 : todayIndex - 1];

	let activeDay = $state<string>(defaultDay);

	const catalogue = $derived(data.donghua ?? []);
	const items = $derived(
		catalogue
			.filter((d) => d.day?.includes(activeDay))
			.filter((d) => d.title.toLowerCase().includes($search.toLowerCase()))
	);
	const popular = $derived([...catalogue].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5));
	const suggestions = $derived([...catalogue].sort(() => 0.5 - Math.random()).slice(0, 5));

	// Titles per day, shown next to the weekday label.
	function countFor(day: string) {
		return catalogue.filter((d) => d.day?.includes(day)).length;
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
				<h1 class="font-display text-2xl font-bold text-content flex items-center gap-2.5">
					<Icon name="calendar" class="w-6 h-6 text-accent" />
					Jadwal rilis
				</h1>
				<p class="mt-1 text-sm text-content-subtle">
					Jadwal tayang donghua per hari. Hari ini: {defaultDay}.
				</p>
			</header>

			<!-- Weekday tabs: a scrollable segmented row instead of the previous
			     4-column grid that wrapped into two ragged rows on mobile. -->
			<div class="flex gap-1 p-1 rounded-xl bg-surface-0 overflow-x-auto scrollbar-hide mb-6">
				{#each DAYS as day (day)}
					<button
						type="button"
						onclick={() => (activeDay = day)}
						class="flex-1 min-w-fit whitespace-nowrap px-3.5 py-2 rounded-lg text-sm font-medium
						       transition-colors duration-150
						       {activeDay === day
							? 'bg-surface-3 text-content'
							: 'text-content-muted hover:text-content hover:bg-surface-2'}"
						aria-pressed={activeDay === day}
					>
						{day}
						{#if day === defaultDay}
							<span class="ml-1.5 w-1.5 h-1.5 rounded-full bg-accent inline-block align-middle"></span>
						{/if}
					</button>
				{/each}
			</div>

			{#if items.length === 0}
				<div class="card p-10 text-center">
					<Icon name="inbox" class="w-8 h-8 mx-auto text-content-subtle mb-3" />
					<p class="text-sm text-content-muted">Tidak ada judul yang tayang hari {activeDay}.</p>
				</div>
			{:else}
				<div class="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
					{#each items as item (item.id)}
						<MovieCard {item} />
					{/each}
				</div>
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
