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
	import Icon from '$components/common/Icon.svelte';

	let { data }: { data: { donghua: Donghua[]; meta: Record<string, string> } } = $props();

	const catalogue = $derived(data.donghua ?? []);

	let tab = $state<'bookmarks' | 'history'>('bookmarks');
	let nameInput = $state('');
	let notice = $state('');
	let fileInput = $state<HTMLInputElement>();

	$effect(() => {
		nameInput = $nickname;
	});

	const popular = $derived([...catalogue].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5));
	const suggestions = $derived([...catalogue].sort(() => 0.5 - Math.random()).slice(0, 5));

	const savedItems = $derived(catalogue.filter((d) => $bookmarks.includes(d.id)));
	const historyItems = $derived(
		$history
			.map((h) => {
				const d = catalogue.find((x) => x.id === h.id);
				return d ? { ...d, watchedEp: h.ep } : null;
			})
			.filter((x): x is Donghua & { watchedEp: string } => x !== null)
	);

	function saveName() {
		nickname.set(nameInput);
		nameInput = $nickname;
	}

	function download() {
		const blob = new Blob([exportLibrary()], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `ca3d-koleksi-${new Date().toISOString().slice(0, 10)}.json`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}

	function restore(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			const res = importLibrary(String(ev.target?.result ?? ''));
			notice = res.ok ? 'Koleksi berhasil dipulihkan.' : `Gagal: ${res.error}`;
			input.value = '';
		};
		reader.readAsText(file);
	}
</script>

<svelte:head>
	<title>{data.meta.title} — Chinese Anime 3D</title>
	<meta name="description" content={data.meta.description} />
	<meta name="robots" content="noindex, nofollow" />
	<link rel="canonical" href={data.meta.canonical} />
</svelte:head>

