import type { RequestEvent } from '@sveltejs/kit';
import { readSession, SESSION_COOKIE, type SessionData } from './session';

/**
 * Session handling.
 *
 * The only authenticated role is `admin`. Public visitors are anonymous by
 * design: bookmarks, watch history and the comment nickname live in their
 * own browser, so there is no member account to authenticate or protect.
 */

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
