/* CA3D service worker — offline caching + Web Push. */

const CACHE_NAME = 'ca3d-v3';
const PRECACHE = ['/', '/logo.png', '/favicon-96x96.png', '/manifest.json'];

self.addEventListener('install', (event) => {
	self.skipWaiting();
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		Promise.all(
			/* Drop every previous cache so stale builds never linger. */
			caches.keys().then((names) =>
				Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
			)
		).then(() => self.clients.claim())
	);
});

/**
 * Push handler.
 *
 * The server now encrypts a real JSON payload, so the worker renders exactly
 * what the admin sent. It falls back to a generic message only when a push
 * arrives with no data (for example a test push from a browser tool).
 */
self.addEventListener('push', (event) => {
	let payload = {
		title: 'Update baru',
		body: 'Ada konten baru di CA3D. Cek sekarang!',
		url: '/',
		image: undefined
	};

	if (event.data) {
		try {
			const parsed = event.data.json();
			payload = {
				title: parsed.title || payload.title,
				body: parsed.body || payload.body,
				url: parsed.url || payload.url,
				image: parsed.image || undefined
			};
		} catch {
			/* not JSON — keep the fallback */
		}
	}

	event.waitUntil(
		self.registration.showNotification(payload.title, {
			body: payload.body,
			icon: '/web-app-manifest-192x192.png',
			badge: '/favicon-96x96.png',
			image: payload.image,
			data: { url: payload.url },
			tag: 'ca3d-update',
			renotify: true
		})
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const target = event.notification.data?.url || '/';

	event.waitUntil(
		clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
			// Focus an existing tab on the same origin instead of opening a new one.
			for (const client of list) {
				if ('focus' in client) {
					client.focus();
					client.postMessage({ type: 'navigate', url: target });
					return;
				}
			}
			return clients.openWindow(target);
		})
	);
});

/** Network-first for navigations, cache-first for static assets. */
self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	// Never cache API responses or the admin panel.
	if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;

	// Static build assets are immutable, so serve them from cache first.
	if (url.pathname.startsWith('/_app/')) {
		event.respondWith(
			caches.match(request).then((hit) => {
				if (hit) return hit;
				return fetch(request).then((res) => {
					const copy = res.clone();
					caches.open(CACHE_NAME).then((c) => c.put(request, copy)).catch(() => undefined);
					return res;
				});
			})
		);
		return;
	}

	// Everything else: network first, fall back to cache when offline.
	event.respondWith(
		fetch(request)
			.then((res) => {
				if (res.ok && request.mode === 'navigate') {
					const copy = res.clone();
					caches.open(CACHE_NAME).then((c) => c.put(request, copy)).catch(() => undefined);
				}
				return res;
			})
			.catch(() => caches.match(request).then((hit) => hit || caches.match('/')))
	);
});
