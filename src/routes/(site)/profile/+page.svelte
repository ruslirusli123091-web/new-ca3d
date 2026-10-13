<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { Donghua } from '$lib/types';
	import { api } from '$lib/api';
	import { user as userStore, isAdmin as isAdminStore } from '$lib/stores/user';
	import { getOptimizedImageUrl } from '$lib/utils/helpers';
	import { updateSEO } from '$lib/seo';
	import MovieCard from '$components/common/MovieCard.svelte';
	import SidebarItem from '$components/common/SidebarItem.svelte';
	import Turnstile from '$components/auth/Turnstile.svelte';

	let { data }: { data: Donghua[] } = $props();

	let isLogin = $state(true);
	let username = $state('');
	let password = $state('');
	let loading = $state(false);
	let activeTab = $state<'bookmarks' | 'history'>('bookmarks');
	let website = $state(''); // honeypot
	let turnstileToken = $state('');

	const isAdmin = $derived($isAdminStore);

	$effect(() => {
		updateSEO(
			$userStore ? `Profil ${$userStore.display_name}` : 'Login Member',
			'Masuk ke akun Chinese Anime 3D untuk mengelola bookmark dan riwayat tontonan.'
		);
	});

	const popularList = $derived([...data].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5));
	const randomList = $derived([...data].sort(() => 0.5 - Math.random()).slice(0, 5));

	async function handleAuth(e: SubmitEvent) {
		e.preventDefault();
		loading = true;
		try {
			if (isLogin) {
				// Try admin login first (mirrors the original flow).
				try {
					const admin = await api.adminLogin(username, password, turnstileToken || undefined);
					isAdminStore.set(true);
					userStore.set({
						username: admin.user.username,
						display_name: 'Administrator',
						bookmarks: [],
						history: []
					});
					alert('Login Berhasil sebagai Administrator!');
					return;
				} catch (adminErr) {
					const status = (adminErr as { status?: number }).status;
					// Only fall through to member login on auth failure, not rate limit.
					if (status === 429) throw adminErr;
				}

				const res = await api.login(username, password, turnstileToken || undefined);
				userStore.set(res.user);
				isAdminStore.set(false);
			} else {
				await api.register(username, password, turnstileToken || undefined);
				alert('Register success! Please login.');
				isLogin = true;
			}
		} catch (err) {
			alert((err as Error).message);
		} finally {
			loading = false;
		}
	}

	async function handleLogout() {
		await Promise.all([api.logout(), api.adminLogout()]);
		userStore.set(null);
		isAdminStore.set(false);
		goto('/');
	}

	const bookmarkedItems = $derived(
		$userStore?.bookmarks ? data.filter((d) => $userStore!.bookmarks!.includes(d.id)) : []
	);
	const historyList = $derived(
		$userStore?.history
			? $userStore.history
					.map((h) => {
						const d = data.find((x) => x.id === h.id);
						return d ? { ...d, watchedEp: h.ep } : null;
					})
					.filter(Boolean)
			: []
	);
</script>

