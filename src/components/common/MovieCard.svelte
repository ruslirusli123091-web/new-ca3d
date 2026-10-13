<script lang="ts">
	import type { Donghua } from '$lib/types';
	import { api } from '$lib/api';
	import { getOptimizedImageUrl, getLatestEp, timeAgo, generateSrcSet } from '$lib/utils/helpers';
	import { goto } from '$app/navigation';

	interface Props {
		item: Donghua;
	}

	let { item }: Props = $props();

	const latestEp = $derived(getLatestEp(item.episodes));
	let showPlay = $state(false);

	async function handleClick() {
		await api.trackView(item.id);
		goto(`/synopsis/${item.id}`);
	}

	function handleCardClick() {
		if (
			typeof window !== 'undefined' &&
			window.matchMedia &&
			window.matchMedia('(hover: none)').matches
		) {
			if (!showPlay) {
				showPlay = true;
				return;
			}
		}
		handleClick();
	}
</script>

<div
	onclick={handleCardClick}
	onkeydown={(e) => e.key === 'Enter' && handleCardClick()}
	role="button"
	tabindex="0"
	class="group cursor-pointer flex flex-col h-full"
>
	<div
		class="bg-bg-card rounded-poster shadow-brutal-sm p-2 mb-2 transition-all duration-150 ease-out group-hover:-translate-y-1 group-hover:shadow-brutal"
	>
		<div class="relative aspect-[2/3] overflow-hidden rounded-[12px]">
			<div
				class="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-black/80 to-transparent z-[5] pointer-events-none"
			></div>

			{#if item.status}
				<div class="absolute left-1.5 bottom-6 md:bottom-auto md:top-1.5 z-10">
					<span
						class={[
							'text-[8px] md:text-[10px] font-bold px-2 py-0.5 rounded shadow-sm uppercase tracking-wider',
							item.status === 'Completed'
								? 'bg-green-600 text-white'
								: item.status === 'Dropped'
									? 'bg-red-600 text-white'
									: 'bg-yellow-500 text-black'
						].join(' ')}
					>
						{item.status}
					</span>
				</div>
			{/if}

			{#if latestEp != 0}
				<div class="absolute top-1.5 right-1.5 z-10">
					<span
						class="bg-gray-900 text-white text-[10px] md:text-xs font-bold px-2 py-0.5 rounded shadow-sm border border-white/10"
					>
						{latestEp}
					</span>
				</div>
			{/if}

			<div class="absolute bottom-0 left-0 w-full z-10">
				<div
					class={[
						'text-[10px] font-black tracking-wider py-1 text-center text-white shadow-sm uppercase',
						item.type === 'movie' ? 'bg-purple-600/90' : 'bg-blue-600/90'
					].join(' ')}
				>
					{item.type || 'SERIES'}
				</div>
			</div>

			<img
				src={getOptimizedImageUrl(item.image, 300)}
				srcset={generateSrcSet(item.image, [150, 220, 300, 450])}
				sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
				alt={item.title}
				width="300"
				height="450"
				class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
				loading="lazy"
			/>

			<div
				class={[
					'absolute inset-0 bg-black/20 md:bg-black/40 transition-opacity flex items-center justify-center z-20 md:opacity-0 md:group-hover:opacity-100',
					showPlay ? 'opacity-100' : 'opacity-0'
				].join(' ')}
			>
				<div
					class={[
						'w-9 h-9 md:w-10 md:h-10 rounded-full md:rounded-none bg-white/10 md:bg-primary backdrop-blur-[2px] md:backdrop-blur-none text-white md:text-text-on-primary flex items-center justify-center shadow-[0_0_0_1px_rgba(255,255,255,0.15),3px_3px_8px_rgba(0,0,0,0.35)] md:shadow-brutal-sm transform transition-transform duration-300 md:scale-0 md:group-hover:scale-100',
						showPlay ? 'scale-100' : 'scale-0'
					].join(' ')}
				>
					<svg class="w-4 h-4 md:w-5 md:h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"
						><path d="M8 5v14l11-7z" /></svg
					>
				</div>
			</div>
		</div>
	</div>

	<div class="flex flex-col gap-0.5 px-0.5">
		<h3
			class="font-bold text-xs md:text-sm leading-tight text-text-main group-hover:text-primary transition-colors line-clamp-2"
			title={item.title}
		>
			{item.title}
		</h3>
		<div class="flex items-center justify-between text-[10px] text-text-muted font-medium mt-0.5">
			<span class="flex items-center gap-1 min-w-0 truncate">
				<svg class="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"
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
				{item.views || 0}
			</span>
			<span class="whitespace-nowrap flex-shrink-0 text-right">{timeAgo(item.lastUpdated)}</span>
		</div>
	</div>
</div>
