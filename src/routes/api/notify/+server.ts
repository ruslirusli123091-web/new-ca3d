import type { RequestHandler } from '@sveltejs/kit';
import { guard } from '$lib/server/guard';
import { error, json } from '$lib/server/response';
import { requireAdmin } from '$lib/server/auth';
import { sanitizeText, safeUrl } from '$lib/server/validate';

/**
 * POST /api/notify - send a Telegram notification (admin only).
 * Secrets come from environment variables, never hardcoded.
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

	const token = event.platform?.env?.TELEGRAM_BOT_TOKEN;
	const chatId = event.platform?.env?.TELEGRAM_CHAT_ID;
	if (!token || !chatId) return error('Notifikasi belum dikonfigurasi', 503);

	const title = sanitizeText(body.title, 200);
	const message = sanitizeText(body.body, 800);
	const image = safeUrl(body.image);
	const url = safeUrl(body.url);

	const text = `<b>${title}</b>\n\n${message}\n\n${url}`;

	try {
		await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat_id: chatId,
				photo: image,
				caption: text,
				parse_mode: 'HTML'
			})
		});
		return json({ status: 'Sent' });
	} catch {
		return error('Gagal mengirim notifikasi', 502);
	}
};
