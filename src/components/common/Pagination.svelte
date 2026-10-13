<script lang="ts">
	import Icon from './Icon.svelte';

	interface Props {
		currentPage: number;
		totalPages: number;
		onPageChange: (page: number) => void;
	}

	let { currentPage, totalPages, onPageChange }: Props = $props();

	const pages = $derived.by(() => {
		const out: (number | 'gap')[] = [];
		const total = totalPages;
		const current = currentPage;

		if (total <= 7) {
			for (let i = 1; i <= total; i++) out.push(i);
			return out;
		}

		out.push(1);
		if (current > 3) out.push('gap');

		const start = Math.max(2, current - 1);
		const end = Math.min(total - 1, current + 1);
		for (let i = start; i <= end; i++) out.push(i);

		if (current < total - 2) out.push('gap');
		out.push(total);
		return out;
	});
</script>

{#if totalPages > 1}
	<nav class="flex items-center justify-center gap-1 mt-8" aria-label="Navigasi halaman">
		<button
			type="button"
			onclick={() => onPageChange(currentPage - 1)}
			disabled={currentPage === 1}
			class="btn-icon disabled:opacity-40 disabled:pointer-events-none"
			aria-label="Halaman sebelumnya"
		>
			<Icon name="chevron-up" class="w-4 h-4 -rotate-90" />
		</button>

		{#each pages as p, i (i)}
			{#if p === 'gap'}
				<span class="w-9 text-center text-sm text-content-subtle select-none">…</span>
			{:else}
				<button
					type="button"
					onclick={() => onPageChange(p)}
					class="h-9 min-w-9 px-2.5 rounded-lg text-sm font-medium tabular-nums
					       transition-colors duration-150
					       {p === currentPage
						? 'bg-accent text-accent-on'
						: 'text-content-muted hover:text-content hover:bg-surface-2'}"
					aria-current={p === currentPage ? 'page' : undefined}
				>
					{p}
				</button>
			{/if}
		{/each}

		<button
			type="button"
			onclick={() => onPageChange(currentPage + 1)}
			disabled={currentPage === totalPages}
			class="btn-icon disabled:opacity-40 disabled:pointer-events-none"
			aria-label="Halaman berikutnya"
		>
			<Icon name="chevron-up" class="w-4 h-4 rotate-90" />
		</button>
	</nav>
{/if}
