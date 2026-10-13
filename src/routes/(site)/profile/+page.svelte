<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Donghua } from '$lib/types';
	import {
		bookmarks,
		history,
		nickname,
		clearHistory,
		removeHistory,
		exportLibrary,
		importLibrary
	} from '$lib/stores/library';
	import { getOptimizedImageUrl } from '$lib/utils/helpers';
	import MovieCard from '$components/common/MovieCard.svelte';
	import SidebarItem from '$components/common/SidebarItem.svelte';

	let { data }: { data: { donghua: Donghua[]; meta: Record<string, string> } } = $props();

	const catalogue = $derived(data.donghua ?? []);

	let activeTab = $state<'bookmarks' | 'history'>('bookmarks');
	let nameInput = $state('');
	let importMsg = $state('');
	let fileInput = $state<HTMLInputElement>();

	// Keep the nickname input in sync with the stored value.
	$effect(() => {
		nameInput = $nickname;
	});

	const popularList = $derived(
		[...catalogue].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5)
	);
	const randomList = $derived([...catalogue].sort(() => 0.5 - Math.random()).slice(0, 5));

	const bookmarkedItems = $derived(catalogue.filter((d) => $bookmarks.includes(d.id)));
	const historyList = $derived(
		$history
			.map((h) => {
				const d = catalogue.find((x) => x.id === h.id);
				return d ? { ...d, watchedEp: h.ep } : null;
			})
			.filter(Boolean)
	);

	function saveNickname() {
		nickname.set(nameInput);
		nameInput = $nickname;
	}

	function handleExport() {
		const blob = new Blob([exportLibrary()], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `ca3d-koleksi-${new Date().toISOString().slice(0, 10)}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function handleImport(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			const res = importLibrary(String(ev.target?.result || ''));
			importMsg = res.ok ? 'Koleksi berhasil dipulihkan!' : `Gagal: ${res.error}`;
			input.value = '';
		};
		reader.readAsText(file);
	}
</script>

<svelte:head>
	<title>Koleksi Saya - Chinese Anime 3D</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="max-w-7xl mx-auto px-4 py-8 min-h-screen">
	<div class="flex flex-col lg:flex-row gap-8">
		<div class="flex-1 flex justify-center items-start pt-10">
			<div class="w-full max-w-lg bg-bg-secondary p-8 text-center relative overflow-hidden">
				<div class="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/20 to-transparent"></div>
				<div
					class="w-24 h-24 border-4 border-ink mx-auto flex items-center justify-center text-4xl font-bold text-text-main mb-4 relative z-10 shadow-brutal bg-bg-card"
				>
					{($nickname || 'A').charAt(0).toUpperCase()}
				</div>
				<h2 class="font-display text-2xl font-bold text-text-main mb-1">
					{$nickname || 'Pengunjung'}
				</h2>
				<span class="px-3 py-1 text-xs font-bold bg-primary/20 text-primary">Koleksi Lokal</span>

				<!-- Nickname editor -->
				<div class="mt-6 text-left">
					<label class="block text-xs font-bold text-text-muted mb-1 uppercase tracking-wide" for="nick"
						>Nama Tampilan (untuk komentar)</label
					>
					<div class="flex gap-2">
						<input
							id="nick"
							bind:value={nameInput}
							type="text"
							maxlength="24"
							placeholder="Misal: Budi"
							class="flex-1 bg-bg-main p-3 text-text-main text-sm focus:border-primary outline-none transition shadow-inner"
						/>
						<button
							onclick={saveNickname}
							class="brutal-press bg-primary text-text-on-primary px-4 font-bold text-sm shadow-brutal-sm"
							>Simpan</button
						>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4 mt-6 text-left">
					<button
						onclick={() => (activeTab = 'bookmarks')}
						class={[
							'bg-bg-main p-4 border-2 cursor-pointer transition text-left',
							activeTab === 'bookmarks' ? 'border-primary shadow-brutal-sm' : 'border-ink hover:bg-bg-hover'
						].join(' ')}
					>
						<div class="text-2xl font-black text-text-main mb-1">{$bookmarks.length}</div>
						<div class="text-xs text-text-muted uppercase font-bold">Favorit</div>
					</button>
					<button
						onclick={() => (activeTab = 'history')}
						class={[
							'bg-bg-main p-4 border-2 cursor-pointer transition text-left',
							activeTab === 'history' ? 'border-primary shadow-brutal-sm' : 'border-ink hover:bg-bg-hover'
						].join(' ')}
					>
						<div class="text-2xl font-black text-text-main mb-1">{$history.length}</div>
						<div class="text-xs text-text-muted uppercase font-bold">Riwayat</div>
					</button>
				</div>

				<div class="mt-8 text-left">
					<div class="flex border-b border-ink mb-4">
						<button
							onclick={() => (activeTab = 'bookmarks')}
							class={[
								'pb-2 pr-4 text-sm font-bold transition',
								activeTab === 'bookmarks'
									? 'text-primary border-b-2 border-primary'
									: 'text-text-muted hover:text-text-main'
							].join(' ')}
							>Favorit Saya</button
						>
						<button
							onclick={() => (activeTab = 'history')}
							class={[
								'pb-2 px-4 text-sm font-bold transition',
								activeTab === 'history'
									? 'text-primary border-b-2 border-primary'
									: 'text-text-muted hover:text-text-main'
							].join(' ')}
							>Riwayat Tontonan</button
						>
					</div>
					<div class="min-h-[300px]">
						{#if activeTab === 'bookmarks'}
							{#if bookmarkedItems.length === 0}
								<div class="text-center py-10 text-text-muted text-sm border-2 border-dashed border-ink">
									Belum ada favorit. Tekan ikon hati di halaman detail donghua.
								</div>
							{:else}
								<div class="grid grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1 custom-scroll">
									{#each bookmarkedItems as item (item.id)}
										<MovieCard {item} />
									{/each}
								</div>
							{/if}
						{:else}
							{#if historyList.length === 0}
								<div class="text-center py-10 text-text-muted text-sm border-2 border-dashed border-ink">
									Belum ada riwayat tontonan.
								</div>
							{:else}
								<div class="flex justify-end mb-2">
									<button
										onclick={clearHistory}
										class="brutal-press text-[10px] font-bold text-red-500 border border-red-500/40 px-2 py-1 hover:bg-red-500 hover:text-white transition"
										>Hapus Semua Riwayat</button
									>
								</div>
								<div class="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scroll">
									{#each historyList as item, idx (idx)}
										{@const it = item as Donghua & { watchedEp: string }}
										<div
											class="flex gap-3 p-2 bg-bg-main cursor-pointer hover:border-primary transition group"
										>
											<div
												onclick={() => goto(`/watch/${it.id}/${it.watchedEp}`)}
												onkeydown={(e) => e.key === 'Enter' && goto(`/watch/${it.id}/${it.watchedEp}`)}
												role="button"
												tabindex="0"
												class="flex gap-3 flex-1 min-w-0"
											>
												<div class="w-16 h-20 flex-shrink-0 rounded-poster overflow-hidden relative">
													<img
														src={getOptimizedImageUrl(it.image, 100)}
														class="w-full h-full object-cover"
														alt=""
													/>
													<div
														class="absolute bottom-0 w-full bg-black/60 text-white text-[10px] text-center font-bold py-0.5"
													>
														Ep {it.watchedEp}
													</div>
												</div>
												<div class="flex-1 min-w-0 flex flex-col justify-center">
													<h4
														class="font-bold text-text-main text-xs md:text-sm truncate group-hover:text-primary"
													>
														{it.title}
													</h4>
													<div class="text-[10px] text-text-muted mt-1">
														Lanjut: Episode {it.watchedEp}
													</div>
													<div class="text-[10px] text-text-muted mt-auto">
														{it.type === 'movie' ? 'Movie' : 'Series'}
													</div>
												</div>
											</div>
											<button
												onclick={() => removeHistory(it.id)}
												class="text-text-muted hover:text-red-500 text-xs px-2 self-start"
												aria-label="Hapus dari riwayat">✕</button
											>
										</div>
									{/each}
								</div>
							{/if}
						{/if}
					</div>
				</div>

				<!-- Backup / restore the local library -->
				<div class="mt-8 pt-6 border-t border-ink text-left">
					<h3 class="text-xs font-bold text-text-muted uppercase tracking-wide mb-3">
						Backup Koleksi (opsional)
					</h3>
					<p class="text-[11px] text-text-muted mb-3">
						Bookmark &amp; riwayat hanya tersimpan di browser ini. Simpan file backup kalau ingin pindah
						perangkat atau membersihkan browser.
					</p>
					<div class="flex gap-2">
						<button
							onclick={handleExport}
							class="brutal-press flex-1 bg-bg-main border-2 border-ink text-text-main py-2.5 font-bold text-xs hover:border-primary transition"
							>DOWNLOAD BACKUP</button
						>
						<input
							bind:this={fileInput}
							type="file"
							accept=".json"
							onchange={handleImport}
							class="hidden"
							id="lib-import"
						/>
						<label
							for="lib-import"
							class="brutal-press flex-1 bg-bg-main border-2 border-ink text-text-main py-2.5 font-bold text-xs text-center cursor-pointer hover:border-primary transition"
							>PULIHKAN BACKUP</label
						>
					</div>
					{#if importMsg}
						<p class="text-xs font-bold text-primary mt-2">{importMsg}</p>
					{/if}
				</div>
			</div>
		</div>

		<div class="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6">
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
						>Top Popular</h3
					>
					<div class="flex flex-col gap-1 mb-6">
						{#each popularList as item, i (item.id)}
							<SidebarItem {item} rank={i + 1} />
						{/each}
					</div>
				</div>
				<div class="bg-bg-secondary p-4 shadow-brutal-sm">
					<h3 class="font-bold text-text-main mb-4 flex items-center gap-2 text-sm">
						<span class="text-red-500">❤</span> You May Like
					</h3>
					<div class="flex flex-col gap-1">
						{#each randomList as item, i (item.id)}
							<SidebarItem {item} rank={i + 1} />
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
