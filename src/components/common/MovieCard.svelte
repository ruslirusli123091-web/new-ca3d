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

	/**
	 * Navigates straight to the synopsis page on a single click/tap.
	 *
	 * The previous version required two taps on touch devices (first tap only
	 * revealed the play overlay), which felt broken. The play overlay is now
	 * shown on press via CSS only, so a single tap both shows the feedback and
	 * navigates.
	 */
	let pressed = $state(false);
	let navigating = $state(false);

	async function open() {
		if (navigating) return;
		navigating = true;
		try {
			await api.trackView(item.id);
		} catch {
			/* a failed view count must not block navigation */
		}
		await goto(`/synopsis/${item.id}`);
	}
</script>

<article class="group h-full">
	<button
		type="button"
		onclick={open}
		class="movie-card flex flex-col h-full w-full text-left rounded-xl overflow-hidden
		       bg-surface-0 transition-all duration-200 ease-smooth"
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
				class="w-full h-full object-cover transition-transform duration-300 ease-smooth
				       group-hover:scale-[1.04]"
				loading="lazy"
				decoding="async"
			/>

			<!--
			  Play overlay. Visibility comes from CSS only (hover, focus, or the
			  :active press state), so a single tap both shows the feedback and
			  navigates — no two-step interaction.
			-->
			<div class="card-play-overlay" data-visible={pressed} aria-hidden="true">
				<span class="card-play-button">
					<Icon name="play" class="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />
				</span>
			</div>

			{#if latestEp}
				<span
					class="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px]
					       font-semibold bg-surface-0/85 text-content backdrop-blur-sm tabular-nums"
				>
					EP {latestEp}
				</span>
			{/if}

			{#if item.rating}
				<span
					class="absolute bottom-1.5 left-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5
					       rounded text-[10px] sm:text-[11px] font-semibold
					       bg-surface-0/85 backdrop-blur-sm tabular-nums"
					style="color: var(--warning)"
				>
					<Icon name="star" class="w-2.5 h-2.5" stroke={2} />
					{item.rating.toFixed(1)}
				</span>
			{/if}
		</div>

		<div class="p-1.5 sm:p-2.5 flex-1 flex flex-col">
			<h3
				class="text-[11px] sm:text-[13px] font-medium leading-snug text-content line-clamp-2
				       group-hover:text-accent transition-colors duration-150"
				title={item.title}
			>
				{item.title}
			</h3>

			<div class="mt-auto pt-1 hidden sm:flex items-center justify-between text-[11px] text-content-subtle">
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

			<!-- Views stay visible on mobile, just below the title -->
			<div class="mt-auto pt-1 flex sm:hidden items-center gap-1 text-[10px] text-content-subtle">
				<Icon name="eye" class="w-2.5 h-2.5" />
				<span class="tabular-nums">{(item.views || 0).toLocaleString('id-ID')}</span>
			</div>
		</div>
	</button>
</article>

