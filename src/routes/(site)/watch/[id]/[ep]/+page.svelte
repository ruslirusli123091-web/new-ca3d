<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Donghua, Episode } from '$lib/types';
	import { api } from '$lib/api';
	import { pushHistory } from '$lib/stores/library';
	import SidebarItem from '$components/common/SidebarItem.svelte';
	import SidebarButtons from '$components/common/SidebarButtons.svelte';

	interface Meta {
		title: string;
		description: string;
		canonical: string;
		image: string;
		type: string;
	}

	let {
		data
	}: {
		data: {
			item: Donghua;
			episode: Episode;
			prevEp: string | null;
			nextEp: string | null;
			popular: Donghua[];
			recommended: Donghua[];
			meta: Meta;
			jsonLd: Record<string, unknown>;
		};
	} = $props();

	const item = $derived(data.item);
	const ep = $derived(data.episode.ep);
	const popularList = $derived(data.popular ?? []);
	const recommendations = $derived(data.recommended ?? []);

	let forceLandscape = $state(false);
	let isAscending = $state(true);
	let currentUrl = $state('');
	let activeChunk = $state(0);

	// Streams are resolved in the browser (only needed client-side).
	const streams = $derived.by(() => {
		const url = data.episode.url;
		if (url && url.includes('|')) {
			return url
				.split('\n')
				.map((l) => {
					const p = l.split('|');
					return p.length >= 2 ? { name: p[0].trim(), url: p.slice(1).join('|').trim() } : null;
				})
				.filter(Boolean) as { name: string; url: string }[];
		}
		return [{ name: 'Default', url: url || '' }];
	});

	$effect(() => {
		const newUrl = streams[0]?.url || '';
		if (currentUrl !== newUrl) currentUrl = newUrl;

		// Record watch progress locally, then count the view once.
		pushHistory(item.id, ep);
		api.trackView(item.id);
	});

	const sortedEps = $derived(
		[...item.episodes].sort((a, b) => {
			const valA = parseFloat(a.ep);
			const valB = parseFloat(b.ep);
			return isAscending ? valA - valB : valB - valA;
		})
	);

	const episodeChunks = $derived.by(() => {
		const chunkSize = 20;
		const chunks: Episode[][] = [];
		for (let i = 0; i < sortedEps.length; i += chunkSize) {
			chunks.push(sortedEps.slice(i, i + chunkSize));
		}
		return chunks;
	});

	$effect(() => {
		const newIndex = episodeChunks.findIndex((chunk) => chunk.some((e) => e.ep === ep));
		if (newIndex !== -1 && newIndex !== activeChunk) activeChunk = newIndex;
	});

	async function handleShare() {
		if (navigator.share) {
			try {
				await navigator.share({ title: `${item.title} Episode ${ep}`, url: window.location.href });
			} catch (error) {
				console.log(error);
			}
		} else {
			navigator.clipboard.writeText(window.location.href);
			alert('Link disalin ke clipboard!');
		}
	}
</script>

<svelte:head>
	<title>{data.meta.title}</title>
	<meta name="description" content={data.meta.description} />
	<link rel="canonical" href={data.meta.canonical} />
	<meta property="og:type" content={data.meta.type} />
	<meta property="og:title" content={data.meta.title} />
	<meta property="og:description" content={data.meta.description} />
	<meta property="og:image" content={data.meta.image} />
	<meta property="og:url" content={data.meta.canonical} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={data.meta.title} />
	<meta name="twitter:description" content={data.meta.description} />
	<meta name="twitter:image" content={data.meta.image} />
	{@html `<script type="application/ld+json">${JSON.stringify(data.jsonLd)}<\/script>`}
</svelte:head>

