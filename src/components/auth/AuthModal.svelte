<script lang="ts">
	import { api } from '$lib/api';
	import { user as userStore } from '$lib/stores/user';
	import Turnstile from './Turnstile.svelte';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		turnstileSiteKey?: string;
	}

	let { isOpen, onClose, turnstileSiteKey = '' }: Props = $props();

	let isLogin = $state(true);
	let username = $state('');
	let password = $state('');
	let loading = $state(false);
	let turnstileToken = $state('');

	// Honeypot field: invisible to users, bots tend to fill it.
	let website = $state('');

	$effect(() => {
		if (isOpen) {
			username = '';
			password = '';
			turnstileToken = '';
			website = '';
			isLogin = true;
		}
	});

	async function handleAuth(e: SubmitEvent) {
		e.preventDefault();
		loading = true;
		try {
			if (isLogin) {
				const res = await api.login(username, password, turnstileToken || undefined);
				userStore.set(res.user);
				onClose();
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
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
		onclick={(e) => e.target === e.currentTarget && onClose()}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
		role="presentation"
	>
		<div class="w-full max-w-sm bg-bg-secondary p-6 shadow-brutal-lg relative">
			<button
				onclick={onClose}
				class="absolute top-4 right-4 text-text-muted hover:text-white transition"
				aria-label="Tutup"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
					><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg
				>
			</button>

			<h2
				class="font-display text-xl font-bold text-text-main mb-6 text-center uppercase tracking-wide"
			>
				{isLogin ? 'Login' : 'Daftar Akun'}
			</h2>

			<form onsubmit={handleAuth} class="space-y-4">
				<div>
					<label class="block text-xs font-bold text-text-muted mb-1 uppercase tracking-wide" for="auth-user"
						>Username</label
					>
					<input
						id="auth-user"
						bind:value={username}
						type="text"
						class="w-full bg-bg-main p-2.5 text-text-main text-sm focus:border-primary outline-none transition shadow-inner"
						required
						autocomplete="username"
						maxlength="32"
					/>
				</div>
				<div>
					<label class="block text-xs font-bold text-text-muted mb-1 uppercase tracking-wide" for="auth-pass"
						>Password</label
					>
					<input
						id="auth-pass"
						bind:value={password}
						type="password"
						class="w-full bg-bg-main p-2.5 text-text-main text-sm focus:border-primary outline-none transition shadow-inner"
						required
						autocomplete={isLogin ? 'current-password' : 'new-password'}
						maxlength="128"
					/>
				</div>

				<!-- Honeypot: hidden from humans, bots auto-fill it -->
				<input
					type="text"
					bind:value={website}
					tabindex="-1"
					autocomplete="off"
					aria-hidden="true"
					class="hidden"
					name="website"
				/>

				{#if turnstileSiteKey}
					<div class="turnstile-slot">
						<Turnstile siteKey={turnstileSiteKey} onVerify={(t) => (turnstileToken = t)} />
					</div>
				{/if}

				<button
					disabled={loading}
					class="brutal-press w-full bg-primary text-text-on-primary py-3 font-bold transition shadow-brutal-sm text-sm disabled:opacity-60"
				>
					{loading ? 'Processing...' : isLogin ? 'MASUK' : 'DAFTAR'}
				</button>
			</form>

			<div class="mt-4 text-center text-xs text-text-muted">
				<button onclick={() => (isLogin = !isLogin)} class="text-primary font-bold hover:underline">
					{isLogin ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Login'}
				</button>
			</div>
		</div>
	</div>
{/if}
