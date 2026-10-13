<script lang="ts">
	/**
	 * Scrolling marquee, like the ticker on a TV advert.
	 *
	 * The hero metadata row holds a variable number of items (the rating is
	 * optional) and the text was getting clipped at narrow widths. Instead of
	 * shrinking the font further, the row scrolls continuously so every item
	 * stays readable.
	 *
	 * Accessibility: the content is duplicated to make the loop seamless, so the
	 * second copy is hidden from assistive tech, and the animation stops when
	 * the visitor prefers reduced motion.
	 */
	interface Props {
		/** Seconds for one full pass. */
		duration?: number;
		children: import('svelte').Snippet;
	}

	let { duration = 20, children }: Props = $props();
</script>

<div class="marquee" style="--marquee-duration: {duration}s">
	<div class="marquee-track">
		<div class="marquee-group">
			{@render children()}
		</div>
		<div class="marquee-group" aria-hidden="true">
			{@render children()}
		</div>
	</div>
</div>
