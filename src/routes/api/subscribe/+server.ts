import type { RequestHandler } from '@sveltejs/kit';
import { guard } from '$lib/server/guard';
import { error, json } from '$lib/server/response';

/**
 * POST /api/subscribe — store a Web Push subscription.
 * DELETE /api/subscribe — remove one.
 *
 * Both are rate limited and the endpoint is validated so the KV namespace
 * cannot be filled with arbitrary keys.
 */

function validEndpoint(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (trimmed.length < 12 || trimmed.length > 1000) return null;
	if (!/^https:\/\//i.test(trimmed)) return null;
	return trimmed;
}

export const POST: RequestHandler = async (event) => {
	const blocked = await guard(event, { bucket: 'write', sameOrigin: true });
	if (blocked) return blocked;

	let body: Record<string, unknown>;
	try {
		body = await event.request.json();
	} catch {
		return error('Body tidak valid', 400);
	}

	const endpoint = validEndpoint(body.endpoint);
	if (!endpoint) return error('Langganan tidak valid', 400);

	const kv = event.platform?.env?.SUBSCRIPTIONS;
	if (!kv) {
		return error('Notifikasi belum dikonfigurasi di server ini', 503);
	}

	try {
		await kv.put(endpoint, JSON.stringify(body));
	} catch {
		return error('Gagal menyimpan langganan', 500);
	}

	return json({ status: 'Subscribed' });
};

export const DELETE: RequestHandler = async (event) => {
	const blocked = await guard(event, { bucket: 'write', sameOrigin: true });
	if (blocked) return blocked;

	let body: Record<string, unknown>;
	try {
		body = await event.request.json();
	} catch {
		return error('Body tidak valid', 400);
	}

	const endpoint = validEndpoint(body.endpoint);
	if (!endpoint) return error('Langganan tidak valid', 400);

	const kv = event.platform?.env?.SUBSCRIPTIONS;
	if (!kv) return json({ status: 'Unsubscribed' });

	try {
		await kv.delete(endpoint);
	} catch {
		/* already gone is fine */
	}

	return json({ status: 'Unsubscribed' });
};
