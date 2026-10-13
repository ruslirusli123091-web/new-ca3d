#!/usr/bin/env node
/**
 * Generate a PBKDF2 password hash compatible with the CA3D backend.
 *
 *   node scripts/hash-password.mjs "MyStrongPassword"
 *
 * Then insert it into D1:
 *   INSERT OR REPLACE INTO admins (username, password) VALUES ('admin', '<hash>');
 * or for a member:
 *   INSERT OR REPLACE INTO users (username, password, bookmarks, history, joinedAt)
 *   VALUES ('user', '<hash>', '[]', '[]', <now>);
 */
import { webcrypto as crypto } from 'node:crypto';

const ITERATIONS = 120_000;

function toHex(buf) {
	const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
	return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const password = process.argv[2];
if (!password) {
	console.error('Usage: node scripts/hash-password.mjs "password"');
	process.exit(1);
}

const enc = new TextEncoder();
const salt = new Uint8Array(16);
crypto.getRandomValues(salt);
const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
	'deriveBits'
]);
const bits = await crypto.subtle.deriveBits(
	{ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
	key,
	256
);
console.log(`pbkdf2$${ITERATIONS}$${toHex(salt)}$${toHex(bits)}`);
