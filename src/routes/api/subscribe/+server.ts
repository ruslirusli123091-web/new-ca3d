import type { RequestHandler } from '@sveltejs/kit';
import { guard } from '$lib/server/guard';
import { error, json } from '$lib/server/response';

/**
 * POST /api/subscribe - store a Web Push subscription in KV.
 * Rate limited and validated to avoid KV abuse.
 */
export const POST: RequestHandler = async (event) => {
	const blocked = await guard(event, { bucket: 'write', sameOrigin: true });
	if (blocked) return blocked;

	let sub: Record<string, unknown>;
	try {
		sub = await event.request.json();
	} catch {
		return error('Body tidak valid', 400);
	}

	const endpoint = typeof sub.endpoint === 'string' ? sub.endpoint : '';
	if (!endpoint.startsWith('https://') || endpoint.length > 1000) {
		return error('Subscription tidak valid', 400);
	}

	const kv = event.platform?.env?.SUBSCRIPTIONS;
	if (!kv) return error('KV SUBSCRIPTIONS belum dikonfigurasi', 500);

	await kv.put(endpoint, JSON.stringify(sub));
	return json({ status: 'Subscribed' });
};
