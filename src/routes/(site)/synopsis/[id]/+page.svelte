<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Donghua } from '$lib/types';
	import { bookmarks, history, toggleBookmark } from '$lib/stores/library';
	import { getOptimizedImageUrl } from '$lib/utils/helpers';
	import ExpandableText from '$components/common/ExpandableText.svelte';
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
			related: Donghua[];
			popular: Donghua[];
			meta: Meta;
			jsonLd: Record<string, unknown>;
		};
	} = $props();

	const item = $derived(data.item);
	const related = $derived(data.related ?? []);
	const popularList = $derived(data.popular ?? []);

	let activeChunk = $state(0);
	let isAscending = $state(true);

	// Bookmark state comes straight from localStorage — no account involved.
	const isBookmarked = $derived($bookmarks.includes(item.id));

	function handleToggleBookmark() {
		toggleBookmark(item.id);
	}

	const sortedEps = $derived(
		[...item.episodes].sort((a, b) => {
			const valA = parseFloat(a.ep);
			const valB = parseFloat(b.ep);
			return isAscending ? valA - valB : valB - valA;
		})
	);

	const firstEp = $derived(sortedEps[0]?.ep);

	const episodeChunks = $derived.by(() => {
		const chunkSize = 20;
		const chunks: typeof sortedEps[] = [];
		for (let i = 0; i < sortedEps.length; i += chunkSize) {
			chunks.push(sortedEps.slice(i, i + chunkSize));
		}
		return chunks;
	});

	async function handleShare() {
		if (navigator.share) {
			try {
				await navigator.share({
					title: item.title,
					text: `Nonton ${item.title} Sub Indo Gratis`,
					url: window.location.href
				});
			} catch (error) {
				console.log('Error sharing', error);
			}
		} else {
			navigator.clipboard.writeText(window.location.href);
			alert('Link berhasil disalin ke clipboard!');
		}
	}

	const formatEp = (ep: string) => (ep.length === 1 && !isNaN(parseInt(ep)) ? `0${ep}` : ep);
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

