<script lang="ts">
	import Icon from './Icon.svelte';

	/**
	 * Outbound links. The previous version stacked three full-width buttons in
	 * unrelated brand colours (blue, orange, yellow) directly under the content,
	 * which competed with the page's own accent colour. These are now quiet
	 * secondary actions that only show their brand tint on hover.
	 */
	const links = [
		{ href: 'https://t.me/+fNYCg8r1Jus0ZmI1', label: 'Gabung Telegram', icon: 'send' as const },
		{ href: 'https://t.me/info_ChineseAnime3D/2', label: 'Traktir / Donasi', icon: 'coffee' as const },
		{ href: 'https://www.snackvideo.com/HuangDonghua178', label: 'Snack Video', icon: 'video' as const }
	];
</script>

<div class="flex flex-col gap-1.5 mt-4 pt-4 border-t border-line">
	{#each links as link (link.href)}
		<a
			href={link.href}
			target="_blank"
			rel="noopener noreferrer"
			class="btn-secondary w-full !justify-start !py-2 !text-[13px]"
		>
			<Icon name={link.icon} class="w-4 h-4" />
			{link.label}
		</a>
	{/each}
</div>
