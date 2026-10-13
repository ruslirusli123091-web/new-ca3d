<script lang="ts">
	interface Props {
		currentPage: number;
		totalPages: number;
		onPageChange: (page: number) => void;
	}

	let { currentPage, totalPages, onPageChange }: Props = $props();

	const pages = $derived.by(() => {
		const out: number[] = [];
		const maxVisibleButtons = 5;
		let startPage = Math.max(1, currentPage - 2);
		const endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1);
		if (endPage - startPage < maxVisibleButtons - 1) {
			startPage = Math.max(1, endPage - maxVisibleButtons + 1);
		}
		for (let i = startPage; i <= endPage; i++) out.push(i);
		return out;
	});
</script>

{#if totalPages > 1}
	<div class="flex items-center justify-center gap-2 mt-8 animate-fade-in">
		<button
			onclick={() => onPageChange(currentPage - 1)}
			disabled={currentPage === 1}
			aria-label="Halaman Sebelumnya"
			class="brutal-press w-10 h-10 flex items-center justify-center bg-bg-secondary text-text-muted hover:bg-bg-hover hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
				><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg
			>
		</button>

		{#each pages as i (i)}
			<button
				onclick={() => onPageChange(i)}
				aria-label={`Halaman ${i}`}
				class={[
					'brutal-press w-10 h-10 text-sm font-bold transition-all flex items-center justify-center border-2',
					currentPage === i
						? 'bg-primary border-ink text-text-on-primary shadow-brutal-sm'
						: 'bg-bg-secondary border-ink text-text-muted hover:bg-bg-hover hover:text-white'
				].join(' ')}
			>
				{i}
			</button>
		{/each}

		<button
			onclick={() => onPageChange(currentPage + 1)}
			disabled={currentPage === totalPages}
			aria-label="Halaman Selanjutnya"
			class="brutal-press w-10 h-10 flex items-center justify-center bg-bg-secondary text-text-muted hover:bg-bg-hover hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
				><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg
			>
		</button>
	</div>
{/if}
