/**
 * Service Worker for Roommate Expense Tracker
 * Provides offline functionality and caching
 */

const CACHE_NAME = 'roommate-expense-tracker-v1.0.0';
const CACHE_FILES = [
    '/',
    '/index.html',
    '/add-expense.html',
    '/summary.html',
    '/manage-members.html',
    '/manage-presence.html',
    '/settings.html',
    '/css/style.css',
    '/css/responsive.css',
    '/js/storage.js',
    '/js/members.js',
    '/js/presence.js',
    '/js/expense.js',
    '/js/calculate.js',
    '/js/settlement.js',
    '/js/charts.js',
    '/js/ui.js',
    '/js/app.js',
    '/js/pwa.js',
    '/manifest.json',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install event - cache files
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching app files...');
                return cache.addAll(CACHE_FILES);
            })
            .then(() => {
                console.log('Service Worker installed successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Cache installation failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
            .then(() => {
                console.log('Service Worker activated successfully');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // For HTML pages, try network first, then cache
    if (event.request.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Clone the response to cache it
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // If network fails, try cache
                    return caches.match(event.request)
                        .then((cachedResponse) => {
                            if (cachedResponse) {
                                return cachedResponse;
                            }
                            // If not in cache, return offline page
                            return caches.match('/index.html');
                        });
                })
        );
        return;
    }

    // For static assets, try cache first, then network
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Update cache in background
                    fetch(event.request)
                        .then((response) => {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseClone);
                            });
                        })
                        .catch(() => {
                            // Ignore fetch errors for background updates
                        });
                    return cachedResponse;
                }

                // Not in cache, fetch from network
                return fetch(event.request)
                    .then((response) => {
                        // Don't cache if not successful
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response to cache it
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });

                        return response;
                    })
                    .catch(() => {
                        // If both cache and network fail, we're offline
                        // For JS/CSS files, we can return empty responses
                        if (event.request.url.includes('.js')) {
                            return new Response('console.log("Offline - resource not available");', {
                                headers: { 'Content-Type': 'application/javascript' }
                            });
                        }

                        if (event.request.url.includes('.css')) {
                            return new Response('/* Offline - styles not available */', {
                                headers: { 'Content-Type': 'text/css' }
                            });
                        }

                        // For other files, return null
                        return null;
                    });
            })
    );
});

// Sync event - handle background sync
self.addEventListener('sync', (event) => {
    console.log('Background sync:', event.tag);

    if (event.tag === 'data-sync') {
        event.waitUntil(syncData());
    }
});

// Periodic sync event
self.addEventListener('periodicsync', (event) => {
    console.log('Periodic sync:', event.tag);

    if (event.tag === 'data-sync') {
        event.waitUntil(syncData());
    }
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
    console.log('Push notification received:', event);

    if (!event.data) {
        return;
    }

    const data = event.data.json();
    const options = {
        body: data.body || 'New notification from Expense Tracker',
        icon: data.icon || '/icon-192.png',
        badge: data.badge || '/icon-96.png',
        tag: data.tag || 'expense-tracker',
        data: data.data || {},
        actions: data.actions || [
            {
                action: 'view',
                title: 'View'
            },
            {
                action: 'dismiss',
                title: 'Dismiss'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Expense Tracker', options)
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);

    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    // Default action - open the app
    const urlToOpen = new URL('/', self.location.origin).href;

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then((windowClients) => {
            // Check if there's already a window/tab open
            for (let client of windowClients) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }

            // If not, open a new window/tab
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// Message event - handle messages from clients
self.addEventListener('message', (event) => {
    console.log('Message from client:', event.data);

    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data.type === 'CACHE_DATA') {
        event.waitUntil(cacheData(event.data.payload));
    }

    if (event.data.type === 'GET_CACHED_DATA') {
        event.ports[0].postMessage({ data: getCachedData() });
    }
});

// Sync data function (placeholder for future cloud sync)
async function syncData() {
    console.log('Syncing data in background...');

    try {
        // This would sync with a cloud service
        // For now, just update cache
        const cache = await caches.open(CACHE_NAME);
        const requests = await cache.keys();

        // Check for updates
        for (const request of requests) {
            try {
                const response = await fetch(request);
                if (response.ok) {
                    await cache.put(request, response);
                }
            } catch (error) {
                console.log(`Failed to update ${request.url}:`, error);
            }
        }

        console.log('Background sync completed');

        // Show notification if updated
        self.registration.showNotification('Expense Tracker', {
            body: 'Data synced in background',
            icon: '/icon-192.png',
            tag: 'sync-complete'
        });

    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Cache data function
async function cacheData(data) {
    try {
        const cache = await caches.open(CACHE_NAME + '-data');
        const response = new Response(JSON.stringify(data));
        await cache.put('/app-data', response);
        console.log('Data cached successfully');
    } catch (error) {
        console.error('Failed to cache data:', error);
    }
}

// Get cached data function
async function getCachedData() {
    try {
        const cache = await caches.open(CACHE_NAME + '-data');
        const response = await cache.match('/app-data');

        if (response) {
            return await response.json();
        }

        return null;
    } catch (error) {
        console.error('Failed to get cached data:', error);
        return null;
    }
}

// Offline fallback responses
const OFFLINE_RESPONSES = {
    '/': async () => {
        const cache = await caches.open(CACHE_NAME);
        return await cache.match('/index.html');
    },
    '/index.html': async () => {
        const cache = await caches.open(CACHE_NAME);
        return await cache.match('/index.html');
    }
};

// Error handling
self.addEventListener('error', (event) => {
    console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('Service Worker unhandled rejection:', event.reason);
});