<svelte:head>
	<title>{$userStore ? `Profil ${$userStore.display_name}` : 'Login Member'} - Chinese Anime 3D</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 py-8 min-h-screen">
	<div class="flex flex-col lg:flex-row gap-8">
		<div class="flex-1 flex justify-center items-start pt-10">
			{#if $userStore}
				<div class="w-full max-w-lg bg-bg-secondary p-8 text-center relative overflow-hidden">
					<div class="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/20 to-transparent"></div>
					<div
						class={[
							'w-24 h-24 border-4 border-ink mx-auto flex items-center justify-center text-4xl font-bold text-text-main mb-4 relative z-10 shadow-brutal',
							isAdmin ? 'bg-red-600' : 'bg-bg-card'
						].join(' ')}
					>
						{$userStore.display_name.charAt(0).toUpperCase()}
					</div>
					<h2 class="font-display text-2xl font-bold text-text-main mb-1">{$userStore.display_name}</h2>
					<span
						class={[
							'px-3 py-1 text-xs font-bold',
							isAdmin ? 'bg-red-500/20 text-red-500' : 'bg-primary/20 text-primary'
						].join(' ')}
					>
						{isAdmin ? 'Super Admin' : 'Member'}
					</span>
					{#if isAdmin}
						<div class="mt-6">
							<button
								onclick={() => goto('/admin')}
								class="brutal-press w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-brutal-sm transition flex items-center justify-center gap-2"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
									/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg
								>
								BUKA PANEL ADMIN
							</button>
						</div>
					{/if}
					<div class="grid grid-cols-2 gap-4 mt-8 text-left">
						<button
							onclick={() => (activeTab = 'bookmarks')}
							class={[
								'bg-bg-main p-4 border-2 cursor-pointer transition text-left',
								activeTab === 'bookmarks' ? 'border-primary shadow-brutal-sm' : 'border-ink hover:bg-bg-hover'
							].join(' ')}
						>
							<div class="text-2xl font-black text-text-main mb-1">{$userStore.bookmarks?.length || 0}</div>
							<div class="text-xs text-text-muted uppercase font-bold">Favorit</div>
						</button>
						<button
							onclick={() => (activeTab = 'history')}
							class={[
								'bg-bg-main p-4 border-2 cursor-pointer transition text-left',
								activeTab === 'history' ? 'border-primary shadow-brutal-sm' : 'border-ink hover:bg-bg-hover'
							].join(' ')}
						>
							<div class="text-2xl font-black text-text-main mb-1">{$userStore.history?.length || 0}</div>
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
										Belum ada favorit.
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
									<div class="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scroll">
										{#each historyList as item, idx (idx)}
											{@const it = item as Donghua & { watchedEp: string }}
											<div
												onclick={() => goto(`/watch/${it.id}/${it.watchedEp}`)}
												onkeydown={(e) => e.key === 'Enter' && goto(`/watch/${it.id}/${it.watchedEp}`)}
												role="button"
												tabindex="0"
												class="flex gap-3 p-2 bg-bg-main cursor-pointer hover:border-primary transition group"
											>
												<div class="w-16 h-20 flex-shrink-0 rounded-poster overflow-hidden relative">
													<img src={getOptimizedImageUrl(it.image, 100)} class="w-full h-full object-cover" alt="" />
													<div
														class="absolute bottom-0 w-full bg-black/60 text-white text-[10px] text-center font-bold py-0.5"
													>
														Ep {it.watchedEp}
													</div>
												</div>
												<div class="flex-1 min-w-0 flex flex-col justify-center">
													<h4 class="font-bold text-text-main text-xs md:text-sm truncate group-hover:text-primary">
														{it.title}
													</h4>
													<div class="text-[10px] text-text-muted mt-1">Lanjut: Episode {it.watchedEp}</div>
													<div class="text-[10px] text-text-muted mt-auto">
														{it.type === 'movie' ? 'Movie' : 'Series'}
													</div>
												</div>
											</div>
										{/each}
									</div>
								{/if}
							{/if}
						</div>
					</div>
					<button
						onclick={handleLogout}
						class="brutal-press mt-8 w-full py-3 bg-red-500/10 text-red-500 border-2 border-red-500 font-bold hover:bg-red-500 hover:text-white transition"
						>Logout</button
					>
				</div>
			{:else}
				<div class="w-full max-w-sm bg-bg-secondary p-8 shadow-brutal-lg">
					<h2
						class="font-display text-2xl font-bold text-text-main mb-8 text-center tracking-tight uppercase"
					>
						{isLogin ? 'Welcome Back' : 'Join Community'}
					</h2>
					<form onsubmit={handleAuth} class="space-y-5">
						<div>
							<label class="block text-xs font-bold text-text-muted mb-1 uppercase tracking-wide" for="p-user"
								>Username</label
							>
							<input
								id="p-user"
								bind:value={username}
								type="text"
								maxlength="32"
								autocomplete="username"
								class="w-full bg-bg-main p-3 text-text-main text-sm focus:border-primary outline-none transition shadow-inner"
								required
							/>
						</div>
						<div>
							<label class="block text-xs font-bold text-text-muted mb-1 uppercase tracking-wide" for="p-pass"
								>Password</label
							>
							<input
								id="p-pass"
								bind:value={password}
								type="password"
								maxlength="128"
								autocomplete={isLogin ? 'current-password' : 'new-password'}
								class="w-full bg-bg-main p-3 text-text-main text-sm focus:border-primary outline-none transition shadow-inner"
								required
							/>
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
							<div class="turnstile-slot">
								<Turnstile siteKey={$page.data.turnstileSiteKey} onVerify={(t) => (turnstileToken = t)} />
							</div>
						{/if}

						<button
							disabled={loading}
							class="brutal-press w-full bg-primary text-text-on-primary py-3.5 font-bold hover:bg-primary-dark transition shadow-brutal-sm disabled:opacity-60"
						>
							{loading ? 'Processing...' : isLogin ? 'MASUK SEKARANG' : 'DAFTAR AKUN BARU'}
						</button>
					</form>
					<div class="mt-6 text-center text-sm text-text-muted">
						<button onclick={() => (isLogin = !isLogin)} class="text-primary font-bold hover:underline">
							{isLogin ? 'Buat akun baru' : 'Sudah punya akun? Login'}
						</button>
					</div>
				</div>
			{/if}
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