<div class="max-w-7xl mx-auto px-4 py-8">
	<nav class="text-xs text-text-muted mb-4 flex items-center gap-2" aria-label="Breadcrumb">
		<a href="/" class="hover:text-primary">Home</a> /
		<a href={`/synopsis/${item.id}`} class="hover:text-primary">{item.title}</a> /
		<span class="text-text-main">Episode {ep}</span>
	</nav>

	<div class="flex flex-col lg:flex-row gap-8">
		<div class="flex-1 min-w-0">
			<div class="flex justify-end lg:hidden mb-2">
				<button
					onclick={() => (forceLandscape = !forceLandscape)}
					class="brutal-press bg-bg-card hover:bg-bg-hover text-text-main px-3 py-1.5 text-xs font-bold flex items-center gap-2 shadow-brutal-sm"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
						/></svg
					>
					{forceLandscape ? 'Matikan Rotasi' : 'Rotasi Layar'}
				</button>
			</div>

			<div
				class={[
					'w-full relative bg-black aspect-video overflow-hidden shadow-brutal-lg',
					forceLandscape ? 'forced-landscape' : ''
				].join(' ')}
			>
				{#if currentUrl}
					{#key currentUrl}
						<iframe
							src={currentUrl}
							title={`${item.title} Episode ${ep}`}
							class="w-full h-full"
							allowfullscreen
							allow="autoplay; fullscreen"
							sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
							referrerpolicy="no-referrer"
						></iframe>
					{/key}
				{:else}
					<div class="w-full h-full flex items-center justify-center text-text-muted text-sm">
						Server belum tersedia untuk episode ini.
					</div>
				{/if}
				{#if forceLandscape}
					<button
						onclick={() => (forceLandscape = false)}
						class="absolute top-4 right-8 bg-black/50 hover:bg-black/80 backdrop-blur text-white p-3 rounded-full z-50 transition"
						aria-label="Keluar rotasi"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
							><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg
						>
					</button>
				{/if}
			</div>

			<div class="bg-bg-secondary p-4 mt-4">
				<div class="flex flex-col gap-4">
					<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
						<div class="flex items-center gap-3">
							<h1 class="font-display text-lg font-bold text-text-main line-clamp-2 leading-tight">
								{item.title} Episode {ep}
							</h1>
							<button
								onclick={handleShare}
								class="text-text-muted hover:text-primary transition"
								title="Bagikan"
								aria-label="Bagikan"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
									/></svg
								>
							</button>
						</div>

						<div class="flex items-center gap-2 w-full md:w-auto">
							<div class="flex-1 md:flex-none">
								<select
									value={currentUrl}
									onchange={(e) => (currentUrl = e.currentTarget.value)}
									class="w-full bg-bg-card text-text-main text-xs font-bold py-2 px-3 outline-none focus:border-primary cursor-pointer appearance-none shadow-inner"
									aria-label="Pilih server"
								>
									{#each streams as s, i (i)}
										<option value={s.url}>SERVER {s.name.toUpperCase()}</option>
									{/each}
								</select>
							</div>
							<div class="flex gap-1">
								{#if data.prevEp}
									<a
										href={`/watch/${item.id}/${data.prevEp}`}
										rel="prev"
										class="brutal-press bg-bg-card hover:bg-bg-hover text-text-main px-3 py-2 text-xs font-bold shadow-brutal-sm inline-block"
										>Prev</a
									>
								{/if}
								{#if data.nextEp}
									<a
										href={`/watch/${item.id}/${data.nextEp}`}
										rel="next"
										class="brutal-press bg-primary hover:bg-primary-dark text-text-on-primary px-3 py-2 text-xs font-bold shadow-brutal-sm inline-block"
										>Next</a
									>
								{/if}
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Server-rendered episode description for SEO; the synopsis is not
			     repeated in the player UI, only exposed to crawlers. -->
			<section class="mt-6 bg-bg-secondary p-5">
				<h2 class="text-sm font-bold text-text-main mb-3 uppercase tracking-wide">
					Tentang Episode Ini
				</h2>
				<p class="text-sm text-text-muted leading-relaxed">
					{data.meta.description}
				</p>
			</section>
		</div>

		<div class="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6">
			<div class="bg-bg-secondary overflow-hidden shadow-brutal">
				<div
					class="p-3 bg-bg-card/80 backdrop-blur-sm border-b border-ink font-bold text-sm text-text-main flex justify-between items-center"
				>
					<span>Daftar Episode</span>
					<button
						onclick={() => {
							isAscending = !isAscending;
							activeChunk = 0;
						}}
						class="brutal-press text-[10px] bg-bg-card border border-ink text-text-muted px-2 py-1 rounded flex items-center gap-1 hover:bg-bg-hover hover:text-text-main transition"
					>
						{isAscending ? '1-99' : '99-1'}
					</button>
				</div>

				{#if episodeChunks.length > 1}
					<div class="px-3 pt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
						{#each episodeChunks as chunk, i (i)}
							<button
								onclick={() => (activeChunk = i)}
								class={[
									'brutal-press px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap transition border',
									activeChunk === i
										? 'bg-primary text-text-on-primary border-primary'
										: 'bg-bg-card text-text-muted border-ink hover:text-text-main'
								].join(' ')}
							>
								{chunk[0].ep}-{chunk[chunk.length - 1].ep}
							</button>
						{/each}
					</div>
				{/if}

				<div class="p-3 grid grid-cols-4 gap-2 max-h-[500px] overflow-y-auto custom-scroll">
					{#each episodeChunks[activeChunk] ?? [] as e (e.ep)}
						<a
							href={`/watch/${item.id}/${e.ep}`}
							class={[
								'brutal-press py-2 rounded text-xs font-bold transition text-center block',
								e.ep === ep
									? 'bg-primary text-text-on-primary'
									: 'bg-bg-card text-text-muted hover:bg-bg-hover hover:text-text-main'
							].join(' ')}
						>
							{e.ep}
						</a>
					{/each}
				</div>
			</div>

			<div class="bg-bg-secondary p-4 shadow-brutal">
				<h2 class="font-bold text-text-main mb-4 flex items-center gap-2 text-sm">
					<span class="text-red-500">❤</span> You May Like
				</h2>
				<div class="flex flex-col gap-1">
					{#each recommendations as d, i (d.id)}
						<SidebarItem item={d} rank={i + 1} />
					{/each}
				</div>
				<SidebarButtons />
			</div>

			<div class="bg-bg-secondary p-4 shadow-brutal-sm">
				<h2 class="font-bold text-text-main mb-4 flex items-center gap-2">
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
				</h2>
				<div class="flex flex-col gap-1 mb-6">
					{#each popularList as it, i (it.id)}
						<SidebarItem item={it} rank={i + 1} />
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
