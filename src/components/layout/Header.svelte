<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { Donghua } from '$lib/types';
	import { getOptimizedImageUrl } from '$lib/utils/helpers';
	import { themeColor, themeMode, THEMES } from '$lib/stores/theme';
	import Icon from '$components/common/Icon.svelte';

	interface Props {
		data: Donghua[];
		onSearch?: (val: string) => void;
	}

	let { data, onSearch = () => {} }: Props = $props();

	/**
	 * Web Push public key (VAPID).
	 *
	 * This is a public key by design — it identifies the server to the push
	 * service. The matching private key stays on the server as a secret.
	 * Regenerate both with `node scripts/generate-vapid-keys.mjs`.
	 */
	const VAPID_PUBLIC_KEY =
		'BD3yOCgRGDKMle-0FvZSCbr-B2SwiJ0925X2XeHNBIbLXbZkLtREseIqaW7nhz-M9g-KGlnjFGRTZp1USn_HWxo';

	const NAV = [
		{ href: '/', label: 'Beranda' },
		{ href: '/category/series', label: 'Series' },
		{ href: '/category/movie', label: 'Movie' },
		{ href: '/schedule', label: 'Jadwal' },
		{ href: '/profile', label: 'Koleksi' }
	];

	let scrolled = $state(false);
	let mobileMenuOpen = $state(false);
	let themeMenuOpen = $state(false);
	let searchOpen = $state(false);
	let query = $state('');
	let results = $state<Donghua[]>([]);
	let subscribed = $state(false);
	let message = $state('');

	function toast(text: string) {
		message = text;
		setTimeout(() => (message = ''), 4000);
	}

	// Close transient overlays whenever the route changes.
	$effect(() => {
		$page.url.pathname;
		mobileMenuOpen = false;
		themeMenuOpen = false;
		searchOpen = false;
	});

	onMount(() => {
		const onScroll = () => (scrolled = window.scrollY > 8);
		window.addEventListener('scroll', onScroll, { passive: true });
		onScroll();

		/**
		 * The service worker was never registered anywhere in the app, so
		 * `navigator.serviceWorker.ready` never resolved and the notification
		 * button sat on its loading spinner forever. Registration happens here
		 * once, and the subscription check is bounded by a timeout so a slow or
		 * blocked worker can never freeze the UI again.
		 */
		if ('serviceWorker' in navigator && 'PushManager' in window) {
			navigator.serviceWorker
				.register('/sw.js')
				.then(() => navigator.serviceWorker.ready)
				.then((reg) => reg.pushManager.getSubscription())
				.then((sub) => (subscribed = !!sub))
				.catch(() => {
					/* worker unavailable (private mode, unsupported browser) —
					   the button will explain this when pressed */
				});
		}

		return () => window.removeEventListener('scroll', onScroll);
	});

	/** Resolve `serviceWorker.ready` but never hang: notifications are optional. */
	async function getRegistration(timeoutMs = 5000): Promise<ServiceWorkerRegistration | null> {
		try {
			await navigator.serviceWorker.register('/sw.js');
		} catch {
			return null;
		}
		return Promise.race([
			navigator.serviceWorker.ready,
			new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
		]);
	}

	function onQueryChange(value: string) {
		query = value;
		onSearch(value);
		results = value.trim()
			? data.filter((d) => d.title.toLowerCase().includes(value.toLowerCase())).slice(0, 6)
			: [];
	}

	function goToResult(id: string) {
		onQueryChange('');
		goto(`/synopsis/${id}`);
	}

	function urlBase64ToUint8Array(base64: string) {
		const padding = '='.repeat((4 - (base64.length % 4)) % 4);
		const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
		const raw = window.atob(normalized);
		return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
	}

	/**
	 * Push notifications.
	 *
	 * The previous version failed silently: if the VAPID key was wrong, the KV
	 * binding was missing, or the visitor's browser did not support push, the
	 * click did nothing at all and no explanation was shown. It now reports the
	 * actual reason at every step.
	 *
	 * Notifications also require a configured VAPID key and a KV namespace on the
	 * server; when either is absent the button says so instead of pretending to
	 * work.
	 */
	let notifyBusy = $state(false);

	async function toggleNotifications() {
		if (notifyBusy) return;

		if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
			toast('Browser ini tidak mendukung notifikasi.');
			return;
		}
		if (!VAPID_PUBLIC_KEY) {
			toast('Notifikasi belum dikonfigurasi oleh admin.');
			return;
		}

		notifyBusy = true;
		try {
			const reg = await getRegistration();
			if (!reg) {
				toast('Notifikasi tidak tersedia di browser ini.');
				return;
			}

			if (subscribed) {
				const sub = await reg.pushManager.getSubscription();
				if (sub) {
					await fetch('/api/subscribe', {
						method: 'DELETE',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ endpoint: sub.endpoint })
					}).catch(() => undefined);
					await sub.unsubscribe();
				}
				subscribed = false;
				toast('Notifikasi dimatikan.');
				return;
			}

			const permission = await Notification.requestPermission();
			if (permission !== 'granted') {
				toast(
					permission === 'denied'
						? 'Izin notifikasi diblokir. Aktifkan lewat setelan situs di browser.'
						: 'Izin notifikasi tidak diberikan.'
				);
				return;
			}

			const sub = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
			});

			const res = await fetch('/api/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(sub)
			});

			if (!res.ok) {
				// Roll the subscription back so the UI never claims success when
				// the server rejected it.
				await sub.unsubscribe();
				const body = await res.json().catch(() => ({}));
				toast(body.error || 'Gagal menyimpan langganan di server.');
				return;
			}

			subscribed = true;
			toast('Notifikasi aktif.');
		} catch (err) {
			toast(`Gagal mengaktifkan notifikasi: ${(err as Error).message}`);
		} finally {
			notifyBusy = false;
		}
	}
