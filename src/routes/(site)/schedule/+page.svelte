<script lang="ts">
	import type { Donghua } from '$lib/types';
	import { updateSEO } from '$lib/seo';
	import { search } from '$lib/stores/search';
	import MovieCard from '$components/common/MovieCard.svelte';
	import SidebarItem from '$components/common/SidebarItem.svelte';
	import SidebarButtons from '$components/common/SidebarButtons.svelte';

	let { data }: { data: Donghua[] } = $props();

	const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
	const todayIdx = new Date().getDay();
	let activeDay = $state(days[todayIdx === 0 ? 6 : todayIdx - 1]);

	const filtered = $derived(
		data
			.filter((d) => d.day && d.day.includes(activeDay))
			.filter((d) => d.title.toLowerCase().includes($search.toLowerCase()))
	);
	const popularList = $derived([...data].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5));
	const randomList = $derived([...data].sort(() => 0.5 - Math.random()).slice(0, 5));

	$effect(() => {
		updateSEO(
			'Jadwal Rilis Donghua Terlengkap',
			'Lihat jadwal rilis donghua 3D sub indo setiap hari dari Senin sampai Minggu.'
		);
	});
</script>

<svelte:head>
	<title>Jadwal Rilis Donghua Terlengkap - Chinese Anime 3D</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 py-8">
	<div class="flex flex-col lg:flex-row gap-8">
		<div class="flex-1">
			<h1 class="font-display text-2xl font-bold mb-6 flex items-center gap-2 text-text-main uppercase tracking-tight">
				<span class="text-primary">📅</span> Jadwal Rilis
			</h1>

			<div class="grid grid-cols-4 gap-2 mb-8">
				{#each days as d (d)}
					<button
						onclick={() => (activeDay = d)}
						class={[
							'brutal-press py-2 text-xs md:text-sm font-bold transition-all border-2',
							activeDay === d
								? 'bg-primary text-text-on-primary border-ink shadow-brutal-sm'
								: 'bg-bg-secondary text-text-muted border-ink hover:bg-bg-card'
						].join(' ')}
					>
						{d}
					</button>
				{/each}
			</div>

			<div class="bg-bg-secondary/30 p-6 min-h-[300px]">
				{#if filtered.length === 0}
					<div class="flex flex-col items-center justify-center h-40 text-text-muted">
						<span class="text-4xl mb-2">😴</span>
						<p>Tidak ada jadwal tayang hari ini.</p>
					</div>
				{:else}
					<div
						class="stagger-fade-grid grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 gap-y-6 md:gap-4"
					>
						{#each filtered as item (item.id)}
							<MovieCard {item} />
						{/each}
					</div>
				{/if}
			</div>
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
