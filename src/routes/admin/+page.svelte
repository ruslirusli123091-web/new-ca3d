<script lang="ts">
	import { onMount } from 'svelte';
	import type { Donghua } from '$lib/types';
	import { api } from '$lib/api';
	import { getOptimizedImageUrl } from '$lib/utils/helpers';
	import Icon from '$components/common/Icon.svelte';

	interface ServerEntry {
		name: string;
		url: string;
	}
	interface EpisodeDraft {
		ep: string;
		servers: ServerEntry[];
	}

	const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu', 'Random'] as const;

	let { data }: { data: { meta?: Record<string, string> } } = $props();

	// ---- auth ----
	let authed = $state(false);
	let checking = $state(true);
	let username = $state('');
	let password = $state('');
	let authError = $state('');
	let signingIn = $state(false);

	// ---- navigation ----
	let tab = $state<'catalogue' | 'backup'>('catalogue');
	let editing = $state(false);

	// ---- data ----
	let catalogue = $state<Donghua[]>([]);
	let query = $state('');
	let toast = $state('');
	let busy = $state(false);

	// ---- editor draft ----
	let draftId = $state('');
	let draftTitle = $state('');
	let draftType = $state<'series' | 'movie'>('series');
	let draftImage = $state('');
	let draftSynopsis = $state('');
	let draftStatus = $state('Ongoing');
	let draftRating = $state('');
	let draftDays = $state<string[]>([]);
	let draftPublishAt = $state('');
	let draftEpisodes = $state<EpisodeDraft[]>([]);
	let notify = $state(false);
	let notifyText = $state('');

	let fileInput = $state<HTMLInputElement>();

	onMount(async () => {
		authed = await api.adminVerify();
		checking = false;
		if (authed) await reload();
	});

	async function reload() {
		catalogue = await api.fetchDonghua();
	}

	async function signIn(e: SubmitEvent) {
		e.preventDefault();
		authError = '';
		signingIn = true;
		try {
			await api.adminLogin(username, password);
			authed = true;
			password = '';
			await reload();
		} catch (err) {
			authError = (err as Error).message || 'Login gagal.';
		} finally {
			signingIn = false;
		}
	}

	async function signOut() {
		await api.adminLogout();
		authed = false;
		catalogue = [];
	}

	function flash(message: string) {
		toast = message;
		setTimeout(() => (toast = ''), 3200);
	}

	// ---- editor ----
	function resetDraft() {
		draftId = '';
		draftTitle = '';
		draftType = 'series';
		draftImage = '';
		draftSynopsis = '';
		draftStatus = 'Ongoing';
		draftRating = '';
		draftDays = [];
		draftPublishAt = '';
		draftEpisodes = [];
		notify = false;
		notifyText = '';
	}

	function openEditor(item?: Donghua) {
		resetDraft();
		if (item) {
			draftId = item.id;
			draftTitle = item.title;
			draftType = item.type === 'movie' ? 'movie' : 'series';
			draftImage = item.image;
			draftSynopsis = item.synopsis;
			draftStatus = item.status || 'Ongoing';
			draftRating = item.rating != null ? String(item.rating) : '';
			draftDays = item.day ? item.day.split(',').filter(Boolean) : [];
			if (item.scheduledTime) {
				const d = new Date(item.scheduledTime);
				d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
				draftPublishAt = d.toISOString().slice(0, 16);
			}
			draftEpisodes = item.episodes.map((e) => {
				const raw = e.url ?? '';
				let servers: ServerEntry[] = [];
				if (raw.includes('|')) {
					servers = raw
						.split('\n')
						.map((line) => {
							const [name, ...rest] = line.split('|');
							const url = rest.join('|').trim();
							return url ? { name: name.trim() || 'Server', url } : null;
						})
						.filter((s): s is ServerEntry => s !== null);
				}
				if (servers.length === 0) servers = [{ name: 'Server', url: raw }];
				return { ep: e.ep, servers };
			});
		}
		editing = true;
	}

	function addEpisode() {
		draftEpisodes = [...draftEpisodes, { ep: '', servers: [{ name: 'Server', url: '' }] }];
	}

	function removeEpisode(index: number) {
		draftEpisodes = draftEpisodes.filter((_, i) => i !== index);
	}

	function moveEpisode(index: number, delta: number) {
		const target = index + delta;
		if (target < 0 || target >= draftEpisodes.length) return;
		const next = [...draftEpisodes];
		[next[index], next[target]] = [next[target], next[index]];
		draftEpisodes = next;
	}

	function addServer(epIndex: number) {
		draftEpisodes[epIndex].servers = [
			...draftEpisodes[epIndex].servers,
			{ name: 'Server', url: '' }
		];
	}

	function removeServer(epIndex: number, serverIndex: number) {
		draftEpisodes[epIndex].servers = draftEpisodes[epIndex].servers.filter(
			(_, i) => i !== serverIndex
		);
	}

	function toggleDay(day: string) {
		draftDays = draftDays.includes(day)
			? draftDays.filter((d) => d !== day)
			: [...draftDays, day];
	}

	async function save() {
		if (!draftTitle.trim()) {
			flash('Judul wajib diisi.');
			return;
		}

		const id = draftId || String(Date.now());
		const previous = catalogue.find((d) => d.id === id);

		const episodes = draftEpisodes
			.map((e) => {
				const usable = e.servers.filter((s) => s.url.trim());
				// A single unnamed mirror is stored as a bare URL; several mirrors
				// are stored as "Name|URL" lines.
				const url =
					usable.length === 1 && usable[0].name === 'Server'
						? usable[0].url.trim()
						: usable.map((s) => `${s.name.trim()}|${s.url.trim()}`).join('\n');
				return { ep: e.ep.trim(), url, title: `Episode ${e.ep.trim()}`, video: url };
			})
			.filter((e) => e.ep);

		const ratingNum = draftRating === '' ? undefined : Number(draftRating);

		const entry: Donghua = {
			id,
			title: draftTitle.trim(),
			type: draftType,
			image: draftImage.trim(),
			synopsis: draftSynopsis.trim(),
			status: draftStatus,
			rating: ratingNum != null && Number.isFinite(ratingNum) ? ratingNum : undefined,
			day: draftDays.join(','),
			scheduledTime: draftPublishAt ? new Date(draftPublishAt).getTime() : undefined,
			episodes,
			views: previous?.views ?? 0,
			lastUpdated: Date.now()
		};

		const next = [...catalogue];
		const index = next.findIndex((d) => d.id === id);
		if (index > -1) next[index] = entry;
		else next.push(entry);

		busy = true;
		try {
			const res = await api.saveDonghua(next);
			if (!res.ok) throw new Error('Simpan gagal.');

			if (notify) {
				await fetch('/api/notify', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						title: 'Update baru',
						body: notifyText.trim() || `${entry.title} sudah tersedia.`,
						url: `/synopsis/${id}`,
						image: entry.image
					})
				}).catch(() => undefined);
			}

			await reload();
			editing = false;
			flash(notify ? 'Tersimpan dan notifikasi dikirim.' : 'Perubahan tersimpan.');
		} catch (err) {
			flash((err as Error).message);
		} finally {
			busy = false;
		}
	}

	async function remove(id: string, title: string) {
		if (!confirm(`Hapus "${title}"? Tindakan ini tidak bisa dibatalkan.`)) return;
		busy = true;
		try {
			const res = await api.deleteDonghua(id);
			if (!res.ok) throw new Error('Hapus gagal.');
			catalogue = catalogue.filter((d) => d.id !== id);
			flash('Judul dihapus.');
		} catch (err) {
			flash((err as Error).message);
		} finally {
			busy = false;
		}
	}

	// ---- backup ----
	function downloadBackup() {
		const blob = new Blob(
			[JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), donghua: catalogue }, null, 2)],
			{ type: 'application/json' }
		);
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `ca3d-backup-${new Date().toISOString().slice(0, 10)}.json`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}

	function restoreBackup(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		if (!confirm('Restore akan menimpa seluruh katalog saat ini. Lanjutkan?')) {
			input.value = '';
			return;
		}
		const reader = new FileReader();
		reader.onload = async (ev) => {
			try {
				const parsed = JSON.parse(String(ev.target?.result ?? ''));
				if (!Array.isArray(parsed.donghua)) throw new Error('Format berkas tidak dikenali.');
				busy = true;
				const res = await api.saveDonghua(parsed.donghua);
				if (!res.ok) throw new Error('Restore gagal.');
				await reload();
				flash(`Restore selesai: ${parsed.donghua.length} judul.`);
			} catch (err) {
				flash((err as Error).message);
			} finally {
				busy = false;
				input.value = '';
			}
		};
		reader.readAsText(file);
	}

	const filtered = $derived(
		catalogue
			.filter((d) => d.title.toLowerCase().includes(query.toLowerCase()))
			.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0))
	);

	const stats = $derived({
		titles: catalogue.length,
		episodes: catalogue.reduce((sum, d) => sum + (d.episodes?.length || 0), 0),
		views: catalogue.reduce((sum, d) => sum + (d.views || 0), 0),
		movies: catalogue.filter((d) => d.type === 'movie').length
	});
