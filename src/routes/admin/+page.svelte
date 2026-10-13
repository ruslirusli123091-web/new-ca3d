<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Donghua } from '$lib/types';
	import { api } from '$lib/api';
	import { getOptimizedImageUrl } from '$lib/utils/helpers';

	interface ServerData {
		name: string;
		url: string;
	}
	interface EpisodeEditor {
		ep: string;
		servers: ServerData[];
	}

	let { data } = $props();

	let isAuthenticated = $state(false);
	let activeTab = $state<'anime' | 'backup'>('anime');
	let editorMode = $state(false);

	// Auth state
	let user = $state('');
	let pass = $state('');
	let msg = $state('');

	// Data state
	let donghuaList = $state<Donghua[]>([]);
	let searchQuery = $state('');

	// Form state
	let editId = $state('');
	let title = $state('');
	let type = $state('series');
	let img = $state('');
	let desc = $state('');
	let status = $state('Ongoing');
	// Manual rating entered by the admin (1.0 - 10.0). Empty = no rating shown.
	let rating = $state<string>('');
	let notifyMsg = $state('');
	let sendNotification = $state(false);
	let days = $state<string[]>([]);
	let scheduleTime = $state('');

	let fileInputRef = $state<HTMLInputElement>();
	let episodes = $state<EpisodeEditor[]>([]);

	async function loadAllData() {
		donghuaList = await api.fetchDonghua();
	}

	onMount(async () => {
		const ok = await api.adminVerify();
		if (ok) {
			isAuthenticated = true;
			loadAllData();
		}
	});

	async function handleLogin(e: SubmitEvent) {
		e.preventDefault();
		msg = 'Memproses...';
		try {
			await api.adminLogin(user, pass);
			isAuthenticated = true;
			msg = '';
			loadAllData();
		} catch (err) {
			msg = (err as Error).message || 'Username atau Password Salah!';
		}
	}

	async function handleLogout() {
		await api.adminLogout();
		isAuthenticated = false;
	}

	// ---- Editor logic ----
	function toggleDay(d: string) {
		days = days.includes(d) ? days.filter((x) => x !== d) : [...days, d];
	}

	function addEpisode() {
		episodes = [...episodes, { ep: '', servers: [{ name: 'HD', url: '' }] }];
	}
	function updateEpNum(idx: number, val: string) {
		episodes[idx].ep = val;
		episodes = episodes;
	}
	function addServerToEp(epIdx: number) {
		episodes[epIdx].servers.push({ name: 'Server Baru', url: '' });
		episodes = episodes;
	}
	function removeServerFromEp(epIdx: number, srvIdx: number) {
		episodes[epIdx].servers = episodes[epIdx].servers.filter((_, i) => i !== srvIdx);
		episodes = episodes;
	}
	function updateServerData(epIdx: number, srvIdx: number, field: 'name' | 'url', val: string) {
		episodes[epIdx].servers[srvIdx][field] = val;
		episodes = episodes;
	}
	function removeEpisode(idx: number) {
		if (confirm('Hapus episode ini?')) episodes = episodes.filter((_, i) => i !== idx);
	}
	function moveEpisode(idx: number, dir: number) {
		if ((dir === -1 && idx === 0) || (dir === 1 && idx === episodes.length - 1)) return;
		const next = [...episodes];
		const temp = next[idx];
		next[idx] = next[idx + dir];
		next[idx + dir] = temp;
		episodes = next;
	}

	function clearForm() {
		editId = '';
		title = '';
		type = 'series';
		img = '';
		desc = '';
		status = 'Ongoing';
		rating = '';
		notifyMsg = '';
		days = [];
		scheduleTime = '';
		episodes = [];
	}

	function openEditor(item?: Donghua) {
		if (item) {
			editId = item.id;
			title = item.title;
			type = item.type || 'series';
			img = item.image;
			desc = item.synopsis;
			status = item.status || 'Ongoing';
			rating = item.rating != null ? String(item.rating) : '';
			days = item.day ? item.day.split(',') : [];
			if (item.scheduledTime) {
				const d = new Date(item.scheduledTime);
				d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
				scheduleTime = d.toISOString().slice(0, 16);
			} else scheduleTime = '';

			episodes = item.episodes.map((e) => {
				let servers: ServerData[] = [];
				if (e.url && e.url.includes('|')) {
					servers = e.url
						.split('\n')
						.map((line) => {
							const parts = line.split('|');
							if (parts.length >= 2)
								return { name: parts[0].trim(), url: parts.slice(1).join('|').trim() };
							return { name: 'Default', url: line.trim() };
						})
						.filter((s) => s.url);
				}
				if (servers.length === 0) servers = [{ name: 'Default', url: e.url || '' }];
				return { ep: e.ep, servers };
			});
		} else clearForm();
		editorMode = true;
	}

	async function handleSave() {
		if (!title) return alert('Judul wajib diisi');
		const ts = Date.now();
		const newItemId = editId || ts.toString();
		const scheduledTs = scheduleTime ? new Date(scheduleTime).getTime() : undefined;

		const formattedEpisodes = episodes.map((e) => {
			const validServers = e.servers.filter((s) => s.url.trim() !== '');
			let urlString = '';
			if (validServers.length === 1 && validServers[0].name === 'Default') {
				urlString = validServers[0].url;
			} else {
				urlString = validServers.map((s) => `${s.name.trim()}|${s.url.trim()}`).join('\n');
			}
			return { ep: e.ep, url: urlString, title: `Episode ${e.ep}`, video: urlString };
		});

		const newItem: Donghua = {
			id: newItemId,
			title,
			type: type as 'series' | 'movie',
			image: img,
			synopsis: desc,
			status,
			// Empty input means "no rating"; otherwise clamp to 1.0 - 10.0.
			rating: rating === '' ? undefined : Math.min(10, Math.max(1, Number(rating) || 0)),
			day: days.join(','),
			scheduledTime: scheduledTs,
			episodes: formattedEpisodes,
			views: 0,
			lastUpdated: ts
		};

		const newlist = [...donghuaList];
		const idx = newlist.findIndex((x) => x.id === newItemId);
		if (idx > -1) {
			newItem.views = newlist[idx].views || 0;
			newlist[idx] = newItem;
		} else newlist.push(newItem);

		try {
			const res = await api.saveDonghua(newlist);
			if (res.ok) {
				if (sendNotification) {
					try {
						const notifBody = notifyMsg || `${title} Episode Baru Telah Rilis!`;
						await fetch('/api/notify', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								title: 'Update Anime!',
								body: notifBody,
								url: `/synopsis/${newItemId}`,
								image: img
							})
						});
					} catch (err) {
						console.error('Gagal kirim notifikasi', err);
					}
				}
				await loadAllData();
				editorMode = false;
				alert('Data Berhasil Disimpan' + (sendNotification ? ' & Notifikasi Dikirim!' : '!'));
			} else alert('Gagal menyimpan. Cek koneksi.');
		} catch {
			alert('Error saving');
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Yakin ingin menghapus anime ini secara permanen?')) return;
		try {
			await api.deleteDonghua(id);
			donghuaList = donghuaList.filter((x) => x.id !== id);
		} catch {
			alert('Error deleting');
		}
	}

	// ---- Backup ----
	function handleDownloadBackup() {
		const backupData = {
			timestamp: Date.now(),
			generated: new Date().toISOString(),
			donghua: donghuaList
		};
		const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `ca3d_backup_${new Date().toISOString().slice(0, 10)}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function handleRestoreBackup(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		if (!confirm('PERINGATAN: Restore akan menimpa data Konten Anime yang ada saat ini. Lanjutkan?')) {
			input.value = '';
			return;
		}
		const reader = new FileReader();
		reader.onload = async (ev) => {
			try {
				const json = JSON.parse(ev.target?.result as string);
				if (json.donghua && Array.isArray(json.donghua)) {
					msg = 'Sedang mengupload data...';
					const res = await api.saveDonghua(json.donghua);
					if (res.ok) {
						alert('Restore Konten Anime Berhasil!');
						await loadAllData();
					} else alert('Gagal restore. Cek koneksi.');
				} else alert('Format file backup tidak valid!');
			} catch {
				alert('Error parsing JSON file.');
			}
			input.value = '';
		};
		reader.readAsText(file);
	}

	const filteredDonghua = $derived(
		donghuaList
			.filter((d) => d.title.toLowerCase().includes(searchQuery.toLowerCase()))
			.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0))
	);
</script>

<svelte:head>
	<title>Admin Panel - CA3D</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#if !isAuthenticated}
	<div class="admin-panel-root admin-login-neu">
		<div class="admin-login-neu-card">
			<div class="admin-login-neu-icon">
				<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--admin-accent)" stroke-width="2"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
					/></svg
				>
			</div>
			<h2 class="admin-login-neu-title">Admin<span style="color: var(--admin-accent)">Panel</span></h2>
			<p class="admin-login-neu-subtitle">Masuk untuk mengelola konten website</p>
			<form onsubmit={handleLogin} class="admin-login-neu-form">
				<div class="admin-login-neu-inputbx">
					<input bind:value={user} type="text" placeholder="Username" autocomplete="username" maxlength="32" />
				</div>
				<div class="admin-login-neu-inputbx">
					<input
						bind:value={pass}
						type="password"
						placeholder="Password"
						autocomplete="current-password"
						maxlength="128"
					/>
				</div>
				<button type="submit" class="admin-login-neu-submit">LOGIN DASHBOARD</button>
			</form>
			{#if msg}<p class="admin-login-neu-msg">{msg}</p>{/if}
		</div>
	</div>
{:else}
	<div class="admin-panel-root flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
		<!-- SIDEBAR DESKTOP -->
		<aside class="w-64 bg-slate-900 border-r border-admin-ink flex-shrink-0 hidden md:flex flex-col z-20">
			<div class="h-16 flex items-center justify-center px-6 border-b border-admin-ink bg-slate-900">
				<img src="/logo.png" alt="CA3D CMS" class="h-10 w-auto" />
			</div>
			<nav class="flex-1 p-4 space-y-2 overflow-y-auto">
				<button
					onclick={() => {
						activeTab = 'anime';
						editorMode = false;
					}}
					class={[
						'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all',
						activeTab === 'anime' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
					].join(' ')}
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
						/></svg
					>
					Anime Manager
				</button>
				<button
					onclick={() => (activeTab = 'backup')}
					class={[
						'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all',
						activeTab === 'backup' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
					].join(' ')}
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
						/></svg
					>
					Backup / Restore
				</button>
			</nav>
			<div class="p-4 border-t border-admin-ink bg-slate-900">
				<a href="/" class="block w-full text-center py-2 mb-2 text-xs font-bold text-slate-500 hover:text-blue-400"
					>Lihat Website &rarr;</a
				>
				<button
					onclick={handleLogout}
					class="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-900/20 hover:text-red-400 text-slate-300 py-3 rounded-lg text-xs font-bold transition border border-admin-ink"
				>
					Logout
				</button>
			</div>
		</aside>

		<!-- MAIN CONTENT -->
		<main class="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-slate-950">
			<header
				class="h-16 bg-slate-900 border-b border-admin-ink flex items-center justify-between px-4 md:hidden flex-shrink-0 z-20"
			>
				<div class="flex flex-col justify-center">
					<img src="/logo.png" alt="Logo" class="h-6 w-auto object-contain" />
					<span class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Panel Admin</span>
				</div>
				<div class="flex gap-2">
					<button
						onclick={() => (activeTab = 'anime')}
						class={[
							'p-2 rounded-lg border',
							activeTab === 'anime' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-800 border-admin-ink text-slate-400'
						].join(' ')}>A</button
					>
					<button
						onclick={() => (activeTab = 'backup')}
						class={[
							'p-2 rounded-lg border',
							activeTab === 'backup' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-800 border-admin-ink text-slate-400'
						].join(' ')}>B</button
					>
					<button onclick={handleLogout} class="p-2 rounded-lg bg-slate-800 border border-admin-ink text-red-400"
						>X</button
					>
				</div>
			</header>

			<div class="flex-1 overflow-y-auto p-4 md:p-8 custom-scroll">
				<!-- ANIME MANAGER TAB -->
				{#if activeTab === 'anime'}
					{#if !editorMode}
						<div class="space-y-6 animate-fade-in pb-20">
							<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
								<div class="bg-slate-900 p-4 rounded-xl border border-admin-ink">
									<div class="text-slate-500 text-xs font-bold uppercase mb-1">Total Anime</div>
									<div class="text-2xl font-black text-white">{donghuaList.length}</div>
								</div>
								<div class="bg-slate-900 p-4 rounded-xl border border-admin-ink">
									<div class="text-slate-500 text-xs font-bold uppercase mb-1">Total Views</div>
									<div class="text-2xl font-black text-blue-400">
										{donghuaList.reduce((a, b) => a + (b.views || 0), 0).toLocaleString()}
									</div>
								</div>
								<div class="bg-slate-900 p-4 rounded-xl border border-admin-ink">
									<div class="text-slate-500 text-xs font-bold uppercase mb-1">Total Episode</div>
									<div class="text-2xl font-black text-green-400">
										{donghuaList.reduce((a, b) => a + (b.episodes?.length || 0), 0)}
									</div>
								</div>
								<div class="bg-slate-900 p-4 rounded-xl border border-admin-ink">
									<div class="text-slate-500 text-xs font-bold uppercase mb-1">Movie</div>
									<div class="text-2xl font-black text-red-400">
										{donghuaList.filter((d) => d.type === 'movie').length}
									</div>
								</div>
							</div>

							<div
								class="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900 p-4 rounded-xl border border-admin-ink"
							>
								<div class="relative w-full md:w-96">
									<input
										type="text"
										placeholder="Cari judul anime..."
										bind:value={searchQuery}
										class="w-full bg-slate-950 border border-admin-ink rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:border-blue-500 outline-none transition"
									/>
									<div class="absolute left-3 top-3 text-slate-500">
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
											><path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
											/></svg
										>
									</div>
								</div>
								<div class="flex gap-2 w-full md:w-auto">
									<button
										onclick={loadAllData}
										class="p-2.5 bg-slate-800 text-slate-400 rounded-lg hover:text-white border border-admin-ink transition"
										title="Refresh Data">⟳</button
									>
									<button
										onclick={() => openEditor()}
										class="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition"
									>
										+ Tambah Anime
									</button>
								</div>
							</div>

							<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
								{#each filteredDonghua as item (item.id)}
									<div
										class="group relative bg-slate-900 rounded-xl overflow-hidden border border-admin-ink transition-all"
									>
										<div class="relative aspect-[2/3] overflow-hidden rounded-poster bg-slate-950">
											<img
												src={getOptimizedImageUrl(item.image, 300)}
												alt={item.title}
												class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
												loading="lazy"
											/>
											<div class="absolute top-2 left-2 z-10 flex flex-col gap-1">
												<span
													class={[
														'px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider',
														item.type === 'movie' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
													].join(' ')}
												>
													{item.type || 'SERIES'}
												</span>
											</div>
											<div class="absolute top-2 right-2 z-10">
												<span
													class="bg-slate-900 text-white border border-admin-ink px-2 py-1 rounded text-[10px] font-bold"
												>
													{item.episodes?.length || 0} EPS
												</span>
											</div>
											<div
												class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3"
											>
												<button
													onclick={() => openEditor(item)}
													class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-full text-xs font-bold"
													>Edit</button
												>
												<button
													onclick={() => handleDelete(item.id)}
													class="bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded-full text-xs font-bold"
													>Hapus</button
												>
											</div>
										</div>
										<div class="p-3">
											<h3
												class="font-bold text-slate-200 text-sm leading-tight line-clamp-2 mb-2 h-9"
												title={item.title}
											>
												{item.title}
											</h3>
											<div class="flex justify-between items-center text-[10px] text-slate-500 font-medium">
												<span>👁 {item.views || 0}</span>
												<span>{item.day || '?'}</span>
											</div>
										</div>
									</div>
								{/each}
							</div>

							{#if filteredDonghua.length === 0}
								<div class="text-center py-20 text-slate-500 italic border-2 border-dashed border-admin-ink rounded-xl">
									Tidak ada anime yang ditemukan.
								</div>
							{/if}
						</div>
					{:else}
						<!-- EDITOR MODE -->
						<div class="animate-fade-in pb-40">
							<div class="border-b border-admin-ink pb-4 mb-6 pt-2 flex items-center justify-between">
								<div class="flex items-center gap-3">
									<button
										onclick={() => (editorMode = false)}
										class="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-admin-ink transition font-bold text-sm"
									>
										← Kembali
									</button>
									<h2 class="text-xl font-bold text-white hidden md:block">
										{editId ? 'Edit Anime' : 'Tambah Anime Baru'}
									</h2>
								</div>
							</div>

							<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
								<div class="space-y-6 order-2 lg:order-none">
									<div class="bg-slate-900 p-5 rounded-xl border border-admin-ink">
										<label class="block text-xs font-bold text-slate-400 uppercase mb-2" for="ed-img"
											>Poster Preview</label
										>
										<div
											class="aspect-[2/3] bg-slate-950 rounded-poster border-2 border-dashed border-admin-ink flex items-center justify-center overflow-hidden mb-4"
										>
											{#if img}
												<img src={getOptimizedImageUrl(img, 300)} alt="Preview" class="w-full h-full object-cover" />
											{:else}
												<span class="text-slate-600 text-xs">No Image URL</span>
											{/if}
										</div>
										<input
											id="ed-img"
											bind:value={img}
											type="text"
											placeholder="Paste URL Gambar disini..."
											class="w-full bg-slate-950 border border-admin-ink rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none"
										/>
									</div>
									<div class="bg-slate-900 p-5 rounded-xl border border-admin-ink space-y-5">
										<div class="grid grid-cols-2 gap-4">
											<div>
												<label class="block text-xs font-bold text-slate-400 uppercase mb-2" for="ed-type"
													>Tipe Anime</label
												>
												<select
													id="ed-type"
													bind:value={type}
													class="w-full bg-slate-950 border border-admin-ink rounded-lg p-3 text-sm text-white outline-none"
												>
													<option value="series">Series</option>
													<option value="movie">Movie</option>
												</select>
											</div>
											<div>
												<label class="block text-xs font-bold text-slate-400 uppercase mb-2" for="ed-status"
													>Status</label
												>
												<select
													id="ed-status"
													bind:value={status}
													class="w-full bg-slate-950 border border-admin-ink rounded-lg p-3 text-sm text-white outline-none"
												>
													<option value="Ongoing">Ongoing</option>
													<option value="Completed">Completed</option>
													<option value="Dropped">Dropped</option>
												</select>
											</div>
										</div>
										<div>
											<label class="block text-xs font-bold text-slate-400 uppercase mb-2" for="ed-rating"
												>Rating (Manual)</label
											>
											<div class="flex items-center gap-3">
												<input
													id="ed-rating"
													bind:value={rating}
													type="number"
													min="1"
													max="10"
													step="0.1"
													placeholder="Contoh: 8.5"
													class="flex-1 bg-slate-950 border border-admin-ink rounded-lg p-3 text-sm text-white outline-none"
												/>
												<button
													type="button"
													onclick={() => (rating = '')}
													class="text-xs font-bold text-slate-500 hover:text-red-400 px-3 py-3 border border-admin-ink rounded-lg transition"
													title="Kosongkan rating">Hapus</button
												>
											</div>
											<p class="text-[10px] text-slate-500 mt-1">
												Diisi manual oleh admin (1.0 - 10.0). Kosongkan bila belum ada rating.
											</p>
										</div>
										<div>
										<span class="block text-xs font-bold text-slate-400 uppercase mb-2">Jadwal Tayang</span>
											<div class="grid grid-cols-4 gap-2">
												{#each ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu', 'Random'] as d (d)}
													<button
														onclick={() => toggleDay(d)}
														class={[
															'px-1 py-2 rounded text-[10px] font-bold border transition',
															days.includes(d) ? 'bg-blue-600 text-white' : 'bg-slate-950 text-slate-500'
														].join(' ')}>{d}</button
													>
												{/each}
											</div>
										</div>
										<div>
											<label class="block text-xs font-bold text-slate-400 uppercase mb-2" for="ed-sched"
												>Auto Publish</label
											>
											<input
												id="ed-sched"
												bind:value={scheduleTime}
												type="datetime-local"
												class="w-full bg-slate-950 border border-admin-ink rounded-lg p-3 text-xs text-white outline-none"
											/>
										</div>
									</div>
								</div>

								<div class="space-y-6 order-3 lg:order-none">
									<div class="bg-slate-900 p-5 rounded-xl border border-admin-ink space-y-5">
										<div>
											<label class="block text-xs font-bold text-slate-400 uppercase mb-2" for="ed-title"
												>Judul Anime</label
											>
											<input
												id="ed-title"
												bind:value={title}
												type="text"
												class="w-full bg-slate-950 border border-admin-ink rounded-lg p-3 text-sm text-white outline-none font-bold"
											/>
										</div>
										<div>
											<label class="block text-xs font-bold text-slate-400 uppercase mb-2" for="ed-desc"
												>Sinopsis</label
											>
											<textarea
												id="ed-desc"
												bind:value={desc}
												rows="12"
												class="w-full bg-slate-950 border border-admin-ink rounded-lg p-3 text-sm text-white outline-none"
											></textarea>
										</div>
										<div>
											<label class="block text-xs font-bold text-slate-400 uppercase mb-2" for="ed-notif"
												>Pesan Notifikasi</label
											>
											<textarea
												id="ed-notif"
												bind:value={notifyMsg}
												rows="2"
												class="w-full bg-slate-950 border border-admin-ink rounded-lg p-3 text-sm text-white outline-none"
											></textarea>
										</div>
									</div>
								</div>

								<div class="flex flex-col h-auto lg:h-[calc(100vh-140px)] order-1 lg:order-none">
									<div
										class="bg-slate-900 rounded-xl border border-admin-ink flex flex-col h-full overflow-hidden"
									>
										<div class="p-4 bg-slate-800/50 border-b border-admin-ink flex justify-between items-center">
											<h3 class="font-bold text-white text-sm uppercase">Daftar Episode</h3>
											<button
												onclick={addEpisode}
												class="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-lg font-bold transition"
												>+ Tambah EPS</button
											>
										</div>
										<div
											class="flex-1 overflow-y-auto p-3 space-y-3 custom-scroll bg-slate-900/50 max-h-[600px] lg:max-h-none"
										>
											{#each [...episodes.map((ep, idx) => ({ ep, idx }))].reverse() as { ep, idx } (idx)}
												<div class="flex flex-col gap-2 bg-slate-950 p-3 border-2 border-admin-ink rounded-lg">
													<div class="flex items-center gap-2 mb-2">
														<div class="flex flex-col gap-0.5">
															<button
																onclick={() => moveEpisode(idx, -1)}
																class="bg-slate-800 text-slate-500 rounded px-1 py-0.5 text-[10px]">▲</button
															>
															<button
																onclick={() => moveEpisode(idx, 1)}
																class="bg-slate-800 text-slate-500 rounded px-1 py-0.5 text-[10px]">▼</button
															>
														</div>
														<span class="text-xs font-bold text-slate-500">EP:</span>
														<input
															value={ep.ep}
															oninput={(e) => updateEpNum(idx, e.currentTarget.value)}
															placeholder="No"
															class="w-16 bg-slate-900 border border-admin-ink text-sm p-1.5 text-center text-white rounded outline-none font-bold"
														/>
														<div class="flex-1"></div>
														<button
															onclick={() => removeEpisode(idx)}
															class="text-slate-600 hover:text-red-500 p-1.5">✕</button
														>
													</div>
													<div class="space-y-2">
														{#each ep.servers as srv, srvIdx (srvIdx)}
															<div class="flex gap-2 items-center">
																<input
																	value={srv.name}
																	oninput={(e) => updateServerData(idx, srvIdx, 'name', e.currentTarget.value)}
																	placeholder="Server"
																	class="w-1/3 bg-slate-900 border border-admin-ink text-xs p-2 text-white rounded outline-none"
																/>
																<input
																	value={srv.url}
																	oninput={(e) => updateServerData(idx, srvIdx, 'url', e.currentTarget.value)}
																	placeholder="URL"
																	class="flex-1 bg-slate-900 border border-admin-ink text-xs p-2 text-slate-300 rounded outline-none font-mono"
																/>
																{#if ep.servers.length > 1}
																	<button
																		onclick={() => removeServerFromEp(idx, srvIdx)}
																		class="text-slate-600 hover:text-red-500 p-1">✕</button
																	>
																{/if}
															</div>
														{/each}
													</div>
													<button
														onclick={() => addServerToEp(idx)}
														class="mt-1 w-full py-1.5 border border-dashed border-admin-ink rounded text-[10px] text-slate-500 hover:text-blue-400"
														>+ Tambah Server</button
													>
												</div>
											{/each}
										</div>
									</div>
								</div>
							</div>

							<div
								class="fixed bottom-0 left-0 w-full bg-slate-900 border-t border-admin-ink p-4 z-50 flex flex-col items-center justify-center gap-3"
							>
								<label
									class="flex items-center gap-2 cursor-pointer select-none bg-slate-950 p-3 rounded-lg border border-admin-ink w-full max-w-md justify-center"
								>
									<input
										type="checkbox"
										bind:checked={sendNotification}
										class="w-4 h-4 rounded border-admin-ink text-blue-600 bg-slate-900"
									/>
									<span class="text-xs font-bold text-slate-300">Kirim Notifikasi ke User?</span>
								</label>
								<button
									onclick={handleSave}
									class="w-full max-w-md bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-lg flex items-center justify-center gap-2"
									>SIMPAN SEMUA DATA</button
								>
							</div>
						</div>
					{/if}
				{/if}


				<!-- BACKUP TAB -->
				{#if activeTab === 'backup'}
					<div class="space-y-6 animate-fade-in max-w-3xl mx-auto pb-20">
						<div class="bg-slate-900 p-6 rounded-xl border border-admin-ink text-center">
							<h2 class="text-2xl font-bold text-white mb-2">Backup &amp; Restore</h2>
							<p class="text-slate-400 text-sm">
								Download semua data anime dan episode ke file JSON, atau restore dari file
								backup.
							</p>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div
								class="bg-slate-900 rounded-xl border border-admin-ink p-6 flex flex-col items-center text-center"
							>
								<h3 class="font-bold text-white mb-2">Download Data</h3>
								<p class="text-xs text-slate-500 mb-6 px-4">
									Mengunduh file .json berisi seluruh katalog anime beserta daftar episodenya.
								</p>
								<button
									onclick={handleDownloadBackup}
									class="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition"
									>DOWNLOAD JSON</button
								>
							</div>

							<div
								class="bg-slate-900 rounded-xl border border-admin-ink p-6 flex flex-col items-center text-center"
							>
								<h3 class="font-bold text-white mb-2">Restore Data</h3>
								<p class="text-xs text-slate-500 mb-6 px-4">
									Upload file .json backup untuk mengembalikan data Anime &amp; Konten.
								</p>
								<div class="relative w-full">
									<input
										bind:this={fileInputRef}
										type="file"
										accept=".json"
										onchange={handleRestoreBackup}
										class="hidden"
										id="restore-file"
									/>
									<label
										for="restore-file"
										class="cursor-pointer w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-lg flex items-center justify-center transition"
										>UPLOAD FILE</label
									>
								</div>
							</div>
						</div>

						<div class="bg-red-900/20 border border-red-900/50 rounded-lg p-4 text-xs text-red-400">
							<strong>Catatan Penting:</strong> Fitur Restore difokuskan untuk mengembalikan <u>Data Anime &amp; Episode</u
							>. Pastikan Anda menyimpan file backup ini di tempat yang aman.
						</div>
					</div>
				{/if}
			</div>
		</main>
	</div>
{/if}
