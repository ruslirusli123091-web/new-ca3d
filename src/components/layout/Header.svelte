<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Donghua } from '$lib/types';
	import { getOptimizedImageUrl } from '$lib/utils/helpers';
	import { themeColor, themeMode, THEMES } from '$lib/stores/theme';

	interface Props {
		data: Donghua[];
		onSearch?: (val: string) => void;
	}

	let { data, onSearch = () => {} }: Props = $props();

	// VAPID public key is public by design (safe to ship to the client).
	const VAPID_PUBLIC_KEY =
		'BEILObk2BQwxFm_9moEUYRtMVFuQzuy0VmPzO0CxCpbGpEY14CiEij65fWfCI77avqjt9Q8qO5WkfgzSCMnZiYA';

	let isScrolled = $state(false);
	let hideHeader = $state(false);
	let isMobileSearchOpen = $state(false);
	let isMobileMenuOpen = $state(false);
	let isThemeMenuOpen = $state(false);
	let searchQuery = $state('');
	let searchResults = $state<Donghua[]>([]);
	let showDropdown = $state(false);
	let isSubscribed = $state(false);
	let lastScrollY = 0;

	onMount(() => {
		lastScrollY = window.scrollY;
		const handleScroll = () => {
			const currentY = window.scrollY;
			isScrolled = currentY > 20;
			const diff = currentY - lastScrollY;
			if (currentY < 80) {
				hideHeader = false;
			} else if (diff > 8) {
				hideHeader = true;
				lastScrollY = currentY;
			} else if (diff < -8) {
				hideHeader = false;
				lastScrollY = currentY;
			}
		};
		window.addEventListener('scroll', handleScroll);

		if ('serviceWorker' in navigator && 'PushManager' in window) {
			navigator.serviceWorker.ready.then((registration) => {
				registration.pushManager.getSubscription().then((subscription) => {
					isSubscribed = !!subscription;
				});
			});
		}

		return () => window.removeEventListener('scroll', handleScroll);
	});

	function handleMobileNavClick(path: string) {
		goto(path);
		isMobileMenuOpen = false;
	}

	function urlBase64ToUint8Array(base64String: string) {
		const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
		const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
		const rawData = window.atob(base64);
		const outputArray = new Uint8Array(rawData.length);
		for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
		return outputArray;
	}

	async function handleSubscribe() {
		if (!('serviceWorker' in navigator)) return;
		try {
			const registration = await navigator.serviceWorker.ready;
			if (isSubscribed) {
				const subscription = await registration.pushManager.getSubscription();
				if (subscription) {
					await subscription.unsubscribe();
					isSubscribed = false;
					alert('Notifikasi dimatikan.');
				}
			} else {
				const subscription = await registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
				});
				await fetch('/api/subscribe', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(subscription)
				});
				isSubscribed = true;
				registration.showNotification('Notifikasi Aktif!', {
					body: 'Terima kasih telah berlangganan. Anda akan mendapatkan update episode terbaru.',
					icon: '/logo.png',
					badge: '/favicon-96x96.png'
				});
			}
		} catch (error) {
			console.error('Failed to subscribe:', error);
			alert('Gagal mengaktifkan notifikasi. Pastikan izin diberikan.');
		}
	}

	function handleSearchChange(val: string) {
		searchQuery = val;
		onSearch(val);
		if (val.trim()) {
			searchResults = data
				.filter((d) => d.title.toLowerCase().includes(val.toLowerCase()))
				.slice(0, 6);
			showDropdown = true;
		} else {
			showDropdown = false;
		}
	}

	function handleResultClick(id: string) {
		goto(`/synopsis/${id}`);
		showDropdown = false;
		searchQuery = '';
		onSearch('');
		isMobileSearchOpen = false;
	}
</script>

<header
	class={[
		'fixed top-0 z-50 w-full transition-all duration-300 border-b',
		hideHeader && !isMobileMenuOpen && !isMobileSearchOpen ? '-translate-y-full' : 'translate-y-0',
		isScrolled || isMobileMenuOpen ? 'bg-bg-main border-ink shadow-brutal-sm' : 'bg-transparent border-transparent'
	].join(' ')}
