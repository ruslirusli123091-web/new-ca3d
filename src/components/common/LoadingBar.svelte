<script lang="ts">
	/**
	 * Full-screen loading state.
	 *
	 * The previous version drew a pill-shaped progress bar with hard black
	 * borders, a colour-shifting fill, a percentage readout and a label, then
	 * forced a dark text colour on it. This is a single quiet indicator instead:
	 * the page already shows skeletons while data loads, so a second animated
	 * progress bar was redundant.
	 */
	interface Props {
		label?: string;
	}

	let { label = 'Memuat' }: Props = $props();
</script>

<div class="flex flex-col items-center gap-4" role="status" aria-live="polite">
	<div class="relative w-9 h-9">
		<div class="absolute inset-0 rounded-full border-2 border-line"></div>
		<div
			class="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
			style="border-top-color: var(--accent)"
		></div>
	</div>
	<span class="text-xs font-medium text-content-subtle">{label}…</span>
</div>
