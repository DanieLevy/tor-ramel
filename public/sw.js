// Service Worker for Tor-Ramel PWA
// Version 3.14 - Enhanced authentication handling
const SW_VERSION = '2025-01-29-v3.14'
const CACHE_NAME = 'tor-ramel-v3.14'
const DYNAMIC_CACHE = 'tor-ramel-dynamic-v24';
const API_CACHE = 'tor-ramel-api-v24';
const FONT_CACHE = 'tor-ramel-fonts-v1';

// Critical fonts to preload
const CRITICAL_FONTS = [
  '/fonts/ploni-regular-aaa.otf',
  '/fonts/ploni-light-aaa.otf',
  '/fonts/ploni-ultralight-aaa.otf'
];

// Assets to cache on install
const STATIC_ASSETS = [
  '/offline',
  '/manifest.json',
  '/icon.svg',
  '/favicon.ico',
  '/favicon-32x32.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Include critical fonts in initial cache
  ...CRITICAL_FONTS
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  self.skipWaiting();
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Pre-cache fonts separately for better control
      caches.open(FONT_CACHE).then((cache) => {
        console.log('[SW] Pre-caching critical fonts');
        return Promise.all(
          CRITICAL_FONTS.map(font => 
            fetch(font, { 
              mode: 'cors',
              credentials: 'omit',
              cache: 'no-cache'
            }).then(response => {
              if (response.ok) {
                return cache.put(font, response);
              }
              console.error(`[SW] Failed to cache font: ${font}`);
            }).catch(err => {
              console.error(`[SW] Error caching font ${font}:`, err);
            })
          )
        );
      })
    ])
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
            .filter((name) => name !== CACHE_NAME && name !== DYNAMIC_CACHE && name !== API_CACHE && name !== FONT_CACHE)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
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

  // Special handling for fonts
  if (request.destination === 'font' || url.pathname.includes('/fonts/')) {
    event.respondWith(
      fontCacheStrategy(request)
    );
    return;
  }

  // API calls - Special handling for subscriptions and auth-related endpoints
  if (url.pathname.startsWith('/api/')) {
    // Never cache auth or subscription endpoints
    if (url.pathname.includes('/auth/') || 
        url.pathname.includes('/notifications/subscriptions') ||
        url.pathname.includes('/notifications/subscribe')) {
      console.log('[SW] Skipping cache for auth/subscription endpoint:', url.pathname);
      return;
    }
    
    // For other API calls, use network first with auth handling
    event.respondWith(
      networkFirstWithAuth(request, API_CACHE, 1 * 60 * 1000) // 1 minute cache only
    );
    return;
  }

  // Static assets - Cache first, network fallback
  if (request.destination === 'image' || 
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js')) {
    event.respondWith(
      cacheFirst(request, CACHE_NAME)
    );
    return;
  }

  // HTML pages - Network first with auth handling, cache fallback, offline page as last resort
  event.respondWith(
    networkFirstWithAuth(request, DYNAMIC_CACHE, 60 * 60 * 1000) // 1 hour cache
      .catch(() => caches.match('/offline'))
  );
});

// Cache strategies with better error handling
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    console.log('[SW] Serving from cache:', request.url);
    return cached;
  }
  
  try {
    const response = await fetch(request, {
      credentials: 'include' // Ensure cookies are sent
    });
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
    const response = await fetch(request, {
      credentials: 'include' // Ensure cookies are sent
    });
    
    // Handle authentication errors
    if (response.status === 401) {
      console.log('[SW] Received 401, clearing auth-related caches');
      // Clear API cache on auth failure
      await caches.delete(API_CACHE);
      // Don't cache 401 responses
      return response;
    }
    
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

// New network first strategy with authentication handling
async function networkFirstWithAuth(request, cacheName, maxAge) {
  try {
    const response = await fetch(request, {
      credentials: 'include' // Ensure cookies are sent
    });
    
    // Handle authentication errors
    if (response.status === 401) {
      console.log('[SW] Received 401 for:', request.url);
      // Don't cache 401 responses
      return response;
    }
    
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

// Message handling for skip waiting and cache clearing
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_ALL_CACHES') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('[SW] Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
    );
  }
  
  // Handle logout - clear auth-sensitive caches
  if (event.data && event.data.type === 'LOGOUT') {
    console.log('[SW] Handling logout, clearing auth-sensitive caches');
    event.waitUntil(
      Promise.all([
        caches.delete(API_CACHE),
        caches.delete(DYNAMIC_CACHE)
      ]).then(() => {
        console.log('[SW] Auth-sensitive caches cleared');
      })
    );
  }
  
  // Handle font caching request
  if (event.data && event.data.type === 'CACHE_FONTS' && event.data.fonts) {
    event.waitUntil(
      caches.open(FONT_CACHE).then((cache) => {
        return Promise.all(
          event.data.fonts.map(fontUrl => 
            fetch(fontUrl, {
              mode: 'cors',
              credentials: 'omit',
              cache: 'no-cache'
            }).then(response => {
              if (response.ok) {
                console.log('[SW] Caching font on demand:', fontUrl);
                return cache.put(fontUrl, response);
              }
            }).catch(err => {
              console.error('[SW] Error caching font:', fontUrl, err);
            })
          )
        );
      })
    );
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

// Enhanced font caching strategy
async function fontCacheStrategy(request) {
  // Try font cache first
  const fontCache = await caches.open(FONT_CACHE);
  const cachedFont = await fontCache.match(request);
  
  if (cachedFont) {
    console.log('[SW] Serving font from cache:', request.url);
    // Update cache in background
    fetchAndCacheFont(request, fontCache);
    return cachedFont;
  }
  
  // If not in cache, fetch from network
  try {
    const response = await fetch(request, {
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-cache',
      headers: {
        'Accept': 'font/otf,font/woff2,font/woff,*/*'
      }
    });
    
    if (response.ok) {
      // Clone the response before caching
      const responseToCache = response.clone();
      fontCache.put(request, responseToCache);
      console.log('[SW] Font cached:', request.url);
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Font fetch failed:', error);
    // Return a fallback response
    return new Response('', {
      status: 404,
      statusText: 'Font not found'
    });
  }
}

// Background font update
async function fetchAndCacheFont(request, cache) {
  try {
    const response = await fetch(request, {
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-cache'
    });
    
    if (response.ok) {
      cache.put(request, response);
    }
  } catch (error) {
    // Silent fail for background updates
  }
} 