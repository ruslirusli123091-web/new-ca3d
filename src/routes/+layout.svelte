<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import LoadingBar from '$components/common/LoadingBar.svelte';
	import { applyStoredTheme } from '$lib/stores/theme';

	let { children } = $props();

	const SPLASH_DURATION_MS = 2600;
	let showSplash = $state(true);

	onMount(() => {
		// Re-apply in case the inline <head> script was blocked.
		applyStoredTheme();
		const t = setTimeout(() => (showSplash = false), SPLASH_DURATION_MS);
		return () => clearTimeout(t);
	});
</script>

{@render children()}

{#if showSplash}
	<div class="fixed inset-0 z-[999] flex items-center justify-center bg-bg-main text-text-main px-4">
		<LoadingBar durationMs={SPLASH_DURATION_MS} />
	</div>
{/if}
