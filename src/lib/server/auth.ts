import type { RequestEvent } from '@sveltejs/kit';
import { readSession, SESSION_COOKIE, type SessionData } from './session';
import { verifyPassword } from './crypto';

/**
 * Session + credential handling.
 *
 * Admin credentials live in environment variables, never in the database:
 *   ADMIN_USERNAME  — admin login name
 *   ADMIN_PASSWORD  — admin password, either plain text or a `pbkdf2$...`
 *                     hash from scripts/hash-password.mjs
 *
 * Because there is no `admins` table, a leaked D1 dump exposes no credentials.
 * There is also no `users` table: public visitors are anonymous.
 */

export interface AdminCredentials {
	username: string;
	password: string;
}

export function getAdminCredentials(env: App.Platform['env'] | undefined): AdminCredentials | null {
	const username = env?.ADMIN_USERNAME?.trim();
	const password = env?.ADMIN_PASSWORD;
	if (!username || !password) return null;
	return { username, password };
}

/**
 * Constant-time string comparison. Length is folded into the accumulator so a
 * length mismatch still performs a full scan instead of returning early.
 */
function constantTimeEqual(a: string, b: string): boolean {
	const enc = new TextEncoder();
	const ab = enc.encode(a);
	const bb = enc.encode(b);
	let diff = ab.length ^ bb.length;
	const max = Math.max(ab.length, bb.length);
	for (let i = 0; i < max; i++) {
		diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
	}
	return diff === 0;
}

/**
 * Verify a submitted login against the env credentials. Both fields use
 * constant-time comparison so neither can be probed by timing the response.
 */
export async function verifyAdminCredentials(
	env: App.Platform['env'] | undefined,
	submittedUser: string,
	submittedPass: string
): Promise<boolean> {
	const creds = getAdminCredentials(env);
	if (!creds) return false;

	const userOk = constantTimeEqual(submittedUser, creds.username);

	const passOk = creds.password.startsWith('pbkdf2$')
		? (await verifyPassword(submittedPass, creds.password)).ok
		: constantTimeEqual(submittedPass, creds.password);

	return userOk && passOk;
}

export async function getSession(event: RequestEvent): Promise<SessionData | null> {
	const token = event.cookies.get(SESSION_COOKIE);
	return readSession(event.platform, token);
}

export async function requireAdmin(event: RequestEvent): Promise<SessionData | null> {
	const session = await getSession(event);
	if (!session || session.role !== 'admin') return null;
	return session;
}

/** Typed accessor for the D1 binding. */
export function getDB(event: RequestEvent): D1Database {
	const db = event.platform?.env?.DB;
	if (!db) throw new Error('D1 binding "DB" is not configured');
	return db;
}
