<script lang="ts">
	/**
	 * Typewriter effect for the hero title.
	 *
	 * Types the text out character by character, holds it, then erases and
	 * restarts — the "TV advert" feel the hero was asked for. It is
	 * deliberately restrained:
	 *  - only the visible slide animates
	 *  - the surrounding heading carries the full title as its accessible name,
	 *    so assistive tech and crawlers never see a half-typed string
	 *  - `prefers-reduced-motion` shows the finished text immediately
	 */
	interface Props {
		text: string;
		/** ms per character while typing. */
		typeSpeed?: number;
		/** ms per character while erasing. */
		eraseSpeed?: number;
		/** ms to hold the finished text before erasing. */
		holdMs?: number;
	}

	let { text, typeSpeed = 55, eraseSpeed = 25, holdMs = 3000 }: Props = $props();

	let shown = $state('');
	let reducedMotion = $state(false);

	$effect(() => {
		if (typeof window === 'undefined') return;
		reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	});

	$effect(() => {
		const full = text ?? '';

		if (reducedMotion) {
			shown = full;
			return;
		}

		let cancelled = false;
		let timer: ReturnType<typeof setTimeout>;

		const wait = (ms: number) =>
			new Promise<void>((resolve) => {
				timer = setTimeout(resolve, ms);
			});

		const run = async () => {
			// Restart cleanly whenever the text changes (slide change).
			shown = '';
			await wait(150);

			while (!cancelled) {
				for (let i = 1; i <= full.length; i++) {
					if (cancelled) return;
					shown = full.slice(0, i);
					await wait(typeSpeed);
				}

				await wait(holdMs);
				if (cancelled) return;

				for (let i = full.length; i >= 0; i--) {
					if (cancelled) return;
					shown = full.slice(0, i);
					await wait(eraseSpeed);
				}
				await wait(300);
			}
		};

		run();

		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	});
</script>

<!--
  The visible text is animated, but the surrounding heading carries the full
  title as its accessible name, so screen readers and search engines always see
  the complete text rather than a half-typed string.
-->
<span aria-hidden="true">
	<span class="hero-typing">{shown}</span><span class="hero-caret"></span>
</span>
