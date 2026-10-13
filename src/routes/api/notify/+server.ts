import type { RequestHandler } from '@sveltejs/kit';
import { guard } from '$lib/server/guard';
import { error, json } from '$lib/server/response';
import { requireAdmin } from '$lib/server/auth';
import { sanitizeText, safeUrl } from '$lib/server/validate';
import { getVapidKeys, sendPush, type PushSubscriptionRecord } from '$lib/server/webpush';

/**
 * POST /api/notify — broadcast a notification (admin only).
 *
 * Two channels, used together when both are configured:
 *   1. Telegram, if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set.
 *   2. Web Push to every stored browser subscription, if the VAPID keys are set.
 *
 * Web Push needs no account on the visitor side: the browser subscription is
 * anonymous and stored in KV. Expired subscriptions (404/410 from the push
 * service) are deleted so the list stays clean.
 */
export const POST: RequestHandler = async (event) => {
	const blocked = await guard(event, { bucket: 'write', sameOrigin: true });
	if (blocked) return blocked;

	if (!(await requireAdmin(event))) return error('Tidak diizinkan', 401);

	let body: Record<string, unknown>;
	try {
		body = await event.request.json();
	} catch {
		return error('Body tidak valid', 400);
	}

	const title = sanitizeText(body.title, 200) || 'Update baru';
	const message = sanitizeText(body.body, 800);
	const image = safeUrl(body.image);
	const url = safeUrl(body.url);

	const env = event.platform?.env;
	const results: Record<string, unknown> = {};

	// ---- Web Push ----
	const vapid = getVapidKeys(env);
	const kv = env?.SUBSCRIPTIONS;

	if (vapid && kv) {
		try {
			const list = await kv.list();
			const keys = list.keys.map((k) => k.name);

			let sent = 0;
			let removed = 0;
			let failed = 0;

			// Bounded concurrency keeps us inside the Worker's subrequest limit
			// even with a large subscriber list.
			const BATCH = 25;
			for (let i = 0; i < keys.length; i += BATCH) {
				const slice = keys.slice(i, i + BATCH);
				await Promise.all(
					slice.map(async (endpoint) => {
						const raw = await kv.get(endpoint);
						if (!raw) return;
						let record: PushSubscriptionRecord;
						try {
							record = JSON.parse(raw);
						} catch {
							await kv.delete(endpoint).catch(() => undefined);
							removed++;
							return;
						}

						const res = await sendPush(vapid, record, {
							title,
							body: message,
							url: url || '/',
							image: image || undefined
						});

						if (res.ok) {
							sent++;
						} else if (res.expired) {
							await kv.delete(endpoint).catch(() => undefined);
							removed++;
						} else {
							failed++;
						}
					})
				);
			}

			results.push = { subscribers: keys.length, sent, removed, failed };
		} catch (err) {
			results.push = { error: (err as Error).message };
		}
	} else {
		results.push = {
			skipped: !vapid
				? 'VAPID keys belum dikonfigurasi'
				: 'KV namespace SUBSCRIPTIONS belum di-bind'
		};
	}

	// ---- Telegram ----
	const token = env?.TELEGRAM_BOT_TOKEN;
	const chatId = env?.TELEGRAM_CHAT_ID;
	if (token && chatId) {
		try {
			const text = `<b>${title}</b>\n\n${message}${url ? `\n\n${url}` : ''}`;
			const endpoint = image
				? `https://api.telegram.org/bot${token}/sendPhoto`
				: `https://api.telegram.org/bot${token}/sendMessage`;
			const payload = image
				? { chat_id: chatId, photo: image, caption: text, parse_mode: 'HTML' }
				: { chat_id: chatId, text, parse_mode: 'HTML' };

			const res = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			results.telegram = { ok: res.ok, status: res.status };
		} catch (err) {
			results.telegram = { error: (err as Error).message };
		}
	} else {
		results.telegram = { skipped: 'token/chat id belum dikonfigurasi' };
	}

	return json({ status: 'Processed', results });
};
