<script lang="ts">
	import ProgressBar from './ProgressBar.svelte';

	interface Props {
		label?: string;
		durationMs?: number;
	}

	let { label = 'Memuat...', durationMs = 2600 }: Props = $props();

	let progress = $state(0);

	$effect(() => {
		let raf: number;
		const start = performance.now();
		const duration = durationMs;

		const tick = (now: number) => {
			const t = Math.min(1, (now - start) / duration);
			const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
			progress = Math.round(eased * 100);
			if (t < 1) raf = requestAnimationFrame(tick);
		};

		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});
</script>

<div class="loading-bar-pill flex flex-col items-center gap-3">
	<ProgressBar currentValue={progress} color="lime" rounded="full" />
	<span class="text-xs font-bold text-text-muted uppercase tracking-wider">{label}</span>
</div>
