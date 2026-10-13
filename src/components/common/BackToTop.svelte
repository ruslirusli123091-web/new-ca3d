<script lang="ts">
	import { onMount } from 'svelte';

	let visible = $state(false);

	onMount(() => {
		const onScroll = () => (visible = window.scrollY > 500);
		window.addEventListener('scroll', onScroll, { passive: true });
		onScroll();
		return () => window.removeEventListener('scroll', onScroll);
	});

	const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
</script>

<button
	onclick={scrollToTop}
	aria-label="Kembali ke atas"
	class={[
		'brutal-press fixed bottom-6 right-4 md:right-8 z-40 w-12 h-12 bg-primary text-text-on-primary shadow-brutal-sm flex items-center justify-center transition-all duration-300',
		visible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
	].join(' ')}
>
	<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7" />
	</svg>
</button>
