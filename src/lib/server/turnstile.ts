/**
 * Cloudflare Turnstile verification (bot protection for auth + writes).
 *
 * Enabled only when TURNSTILE_SECRET_KEY is configured. When it is missing
 * (local dev), verification is skipped so the app remains runnable.
 */
export async function verifyTurnstile(
	env: App.Platform['env'] | undefined,
	token: string | undefined,
	ip: string
): Promise<{ ok: boolean; skipped: boolean }> {
	const secretKey = env?.TURNSTILE_SECRET_KEY;
	if (!secretKey) return { ok: true, skipped: true };
	if (!token) return { ok: false, skipped: false };

	const body = new FormData();
	body.append('secret', secretKey);
	body.append('response', token);
	if (ip && ip !== 'unknown') body.append('remoteip', ip);

	try {
		const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			body
		});
		const data = (await res.json()) as { success?: boolean };
		return { ok: !!data.success, skipped: false };
	} catch {
		return { ok: false, skipped: false };
	}
}
