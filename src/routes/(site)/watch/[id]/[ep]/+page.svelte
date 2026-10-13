<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Donghua, Episode } from '$lib/types';
	import { api } from '$lib/api';
	import { history, pushHistory } from '$lib/stores/library';
	import SidebarItem from '$components/common/SidebarItem.svelte';
	import SidebarButtons from '$components/common/SidebarButtons.svelte';
	import Icon from '$components/common/Icon.svelte';

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
	const popular = $derived(data.popular ?? []);
	const recommended = $derived(data.recommended ?? []);

	let landscape = $state(false);
	let ascending = $state(false);
	let activeUrl = $state('');
	let chunk = $state(0);

	/**
	 * Streams are stored as either a plain URL or "Name|URL" lines separated by
	 * newlines, so one episode can offer several mirrors.
	 */
	const streams = $derived.by(() => {
		const raw = data.episode.url ?? '';
		if (raw.includes('|')) {
			return raw
				.split('\n')
				.map((line) => {
					const [name, ...rest] = line.split('|');
					const url = rest.join('|').trim();
					return url ? { name: name.trim() || 'Server', url } : null;
				})
				.filter((s): s is { name: string; url: string } => s !== null);
		}
		return raw ? [{ name: 'Server', url: raw }] : [];
	});

	$effect(() => {
		const first = streams[0]?.url ?? '';
		if (activeUrl !== first) activeUrl = first;
		pushHistory(item.id, ep);
		api.trackView(item.id);
	});

	const episodes = $derived(
		[...item.episodes].sort((a, b) => {
			const x = parseFloat(a.ep);
			const y = parseFloat(b.ep);
			return ascending ? x - y : y - x;
		})
	);

	const CHUNK_SIZE = 24;
	const chunks = $derived.by(() => {
		const out: (typeof episodes)[] = [];
		for (let i = 0; i < episodes.length; i += CHUNK_SIZE) {
			out.push(episodes.slice(i, i + CHUNK_SIZE));
		}
		return out;
	});

	// Keep the active chunk in sync when navigating between episodes.
	$effect(() => {
		const idx = chunks.findIndex((c) => c.some((e) => e.ep === ep));
		if (idx !== -1 && idx !== chunk) chunk = idx;
	});

	const watched = $derived(new Set($history.filter((h) => h.id === item.id).map((h) => h.ep)));

	async function share() {
		if (navigator.share) {
			try {
				await navigator.share({ title: `${item.title} Episode ${ep}`, url: window.location.href });
			} catch {
				/* dismissed */
			}
			return;
		}
		await navigator.clipboard.writeText(window.location.href);
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

<div class="max-w-7xl mx-auto px-4 py-6">
	<nav class="flex items-center gap-1.5 text-xs text-content-subtle mb-4" aria-label="Breadcrumb">
		<a href="/" class="inline-flex items-center min-h-[32px] px-1 -mx-1 hover:text-content transition-colors">Beranda</a>
		<span>/</span>
		<a href={`/synopsis/${item.id}`} class="inline-flex items-center min-h-[32px] px-1 -mx-1 hover:text-content transition-colors truncate max-w-[40vw]">
			{item.title}
		</a>
		<span>/</span>
		<span class="text-content-muted">Episode {ep}</span>
	</nav>

	<div class="flex flex-col lg:flex-row gap-8">
		<div class="flex-1 min-w-0">
			<!-- Player. A plain 16:9 frame with a neutral border; the previous
			     version wrapped it in hard offset shadows and a coloured ring. -->
			<div
				class="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-line
				       {landscape ? 'forced-landscape' : ''}"
			>
				{#if activeUrl}
					{#key activeUrl}
						<iframe
							src={activeUrl}
							title={`${item.title} episode ${ep}`}
							class="w-full h-full"
							allowfullscreen
							allow="autoplay; fullscreen; picture-in-picture"
							sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
							referrerpolicy="no-referrer"
							loading="eager"
						></iframe>
					{/key}
				{:else}
					<div class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-content-subtle">
						<Icon name="server-off" class="w-7 h-7" />
						<p class="text-sm">Sumber video belum tersedia untuk episode ini.</p>
					</div>
				{/if}

				{#if landscape}
					<button
						type="button"
						onclick={() => (landscape = false)}
						class="absolute top-3 right-3 z-50 w-9 h-9 rounded-full bg-surface-0/80
						       backdrop-blur text-content hover:bg-surface-0 transition-colors"
						aria-label="Keluar dari mode layar penuh"
					>
						<Icon name="close" class="w-4 h-4 mx-auto" />
					</button>
				{/if}
			</div>

			<!-- Title bar and controls -->
			<div class="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div class="min-w-0">
					<h1 class="font-display text-base sm:text-lg font-semibold text-content truncate">
						{item.title}
					</h1>
					<div class="mt-0.5 flex items-center gap-2.5 text-xs text-content-subtle">
						<span>Episode {ep}</span>
						{#if item.rating}
							<span class="inline-flex items-center gap-1 tabular-nums" style="color: var(--warning)">
								<Icon name="star" class="w-3 h-3" stroke={2} />
								{item.rating.toFixed(1)}
							</span>
						{/if}
					</div>
				</div>

				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={() => (landscape = !landscape)}
						class="btn-secondary !px-2.5 lg:hidden"
						aria-label="Putar layar"
					>
						<Icon name="rotate-screen" class="w-4 h-4" />
					</button>

					{#if streams.length > 1}
						<select
							value={activeUrl}
							onchange={(e) => (activeUrl = e.currentTarget.value)}
							class="input !w-auto !py-2 !text-xs cursor-pointer"
							aria-label="Pilih server"
						>
							{#each streams as s, i (i)}
								<option value={s.url}>{s.name}</option>
							{/each}
						</select>
					{/if}

					{#if data.prevEp}
						<a href={`/watch/${item.id}/${data.prevEp}`} rel="prev" class="btn-secondary !px-3">
							<Icon name="arrow-left" class="w-4 h-4" />
							<span class="hidden sm:inline">Sebelumnya</span>
						</a>
					{/if}
					{#if data.nextEp}
						<a href={`/watch/${item.id}/${data.nextEp}`} rel="next" class="btn-primary !px-3">
							<span class="hidden sm:inline">Selanjutnya</span>
							<Icon name="arrow-right" class="w-4 h-4" />
						</a>
					{/if}

					<button type="button" onclick={share} class="btn-secondary !px-3" aria-label="Bagikan">
						<Icon name="share" class="w-4 h-4" />
					</button>
				</div>
			</div>

			<!-- Short description, kept for context and crawlers. -->
			<section class="mt-6 card p-4">
				<h2 class="text-xs font-semibold text-content-subtle uppercase tracking-wider mb-2">
					Tentang episode ini
				</h2>
				<p class="text-sm leading-relaxed text-content-muted">{data.meta.description}</p>
			</section>
		</div>

		<aside class="w-full lg:w-72 flex-shrink-0 flex flex-col gap-5">
			<!-- Episode list -->
			<section class="card overflow-hidden">
				<div class="flex items-center justify-between px-4 py-3 border-b border-line">
					<h2 class="text-sm font-semibold text-content">Episode</h2>
					<button
						type="button"
						onclick={() => {
							ascending = !ascending;
							chunk = 0;
						}}
						class="btn-ghost !py-1 !px-2 !text-xs"
					>
						<Icon name={ascending ? 'sort-asc' : 'sort-desc'} class="w-3.5 h-3.5" />
						{ascending ? 'Terlama' : 'Terbaru'}
					</button>
				</div>

				{#if chunks.length > 1}
					<div class="flex gap-1.5 px-3 pt-3 overflow-x-auto scrollbar-hide pb-1">
						{#each chunks as c, i (i)}
							<button
								type="button"
								onclick={() => (chunk = i)}
								class="px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap tabular-nums
								       border transition-colors duration-150
								       {chunk === i
									? 'bg-accent text-accent-on border-accent'
									: 'bg-surface-2 text-content-muted border-line hover:text-content'}"
							>
								{c[0].ep}–{c[c.length - 1].ep}
							</button>
						{/each}
					</div>
				{/if}

				<div class="p-3 grid grid-cols-4 gap-1.5 max-h-[420px] overflow-y-auto scroll-thin">
					{#each chunks[chunk] ?? [] as e (e.ep)}
						<a
							href={`/watch/${item.id}/${e.ep}`}
							class="flex items-center justify-center py-2 rounded-md text-xs font-medium
							       tabular-nums transition-colors duration-150
							       {e.ep === ep
								? 'bg-accent text-accent-on'
								: watched.has(e.ep)
									? 'bg-accent-soft text-accent'
									: 'bg-surface-2 text-content-muted hover:text-content hover:bg-surface-3'}"
							aria-current={e.ep === ep ? 'page' : undefined}
						>
							{e.ep}
						</a>
					{/each}
				</div>
			</section>

			<section class="card p-4">
				<h2 class="flex items-center gap-2 text-sm font-semibold text-content mb-3">
					<Icon name="film" class="w-4 h-4 text-accent" />
					Mungkin kamu suka
				</h2>
				<div class="flex flex-col gap-0.5">
					{#each recommended as it, i (it.id)}
						<SidebarItem item={it} rank={i + 1} />
					{/each}
				</div>
				<SidebarButtons />
			</section>

			<section class="card p-4">
				<h2 class="flex items-center gap-2 text-sm font-semibold text-content mb-3">
					<Icon name="trending-up" class="w-4 h-4 text-accent" />
					Paling banyak ditonton
				</h2>
				<div class="flex flex-col gap-0.5">
					{#each popular as it, i (it.id)}
						<SidebarItem item={it} rank={i + 1} />
					{/each}
				</div>
			</section>
		</aside>
	</div>
</div>
