<script lang="ts">
	interface Props {
		value: number;
		durationMs?: number;
		class?: string;
	}

	let { value, durationMs = 900, class: className = '' }: Props = $props();

	let display = $state(0);
	let from = 0;

	$effect(() => {
		const to = value;
		const startFrom = from;
		const start = performance.now();
		let raf: number;

		const tick = (now: number) => {
			const t = Math.min(1, (now - start) / durationMs);
			const eased = 1 - Math.pow(1 - t, 3);
			display = Math.round(startFrom + (to - startFrom) * eased);
			if (t < 1) {
				raf = requestAnimationFrame(tick);
			} else {
				from = to;
			}
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});
</script>

<span class={className}>{display.toLocaleString('id-ID')}</span>
