<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from './Icon.svelte';

	let visible = $state(false);

	onMount(() => {
		const onScroll = () => (visible = window.scrollY > 600);
		window.addEventListener('scroll', onScroll, { passive: true });
		onScroll();
		return () => window.removeEventListener('scroll', onScroll);
	});

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

<button
	type="button"
	onclick={scrollToTop}
	aria-label="Kembali ke atas"
	class="fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full
	       bg-surface-2 shadow-lg
	       text-content-muted hover:text-content hover:bg-surface-3
	       transition-all duration-200 ease-smooth
	       {visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}"
>
	<Icon name="chevron-up" class="w-4 h-4 mx-auto" />
</button>
