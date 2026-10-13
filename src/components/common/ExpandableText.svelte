<script lang="ts">
	interface Props {
		text: string;
	}

	let { text }: Props = $props();
	let isExpanded = $state(false);

	const isLong = $derived(!!text && text.length > 200);
</script>

<div>
	<p
		class={[
			'text-text-muted leading-relaxed text-sm whitespace-pre-wrap transition-all',
			!isExpanded ? 'line-clamp-3' : ''
		].join(' ')}
	>
		{text}
	</p>
	{#if isLong}
		<button
			onclick={() => (isExpanded = !isExpanded)}
			class="mt-2 text-primary text-xs font-bold hover:text-text-main flex items-center gap-1 focus:outline-none"
		>
			{isExpanded ? 'Lebih Sedikit' : 'Selengkapnya'}
			<svg
				class={['w-3 h-3 transition-transform duration-300', isExpanded ? 'rotate-180' : ''].join(' ')}
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
	{/if}
</div>
