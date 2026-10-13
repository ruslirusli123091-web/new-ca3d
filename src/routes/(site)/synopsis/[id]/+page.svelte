<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { Donghua, Chat } from '$lib/types';
	import { api } from '$lib/api';
	import { user as userStore } from '$lib/stores/user';
	import { getOptimizedImageUrl } from '$lib/utils/helpers';
	import { updateSEO } from '$lib/seo';
	import ExpandableText from '$components/common/ExpandableText.svelte';
	import SidebarItem from '$components/common/SidebarItem.svelte';
	import SidebarButtons from '$components/common/SidebarButtons.svelte';
	import AuthModal from '$components/auth/AuthModal.svelte';
	import LoadingBar from '$components/common/LoadingBar.svelte';

	let { data }: { data: Donghua[] } = $props();

	const id = $derived($page.params.id);
	let localItem = $state<Donghua | null>(null);
	const item = $derived(localItem || data.find((d) => String(d.id) === String(id)));

	let activeChunk = $state(0);
	let isAscending = $state(true);
	let showAuthModal = $state(false);
	let userRating = $state(0);
	let hoverRating = $state(0);
	let reviewText = $state('');
	let submittingReview = $state(false);
	let reviewMsg = $state('');

	// Deep-link fallback fetch
	$effect(() => {
		if (!item && id) {
			api.fetchOneDonghua(id).then((fetched) => {
				if (fetched) localItem = fetched;
			});
		}
	});

	$effect(() => {
		if (item) {
			updateSEO(
				item.title,
				`Nonton donghua ${item.title} sub indo gratis. ${item.synopsis ? item.synopsis.substring(0, 150) : ''}...`,
				item.image
			);
		}
	});

	const isBookmarked = $derived($userStore?.bookmarks?.includes(item?.id ?? '') ?? false);
	const popularList = $derived([...data].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5));
	const recommendations = $derived(
		data.filter((x) => x.id !== item?.id).sort(() => 0.5 - Math.random()).slice(0, 5)
	);

	const sortedEps = $derived(
		item
			? [...item.episodes].sort((a, b) => {
					const valA = parseFloat(a.ep);
					const valB = parseFloat(b.ep);
					return isAscending ? valA - valB : valB - valA;
				})
			: []
	);

	const firstEp = $derived(sortedEps[0]?.ep);

	const episodeChunks = $derived.by(() => {
		const chunkSize = 20;
		const chunks: typeof sortedEps[] = [];
		for (let i = 0; i < sortedEps.length; i += chunkSize) {
			chunks.push(sortedEps.slice(i, i + chunkSize));
		}
		return chunks;
	});

	async function toggleBookmark() {
		if (!item) return;
		if (!$userStore) {
			showAuthModal = true;
			return;
		}
		const currentBookmarks = $userStore.bookmarks || [];
		const newBookmarks = isBookmarked
			? currentBookmarks.filter((b) => b !== item.id)
			: [...currentBookmarks, item.id];
		userStore.update((u) => (u ? { ...u, bookmarks: newBookmarks } : u));
		try {
			await api.syncUser(newBookmarks, $userStore?.history);
		} catch (e) {
			console.error('Gagal menyimpan bookmark ke database', e);
		}
	}

	async function handleShare() {
		if (!item) return;
		if (navigator.share) {
			try {
				await navigator.share({
					title: item.title,
					text: `Nonton ${item.title} Sub Indo Gratis`,
					url: window.location.href
				});
			} catch (error) {
				console.log('Error sharing', error);
			}
		} else {
			navigator.clipboard.writeText(window.location.href);
			alert('Link berhasil disalin ke clipboard!');
		}
	}

	async function handleSubmitReview() {
		if (!item) return;
		if (!$userStore) {
			showAuthModal = true;
			return;
		}
		if (userRating === 0 || !reviewText.trim()) {
			reviewMsg = 'Kasih rating bintang dan tulis komentar dulu ya.';
			return;
		}
		submittingReview = true;
		reviewMsg = '';
		const review: Partial<Chat> = {
			id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			timestamp: Date.now(),
			user: $userStore.display_name || $userStore.username,
			text: reviewText.trim(),
			donghuaId: String(item.id),
			ep: 'rating',
			rating: userRating
		};
		try {
			await api.sendChat(review);
			reviewMsg = 'Makasih! Rating dan komentar kamu berhasil dikirim.';
			userRating = 0;
			reviewText = '';
		} catch {
			reviewMsg = 'Gagal mengirim, coba lagi ya.';
		} finally {
			submittingReview = false;
		}
	}

	function handleCancelReview() {
		userRating = 0;
		hoverRating = 0;
		reviewText = '';
		reviewMsg = '';
	}

	const formatEp = (ep: string) => (ep.length === 1 && !isNaN(parseInt(ep)) ? `0${ep}` : ep);
</script>

