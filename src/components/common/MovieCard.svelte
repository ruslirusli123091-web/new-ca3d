<script lang="ts">
	import type { Donghua } from '$lib/types';
	import { api } from '$lib/api';
	import { getOptimizedImageUrl, getLatestEp, generateSrcSet } from '$lib/utils/helpers';
	import { goto } from '$app/navigation';
	import Icon from './Icon.svelte';

	interface Props {
		item: Donghua;
	}

	let { item }: Props = $props();

	const latestEp = $derived(getLatestEp(item.episodes));

	async function open() {
		await api.trackView(item.id);
		goto(`/synopsis/${item.id}`);
	}
</script>

<!--
  Card structure is deliberately simple: artwork, then a short meta block.
  Removed from the previous version: a rotating neumorphic frame, a gradient
  scrim, a full-width coloured type banner, an oversized play button, two
  competing status pills, and a star badge — five overlapping decorations on a
  single thumbnail.
-->
<article class="group">
	<button
		type="button"
		onclick={open}
		class="block w-full text-left rounded-xl overflow-hidden border border-line bg-surface-1
		       transition-colors duration-150 ease-smooth
		       hover:border-line-strong focus-visible:border-accent"
		aria-label={`Lihat ${item.title}`}
	>
		<div class="relative aspect-[2/3] overflow-hidden bg-surface-2">
			<img
				src={getOptimizedImageUrl(item.image, 300)}
				srcset={generateSrcSet(item.image, [180, 260, 320, 480])}
				sizes="(max-width: 640px) 33vw, (max-width: 1024px) 22vw, 200px"
				alt={item.title}
				width="300"
				height="450"
				class="w-full h-full object-cover transition-transform duration-300 ease-smooth group-hover:scale-[1.03]"
				loading="lazy"
				decoding="async"
			/>

			<!-- Episode count: the one piece of data viewers scan for. -->
			{#if latestEp}
				<span
					class="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[11px] font-semibold
					       bg-surface-0/85 text-content backdrop-blur-sm tabular-nums"
				>
					EP {latestEp}
				</span>
			{/if}

			<!-- Manual admin rating, shown only when it exists. -->
			{#if item.rating}
				<span
					class="absolute bottom-2 left-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md
					       text-[11px] font-semibold bg-surface-0/85 backdrop-blur-sm tabular-nums"
					style="color: var(--warning)"
				>
					<Icon name="star" class="w-3 h-3" stroke={2} />
					{item.rating.toFixed(1)}
				</span>
			{/if}
		</div>

		<div class="p-2.5">
			<h3
				class="text-[13px] font-medium leading-snug text-content line-clamp-2
				       group-hover:text-accent transition-colors duration-150"
				title={item.title}
			>
				{item.title}
			</h3>

			<div class="mt-1.5 flex items-center justify-between text-[11px] text-content-subtle">
				<span class="inline-flex items-center gap-1 tabular-nums">
					<Icon name="eye" class="w-3 h-3" />
					{(item.views || 0).toLocaleString('id-ID')}
				</span>
				{#if item.status && item.status !== 'Ongoing'}
					<span
						class="font-medium"
						style="color: {item.status === 'Completed' ? 'var(--positive)' : 'var(--critical)'}"
					>
						{item.status}
					</span>
				{/if}
			</div>
		</div>
	</button>
</article>
