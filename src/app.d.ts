/// <reference types="@sveltejs/adapter-cloudflare" />

interface D1Result<T = unknown> {
	results?: T[];
	success: boolean;
	meta: Record<string, unknown>;
}

interface D1PreparedStatement {
	bind(...values: unknown[]): D1PreparedStatement;
	first<T = unknown>(colName?: string): Promise<T | null>;
	run<T = unknown>(): Promise<D1Result<T>>;
	all<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Database {
	prepare(query: string): D1PreparedStatement;
	batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
	exec(query: string): Promise<D1Result>;
	dump(): Promise<ArrayBuffer>;
}

interface RateLimiterBinding {
	limit(opts: { key: string }): Promise<{ success: boolean }>;
}

interface KVNamespace {
	put(key: string, value: string): Promise<void>;
	get(key: string): Promise<string | null>;
	delete(key: string): Promise<void>;
	list(): Promise<{ keys: { name: string }[] }>;
}

declare namespace App {
	interface Locals {
		session: import('$lib/server/session').SessionData | null;
	}
	interface Platform {
		env: {
			DB: D1Database;
			SESSION_SECRET?: string;
			ADMIN_USERNAME?: string;
			ADMIN_PASSWORD?: string;
			RATE_LIMITER?: RateLimiterBinding;
			SUBSCRIPTIONS?: KVNamespace;
			TELEGRAM_BOT_TOKEN?: string;
			TELEGRAM_CHAT_ID?: string;
			SITE_URL?: string;
			CF_PAGES_URL?: string;
		};
		context: {
			waitUntil(promise: Promise<unknown>): void;
		};
	}
}
