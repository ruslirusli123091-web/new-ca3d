<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { Donghua, Chat, Episode } from '$lib/types';
	import { api } from '$lib/api';
	import { history, nickname, pushHistory } from '$lib/stores/library';
	import { timeAgo } from '$lib/utils/helpers';
	import { updateSEO } from '$lib/seo';
	import SidebarItem from '$components/common/SidebarItem.svelte';
	import SidebarButtons from '$components/common/SidebarButtons.svelte';
	import Turnstile from '$components/auth/Turnstile.svelte';
	import LoadingBar from '$components/common/LoadingBar.svelte';

	let { data }: { data: Donghua[] } = $props();

	const id = $derived($page.params.id);
	const ep = $derived($page.params.ep);

	let localItem = $state<Donghua | null>(null);
	const item = $derived(localItem || data.find((d) => String(d.id) === String(id)));
	const episode = $derived(item?.episodes?.find((e) => e.ep === ep));

	let chatMsg = $state('');
	let chats = $state<Chat[]>([]);
	let forceLandscape = $state(false);
	let isAscending = $state(true);
	let currentUrl = $state('');
	let activeChunk = $state(0);
	let turnstileToken = $state('');
	let website = $state(''); // honeypot

	// Deep-link fallback fetch
	$effect(() => {
		if (!item && id && !localItem) {
			api.fetchOneDonghua(id).then((fetched) => {
				if (fetched) localItem = fetched;
			});
		}
	});

	$effect(() => {
		if (item && ep) {
			updateSEO(
				`Nonton ${item.title} Episode ${ep}`,
				`Streaming online ${item.title} episode ${ep} sub indo gratis hanya di Chinese Anime 3D.`,
				item.image
			);
		}
	});

	const streams = $derived.by(() => {
		if (!episode) return [] as { name: string; url: string }[];
		if (episode.url && episode.url.includes('|')) {
			return episode.url
				.split('\n')
				.map((l) => {
					const p = l.split('|');
					return p.length >= 2 ? { name: p[0].trim(), url: p.slice(1).join('|').trim() } : null;
				})
				.filter(Boolean) as { name: string; url: string }[];
		}
		return [{ name: 'Default', url: episode.url || '' }];
	});

	$effect(() => {
		if (episode) {
			const newUrl = streams[0]?.url || '';
			if (currentUrl !== newUrl) currentUrl = newUrl;

			// Record watch progress in this browser only (localStorage).
			if (id && ep) pushHistory(id, ep);

			api.fetchChats().then((allChats) => {
				chats = allChats.filter((c) => c.donghuaId === id && c.ep === ep);
			});
			if (item) api.trackView(item.id);
		}
	});

	const sortedEps = $derived(
		item && item.episodes
			? [...item.episodes].sort((a, b) => {
					const valA = parseFloat(a.ep);
					const valB = parseFloat(b.ep);
					return isAscending ? valA - valB : valB - valA;
				})
			: []
	);

	const episodeChunks = $derived.by(() => {
		const chunkSize = 20;
		const chunks: Episode[][] = [];
		for (let i = 0; i < sortedEps.length; i += chunkSize) {
			chunks.push(sortedEps.slice(i, i + chunkSize));
		}
		return chunks;
	});

	$effect(() => {
		const newIndex = episodeChunks.findIndex((chunk) => chunk.some((e) => e.ep === ep));
		if (newIndex !== -1 && newIndex !== activeChunk) activeChunk = newIndex;
	});

	const popularList = $derived([...data].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5));
	const recommendations = $derived(
		data.filter((d) => d.id !== item?.id).sort(() => 0.5 - Math.random()).slice(0, 5)
	);

	const currentIndex = $derived(sortedEps.findIndex((e) => e.ep === ep));
	const prevEp = $derived(currentIndex > 0 ? sortedEps[currentIndex - 1] : null);
	const nextEp = $derived(currentIndex < sortedEps.length - 1 ? sortedEps[currentIndex + 1] : null);

	async function sendChat(e: SubmitEvent) {
		e.preventDefault();
		if (!chatMsg.trim() || !item) return;
		if (website) return; // honeypot filled → silently drop

		// Nickname lives in the visitor's browser; ask once and remember it.
		let name = $nickname;
		if (!name) {
			const input = prompt('Masukkan nama tampilan untuk komentar (maks 24 karakter):');
			if (!input || !input.trim()) return;
			name = input.trim().slice(0, 24);
			nickname.set(name);
		}

		const text = chatMsg;
		const newChat: Partial<Chat> = {
			user: name,
			text,
			donghuaId: item.id,
			ep: ep!,
			timestamp: Date.now()
		};
		chats = [{ ...newChat, id: Date.now().toString() } as Chat, ...chats];
		chatMsg = '';
		try {
			await api.sendChat(newChat, turnstileToken || undefined);
		} catch (err) {
			alert((err as Error).message);
		}
	}

	async function handleShare() {
		if (!item) return;
		if (navigator.share) {
			try {
				await navigator.share({ title: `${item.title} Episode ${ep}`, url: window.location.href });
			} catch (error) {
				console.log(error);
			}
		} else {
			navigator.clipboard.writeText(window.location.href);
			alert('Link disalin ke clipboard!');
		}
	}