<svelte:head>
	{#if item}
		<title>Nonton {item.title} Sub Indo - Chinese Anime 3D</title>
		<meta
			name="description"
			content={`Nonton donghua ${item.title} sub indo gratis. ${item.synopsis ? item.synopsis.substring(0, 150) : ''}...`}
		/>
		<meta property="og:title" content={item.title} />
		<meta property="og:image" content={item.image} />
	{/if}
</svelte:head>

{#if !item}
	<div class="flex flex-col justify-center items-center h-[60vh] gap-4 px-4">
		<LoadingBar label="Menghubungkan ke Database D1..." />
	</div>
{:else}
	<div class="pb-20">
		<AuthModal
			isOpen={showAuthModal}
			onClose={() => (showAuthModal = false)}
			turnstileSiteKey={$page.data.turnstileSiteKey ?? ''}
		/>

		<div class="relative w-full min-h-[500px] md:h-[500px] flex items-end">
			<div class="absolute inset-0 h-full">
				<img
					src={getOptimizedImageUrl(item.image, 1000)}
					class="w-full h-full object-cover blur-2xl opacity-40"
					alt=""
				/>
			</div>
			<div class="absolute inset-0 bg-gradient-to-t from-bg-main via-bg-main/80 to-transparent"></div>

			<div
				class="max-w-7xl mx-auto px-4 w-full flex flex-col md:flex-row items-center md:items-end pb-10 gap-8 relative z-10 pt-24 md:pt-20"
			>
				<div
					class="w-[160px] md:w-[240px] flex-shrink-0 bg-bg-card rounded-poster shadow-brutal p-2 rotate-2 hover:rotate-0 transition-transform duration-500 mx-auto md:mx-0"
				>
					<div class="aspect-[2/3] overflow-hidden rounded-[12px]">
						<img
							src={getOptimizedImageUrl(item.image, 400)}
							class="w-full h-full object-cover"
							alt={item.title}
						/>
					</div>
				</div>

				<div class="flex-1 text-center md:text-left w-full">
					<div class="flex items-center justify-center md:justify-start gap-2 mb-2">
						<span
							class="bg-primary px-2 py-0.5 rounded text-[10px] font-bold text-text-on-primary uppercase"
							>{item.type || 'Series'}</span
						>
						<span
							class={[
								'px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase',
								item.status === 'Completed'
									? 'bg-green-600'
									: item.status === 'Dropped'
										? 'bg-red-600'
										: 'bg-yellow-500 text-black'
							].join(' ')}
						>
							{item.status || 'Ongoing'}
						</span>
					</div>
					<h1 class="font-display text-3xl md:text-5xl font-black text-text-main mb-4 leading-tight drop-shadow">
						{item.title}
					</h1>

					<div
						class="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-text-muted font-bold mb-6"
					>
						<span class="flex items-center gap-1"
							><span class="text-yellow-400">★</span>
							{item.views ? (item.views / 1000).toFixed(1) + 'K' : 'N/A'}</span
						>
						<span>•</span>
						<span>{item.episodes.length} Episode</span>
						<span>•</span>
						<span>Update {item.day || '?'}</span>
					</div>

					<div class="flex flex-wrap justify-center md:justify-start gap-3 w-full">
						<button
							onclick={() => (firstEp ? goto(`/watch/${item.id}/${firstEp}`) : alert('Belum ada episode'))}
							class="brutal-press bg-primary hover:bg-primary-dark text-text-on-primary px-8 py-3 font-bold text-sm shadow-brutal flex items-center gap-2 w-full md:w-auto justify-center"
						>
							<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
							{firstEp ? `TONTON EP ${firstEp}` : 'BELUM ADA EPISODE'}
						</button>

						<button
							onclick={toggleBookmark}
							class={[
								'brutal-press w-12 h-12 flex items-center justify-center border-2 shadow-brutal-sm transition-colors',
								isBookmarked
									? 'bg-red-500 border-ink text-white'
									: 'bg-bg-card border-ink text-text-main hover:border-primary hover:text-primary'
							].join(' ')}
							title="Bookmark"
						>
							<svg
								class="w-5 h-5"
								fill={isBookmarked ? 'currentColor' : 'none'}
								stroke="currentColor"
								viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
								/></svg
							>
						</button>

						<button
							onclick={handleShare}
							class="brutal-press w-12 h-12 flex items-center justify-center border-2 bg-bg-card border-ink text-text-main hover:border-primary hover:text-primary shadow-brutal-sm"
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
				</div>
			</div>
		</div>

		<div class="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
			<div class="md:col-span-2 space-y-8">
				<div class="bg-bg-secondary p-6">
					<h3 class="text-lg font-bold text-text-main mb-4">Sinopsis</h3>
					<ExpandableText text={item.synopsis} />
				</div>

				<div class="bg-bg-secondary p-6">
					<h3 class="text-lg font-bold text-text-main mb-4">Beri Rating &amp; Komentar</h3>
					{#if !$userStore}
						<div class="border-2 border-dashed border-ink p-5 text-center">
							<p class="text-sm text-text-muted mb-3">
								Silakan login dulu untuk memberi rating dan komentar setelah nonton.
							</p>
							<button
								onclick={() => (showAuthModal = true)}
								class="brutal-press bg-primary text-text-on-primary shadow-brutal-sm font-bold text-sm px-5 py-2"
							>
								Login Sekarang
							</button>
						</div>
					{:else}
						<div>
							<div class="flex items-center gap-1 mb-3">
								{#each [1, 2, 3, 4, 5] as star (star)}
									<button
										type="button"
										onclick={() => (userRating = star)}
										onmouseenter={() => (hoverRating = star)}
										onmouseleave={() => (hoverRating = 0)}
										aria-label={`Beri rating ${star} bintang`}
										class="text-3xl leading-none transition-colors"
										style="color: {(hoverRating || userRating) >= star
											? 'var(--primary)'
											: 'var(--neu-dark)'};"
									>
										★
									</button>
								{/each}
							</div>
							<textarea
								bind:value={reviewText}
								placeholder="Gimana menurutmu setelah nonton donghua ini?"
								rows="3"
								maxlength="1000"
								class="w-full bg-bg-main p-3 text-sm text-text-main focus:border-primary outline-none transition resize-none mb-3 shadow-inner"
							></textarea>
							{#if reviewMsg}
								<p class="text-xs font-bold text-primary mb-3">{reviewMsg}</p>
							{/if}
							<div class="flex items-center gap-3">
								<button
									type="button"
									onclick={handleCancelReview}
									disabled={submittingReview}
									class="brutal-press text-text-muted hover:text-white font-bold text-sm px-5 py-2 disabled:opacity-50"
								>
									Batal
								</button>
								<button
									type="button"
									onclick={handleSubmitReview}
									disabled={submittingReview}
									class="brutal-press bg-primary text-text-on-primary shadow-brutal-sm font-bold text-sm px-5 py-2 disabled:opacity-50"
								>
									{submittingReview ? 'Mengirim...' : 'Kirim'}
								</button>
							</div>
						</div>
					{/if}
				</div>

				<div class="bg-bg-secondary p-5">
					<div class="flex justify-between items-center mb-5">
						<h3 class="text-lg font-bold text-text-main">Daftar Episode</h3>
						<div class="flex items-center gap-2">
							<button
								onclick={() => {
									isAscending = !isAscending;
									activeChunk = 0;
								}}
								class="brutal-press bg-bg-card text-text-muted px-3 py-1.5 text-xs font-bold hover:text-white transition"
							>
								{isAscending ? 'A-Z' : 'Z-A'}
							</button>
							{#if episodeChunks.length > 0}
								<div class="bg-bg-card text-text-muted px-3 py-1.5 text-xs font-bold">
									{episodeChunks[activeChunk][0].ep}-{episodeChunks[activeChunk][
										episodeChunks[activeChunk].length - 1
									].ep}
								</div>
							{/if}
						</div>
					</div>

					{#if episodeChunks.length > 1}
						<div class="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
							{#each episodeChunks as chunk, i (i)}
								<button
									onclick={() => (activeChunk = i)}
									class={[
										'brutal-press px-3 py-1.5 text-xs font-bold whitespace-nowrap transition border-2',
										activeChunk === i
											? 'bg-primary border-ink text-text-on-primary'
											: 'bg-bg-card border-ink text-text-muted hover:text-white'
									].join(' ')}
								>
									{chunk[0].ep}-{chunk[chunk.length - 1].ep}
								</button>
							{/each}
						</div>
					{/if}

					<div
						class="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-[500px] overflow-y-auto pr-1 custom-scroll"
					>
						{#each episodeChunks[activeChunk] ?? [] as e (e.ep)}
							{@const isWatched = $userStore?.history?.some((h) => h.id === item.id && h.ep === e.ep)}
							<button
								onclick={() => goto(`/watch/${item.id}/${e.ep}`)}
								class={[
									'brutal-press py-3 text-sm font-bold transition-all border-2',
									isWatched
										? 'bg-primary border-ink text-text-on-primary shadow-brutal-sm'
										: 'bg-bg-main border-ink text-text-muted hover:bg-bg-card hover:text-text-main'
								].join(' ')}
							>
								{formatEp(e.ep)}
							</button>
						{/each}
					</div>
				</div>
			</div>

			<div class="md:col-span-1 flex flex-col gap-6">
				<div class="sticky top-24 flex flex-col gap-6">
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
						<div class="flex flex-col gap-1">
							{#each popularList as it, i (it.id)}
								<SidebarItem item={it} rank={i + 1} />
							{/each}
						</div>
					</div>

					<div class="bg-bg-secondary p-4 shadow-brutal-sm">
						<h3 class="font-bold text-text-main mb-4 flex items-center gap-2 text-sm">
							<span class="text-red-500">❤</span> You May Like
						</h3>
						<div class="flex flex-col gap-1">
							{#each recommendations as it, i (it.id)}
								<SidebarItem item={it} rank={i + 1} />
							{/each}
						</div>
						<SidebarButtons />
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
