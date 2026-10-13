<script lang="ts">
	import type { Donghua } from '$lib/types';
	import { getOptimizedImageUrl, getLatestEp } from '$lib/utils/helpers';
	import { goto } from '$app/navigation';

	interface Props {
		item: Donghua;
		rank: number;
	}

	let { item, rank }: Props = $props();
</script>

<div
	onclick={() => goto(`/synopsis/${item.id}`)}
	onkeydown={(e) => e.key === 'Enter' && goto(`/synopsis/${item.id}`)}
	role="button"
	tabindex="0"
	class="flex gap-3 p-2 rounded-lg items-center cursor-pointer hover:bg-bg-card/50 transition border border-transparent hover:border-ink group"
>
	<div
		class={[
			'text-2xl font-black italic w-8 text-center',
			rank <= 3 ? 'text-primary' : 'text-text-muted'
		].join(' ')}
	>
		#{rank}
	</div>
	<div class="relative w-12 h-16 flex-shrink-0 rounded-poster overflow-hidden border border-ink">
		<img
			src={getOptimizedImageUrl(item.image, 100)}
			alt={item.title}
			width="48"
			height="64"
			class="w-full h-full object-cover"
		/>
	</div>
	<div class="flex-1 min-w-0">
		<h4 class="text-xs font-bold text-text-main mb-1 truncate group-hover:text-primary transition-colors">
			{item.title}
		</h4>
		<div class="flex gap-2 text-[10px] text-text-muted">
			<span class="bg-bg-card px-1 rounded border border-ink text-text-muted"
				>Ep {getLatestEp(item.episodes)}</span
			>
			<span>⭐ {item.views}</span>
		</div>
	</div>
</div>