<div class="pb-20">
	<div class="relative w-full min-h-[500px] md:h-[500px] flex items-end">
		<div class="absolute inset-0 h-full">
			<img
				src={getOptimizedImageUrl(item.image, 1000)}
				class="w-full h-full object-cover blur-2xl opacity-40"
				alt=""
			/>
		</div>
		<div class="absolute inset-0 bg-gradient-to-t from-bg-main via-bg-main/80 to-transparent"></div>

		<div
			class="max-w-7xl mx-auto px-4 w-full flex flex-col md:flex-row items-center md:items-end pb-10 gap-8 relative z-10 pt-24 md:pt-20"
		>
			<div
				class="w-[160px] md:w-[240px] flex-shrink-0 bg-bg-card rounded-poster shadow-brutal p-2 rotate-2 hover:rotate-0 transition-transform duration-500 mx-auto md:mx-0"
			>
				<div class="aspect-[2/3] overflow-hidden rounded-[12px]">
					<img
						src={getOptimizedImageUrl(item.image, 400)}
						class="w-full h-full object-cover"
						alt={item.title}
					/>
				</div>
			</div>

			<div class="flex-1 text-center md:text-left w-full">
				<div class="flex items-center justify-center md:justify-start gap-2 mb-2">
					<span class="bg-primary px-2 py-0.5 rounded text-[10px] font-bold text-text-on-primary uppercase"
						>{item.type || 'Series'}</span
					>
					<span
						class={[
							'px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase',
							item.status === 'Completed'
								? 'bg-green-600'
								: item.status === 'Dropped'
									? 'bg-red-600'
									: 'bg-yellow-500 text-black'
						].join(' ')}
					>
						{item.status || 'Ongoing'}
					</span>
				</div>
				<h1 class="font-display text-3xl md:text-5xl font-black text-text-main mb-4 leading-tight drop-shadow">
					{item.title}
				</h1>

				<div class="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-text-muted font-bold mb-6">
					{#if item.rating}
						<span class="flex items-center gap-1 text-yellow-400">
							★ {item.rating.toFixed(1)}
						</span>
					{/if}
					<span class="flex items-center gap-1"
						><svg class="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
							/></svg
						>
						{item.views ? item.views.toLocaleString('id-ID') : 0}</span
					>
					<span>•</span>
					<span>{item.episodes.length} Episode</span>
					<span>•</span>
					<span>Update {item.day || '?'}</span>
				</div>

				<div class="flex flex-wrap justify-center md:justify-start gap-3 w-full">
					<button
						onclick={() => (firstEp ? goto(`/watch/${item.id}/${firstEp}`) : alert('Belum ada episode'))}
						class="brutal-press bg-primary hover:bg-primary-dark text-text-on-primary px-8 py-3 font-bold text-sm shadow-brutal flex items-center gap-2 w-full md:w-auto justify-center"
					>
						<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
						{firstEp ? `TONTON EP ${firstEp}` : 'BELUM ADA EPISODE'}
					</button>

					<button
						onclick={handleToggleBookmark}
						class={[
							'brutal-press w-12 h-12 flex items-center justify-center border-2 shadow-brutal-sm transition-colors',
							isBookmarked
								? 'bg-red-500 border-ink text-white'
								: 'bg-bg-card border-ink text-text-main hover:border-primary hover:text-primary'
						].join(' ')}
						title={isBookmarked ? 'Hapus dari favorit' : 'Simpan ke favorit'}
						aria-label={isBookmarked ? 'Hapus dari favorit' : 'Simpan ke favorit'}
					>
						<svg
							class="w-5 h-5"
							fill={isBookmarked ? 'currentColor' : 'none'}
							stroke="currentColor"
							viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
							/></svg
						>
					</button>

					<button
						onclick={handleShare}
						class="brutal-press w-12 h-12 flex items-center justify-center border-2 bg-bg-card border-ink text-text-main hover:border-primary hover:text-primary shadow-brutal-sm"
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
			</div>
		</div>
	</div>

	<div class="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
		<div class="md:col-span-2 space-y-8">
			<div class="bg-bg-secondary p-6">
				<h2 class="text-lg font-bold text-text-main mb-4">Sinopsis</h2>
				<ExpandableText text={item.synopsis} />
			</div>

			<div class="bg-bg-secondary p-5">
				<div class="flex justify-between items-center mb-5">
					<h2 class="text-lg font-bold text-text-main">Daftar Episode</h2>
					<div class="flex items-center gap-2">
						<button
							onclick={() => {
								isAscending = !isAscending;
								activeChunk = 0;
							}}
							class="brutal-press bg-bg-card text-text-muted px-3 py-1.5 text-xs font-bold hover:text-white transition"
						>
							{isAscending ? 'A-Z' : 'Z-A'}
						</button>
						{#if episodeChunks.length > 0}
							<div class="bg-bg-card text-text-muted px-3 py-1.5 text-xs font-bold">
								{episodeChunks[activeChunk][0].ep}-{episodeChunks[activeChunk][
									episodeChunks[activeChunk].length - 1
								].ep}
							</div>
						{/if}
					</div>
				</div>

				{#if episodeChunks.length > 1}
					<div class="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
						{#each episodeChunks as chunk, i (i)}
							<button
								onclick={() => (activeChunk = i)}
								class={[
									'brutal-press px-3 py-1.5 text-xs font-bold whitespace-nowrap transition border-2',
									activeChunk === i
										? 'bg-primary border-ink text-text-on-primary'
										: 'bg-bg-card border-ink text-text-muted hover:text-white'
								].join(' ')}
							>
								{chunk[0].ep}-{chunk[chunk.length - 1].ep}
							</button>
						{/each}
					</div>
				{/if}

				<div
					class="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-[500px] overflow-y-auto pr-1 custom-scroll"
				>
					{#each episodeChunks[activeChunk] ?? [] as e (e.ep)}
						{@const isWatched = $history.some((h) => h.id === item.id && h.ep === e.ep)}
						<a
							href={`/watch/${item.id}/${e.ep}`}
							class={[
								'brutal-press py-3 text-sm font-bold transition-all border-2 text-center block',
								isWatched
									? 'bg-primary border-ink text-text-on-primary shadow-brutal-sm'
									: 'bg-bg-main border-ink text-text-muted hover:bg-bg-card hover:text-text-main'
							].join(' ')}
						>
							{formatEp(e.ep)}
						</a>
					{/each}
				</div>
			</div>
		</div>

		<div class="md:col-span-1 flex flex-col gap-6">
			<div class="sticky top-24 flex flex-col gap-6">
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
					<div class="flex flex-col gap-1">
						{#each popularList as it, i (it.id)}
							<SidebarItem item={it} rank={i + 1} />
						{/each}
					</div>
				</div>

				<div class="bg-bg-secondary p-4 shadow-brutal-sm">
					<h2 class="font-bold text-text-main mb-4 flex items-center gap-2 text-sm">
						<span class="text-red-500">❤</span> You May Like
					</h2>
					<div class="flex flex-col gap-1">
						{#each related.slice(0, 5) as it, i (it.id)}
							<SidebarItem item={it} rank={i + 1} />
						{/each}
					</div>
					<SidebarButtons />
				</div>
			</div>
		</div>
	</div>
</div>
