<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Donghua } from '$lib/types';
	import { bookmarks, history, toggleBookmark } from '$lib/stores/library';
	import { getOptimizedImageUrl } from '$lib/utils/helpers';
	import ExpandableText from '$components/common/ExpandableText.svelte';
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
			related: Donghua[];
			popular: Donghua[];
			meta: Meta;
			jsonLd: Record<string, unknown>;
		};
	} = $props();

	const item = $derived(data.item);
	const related = $derived(data.related ?? []);
	const popular = $derived(data.popular ?? []);

	let chunk = $state(0);
	let ascending = $state(true);

	const isBookmarked = $derived($bookmarks.includes(item.id));

	const episodes = $derived(
		[...item.episodes].sort((a, b) => {
			const x = parseFloat(a.ep);
			const y = parseFloat(b.ep);
			return ascending ? x - y : y - x;
		})
	);
	const firstEp = $derived(episodes[0]?.ep);

	// Episode numbers are grouped into blocks so a long series does not render
	// one enormous grid.
	const CHUNK_SIZE = 24;
	const chunks = $derived.by(() => {
		const out: (typeof episodes)[] = [];
		for (let i = 0; i < episodes.length; i += CHUNK_SIZE) {
			out.push(episodes.slice(i, i + CHUNK_SIZE));
		}
		return out;
	});

	const watched = $derived(new Set($history.filter((h) => h.id === item.id).map((h) => h.ep)));

	async function share() {
		if (navigator.share) {
			try {
				await navigator.share({ title: item.title, url: window.location.href });
			} catch {
				/* dismissed by the visitor */
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

<article class="max-w-7xl mx-auto px-4 py-6">
	<nav class="flex items-center gap-1.5 text-xs text-content-subtle mb-6" aria-label="Breadcrumb">
		<a href="/" class="inline-flex items-center min-h-[32px] px-1 -mx-1 hover:text-content transition-colors">
			Beranda
		</a>
		<span aria-hidden="true">/</span>
		<a
			href={`/category/${item.type || 'series'}`}
			class="inline-flex items-center min-h-[32px] px-1 -mx-1 hover:text-content transition-colors capitalize"
		>
			{item.type || 'series'}
		</a>
		<span aria-hidden="true">/</span>
		<span class="text-content-muted truncate py-2">{item.title}</span>
	</nav>

	<!--
	  Hero. The previous version stacked a blurred backdrop image, a second
	  masked image, a rotated neumorphic poster frame that straightened on hover,
	  two competing status pills and a hard-shadowed play button. This keeps one
	  poster, plain metadata and the two actions that actually matter.
	-->
	<div class="flex flex-col sm:flex-row gap-6">
		<div class="w-36 sm:w-44 flex-shrink-0 mx-auto sm:mx-0">
			<div class="aspect-[2/3] rounded-xl overflow-hidden border border-line bg-surface-2">
				<img
					src={getOptimizedImageUrl(item.image, 400)}
					alt={item.title}
					width="400"
					height="600"
					class="w-full h-full object-cover"
					fetchpriority="high"
				/>
			</div>
		</div>

		<div class="flex-1 min-w-0 text-center sm:text-left">
			<div class="flex items-center justify-center sm:justify-start gap-2 mb-2.5">
				<span class="badge-neutral uppercase">{item.type || 'series'}</span>
				{#if item.status === 'Completed'}
					<span class="badge-positive">Selesai</span>
				{:else if item.status === 'Dropped'}
					<span class="badge-critical">Dihentikan</span>
				{:else}
					<span class="badge-accent">Ongoing</span>
				{/if}
			</div>

			<h1 class="font-display text-2xl md:text-3xl font-bold text-content leading-tight">
				{item.title}
			</h1>

			<div
				class="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 text-sm"
			>
				{#if item.rating}
					<span
						class="inline-flex items-center gap-1 font-medium tabular-nums"
						style="color: var(--warning)"
					>
						<Icon name="star" class="w-4 h-4" stroke={2} />
						{item.rating.toFixed(1)}
						<span class="text-content-subtle font-normal">/ 10</span>
					</span>
				{/if}
				<span class="inline-flex items-center gap-1 text-content-muted tabular-nums">
					<Icon name="eye" class="w-4 h-4" />
					{(item.views || 0).toLocaleString('id-ID')}
				</span>
				<span class="text-content-muted tabular-nums">{item.episodes.length} episode</span>
				{#if item.day}
					<span class="text-content-muted">{item.day}</span>
				{/if}
			</div>

			<div class="mt-5 flex items-center justify-center sm:justify-start gap-2.5">
				<button
					type="button"
					onclick={() => firstEp && goto(`/watch/${item.id}/${firstEp}`)}
					disabled={!firstEp}
					class="btn-primary"
				>
					<Icon name="play" class="w-4 h-4" stroke={0} />
					{firstEp ? `Tonton episode ${firstEp}` : 'Belum ada episode'}
				</button>

				<button
					type="button"
					onclick={() => toggleBookmark(item.id)}
					class="btn-secondary !px-3"
					aria-pressed={isBookmarked}
					aria-label={isBookmarked ? 'Hapus dari koleksi' : 'Simpan ke koleksi'}
				>
					<Icon name="bookmark" class="w-4 h-4" stroke={isBookmarked ? 0 : 1.75} />
					<span class="hidden sm:inline">{isBookmarked ? 'Tersimpan' : 'Simpan'}</span>
				</button>

				<button type="button" onclick={share} class="btn-secondary !px-3" aria-label="Bagikan">
					<Icon name="share" class="w-4 h-4" />
				</button>
			</div>
		</div>
	</div>

	<div class="mt-10 flex flex-col lg:flex-row gap-10">
		<div class="flex-1 min-w-0 space-y-8">
			<section>
				<h2 class="section-title mb-4">Sinopsis</h2>
				<ExpandableText text={item.synopsis} />
			</section>

			<section>
				<div class="flex items-center justify-between mb-4">
					<h2 class="section-title">Episode</h2>
					<button
						type="button"
						onclick={() => {
							ascending = !ascending;
							chunk = 0;
						}}
						class="btn-ghost !py-2 !px-3 !text-xs min-h-[36px]"
					>
						<Icon name={ascending ? 'sort-asc' : 'sort-desc'} class="w-3.5 h-3.5" />
						{ascending ? 'Terlama' : 'Terbaru'}
					</button>
				</div>

				{#if chunks.length > 1}
					<div class="flex gap-1.5 mb-4 overflow-x-auto scrollbar-hide pb-1">
						{#each chunks as c, i (i)}
							<button
								type="button"
								onclick={() => (chunk = i)}
								class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap tabular-nums
								       transition-colors duration-150 border
								       {chunk === i
									? 'bg-accent text-accent-on border-accent'
									: 'bg-surface-2 text-content-muted border-line hover:text-content'}"
							>
								{c[0].ep}–{c[c.length - 1].ep}
							</button>
						{/each}
					</div>
				{/if}

				<div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
					{#each chunks[chunk] ?? [] as e (e.ep)}
						<a
							href={`/watch/${item.id}/${e.ep}`}
							class="flex items-center justify-center py-2.5 rounded-lg text-sm font-medium
							       tabular-nums border transition-colors duration-150
							       {watched.has(e.ep)
								? 'bg-accent-soft border-accent text-accent'
								: 'bg-surface-1 border-line text-content-muted hover:text-content hover:bg-surface-2'}"
						>
							{e.ep}
						</a>
					{/each}
				</div>
			</section>
		</div>

		<aside class="w-full lg:w-72 flex-shrink-0">
			<div class="sticky top-24 flex flex-col gap-5">
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

				<section class="card p-4">
					<h2 class="flex items-center gap-2 text-sm font-semibold text-content mb-3">
						<Icon name="film" class="w-4 h-4 text-accent" />
						Mungkin kamu suka
					</h2>
					<div class="flex flex-col gap-0.5">
						{#each related.slice(0, 5) as it, i (it.id)}
							<SidebarItem item={it} rank={i + 1} />
						{/each}
					</div>
					<SidebarButtons />
				</section>
			</div>
		</aside>
	</div>
</article>