</script>

<svelte:head>
	<title>Panel Admin — CA3D</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#if checking}
	<div class="min-h-screen flex items-center justify-center bg-surface-0">
		<div
			class="w-8 h-8 rounded-full border-2 border-line border-t-accent animate-spin"
			role="status"
			aria-label="Memeriksa sesi"
		></div>
	</div>
{:else if !authed}
	<!-- Sign in. The previous version used a decorative neumorphic card with
	     inset shadow inputs and a floating icon badge. This is a plain form. -->
	<div class="min-h-screen flex items-center justify-center bg-surface-0 px-4">
		<form onsubmit={signIn} class="w-full max-w-sm card p-6">
			<div class="mb-6">
				<h1 class="font-display text-lg font-semibold text-content">Panel admin</h1>
				<p class="mt-1 text-sm text-content-muted">Masuk untuk mengelola katalog.</p>
			</div>

			<div class="space-y-4">
				<div>
					<label class="label" for="admin-user">Nama pengguna</label>
					<input
						id="admin-user"
						bind:value={username}
						type="text"
						autocomplete="username"
						maxlength="64"
						required
						class="input"
					/>
				</div>

				<div>
					<label class="label" for="admin-pass">Kata sandi</label>
					<input
						id="admin-pass"
						bind:value={password}
						type="password"
						autocomplete="current-password"
						maxlength="128"
						required
						class="input"
					/>
				</div>

				{#if authError}
					<p class="flex items-start gap-2 text-xs" style="color: var(--critical)">
						<Icon name="exclamation" class="w-4 h-4 flex-shrink-0 mt-px" />
						{authError}
					</p>
				{/if}

				<button type="submit" disabled={signingIn} class="btn-primary w-full">
					{signingIn ? 'Memproses…' : 'Masuk'}
				</button>
			</div>

			<p class="mt-5 text-[11px] leading-relaxed text-content-subtle">
				Kredensial dibaca dari environment variable server, bukan dari database.
			</p>
		</form>
	</div>
{:else}
	<div class="admin-shell min-h-screen flex flex-col">
		<!-- Top bar -->
		<header class="sticky top-0 z-30 border-b border-line bg-surface-0/90 backdrop-blur-md">
			<div class="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
				<a href="/" class="flex items-center gap-2 flex-shrink-0">
					<img src="/logo.png" alt="" width="90" height="26" class="h-6 w-auto" />
				</a>

				<nav class="hidden sm:flex items-center gap-1" aria-label="Bagian admin">
					<button
						type="button"
						onclick={() => {
							tab = 'catalogue';
							editing = false;
						}}
						class="admin-nav-item"
						data-active={tab === 'catalogue'}
					>
						<Icon name="grid" class="w-4 h-4" />
						Katalog
					</button>
					<button
						type="button"
						onclick={() => {
							tab = 'backup';
							editing = false;
						}}
						class="admin-nav-item"
						data-active={tab === 'backup'}
					>
						<Icon name="database" class="w-4 h-4" />
						Cadangan
					</button>
				</nav>

				<div class="ml-auto flex items-center gap-2">
					<a href="/" class="btn-ghost !text-xs hidden sm:inline-flex">
						Lihat situs
						<Icon name="arrow-right" class="w-3.5 h-3.5" />
					</a>
					<button type="button" onclick={signOut} class="btn-secondary !text-xs">
						<Icon name="logout" class="w-3.5 h-3.5" />
						Keluar
					</button>
				</div>
			</div>

			<!-- Mobile tabs -->
			<div class="sm:hidden border-t border-line px-3 py-2 flex gap-1">
				<button
					type="button"
					onclick={() => {
						tab = 'catalogue';
						editing = false;
					}}
					class="admin-nav-item justify-center"
					data-active={tab === 'catalogue'}
				>
					<Icon name="grid" class="w-4 h-4" />
					Katalog
				</button>
				<button
					type="button"
					onclick={() => {
						tab = 'backup';
						editing = false;
					}}
					class="admin-nav-item justify-center"
					data-active={tab === 'backup'}
				>
					<Icon name="database" class="w-4 h-4" />
					Cadangan
				</button>
			</div>
		</header>

		<main class="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
			{#if toast}
				<div
					class="mb-4 flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm text-content animate-fade-in"
					role="status"
				>
					<Icon name="check" class="w-4 h-4 text-accent flex-shrink-0" />
					{toast}
				</div>
			{/if}

			<!-- ============ CATALOGUE ============ -->
			{#if tab === 'catalogue'}
				{#if editing}
					<!-- ---------- Editor ---------- -->
					<div class="flex items-center justify-between mb-6">
						<div class="flex items-center gap-3">
							<button
								type="button"
								onclick={() => (editing = false)}
								class="btn-secondary !px-2.5"
								aria-label="Kembali"
							>
								<Icon name="arrow-left" class="w-4 h-4" />
							</button>
							<h1 class="font-display text-lg font-semibold text-content">
								{draftId ? 'Ubah judul' : 'Judul baru'}
							</h1>
						</div>
						<button type="button" onclick={save} disabled={busy} class="btn-primary">
							<Icon name="check" class="w-4 h-4" />
							{busy ? 'Menyimpan…' : 'Simpan'}
						</button>
					</div>

					<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24">
						<!-- Column 1: artwork + meta -->
						<div class="space-y-5">
							<section class="card p-4">
								<h2 class="label">Poster</h2>
								<div
									class="aspect-[2/3] rounded-lg overflow-hidden bg-surface-2 border border-line mb-3"
								>
									{#if draftImage}
										<img
											src={getOptimizedImageUrl(draftImage, 300)}
											alt="Pratinjau poster"
											class="w-full h-full object-cover"
										/>
									{:else}
										<div class="w-full h-full flex flex-col items-center justify-center gap-2 text-content-subtle">
											<Icon name="image" class="w-6 h-6" />
											<span class="text-xs">Belum ada gambar</span>
										</div>
									{/if}
								</div>
								<label class="label" for="ed-image">URL gambar</label>
								<input
									id="ed-image"
									bind:value={draftImage}
									type="text"
									placeholder="https://…"
									class="input"
								/>
							</section>

							<section class="card p-4 space-y-4">
								<div>
									<label class="label" for="ed-type">Tipe</label>
									<select id="ed-type" bind:value={draftType} class="input">
										<option value="series">Series</option>
										<option value="movie">Movie</option>
									</select>
								</div>

								<div>
									<label class="label" for="ed-status">Status</label>
									<select id="ed-status" bind:value={draftStatus} class="input">
										<option value="Ongoing">Ongoing</option>
										<option value="Completed">Completed</option>
										<option value="Dropped">Dropped</option>
									</select>
								</div>

								<div>
									<label class="label" for="ed-rating">Rating manual (1–10)</label>
									<div class="flex gap-2">
										<input
											id="ed-rating"
											bind:value={draftRating}
											type="number"
											min="1"
											max="10"
											step="0.1"
											placeholder="8.5"
											class="input"
										/>
										<button
											type="button"
											onclick={() => (draftRating = '')}
											class="btn-secondary !px-3 flex-shrink-0"
											title="Kosongkan rating"
										>
											<Icon name="close" class="w-4 h-4" />
										</button>
									</div>
									<p class="mt-1.5 text-[11px] text-content-subtle">
										Diisi manual. Kosongkan bila belum ada rating.
									</p>
								</div>

								<div>
									<span class="label">Hari tayang</span>
									<div class="flex flex-wrap gap-1.5">
										{#each DAYS as day (day)}
											<button
												type="button"
												onclick={() => toggleDay(day)}
												class="px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-colors
												       {draftDays.includes(day)
													? 'bg-accent text-accent-on border-accent'
													: 'bg-surface-2 text-content-muted border-line hover:text-content'}"
												aria-pressed={draftDays.includes(day)}
											>
												{day}
											</button>
										{/each}
									</div>
								</div>

								<div>
									<label class="label" for="ed-publish">Jadwalkan tayang</label>
									<input
										id="ed-publish"
										bind:value={draftPublishAt}
										type="datetime-local"
										class="input"
									/>
									<p class="mt-1.5 text-[11px] text-content-subtle">
										Kosongkan untuk langsung tayang.
									</p>
								</div>
							</section>
						</div>

						<!-- Column 2: text content -->
						<div class="space-y-5">
							<section class="card p-4">
								<label class="label" for="ed-title">Judul</label>
								<input id="ed-title" bind:value={draftTitle} type="text" class="input" />
							</section>

							<section class="card p-4">
								<label class="label" for="ed-synopsis">Sinopsis</label>
								<textarea id="ed-synopsis" bind:value={draftSynopsis} rows="14" class="input resize-y"
								></textarea>
							</section>

							<section class="card p-4">
								<label class="flex items-center gap-2.5 cursor-pointer">
									<input
										type="checkbox"
										bind:checked={notify}
										class="w-4 h-4 rounded border-line bg-surface-2 accent-[var(--accent)]"
									/>
									<span class="text-sm text-content">Kirim notifikasi setelah simpan</span>
								</label>
								{#if notify}
									<textarea
										bind:value={notifyText}
										rows="2"
										placeholder="Pesan notifikasi (opsional)"
										class="input mt-3 resize-y"
									></textarea>
								{/if}
							</section>
						</div>

						<!-- Column 3: episodes -->
						<div class="space-y-3">
							<div class="flex items-center justify-between">
								<h2 class="text-sm font-semibold text-content">
									Episode <span class="text-content-subtle tabular-nums">({draftEpisodes.length})</span>
								</h2>
								<button type="button" onclick={addEpisode} class="btn-secondary !text-xs !py-1.5">
									<Icon name="plus" class="w-3.5 h-3.5" />
									Tambah
								</button>
							</div>

							<div class="space-y-2.5 max-h-[620px] overflow-y-auto scroll-thin pr-1">
								{#each [...draftEpisodes].map((e, i) => ({ e, i })).reverse() as { e, i } (i)}
									<div class="card p-3">
										<div class="flex items-center gap-2 mb-2.5">
											<div class="flex flex-col gap-0.5">
												<button
													type="button"
													onclick={() => moveEpisode(i, -1)}
													disabled={i === 0}
													class="text-content-subtle hover:text-content disabled:opacity-30"
													aria-label="Naikkan"
												>
													<Icon name="chevron-up" class="w-3 h-3" />
												</button>
												<button
													type="button"
													onclick={() => moveEpisode(i, 1)}
													disabled={i === draftEpisodes.length - 1}
													class="text-content-subtle hover:text-content disabled:opacity-30"
													aria-label="Turunkan"
												>
													<Icon name="chevron-down" class="w-3 h-3" />
												</button>
											</div>

											<label class="sr-only" for={`ep-${i}`}>Nomor episode</label>
											<input
												id={`ep-${i}`}
												bind:value={e.ep}
												type="text"
												placeholder="No."
												class="input !w-16 !py-1.5 !px-2 !text-center !text-sm"
											/>

											<div class="flex-1"></div>

											<button
												type="button"
												onclick={() => removeEpisode(i)}
												class="btn-icon !w-7 !h-7"
												aria-label="Hapus episode"
												style="color: var(--critical)"
											>
												<Icon name="trash" class="w-3.5 h-3.5" />
											</button>
										</div>

										<div class="space-y-1.5">
											{#each e.servers as server, si (si)}
												<div class="flex gap-1.5">
													<label class="sr-only" for={`srv-name-${i}-${si}`}>Nama server</label>
													<input
														id={`srv-name-${i}-${si}`}
														bind:value={server.name}
														type="text"
														placeholder="Server"
														class="input !w-24 !py-1.5 !px-2 !text-xs"
													/>
													<label class="sr-only" for={`srv-url-${i}-${si}`}>URL server</label>
													<input
														id={`srv-url-${i}-${si}`}
														bind:value={server.url}
														type="text"
														placeholder="https://…"
														class="input !py-1.5 !px-2 !text-xs flex-1 min-w-0"
													/>
													{#if e.servers.length > 1}
														<button
															type="button"
															onclick={() => removeServer(i, si)}
															class="btn-icon !w-7 !h-7 flex-shrink-0"
															aria-label="Hapus server"
														>
															<Icon name="close" class="w-3 h-3" />
														</button>
													{/if}
												</div>
											{/each}
										</div>

										<button
											type="button"
											onclick={() => addServer(i)}
											class="mt-2 w-full py-1.5 rounded-md border border-dashed border-line
											       text-[11px] text-content-subtle hover:text-accent hover:border-accent
											       transition-colors"
										>
											+ Tambah server
										</button>
									</div>
								{/each}

								{#if draftEpisodes.length === 0}
									<div class="card p-6 text-center text-xs text-content-subtle">
										Belum ada episode.
									</div>
								{/if}
							</div>
						</div>
					</div>
				{:else}
					<!-- ---------- Catalogue list ---------- -->
					<div class="flex items-center justify-between mb-6">
						<h1 class="font-display text-lg font-semibold text-content">Katalog</h1>
						<div class="flex items-center gap-2">
							<button
								type="button"
								onclick={reload}
								class="btn-secondary !px-2.5"
								aria-label="Muat ulang"
							>
								<Icon name="refresh" class="w-4 h-4" />
							</button>
							<button type="button" onclick={() => openEditor()} class="btn-primary">
								<Icon name="plus" class="w-4 h-4" />
								Judul baru
							</button>
						</div>
					</div>

					<!-- Stats -->
					<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
						{#each [{ label: 'Judul', value: stats.titles, icon: 'grid' }, { label: 'Episode', value: stats.episodes, icon: 'list' }, { label: 'Movie', value: stats.movies, icon: 'film' }, { label: 'Total tayangan', value: stats.views, icon: 'eye' }] as s (s.label)}
							<div class="card p-3.5">
								<div class="flex items-center gap-2 text-content-subtle mb-1.5">
									<Icon name={s.icon as 'grid'} class="w-3.5 h-3.5" />
									<span class="text-[11px] font-medium uppercase tracking-wide">{s.label}</span>
								</div>
								<p class="text-xl font-semibold text-content tabular-nums">
									{s.value.toLocaleString('id-ID')}
								</p>
							</div>
						{/each}
					</div>

					<!-- Search -->
					<div class="relative mb-5 max-w-sm">
						<Icon
							name="search"
							class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-content-subtle pointer-events-none"
						/>
						<input
							type="search"
							bind:value={query}
							placeholder="Cari judul…"
							aria-label="Cari judul"
							class="input !pl-9"
						/>
					</div>

					{#if filtered.length === 0}
						<div class="card p-12 text-center">
							<Icon name="inbox" class="w-8 h-8 mx-auto text-content-subtle mb-3" />
							<p class="text-sm text-content-muted">
								{query ? 'Tidak ada judul yang cocok.' : 'Katalog masih kosong.'}
							</p>
						</div>
					{:else}
						<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
							{#each filtered as item (item.id)}
								<article class="card overflow-hidden group">
									<div class="relative aspect-[2/3] bg-surface-2">
										<img
											src={getOptimizedImageUrl(item.image, 300)}
											alt=""
											class="w-full h-full object-cover"
											loading="lazy"
										/>

										<!-- Actions appear on hover/focus so the grid stays readable. -->
										<div
											class="absolute inset-0 bg-surface-0/80 opacity-0 group-hover:opacity-100
											       focus-within:opacity-100 transition-opacity flex flex-col
											       items-center justify-center gap-2"
										>
											<button
												type="button"
												onclick={() => openEditor(item)}
												class="btn-secondary !text-xs !py-1.5"
											>
												<Icon name="edit" class="w-3.5 h-3.5" />
												Ubah
											</button>
											<button
												type="button"
												onclick={() => remove(item.id, item.title)}
												class="btn-secondary !text-xs !py-1.5"
												style="color: var(--critical)"
											>
												<Icon name="trash" class="w-3.5 h-3.5" />
												Hapus
											</button>
										</div>

										{#if item.scheduledTime && item.scheduledTime > Date.now()}
											<span class="absolute top-2 left-2 badge-warning">Terjadwal</span>
										{/if}
									</div>

									<div class="p-2.5">
										<h3 class="text-[13px] font-medium text-content line-clamp-2" title={item.title}>
											{item.title}
										</h3>
										<div class="mt-1.5 flex items-center justify-between text-[11px] text-content-subtle">
											<span class="tabular-nums">{item.episodes?.length || 0} EP</span>
											{#if item.rating}
												<span
													class="inline-flex items-center gap-0.5 tabular-nums"
													style="color: var(--warning)"
												>
													<Icon name="star" class="w-2.5 h-2.5" stroke={2} />
													{item.rating.toFixed(1)}
												</span>
											{/if}
										</div>
									</div>
								</article>
							{/each}
						</div>
					{/if}
				{/if}
			{/if}

			<!-- ============ BACKUP ============ -->
			{#if tab === 'backup'}
				<h1 class="font-display text-lg font-semibold text-content mb-6">Cadangan</h1>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
					<section class="card p-5">
						<div class="flex items-center gap-2 text-content mb-1.5">
							<Icon name="download" class="w-4 h-4 text-accent" />
							<h2 class="text-sm font-semibold">Unduh</h2>
						</div>
						<p class="text-xs text-content-subtle mb-4">
							Menyimpan seluruh katalog beserta episode ke satu berkas JSON.
						</p>
						<button type="button" onclick={downloadBackup} class="btn-secondary w-full">
							Unduh berkas
						</button>
					</section>

					<section class="card p-5">
						<div class="flex items-center gap-2 text-content mb-1.5">
							<Icon name="upload" class="w-4 h-4 text-accent" />
							<h2 class="text-sm font-semibold">Pulihkan</h2>
						</div>
						<p class="text-xs text-content-subtle mb-4">
							Menimpa katalog saat ini dengan isi berkas cadangan.
						</p>
						<input
							bind:this={fileInput}
							id="backup-file"
							type="file"
							accept="application/json,.json"
							onchange={restoreBackup}
							class="sr-only"
						/>
						<label for="backup-file" class="btn-secondary w-full cursor-pointer">
							Pilih berkas
						</label>
					</section>
				</div>

				<div class="mt-4 max-w-3xl flex items-start gap-2.5 rounded-lg border border-line bg-surface-1 p-3.5">
					<Icon name="info" class="w-4 h-4 text-content-subtle flex-shrink-0 mt-px" />
					<p class="text-xs leading-relaxed text-content-muted">
						Cadangan hanya berisi katalog dan episode. Komentar, akun, dan statistik tidak termasuk
						karena fitur tersebut tidak ada di aplikasi ini.
					</p>
				</div>
			{/if}
		</main>
	</div>
{/if}
