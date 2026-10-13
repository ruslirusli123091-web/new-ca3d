<script lang="ts">
	interface Props {
		text: string;
		class?: string;
		typeSpeed?: number;
		eraseSpeed?: number;
		pauseMs?: number;
	}

	let { text, class: className = '', typeSpeed = 60, eraseSpeed = 30, pauseMs = 2200 }: Props =
		$props();

	let display = $state('');

	$effect(() => {
		let cancelled = false;
		let timeoutId: ReturnType<typeof setTimeout>;

		const wait = (ms: number) =>
			new Promise<void>((resolve) => {
				timeoutId = setTimeout(resolve, ms);
			});

		const loop = async () => {
			await wait(300);
			while (!cancelled) {
				const current = text;

				for (let i = 0; i <= current.length; i++) {
					if (cancelled) return;
					display = current.slice(0, i);
					await wait(typeSpeed);
				}

				await wait(pauseMs);
				if (cancelled) return;

				const toErase = current;
				for (let i = toErase.length; i >= 0; i--) {
					if (cancelled) return;
					display = toErase.slice(0, i);
					await wait(eraseSpeed);
				}
				await wait(200);
			}
		};

		loop();

		return () => {
			cancelled = true;
			clearTimeout(timeoutId);
		};
	});
</script>

<span class={className}>
	{display}<span class="typewriter-cursor" aria-hidden="true">|</span>
</span>
