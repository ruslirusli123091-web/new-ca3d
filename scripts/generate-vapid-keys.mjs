#!/usr/bin/env node
/**
 * Generate a VAPID key pair for Web Push.
 *
 *   node scripts/generate-vapid-keys.mjs
 *
 * Then set the output as Cloudflare secrets:
 *   npx wrangler pages secret put VAPID_PUBLIC_KEY
 *   npx wrangler pages secret put VAPID_PRIVATE_KEY
 *   npx wrangler pages secret put VAPID_SUBJECT
 *
 * The public key is also needed by the browser, so paste it into
 * VAPID_PUBLIC_KEY in src/components/layout/Header.svelte.
 */
import { webcrypto as crypto } from 'node:crypto';

function b64url(bytes) {
	return Buffer.from(bytes).toString('base64url');
}

const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
	'sign',
	'verify'
]);

// Public key as a raw uncompressed point (0x04 || X || Y), which is what the
// browser's PushManager and the VAPID `k=` parameter expect.
const rawPublic = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));

// Private key as the raw 32-byte scalar.
const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);

console.log('');
console.log('VAPID_PUBLIC_KEY=' + b64url(rawPublic));
console.log('VAPID_PRIVATE_KEY=' + jwk.d);
console.log('VAPID_SUBJECT=mailto:admin@your-domain.com');
console.log('');
console.log('Public key length:', rawPublic.length, 'bytes (must be 65)');
console.log('');
console.log('Paste VAPID_PUBLIC_KEY into src/components/layout/Header.svelte too,');
console.log('otherwise the browser cannot subscribe.');
console.log('');