</script>

<!--
  Header. Kept the hide-on-scroll behaviour and the theme picker, but removed
  the mixed styling: the logo no longer has a hover scale, active nav items are
  now marked with a single accent underline, and the mobile drawer uses the same
  radius and surface tokens as the rest of the site instead of the previous
  thick-bordered "brutalist" buttons.
-->
<header
	class="fixed top-0 inset-x-0 z-50 border-b transition-colors duration-200 ease-smooth
	       {scrolled || mobileMenuOpen
		? 'bg-surface-0/90 backdrop-blur-md border-line'
		: 'bg-transparent border-transparent'}"
>
	<div class="max-w-7xl mx-auto h-16 px-4 flex items-center gap-4">
		<!-- Logo -->
		<a href="/" class="flex items-center gap-2 flex-shrink-0" aria-label="Chinese Anime 3D">
			<img src="/logo.png" alt="" width="112" height="32" class="h-8 w-auto" />
		</a>

		<!-- Desktop navigation -->
		<nav class="hidden lg:flex items-center gap-1 ml-2" aria-label="Navigasi utama">
			{#each NAV as link (link.href)}
				{@const active = $page.url.pathname === link.href}
				<a
					href={link.href}
					aria-current={active ? 'page' : undefined}
					class="relative px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-150
					       {active ? 'text-content' : 'text-content-muted hover:text-content hover:bg-surface-2'}"
				>
					{link.label}
					{#if active}
						<span class="absolute bottom-0.5 left-3 right-3 h-0.5 rounded-full bg-accent"></span>
					{/if}
				</a>
			{/each}
		</nav>

		<!-- Desktop search -->
		<div class="hidden md:block relative flex-1 max-w-sm ml-auto">
			<div class="relative">
				<Icon
					name="search"
					class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-content-subtle pointer-events-none"
				/>
				<input
					type="search"
					value={query}
					oninput={(e) => onQueryChange(e.currentTarget.value)}
					onblur={() => setTimeout(() => (results = []), 150)}
					onfocus={() => query && onQueryChange(query)}
					placeholder="Cari donghua…"
					aria-label="Cari donghua"
					class="input !pl-9 !py-2"
				/>
			</div>

			{#if results.length}
				<div
					class="absolute top-full left-0 right-0 mt-2 py-1 rounded-xl bg-surface-2
					       border border-line shadow-xl overflow-hidden z-50"
				>
					{#each results as r (r.id)}
						<button
							type="button"
							onmousedown={() => goToResult(r.id)}
							class="flex items-center gap-3 w-full px-3 py-2 text-left
							       hover:bg-surface-3 transition-colors"
						>
							<img
								src={getOptimizedImageUrl(r.image, 60)}
								alt=""
								width="28"
								height="38"
								class="w-7 h-9 rounded object-cover flex-shrink-0"
								loading="lazy"
							/>
							<span class="text-[13px] text-content truncate">{r.title}</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Actions -->
		<div class="flex items-center gap-0.5 ml-auto md:ml-0">
			<!-- Theme picker -->
			<div class="relative">
				<button
					type="button"
					onclick={() => (themeMenuOpen = !themeMenuOpen)}
					class="btn-icon"
					aria-label="Pilih tema"
					aria-expanded={themeMenuOpen}
				>
					<Icon name="settings" class="w-[18px] h-[18px]" />
				</button>

				{#if themeMenuOpen}
					<div
						class="absolute right-0 top-full mt-2 p-3 rounded-xl bg-surface-2
						       border border-line shadow-xl w-max z-50 animate-fade-in"
					>
						<p class="text-[11px] font-medium text-content-subtle mb-2">Warna aksen</p>
						<div class="flex gap-2 mb-3">
							{#each THEMES as t (t.id)}
								<button
									type="button"
									onclick={() => {
										$themeColor = t.id;
										themeMenuOpen = false;
									}}
									class="w-7 h-7 rounded-full transition-transform hover:scale-110
									       {($themeColor === t.id) ? 'ring-2 ring-offset-2 ring-offset-surface-2' : ''}"
									style="background-color: {t.swatch}; --tw-ring-color: {t.swatch}"
									aria-label={`Aksen ${t.label}`}
									title={t.label}
								>
									{#if $themeColor === t.id}
										<Icon name="check" class="w-3.5 h-3.5 mx-auto text-black/70" stroke={3} />
									{/if}
								</button>
							{/each}
						</div>

						<p class="text-[11px] font-medium text-content-subtle mb-2">Mode</p>
						<div class="flex gap-1.5 p-0.5 rounded-lg bg-surface-1">
							<button
								type="button"
								onclick={() => ($themeMode = 'dark')}
								class="flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
								       {$themeMode === 'dark'
									? 'bg-surface-3 text-content'
									: 'text-content-muted hover:text-content'}"
							>
								Gelap
							</button>
							<button
								type="button"
								onclick={() => ($themeMode = 'light')}
								class="flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
								       {$themeMode === 'light'
									? 'bg-surface-3 text-content'
									: 'text-content-muted hover:text-content'}"
							>
								Terang
							</button>
						</div>
					</div>
				{/if}
			</div>

			<!-- Notifications -->
			<button
				type="button"
				onclick={toggleNotifications}
				disabled={notifyBusy}
				class="btn-icon {subscribed ? 'text-accent' : ''}"
				aria-label={subscribed ? 'Matikan notifikasi' : 'Aktifkan notifikasi'}
				aria-pressed={subscribed}
				title={subscribed ? 'Notifikasi aktif' : 'Aktifkan notifikasi'}
			>
				{#if notifyBusy}
					<span
						class="w-[18px] h-[18px] rounded-full border-2 border-line border-t-accent animate-spin"
					></span>
				{:else}
					<Icon name="bell" class="w-[18px] h-[18px]" />
					{#if subscribed}
						<span class="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-accent"></span>
					{/if}
				{/if}
			</button>

			<!-- Mobile search toggle -->
			<button
				type="button"
				onclick={() => (searchOpen = !searchOpen)}
				class="btn-icon md:hidden"
				aria-label="Cari"
			>
				<Icon name="search" class="w-[18px] h-[18px]" />
			</button>

			<!-- Collection -->
			<a href="/profile" class="btn-icon" aria-label="Koleksi saya">
				<Icon name="bookmark" class="w-[18px] h-[18px]" />
			</a>

			<!-- Mobile menu toggle -->
			<button
				type="button"
				onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
				class="btn-icon lg:hidden"
				aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
				aria-expanded={mobileMenuOpen}
			>
				<Icon name={mobileMenuOpen ? 'close' : 'menu'} class="w-[18px] h-[18px]" />
			</button>
		</div>
	</div>

	<!-- Mobile search row -->
	{#if searchOpen}
		<div class="md:hidden px-4 pb-3 animate-fade-in">
			<div class="relative">
				<Icon
					name="search"
					class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-content-subtle pointer-events-none"
				/>
				<input
					type="search"
					value={query}
					oninput={(e) => onQueryChange(e.currentTarget.value)}
					placeholder="Cari donghua…"
					aria-label="Cari donghua"
					class="input !pl-9"
				/>
			</div>
			{#if results.length}
				<div class="mt-2 py-1 rounded-xl bg-surface-2 border border-line overflow-hidden">
					{#each results as r (r.id)}
						<button
							type="button"
							onclick={() => goToResult(r.id)}
							class="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-surface-3"
						>
							<img
								src={getOptimizedImageUrl(r.image, 60)}
								alt=""
								width="28"
								height="38"
								class="w-7 h-9 rounded object-cover flex-shrink-0"
								loading="lazy"
							/>
							<span class="text-[13px] text-content truncate">{r.title}</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

<!--
  Mobile navigation.

  The header is translucent when scrolled, so plain text links over page
  content were hard to read. The drawer now sits on an opaque surface with a
  solid border, and each row has its own background so contrast never depends
  on what is behind the header.
-->
{#if mobileMenuOpen}
	<nav
		class="lg:hidden border-t border-line bg-surface-0 animate-fade-in shadow-lg"
		aria-label="Navigasi mobile"
	>
		<div class="max-w-7xl mx-auto px-3 py-2 flex flex-col gap-1">
			{#each NAV as link (link.href)}
				{@const active = $page.url.pathname === link.href}
				<a
					href={link.href}
					aria-current={active ? 'page' : undefined}
					class="flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm font-semibold
					       transition-colors
					       {active
						? 'bg-accent text-accent-on'
						: 'bg-surface-2 text-content hover:bg-surface-3'}"
				>
					{link.label}
				</a>
			{/each}
		</div>
	</nav>
{/if}
</header>

<!-- Click-away layer for the theme popover -->
{#if themeMenuOpen}
	<button
		type="button"
		class="fixed inset-0 z-40 cursor-default"
		aria-label="Tutup menu tema"
		onclick={() => (themeMenuOpen = false)}
	></button>
{/if}

<!-- Transient status message, so notification failures are visible -->
{#if message}
	<div
		class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] max-w-[90vw] sm:max-w-md
		       flex items-start gap-2.5 rounded-xl border border-line bg-surface-2
		       px-4 py-3 shadow-xl animate-fade-up"
		role="status"
		aria-live="polite"
	>
		<Icon name="info" class="w-4 h-4 flex-shrink-0 mt-px text-accent" />
		<p class="text-sm text-content">{message}</p>
	</div>
{/if}