>
	<div class="max-w-7xl mx-auto h-16 flex items-center justify-between px-4 gap-4">
		<!-- MOBILE LAYOUT -->
		<div class="md:hidden flex items-center justify-between w-full">
			{#if isMobileSearchOpen}
				<div class="flex-1 flex items-center gap-3 animate-fade-in relative">
					<div class="relative flex-1">
						<input
							type="text"
							value={searchQuery}
							placeholder="Cari donghua..."
							oninput={(e) => handleSearchChange(e.currentTarget.value)}
							class="w-full bg-bg-card text-text-main py-2 px-4 rounded-full outline-none focus:border-primary text-sm shadow-inner"
							aria-label="Cari donghua"
						/>
						{#if showDropdown && searchResults.length > 0}
							<div
								class="absolute top-full left-0 w-full bg-bg-secondary rounded-lg mt-2 shadow-xl z-50 overflow-hidden"
							>
								{#each searchResults as item (item.id)}
									<div
										onclick={() => handleResultClick(item.id)}
										onkeydown={(e) => e.key === 'Enter' && handleResultClick(item.id)}
										role="button"
										tabindex="0"
										class="flex items-center gap-3 p-3 border-b border-ink last:border-0 hover:bg-bg-hover active:bg-bg-card cursor-pointer"
									>
										<img src={getOptimizedImageUrl(item.image, 50)} alt="" class="w-8 h-10 object-cover rounded" />
										<div class="text-sm font-bold text-text-main truncate">{item.title}</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
					<button
						onclick={() => {
							isMobileSearchOpen = false;
							handleSearchChange('');
						}}
						class="text-text-muted hover:text-text-main"
						aria-label="Batal Pencarian"
					>
						Batal
					</button>
				</div>
			{:else}
				<div class="flex items-center gap-4">
					<button
						onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
						class="text-text-main"
						aria-label={isMobileMenuOpen ? 'Tutup Menu' : 'Buka Menu'}
					>
						{#if isMobileMenuOpen}
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg
							>
						{:else}
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg
							>
						{/if}
					</button>
					<a href="/" class="flex items-center gap-2" aria-label="Halaman Utama">
						<img src="/logo.png" alt="CA3D" width="120" height="40" class="h-10 w-auto object-contain" />
					</a>
				</div>

				<div class="flex items-center gap-3">
					<div class="relative">
						<button
							onclick={() => (isThemeMenuOpen = !isThemeMenuOpen)}
							class="w-8 h-8 flex items-center justify-center text-text-muted hover:text-primary transition-transform active:scale-95"
							aria-label="Pilih Tema"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h10a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828L11 18.657"
								/></svg
							>
						</button>
						{#if isThemeMenuOpen}
							{@render themeMenu()}
						{/if}
					</div>

					<button
						onclick={handleSubscribe}
						class={[
							'w-8 h-8 flex items-center justify-center transition-transform active:scale-95',
							isSubscribed ? 'text-primary' : 'text-text-muted hover:text-primary'
						].join(' ')}
						aria-label="Notifikasi"
					>
						{#if isSubscribed}
							<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"
								><path
									d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"
								/></svg
							>
						{:else}
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
								/></svg
							>
						{/if}
					</button>

					<button
						onclick={() => (isMobileSearchOpen = true)}
						class="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-main"
						aria-label="Buka Pencarian"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/></svg
						>
					</button>
					<a
						href="/profile"
						class="w-8 h-8 rounded-full bg-bg-card border border-ink flex items-center justify-center text-text-muted hover:text-text-main hover:border-primary transition-colors"
						aria-label="Profil Pengguna"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
							/></svg
						>
					</a>
				</div>
			{/if}
		</div>

		<!-- DESKTOP LAYOUT -->
		<div class="hidden md:flex items-center justify-between w-full">
			<a href="/" class="flex items-center gap-2 group" aria-label="Halaman Utama">
				<img
					src="/logo.png"
					alt="CA3D"
					width="144"
					height="48"
					class="h-12 w-auto object-contain group-hover:scale-105 transition-transform"
				/>
			</a>

			<nav class="flex gap-6 text-sm font-bold text-text-main">
				<a href="/" class="hover:text-primary transition-colors drop-shadow-sm">Home</a>
				<a href="/category/series" class="hover:text-primary transition-colors drop-shadow-sm">Daftar Anime</a>
				<a href="/category/movie" class="hover:text-primary transition-colors drop-shadow-sm">Movie</a>
				<a href="/schedule" class="hover:text-primary transition-colors drop-shadow-sm">Jadwal</a>
				<a href="/profile" class="hover:text-primary transition-colors drop-shadow-sm">Bookmark</a>
			</nav>

			<div class="flex items-center gap-3">
				<div class="relative group w-full max-w-xs">
					<input
						type="text"
						value={searchQuery}
						placeholder="Cari donghua..."
						oninput={(e) => handleSearchChange(e.currentTarget.value)}
						onblur={() => setTimeout(() => (showDropdown = false), 200)}
						onfocus={() => searchQuery && (showDropdown = true)}
						class="w-full bg-bg-secondary/80 text-text-main py-1.5 px-4 pl-9 rounded-full outline-none focus:border-primary focus:bg-bg-card transition-all text-sm shadow-inner placeholder-text-muted"
						aria-label="Cari donghua"
					/>
					<svg
						class="w-4 h-4 absolute left-3 top-2 text-text-muted"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/></svg
					>

					{#if showDropdown && searchResults.length > 0}
						<div
							class="absolute top-full left-0 w-full bg-bg-secondary rounded-lg mt-3 shadow-2xl z-50 overflow-hidden"
						>
							{#each searchResults as item (item.id)}
								<div
									onclick={() => handleResultClick(item.id)}
									onkeydown={(e) => e.key === 'Enter' && handleResultClick(item.id)}
									role="button"
									tabindex="0"
									class="flex items-center gap-3 p-2.5 border-b border-ink last:border-0 hover:bg-bg-hover cursor-pointer transition-colors"
								>
									<img
										src={getOptimizedImageUrl(item.image, 50)}
										alt=""
										class="w-8 h-10 object-cover rounded shadow-sm"
									/>
									<div class="text-xs font-bold text-text-main truncate">{item.title}</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<div class="relative">
					<button
						onclick={() => (isThemeMenuOpen = !isThemeMenuOpen)}
						class="w-8 h-8 rounded-full bg-bg-card border border-ink flex items-center justify-center text-text-muted hover:text-primary hover:border-primary transition-all active:scale-95"
						title="Pilih Tema"
						aria-label="Pilih Tema"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h10a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828L11 18.657"
							/></svg
						>
					</button>
					{#if isThemeMenuOpen}
						{@render themeMenu()}
					{/if}
				</div>

				<button
					onclick={handleSubscribe}
					class={[
						'w-8 h-8 rounded-full bg-bg-card border border-ink flex items-center justify-center transition-all active:scale-95',
						isSubscribed ? 'text-primary border-primary' : 'text-text-muted hover:text-primary hover:border-primary'
					].join(' ')}
					title={isSubscribed ? 'Matikan Notifikasi' : 'Aktifkan Notifikasi'}
					aria-label="Notifikasi"
				>
					{#if isSubscribed}
						<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"
							><path
								d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"
							/></svg
						>
					{:else}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
							/></svg
						>
					{/if}
				</button>

				<a
					href="/profile"
					class="w-8 h-8 rounded-full bg-bg-card border border-ink flex items-center justify-center text-text-muted hover:text-text-main hover:border-primary transition-colors"
					aria-label="Profil Pengguna"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
						/></svg
					>
				</a>
			</div>
		</div>
	</div>
</header>

<!-- Backdrop -->
<div
	onclick={() => (isMobileMenuOpen = false)}
	onkeydown={(e) => e.key === 'Escape' && (isMobileMenuOpen = false)}
	role="presentation"
	class={[
		'fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-300',
		isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
	].join(' ')}
></div>

<!-- Mobile drawer -->
<div
	class={[
		'fixed top-0 left-0 h-full w-[280px] z-50 bg-bg-secondary md:hidden transition-transform duration-300 flex flex-col shadow-xl',
		isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
	].join(' ')}
>
	<div class="flex items-center justify-between p-4 border-b border-ink flex-shrink-0">
		<img src="/logo.png" alt="CA3D" width="110" height="36" class="h-9 w-auto object-contain" />
		<button
			onclick={() => (isMobileMenuOpen = false)}
			class="w-9 h-9 bg-bg-card shadow-sm flex items-center justify-center text-text-muted hover:text-text-main rounded-full"
			aria-label="Tutup Menu"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
				><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg
			>
		</button>
	</div>
	<nav class={['flex-1 overflow-y-auto p-4 space-y-2', isMobileMenuOpen ? 'stagger-fade-grid' : ''].join(' ')}>
		<button
			onclick={() => handleMobileNavClick('/')}
			class="brutal-press w-full bg-bg-card shadow-sm text-sm font-bold text-text-main hover:text-primary py-3.5 px-4 text-left flex items-center gap-3"
		>
			<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
				/></svg
			>
			Home
		</button>
		<button
			onclick={() => handleMobileNavClick('/category/series')}
			class="brutal-press w-full bg-bg-card shadow-sm text-sm font-bold text-text-main hover:text-primary py-3.5 px-4 text-left flex items-center gap-3"
		>
			<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"
				><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" /></svg
			>
			Daftar Anime
		</button>
		<button
			onclick={() => handleMobileNavClick('/category/movie')}
			class="brutal-press w-full bg-bg-card shadow-sm text-sm font-bold text-text-main hover:text-primary py-3.5 px-4 text-left flex items-center gap-3"
		>
			<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4M3 4h18v16H3V4z"
				/></svg
			>
			Movie
		</button>
		<button
			onclick={() => handleMobileNavClick('/schedule')}
			class="brutal-press w-full bg-bg-card shadow-sm text-sm font-bold text-text-main hover:text-primary py-3.5 px-4 text-left flex items-center gap-3"
		>
			<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
				/></svg
			>
			Jadwal Rilis
		</button>
		<button
			onclick={() => handleMobileNavClick('/profile')}
			class="brutal-press w-full bg-primary shadow-sm text-sm font-bold text-text-on-primary py-3.5 px-4 text-left flex items-center gap-3"
		>
			<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
				/></svg
			>
			Bookmark / Akun
		</button>
	</nav>
</div>

{#snippet themeMenu()}
	<div class="absolute top-full right-0 mt-3 bg-bg-secondary shadow-lg p-3 z-50 w-max">
		<div class="flex gap-3 mb-3">
			{#each THEMES as t (t.id)}
				<button
					onclick={() => {
						$themeColor = t.id;
						isThemeMenuOpen = false;
					}}
					aria-label={`Tema ${t.label}`}
					title={t.label}
					class="w-8 h-8 flex items-center justify-center transition-transform active:scale-90"
					style="border-radius: 9999px; background-color: {t.color}; outline: {$themeColor === t.id
						? `2px solid ${t.color}`
						: 'none'}; outline-offset: 2px;"
				>
					{#if $themeColor === t.id}
						<svg class="w-4 h-4" fill="none" stroke="#0c1117" viewBox="0 0 24 24"
							><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg
						>
					{/if}
				</button>
			{/each}
		</div>
		<div class="flex gap-2 border-t border-ink pt-3">
			<button
				onclick={() => ($themeMode = 'dark')}
				class={[
					'flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold shadow-sm',
					$themeMode === 'dark' ? 'bg-primary text-text-on-primary' : 'bg-bg-card text-text-muted'
				].join(' ')}
			>
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
					/></svg
				>
				Gelap
			</button>
			<button
				onclick={() => ($themeMode = 'light')}
				class={[
					'flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold shadow-sm',
					$themeMode === 'light' ? 'bg-primary text-text-on-primary' : 'bg-bg-card text-text-muted'
				].join(' ')}
			>
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
					/></svg
				>
				Terang
			</button>
		</div>
	</div>
{/snippet}
