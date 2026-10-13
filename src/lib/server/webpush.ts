/**
 * Web Push (VAPID) implementation for Cloudflare Workers.
 *
 * Why this exists: storing subscriptions alone does nothing — the server has to
 * encrypt and sign a payload for each push service. WebCrypto in workerd can do
 * this, but the VAPID JWT must be ES256 (ECDSA P-256) and the payload must be
 * aes128gcm per RFC 8291.
 *
 * Keys come from environment variables:
 *   VAPID_PUBLIC_KEY   — base64url raw uncompressed P-256 point (65 bytes)
 *   VAPID_PRIVATE_KEY  — base64url raw P-256 scalar (32 bytes)
 *   VAPID_SUBJECT      — mailto: or https: contact, required by the spec
 */

export interface PushSubscriptionRecord {
	endpoint: string;
	keys: { p256dh: string; auth: string };
}

export interface PushKeys {
	publicKey: string;
	privateKey: string;
	subject: string;
}

export function getVapidKeys(env: App.Platform['env'] | undefined): PushKeys | null {
	const publicKey = env?.VAPID_PUBLIC_KEY?.trim();
	const privateKey = env?.VAPID_PRIVATE_KEY?.trim();
	const subject = env?.VAPID_SUBJECT?.trim() || 'mailto:admin@example.com';
	if (!publicKey || !privateKey) return null;
	return { publicKey, privateKey, subject };
}

// ---- base64url helpers ----------------------------------------------------

function b64urlToBytes(value: string): Uint8Array {
	const pad = '='.repeat((4 - (value.length % 4)) % 4);
	const normalized = (value + pad).replace(/-/g, '+').replace(/_/g, '/');
	const binary = atob(normalized);
	const out = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
	return out;
}

function bytesToB64url(bytes: Uint8Array): string {
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concat(...arrays: Uint8Array[]): Uint8Array {
	const total = arrays.reduce((n, a) => n + a.length, 0);
	const out = new Uint8Array(total);
	let offset = 0;
	for (const a of arrays) {
		out.set(a, offset);
		offset += a.length;
	}
	return out;
}

// ---- VAPID JWT ------------------------------------------------------------

async function vapidAuthHeader(keys: PushKeys, endpoint: string): Promise<string> {
	const audience = new URL(endpoint).origin;
	const enc = new TextEncoder();

	const header = bytesToB64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
	const payload = bytesToB64url(
		enc.encode(
			JSON.stringify({
				aud: audience,
				exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
				sub: keys.subject
			})
		)
	);

	// The public key is a raw uncompressed point: 0x04 || X(32) || Y(32).
	// WebCrypto needs X and Y as separate base64url JWK fields, so decode the
	// bytes and re-encode each half rather than slicing the original string
	// (slicing a base64url string does not align to byte boundaries).
	const raw = b64urlToBytes(keys.publicKey);
	if (raw.length !== 65 || raw[0] !== 4) {
		throw new Error('VAPID_PUBLIC_KEY must be a 65-byte uncompressed P-256 point');
	}

	const jwk: JsonWebKey = {
		kty: 'EC',
		crv: 'P-256',
		d: keys.privateKey,
		x: bytesToB64url(raw.slice(1, 33)),
		y: bytesToB64url(raw.slice(33, 65))
	};

	const key = await crypto.subtle.importKey(
		'jwk',
		jwk,
		{ name: 'ECDSA', namedCurve: 'P-256' },
		false,
		['sign']
	);

	const signature = await crypto.subtle.sign(
		{ name: 'ECDSA', hash: 'SHA-256' },
		key,
		enc.encode(`${header}.${payload}`)
	);

	// WebCrypto returns the raw r||s pair, which is already the JWS format.
	return `vapid t=${header}.${payload}.${bytesToB64url(new Uint8Array(signature))}, k=${keys.publicKey}`;
}

// ---- RFC 8291 payload encryption -----------------------------------------

async function hkdf(
	salt: Uint8Array,
	ikm: Uint8Array,
	info: Uint8Array,
	length: number
): Promise<Uint8Array> {
	const key = await crypto.subtle.importKey('raw', ikm as BufferSource, 'HKDF', false, ['deriveBits']);
	const bits = await crypto.subtle.deriveBits(
		{ name: 'HKDF', hash: 'SHA-256', salt: salt as BufferSource, info: info as BufferSource },
		key,
		length * 8
	);
	return new Uint8Array(bits);
}

async function encryptPayload(
	subscription: PushSubscriptionRecord,
	plaintext: string
): Promise<Uint8Array> {
	const uaPublic = b64urlToBytes(subscription.keys.p256dh);
	const authSecret = b64urlToBytes(subscription.keys.auth);

	// Ephemeral ECDH key pair for this message.
	const local = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
		'deriveBits'
	]);
	const localPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));

	const uaKey = await crypto.subtle.importKey(
		'raw',
		uaPublic as BufferSource,
		{ name: 'ECDH', namedCurve: 'P-256' },
		false,
		[]
	);
	const shared = new Uint8Array(
		await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256)
	);

	const enc = new TextEncoder();
	const salt = crypto.getRandomValues(new Uint8Array(16));

	// ikm = HKDF(auth_secret, ecdh_secret, "WebPush: info\0" || ua_public || as_public, 32)
	const keyInfo = concat(enc.encode('WebPush: info\0'), uaPublic, localPublic);
	const ikm = await hkdf(authSecret, shared, keyInfo, 32);

	// CEK = HKDF(salt, ikm, "Content-Encoding: aes128gcm\0", 16)
	const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
	// NONCE = HKDF(salt, ikm, "Content-Encoding: nonce\0", 12)
	const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);

	const cekKey = await crypto.subtle.importKey('raw', cek as BufferSource, 'AES-GCM', false, ['encrypt']);

	// A single record: the plaintext followed by the 0x02 padding delimiter.
	const body = concat(enc.encode(plaintext), new Uint8Array([2]));
	const ciphertext = new Uint8Array(
		await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce as BufferSource }, cekKey, body as BufferSource)
	);

	// aes128gcm content coding header:
	// salt(16) | rs(4) | idlen(1) | keyid(= as_public, 65) | ciphertext
	const rs = new Uint8Array(4);
	new DataView(rs.buffer).setUint32(0, 4096);
	const idlen = new Uint8Array([localPublic.length]);

	return concat(salt, rs, idlen, localPublic, ciphertext);
}

// ---- Public API -----------------------------------------------------------

export interface PushResult {
	endpoint: string;
	ok: boolean;
	status: number;
	/** True when the push service reports the subscription is gone. */
	expired: boolean;
}

export async function sendPush(
	keys: PushKeys,
	subscription: PushSubscriptionRecord,
	payload: { title: string; body: string; url?: string; image?: string }
): Promise<PushResult> {
	try {
		const authorization = await vapidAuthHeader(keys, subscription.endpoint);
		const body = await encryptPayload(subscription, JSON.stringify(payload));

		const res = await fetch(subscription.endpoint, {
			method: 'POST',
			headers: {
				Authorization: authorization,
				'Content-Encoding': 'aes128gcm',
				'Content-Type': 'application/octet-stream',
				TTL: '86400',
				Urgency: 'normal'
			},
			body: body as BodyInit
		});

		return {
			endpoint: subscription.endpoint,
			ok: res.ok,
			status: res.status,
			// 404 and 410 mean the browser dropped the subscription.
			expired: res.status === 404 || res.status === 410
		};
	} catch {
		return { endpoint: subscription.endpoint, ok: false, status: 0, expired: false };
	}
}
