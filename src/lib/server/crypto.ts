/**
 * Cryptographic helpers for CA3D backend security.
 * Uses WebCrypto (available in Cloudflare Workers).
 */

const enc = new TextEncoder();

export function toHex(buf: ArrayBuffer | Uint8Array): string {
	const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
	return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function fromHex(hex: string): Uint8Array {
	const clean = hex.length % 2 ? '0' + hex : hex;
	const out = new Uint8Array(clean.length / 2);
	for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
	return out;
}

/** Cryptographically secure random hex string. */
export function randomToken(bytes = 32): string {
	const arr = new Uint8Array(bytes);
	crypto.getRandomValues(arr);
	return toHex(arr);
}

/** Constant-time string comparison (prevents timing side channels). */
export function timingSafeEqual(a: string, b: string): boolean {
	if (typeof a !== 'string' || typeof b !== 'string') return false;
	const ab = enc.encode(a);
	const bb = enc.encode(b);
	if (ab.length !== bb.length) return false;
	let diff = 0;
	for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
	return diff === 0;
}

const PBKDF2_ITERATIONS = 120_000;

/**
 * Hash a password with PBKDF2-SHA256 + per-user random salt.
 * Format: pbkdf2$<iterations>$<saltHex>$<hashHex>
 * Legacy unsalted SHA-256 hashes are still accepted on login and
 * transparently upgraded (see verifyPassword).
 */
export async function hashPassword(password: string): Promise<string> {
	const salt = new Uint8Array(16);
	crypto.getRandomValues(salt);
	const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
		'deriveBits'
	]);
	const bits = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
		key,
		256
	);
	return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${toHex(bits)}`;
}

/** Legacy unsalted SHA-256 (kept only for verifying/migrating old rows). */
export async function legacySha256(str: string): Promise<string> {
	const buf = await crypto.subtle.digest('SHA-256', enc.encode(str));
	return toHex(buf);
}

export interface VerifyResult {
	ok: boolean;
	needsUpgrade: boolean;
}

export async function verifyPassword(password: string, stored: string): Promise<VerifyResult> {
	if (!stored) return { ok: false, needsUpgrade: false };

	if (stored.startsWith('pbkdf2$')) {
		const parts = stored.split('$');
		if (parts.length !== 4) return { ok: false, needsUpgrade: false };
		const iterations = parseInt(parts[1], 10);
		const salt = fromHex(parts[2]);
		const expected = parts[3];
		const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
			'deriveBits'
		]);
		const bits = await crypto.subtle.deriveBits(
			{ name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' },
			key,
			256
		);
		return { ok: timingSafeEqual(toHex(bits), expected), needsUpgrade: false };
	}

	// Legacy row: sha256(password) or sha256(username) style. Upgrade on success.
	const legacy = await legacySha256(password);
	const ok = timingSafeEqual(legacy, stored);
	return { ok, needsUpgrade: ok };
}

/**
 * HMAC-SHA256 sign a payload string with the session secret.
 * Used for tamper-proof, stateless session cookies.
 */
export async function hmacSign(data: string, secret: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		enc.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
	return toHex(sig);
}

export async function hmacVerify(data: string, signature: string, secret: string): Promise<boolean> {
	const expected = await hmacSign(data, secret);
	return timingSafeEqual(expected, signature);
}
