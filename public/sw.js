// Service Worker v3.4
const SW_VERSION = '2025-01-28-v3.4'
const CACHE_NAME = 'tor-ramel-v3.4'
const DYNAMIC_CACHE = 'tor-ramel-dynamic-v16';
const API_CACHE = 'tor-ramel-api-v16';

// Assets to cache on install
const STATIC_ASSETS = [
  '/offline',
  '/manifest.json',
  '/icon.svg',
  '/favicon.ico',
  '/favicon-32x32.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== DYNAMIC_CACHE && name !== API_CACHE)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip chrome-extension and non-HTTP(S) requests
  if (url.protocol === 'chrome-extension:' || !url.protocol.startsWith('http')) {
    return;
  }

  // Skip non-GET requests (POST, PUT, DELETE, etc.)
  if (request.method !== 'GET') {
    return;
  }

  // Skip Netlify functions
  if (url.pathname.includes('/.netlify/functions')) {
    return;
  }

  // API calls - Network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      networkFirst(request, API_CACHE, 5 * 60 * 1000) // 5 minutes cache
    );
    return;
  }

  // Static assets - Cache first, network fallback
  if (request.destination === 'image' || 
      request.destination === 'font' || 
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js')) {
    event.respondWith(
      cacheFirst(request, CACHE_NAME)
    );
    return;
  }

  // HTML pages - Network first, cache fallback, offline page as last resort
  event.respondWith(
    networkFirst(request, DYNAMIC_CACHE, 60 * 60 * 1000) // 1 hour cache
      .catch(() => caches.match('/offline'))
  );
});

// Cache strategies
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    console.log('[SW] Serving from cache:', request.url);
    return cached;
  }
  
  try {
    const response = await fetch(request);
    // Only cache GET requests with successful responses
    if (response.ok && request.method === 'GET') {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    throw error;
  }
}

async function networkFirst(request, cacheName, maxAge) {
  try {
    const response = await fetch(request);
    
    // Only cache GET requests with successful responses
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    // Only try cache for GET requests
    if (request.method === 'GET') {
      const cache = await caches.open(cacheName);
      const cached = await cache.match(request);
      
      if (cached) {
        // Check if cache is still fresh
        const cachedDate = new Date(cached.headers.get('date'));
        if (Date.now() - cachedDate.getTime() < maxAge) {
          return cached;
        }
      }
    }
    
    throw error;
  }
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered');
  if (event.tag === 'sync-appointments') {
    event.waitUntil(syncAppointments());
  }
});

async function syncAppointments() {
  // This will be implemented when we add appointment checking functionality
  console.log('[SW] Syncing appointments...');
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'תור חדש זמין!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'appointment-notification',
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'צפה בתור' },
      { action: 'dismiss', title: 'בטל' }
    ],
    dir: 'rtl',
    lang: 'he'
  };
  
  event.waitUntil(
    self.registration.showNotification('תור רם-אל', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling for skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(windowClients => {
      // Check if there's already a window/tab open with the target URL
      const hadWindowToFocus = windowClients.some(windowClient => {
        if (windowClient.url === urlToOpen && 'focus' in windowClient) {
          windowClient.focus();
          return true;
        }
      });
      
      // Otherwise, open a new window/tab with the target URL
      if (!hadWindowToFocus) {
        clients.openWindow(urlToOpen).then(windowClient => {
          if (windowClient) {
            windowClient.focus();
          }
        });
      }
    })
  );
});

// Handle app badge
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SET_BADGE') {
    if ('setAppBadge' in navigator) {
      navigator.setAppBadge(event.data.count);
    }
  }
  
  if (event.data && event.data.type === 'CLEAR_BADGE') {
    if ('clearAppBadge' in navigator) {
      navigator.clearAppBadge();
    }
  }
});

// Handle external URL interception for installed PWA
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Check if this is an external navigation that should stay in the PWA
  if (event.request.mode === 'navigate' && url.origin === self.location.origin) {
    // Handle notification action URLs
    if (url.pathname === '/notification-action') {
      event.respondWith(
        clients.openWindow(url.href).then(windowClient => {
          if (windowClient) {
            windowClient.focus();
          }
          return new Response('Redirecting...', {
            status: 302,
            headers: { 'Location': url.href }
          });
        })
      );
    }
  }
}); 