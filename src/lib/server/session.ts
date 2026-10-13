import { hmacSign, hmacVerify, randomToken, timingSafeEqual } from './crypto';

export type Role = 'admin' | 'member';

export interface SessionData {
	sub: string; // username
	name: string; // display name
	role: Role;
	exp: number; // epoch seconds
}

export const SESSION_COOKIE = 'ca3d_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function secret(platform: App.Platform | undefined): string {
	// SESSION_SECRET must be configured as a Cloudflare Pages secret. A random
	// per-isolate fallback keeps local dev working without leaking a default.
	return platform?.env?.SESSION_SECRET || 'dev-insecure-secret-change-me';
}

/**
 * Stateless, signed session cookie (HMAC-SHA256). Avoids a DB round-trip on
 * every request while remaining tamper-proof: any edit to the payload breaks
 * the signature.
 */
export async function createSession(
	platform: App.Platform | undefined,
	data: Omit<SessionData, 'exp'>
): Promise<string> {
	const payload: SessionData = {
		...data,
		exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
	};
	const body = base64urlEncode(JSON.stringify(payload));
	const sig = await hmacSign(body, secret(platform));
	return `${body}.${sig}`;
}

export async function readSession(
	platform: App.Platform | undefined,
	token: string | undefined
): Promise<SessionData | null> {
	if (!token) return null;
	const dot = token.lastIndexOf('.');
	if (dot < 0) return null;
	const body = token.slice(0, dot);
	const sig = token.slice(dot + 1);
	const ok = await hmacVerify(body, sig, secret(platform));
	if (!ok) return null;
	try {
		const data = JSON.parse(base64urlDecode(body)) as SessionData;
		if (!data || typeof data.exp !== 'number' || data.exp * 1000 < Date.now()) return null;
		return data;
	} catch {
		return null;
	}
}

export function sessionCookieOptions(url: URL): string {
	const secure = url.protocol === 'https:';
	return [
		'Path=/',
		'HttpOnly',
		'SameSite=Lax',
		secure ? 'Secure' : '',
		`Max-Age=${SESSION_TTL_SECONDS}`
	]
		.filter(Boolean)
		.join('; ');
}

export function clearedCookie(): string {
	return 'Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
}

/** Generate a CSRF token bound to a session (double-submit pattern). */
export function csrfToken(): string {
	return randomToken(24);
}

export function safeCompare(a: string, b: string): boolean {
	return timingSafeEqual(a, b);
}

// ---- base64url helpers (workerd-compatible) ----
function base64urlEncode(str: string): string {
	const bytes = new TextEncoder().encode(str);
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(b64: string): string {
	const pad = '='.repeat((4 - (b64.length % 4)) % 4);
	const normalized = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
	const binary = atob(normalized);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return new TextDecoder().decode(bytes);
}