<div class="max-w-7xl mx-auto px-4 py-8">
	<div class="flex flex-col lg:flex-row gap-10">
		<div class="flex-1 min-w-0">
			<header class="mb-8">
				<h1 class="font-display text-2xl font-bold text-content">Koleksi saya</h1>
				<p class="mt-1 text-sm text-content-muted">
					Disimpan di browser ini saja — tidak ada akun dan tidak ada data yang dikirim ke server.
				</p>
			</header>

			<!-- Display name, used for nothing but local labelling. -->
			<section class="card p-4 mb-8">
				<label class="label" for="nickname">Nama tampilan</label>
				<div class="flex gap-2">
					<input
						id="nickname"
						bind:value={nameInput}
						type="text"
						maxlength="24"
						placeholder="Nama kamu"
						class="input"
					/>
					<button type="button" onclick={saveName} class="btn-primary flex-shrink-0">Simpan</button>
				</div>
			</section>

			<!-- Tabs -->
			<div class="flex items-center gap-1 p-1 rounded-xl bg-surface-1 border border-line mb-6">
				<button
					type="button"
					onclick={() => (tab = 'bookmarks')}
					class="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
					       transition-colors duration-150
					       {tab === 'bookmarks' ? 'bg-surface-3 text-content' : 'text-content-muted hover:text-content'}"
					aria-pressed={tab === 'bookmarks'}
				>
					<Icon name="bookmark" class="w-4 h-4" />
					Favorit
					<span class="text-content-subtle tabular-nums">{$bookmarks.length}</span>
				</button>
				<button
					type="button"
					onclick={() => (tab = 'history')}
					class="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
					       transition-colors duration-150
					       {tab === 'history' ? 'bg-surface-3 text-content' : 'text-content-muted hover:text-content'}"
					aria-pressed={tab === 'history'}
				>
					<Icon name="clock" class="w-4 h-4" />
					Riwayat
					<span class="text-content-subtle tabular-nums">{$history.length}</span>
				</button>
			</div>

			{#if tab === 'bookmarks'}
				{#if savedItems.length === 0}
					<div class="card p-10 text-center">
						<Icon name="bookmark" class="w-8 h-8 mx-auto text-content-subtle mb-3" />
						<p class="text-sm text-content-muted">Belum ada judul tersimpan.</p>
						<p class="mt-1 text-xs text-content-subtle">
							Buka halaman detail judul lalu tekan tombol Simpan.
						</p>
					</div>
				{:else}
					<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
						{#each savedItems as item (item.id)}
							<MovieCard {item} />
						{/each}
					</div>
				{/if}
			{:else}
				{#if historyItems.length === 0}
					<div class="card p-10 text-center">
						<Icon name="clock" class="w-8 h-8 mx-auto text-content-subtle mb-3" />
						<p class="text-sm text-content-muted">Belum ada riwayat tontonan.</p>
					</div>
				{:else}
					<div class="flex justify-end mb-3">
						<button
							type="button"
							onclick={clearHistory}
							class="btn-ghost !text-xs"
							style="color: var(--critical)"
						>
							<Icon name="trash" class="w-3.5 h-3.5" />
							Hapus semua riwayat
						</button>
					</div>

					<ul class="card divide-y divide-line overflow-hidden">
						{#each historyItems as it (it.id)}
							<li class="flex items-center gap-3 p-3 hover:bg-surface-2 transition-colors">
								<a
									href={`/watch/${it.id}/${it.watchedEp}`}
									class="flex items-center gap-3 flex-1 min-w-0"
								>
									<img
										src={getOptimizedImageUrl(it.image, 80)}
										alt=""
										width="40"
										height="54"
										class="w-10 h-14 rounded-md object-cover flex-shrink-0 bg-surface-2"
										loading="lazy"
									/>
									<div class="min-w-0">
										<p class="text-sm font-medium text-content truncate">{it.title}</p>
										<p class="mt-0.5 text-xs text-content-subtle tabular-nums">
											Episode {it.watchedEp}
										</p>
									</div>
								</a>
								<button
									type="button"
									onclick={() => removeHistory(it.id)}
									class="btn-icon"
									aria-label={`Hapus ${it.title} dari riwayat`}
								>
									<Icon name="close" class="w-4 h-4" />
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			{/if}

			<!-- Local backup -->
			<section class="card p-4 mt-8">
				<h2 class="flex items-center gap-2 text-sm font-semibold text-content mb-1">
					<Icon name="database" class="w-4 h-4 text-accent" />
					Cadangkan koleksi
				</h2>
				<p class="text-xs text-content-subtle mb-4">
					Koleksi hanya ada di browser ini. Unduh berkas cadangan bila ingin berpindah perangkat atau
					sebelum membersihkan data browser.
				</p>

				<div class="flex flex-col sm:flex-row gap-2">
					<button type="button" onclick={download} class="btn-secondary flex-1">
						<Icon name="download" class="w-4 h-4" />
						Unduh cadangan
					</button>

					<input
						bind:this={fileInput}
						id="restore-file"
						type="file"
						accept="application/json,.json"
						onchange={restore}
						class="sr-only"
					/>
					<label for="restore-file" class="btn-secondary flex-1 cursor-pointer">
						<Icon name="upload" class="w-4 h-4" />
						Pulihkan dari berkas
					</label>
				</div>

				{#if notice}
					<p class="mt-3 text-xs font-medium text-accent">{notice}</p>
				{/if}
			</section>
		</div>

		<aside class="w-full lg:w-72 flex-shrink-0">
			<div class="sticky top-24 flex flex-col gap-5">
				<section class="card p-4">
					<h2 class="flex items-center gap-2 text-sm font-semibold text-content mb-3">
						<Icon name="trending-up" class="w-4 h-4 text-accent" />
						Paling banyak ditonton
					</h2>
					<div class="flex flex-col gap-0.5">
						{#each popular as item, i (item.id)}
							<SidebarItem {item} rank={i + 1} />
						{/each}
					</div>
				</section>

				<section class="card p-4">
					<h2 class="flex items-center gap-2 text-sm font-semibold text-content mb-3">
						<Icon name="film" class="w-4 h-4 text-accent" />
						Mungkin kamu suka
					</h2>
					<div class="flex flex-col gap-0.5">
						{#each suggestions as item, i (item.id)}
							<SidebarItem {item} rank={i + 1} />
						{/each}
					</div>
				</section>
			</div>
		</aside>
	</div>
</div>
