<script lang="ts">
	import type { Donghua } from '$lib/types';
	import { getOptimizedImageUrl, getLatestEp } from '$lib/utils/helpers';
	import Icon from './Icon.svelte';

	interface Props {
		item: Donghua;
		rank: number;
	}

	let { item, rank }: Props = $props();
</script>

<!--
  Ranked list row. The previous version mixed a large italic numeral, a rounded
  thumbnail, an emoji star and a bordered episode chip. This keeps one small
  fixed-width rank, one thumbnail size, and plain text for the rest.
-->
<a
	href={`/synopsis/${item.id}`}
	class="sidebar-row group flex items-center gap-3 rounded-lg p-2 transition-all duration-150 ease-smooth"
>
	<span
		class="w-5 flex-shrink-0 text-center text-xs font-semibold tabular-nums"
		class:text-accent={rank <= 3}
		class:text-content-subtle={rank > 3}
	>
		{rank}
	</span>

	<div class="w-9 h-12 flex-shrink-0 rounded-md overflow-hidden bg-surface-2">
		<img
			src={getOptimizedImageUrl(item.image, 90)}
			alt=""
			width="36"
			height="48"
			class="w-full h-full object-cover"
			loading="lazy"
			decoding="async"
		/>
	</div>

	<div class="flex-1 min-w-0">
		<h4
			class="text-[13px] font-medium text-content truncate
			       group-hover:text-accent transition-colors duration-150"
		>
			{item.title}
		</h4>
		<div class="mt-0.5 flex items-center gap-2 text-[11px] text-content-subtle">
			{#if getLatestEp(item.episodes)}
				<span class="tabular-nums">EP {getLatestEp(item.episodes)}</span>
			{/if}
			{#if item.rating}
				<span class="inline-flex items-center gap-0.5 tabular-nums" style="color: var(--warning)">
					<Icon name="star" class="w-2.5 h-2.5" stroke={2} />
					{item.rating.toFixed(1)}
				</span>
			{/if}
		</div>
	</div>
</a>
