<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { applyStoredTheme } from '$lib/stores/theme';

	let { children } = $props();

	onMount(() => {
		// The inline script in app.html already applied the saved theme before
		// first paint; this only re-applies it if that script was blocked.
		applyStoredTheme();
	});
</script>

{@render children()}
