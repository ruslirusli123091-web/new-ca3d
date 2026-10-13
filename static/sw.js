const CACHE_NAME = 'ca3d-cache-v2';
const urlsToCache = [
	'/',
	'/index.html',
	'/logo.png',
	'/favicon-96x96.png',
	'/apple-touch-icon.png',
	'/web-app-manifest-192x192.png',
	'/web-app-manifest-512x512.png',
	'/manifest.json'
];

self.addEventListener('install', (event) => {
	self.skipWaiting();
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache).catch(() => undefined))
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((names) =>
			Promise.all(names.map((n) => (n !== CACHE_NAME ? caches.delete(n) : undefined)))
		)
	);
	return self.clients.claim();
});

// Push notifications: fetch the latest update and show it.
self.addEventListener('push', (event) => {
	const showNotif = async () => {
		try {
			const response = await fetch('/api/donghua');
			const data = await response.json();
			const list = data.donghua || [];
			const latest = list.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0))[0];
			if (!latest) throw new Error('No data');
			return self.registration.showNotification(`Episode Baru: ${latest.title}`, {
				body: `Tonton ${latest.title} episode terbaru sekarang!`,
				icon: '/logo.png',
				badge: '/favicon-96x96.png',
				image: latest.image,
				data: { url: `/synopsis/${latest.id}` }
			});
		} catch {
			return self.registration.showNotification('Update Baru!', {
				body: 'Ada konten baru di CA3D. Cek sekarang!',
				icon: '/logo.png',
				badge: '/favicon-96x96.png',
				data: { url: '/' }
			});
		}
	};
	event.waitUntil(showNotif());
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	event.waitUntil(
		clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
			for (const client of clientList) {
				if (client.url === event.notification.data.url && 'focus' in client) return client.focus();
			}
			if (clients.openWindow) return clients.openWindow(event.notification.data.url);
		})
	);
});

// Network-first, fall back to cache. Never cache API or auth responses.
self.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);
	if (!event.request.url.startsWith('http')) return;
	if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;

	event.respondWith(
		fetch(event.request)
			.then((response) => response)
			.catch(() => caches.match(event.request))
	);
});
