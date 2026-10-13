<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		siteKey: string;
		onVerify: (token: string) => void;
	}

	let { siteKey, onVerify }: Props = $props();
	let container: HTMLDivElement;

	onMount(() => {
		if (!siteKey) return;
		let widgetId: string | undefined;

		const render = () => {
			const w = window as unknown as {
				turnstile?: {
					render: (el: HTMLElement, opts: Record<string, unknown>) => string;
					remove: (id: string) => void;
				};
			};
			if (!w.turnstile || !container) return;
			widgetId = w.turnstile.render(container, {
				sitekey: siteKey,
				theme: 'dark',
				callback: (token: string) => onVerify(token)
			});
		};

		const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile]');
		if (existing) {
			render();
		} else {
			const s = document.createElement('script');
			s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
			s.async = true;
			s.defer = true;
			s.dataset.turnstile = 'true';
			s.onload = render;
			document.head.appendChild(s);
		}

		return () => {
			const w = window as unknown as {
				turnstile?: { remove: (id: string) => void };
			};
			if (widgetId && w.turnstile) {
				try {
					w.turnstile.remove(widgetId);
				} catch {
					/* noop */
				}
			}
		};
	});
</script>

<div bind:this={container}></div>