</script>

<svelte:head>
	{#if item && ep}
		<title>Nonton {item.title} Episode {ep} - Chinese Anime 3D</title>
		<meta
			name="description"
			content={`Streaming online ${item.title} episode ${ep} sub indo gratis hanya di Chinese Anime 3D.`}
		/>
		<meta property="og:title" content={`Nonton ${item.title} Episode ${ep}`} />
		<meta property="og:image" content={item.image} />
	{/if}
</svelte:head>

{#if !item}
	<div class="flex flex-col justify-center items-center h-[60vh] gap-4 px-4">
		<LoadingBar label="Memuat Data..." />
	</div>
{:else if !episode}
	<div class="text-center mt-20 text-text-main font-bold">Episode Tidak Ditemukan</div>
{:else}
	<div class="max-w-7xl mx-auto px-4 py-8">
		<div class="text-xs text-text-muted mb-4 flex items-center gap-2">
			<a href="/" class="hover:text-primary">Home</a> /
			<a href={`/synopsis/${id}`} class="hover:text-primary">{item.title}</a> /
			<span class="text-text-main">Episode {ep}</span>
		</div>

		<div class="flex flex-col lg:flex-row gap-8">
			<div class="flex-1 min-w-0">
				<div class="flex justify-end lg:hidden mb-2">
					<button
						onclick={() => (forceLandscape = !forceLandscape)}
						class="brutal-press bg-bg-card hover:bg-bg-hover text-text-main px-3 py-1.5 text-xs font-bold flex items-center gap-2 shadow-brutal-sm"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
							/></svg
						>
						{forceLandscape ? 'Matikan Rotasi' : 'Rotasi Layar'}
					</button>
				</div>

				<div
					class={[
						'w-full relative bg-black aspect-video overflow-hidden shadow-brutal-lg',
						forceLandscape ? 'forced-landscape' : ''
					].join(' ')}
				>
					{#if currentUrl}
						{#key currentUrl}
						<iframe
							src={currentUrl}
							title={`${item.title} Episode ${ep}`}
							class="w-full h-full"
							allowfullscreen
							allow="autoplay; fullscreen"
							sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
							referrerpolicy="no-referrer"
						></iframe>
						{/key}
					{:else}
						<div class="w-full h-full flex items-center justify-center text-text-muted text-sm">
							Server belum tersedia untuk episode ini.
						</div>
					{/if}
					{#if forceLandscape}
						<button
							onclick={() => (forceLandscape = false)}
							class="absolute top-4 right-8 bg-black/50 hover:bg-black/80 backdrop-blur text-white p-3 rounded-full z-50 transition"
							aria-label="Keluar rotasi"
						>
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg
							>
						</button>
					{/if}
				</div>

				<div class="bg-bg-secondary p-4 mt-4">
					<div class="flex flex-col gap-4">
						<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
							<div class="flex items-center gap-3">
								<h1 class="font-display text-lg font-bold text-text-main line-clamp-2 leading-tight">
									{item.title} Episode {ep}
								</h1>
								<button
									onclick={handleShare}
									class="text-text-muted hover:text-primary transition"
									title="Bagikan"
								>
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
										><path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
										/></svg
									>
								</button>
							</div>

							<div class="flex items-center gap-2 w-full md:w-auto">
								<div class="flex-1 md:flex-none">
									<select
										value={currentUrl}
										onchange={(e) => (currentUrl = e.currentTarget.value)}
										class="w-full bg-bg-card text-text-main text-xs font-bold py-2 px-3 outline-none focus:border-primary cursor-pointer appearance-none shadow-inner"
									>
										{#each streams as s, i (i)}
											<option value={s.url}>SERVER {s.name.toUpperCase()}</option>
										{/each}
									</select>
								</div>
								<div class="flex gap-1">
									{#if prevEp}
										<button
											onclick={() => goto(`/watch/${id}/${prevEp.ep}`)}
											class="brutal-press bg-bg-card hover:bg-bg-hover text-text-main px-3 py-2 text-xs font-bold shadow-brutal-sm"
											>Prev</button
										>
									{/if}
									{#if nextEp}
										<button
											onclick={() => goto(`/watch/${id}/${nextEp.ep}`)}
											class="brutal-press bg-primary hover:bg-primary-dark text-text-on-primary px-3 py-2 text-xs font-bold shadow-brutal-sm"
											>Next</button
										>
									{/if}
								</div>
							</div>
						</div>
					</div>
				</div>

				<div class="mt-6">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-bold text-text-main flex items-center gap-2">
							<span>💬</span> Komentar
							<span class="text-text-muted text-sm font-normal">({chats.length})</span>
						</h3>
					</div>

					<div class="bg-bg-secondary overflow-hidden">
						<div class="max-h-[500px] overflow-y-auto p-4 space-y-4 custom-scroll">
							{#if chats.length === 0}
								<div class="text-center py-8 text-text-muted text-sm">
									Belum ada komentar. Jadilah yang pertama!
								</div>
							{:else}
								{#each chats as c (c.id)}
									<div class="flex gap-3 group">
										<div
											class="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-gray-600 flex items-center justify-center font-bold text-gray-300 text-sm flex-shrink-0 shadow-sm"
										>
											{c.user[0]?.toUpperCase()}
										</div>
										<div class="flex-1 min-w-0">
											<div class="flex items-baseline gap-2">
												<span class="text-sm font-bold text-primary truncate">{c.user}</span>
												<span class="text-[10px] text-text-muted">{timeAgo(c.timestamp)}</span>
											</div>
											<div
												class="bg-bg-card/50 p-2.5 rounded-lg rounded-tl-none mt-1 border border-ink/50 text-text-main text-sm leading-relaxed group-hover:border-ink transition-colors"
											>
												{c.text}
											</div>
										</div>
									</div>
								{/each}
							{/if}
						</div>

						<form onsubmit={sendChat} class="p-4 border-t border-ink bg-bg-card/30">
							<div class="flex gap-3">
								<div
									class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
								>
									{($nickname || 'A')[0]?.toUpperCase()}
								</div>
								<div class="flex-1">
									<div class="relative">
										<input
											bind:value={chatMsg}
											placeholder="Tulis komentar..."
											maxlength="1000"
											class="w-full bg-bg-main px-4 py-2 text-sm text-text-main focus:border-primary outline-none transition shadow-inner"
										/>
										<button
											disabled={!chatMsg.trim()}
											class="brutal-press absolute right-1 top-1 bg-primary hover:bg-primary-dark disabled:bg-gray-700 disabled:cursor-not-allowed text-text-on-primary px-3 py-1.5 text-xs font-bold transition-all"
											>Kirim</button
										>
									</div>
									<input
										type="text"
										bind:value={website}
										tabindex="-1"
										autocomplete="off"
										aria-hidden="true"
										class="hidden"
										name="website"
									/>
									{#if $page.data.turnstileSiteKey}
										<div class="turnstile-slot mt-2">
											<Turnstile
												siteKey={$page.data.turnstileSiteKey}
												onVerify={(t) => (turnstileToken = t)}
											/>
										</div>
									{/if}
									<p class="text-[10px] text-text-muted mt-1">
										Komentar dikirim sebagai <span class="font-bold">{$nickname || 'nama pilihanmu'}</span>.
										Nama &amp; komentar tersimpan di server; bookmark dan riwayat tetap di browser kamu.
									</p>
								</div>
							</div>
						</form>
					</div>
				</div>
			</div>

			<div class="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6">
				<div class="bg-bg-secondary overflow-hidden shadow-brutal">
					<div
						class="p-3 bg-bg-card/80 backdrop-blur-sm border-b border-ink font-bold text-sm text-text-main flex justify-between items-center"
					>
						<span>Daftar Episode</span>
						<button
							onclick={() => {
								isAscending = !isAscending;
								activeChunk = 0;
							}}
							class="brutal-press text-[10px] bg-bg-card border border-ink text-text-muted px-2 py-1 rounded flex items-center gap-1 hover:bg-bg-hover hover:text-text-main transition"
						>
							{isAscending ? '1-99' : '99-1'}
						</button>
					</div>

					{#if episodeChunks.length > 1}
						<div class="px-3 pt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
							{#each episodeChunks as chunk, i (i)}
								<button
									onclick={() => (activeChunk = i)}
									class={[
										'brutal-press px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap transition border',
										activeChunk === i
											? 'bg-primary text-text-on-primary border-primary'
											: 'bg-bg-card text-text-muted border-ink hover:text-text-main'
									].join(' ')}
								>
									{chunk[0].ep}-{chunk[chunk.length - 1].ep}
								</button>
							{/each}
						</div>
					{/if}

					<div class="p-3 grid grid-cols-4 gap-2 max-h-[500px] overflow-y-auto custom-scroll">
						{#each episodeChunks[activeChunk] ?? [] as e (e.ep)}
							<button
								onclick={() => goto(`/watch/${item.id}/${e.ep}`)}
								class={[
									'brutal-press py-2 rounded text-xs font-bold transition',
									e.ep === ep
										? 'bg-primary text-text-on-primary'
										: 'bg-bg-card text-text-muted hover:bg-bg-hover hover:text-text-main'
								].join(' ')}
							>
								{e.ep}
							</button>
						{/each}
					</div>
				</div>

				<div class="bg-bg-secondary p-4 shadow-brutal">
					<h3 class="font-bold text-text-main mb-4 flex items-center gap-2 text-sm">
						<span class="text-red-500">❤</span> You May Like
					</h3>
					<div class="flex flex-col gap-1">
						{#each recommendations as d, i (d.id)}
							<SidebarItem item={d} rank={i + 1} />
						{/each}
					</div>
					<SidebarButtons />
				</div>

				<div class="bg-bg-secondary p-4 shadow-brutal-sm">
					<h3 class="font-bold text-text-main mb-4 flex items-center gap-2">
						<svg class="w-5 h-5 text-red-hot" fill="none" stroke="currentColor" viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
							/><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"
							/></svg
						>
						Top Popular
					</h3>
					<div class="flex flex-col gap-1 mb-6">
						{#each popularList as it, i (it.id)}
							<SidebarItem item={it} rank={i + 1} />
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
