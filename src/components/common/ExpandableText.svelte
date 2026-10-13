<script lang="ts">
	interface Props {
		text: string;
	}

	let { text }: Props = $props();
	let isExpanded = $state(false);

	const isLong = $derived(!!text && text.length > 240);
</script>

<div>
	<p
		class="text-sm leading-relaxed text-content-muted whitespace-pre-wrap
		       {isExpanded ? '' : 'line-clamp-3'}"
	>
		{text}
	</p>
	{#if isLong}
		<button
			type="button"
			onclick={() => (isExpanded = !isExpanded)}
			class="mt-2 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
			aria-expanded={isExpanded}
		>
			{isExpanded ? 'Tampilkan lebih sedikit' : 'Selengkapnya'}
		</button>
	{/if}
</div>
