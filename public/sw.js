// Service Worker for Tor-Ramel PWA
// iOS 26 Optimized - Navigation Preload + Badge API
const VERSION = 'v2.0';
const BUILD_TIME = new Date().toISOString();
const SW_VERSION = VERSION
const CACHE_NAME = `tor-ramel-${SW_VERSION}`
const DYNAMIC_CACHE = `tor-ramel-dynamic-${SW_VERSION}`;
const API_CACHE = `tor-ramel-api-${SW_VERSION}`;
const FONT_CACHE = 'tor-ramel-fonts-v2';

// Navigation Preload ID
const NAV_PRELOAD_HEADER = 'tor-ramel-preload';

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

// Activate event - clean up old caches and enable Navigation Preload
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== DYNAMIC_CACHE && name !== API_CACHE && name !== FONT_CACHE)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      // Enable Navigation Preload for faster page loads
      (async () => {
        if (self.registration.navigationPreload) {
          await self.registration.navigationPreload.enable();
          await self.registration.navigationPreload.setHeaderValue(NAV_PRELOAD_HEADER);
          console.log('[SW] Navigation Preload enabled');
        }
      })()
    ]).then(() => self.clients.claim())
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

// Push notifications - Enhanced with structured payload and Badge API
self.addEventListener('push', (event) => {
  console.log('[SW] 📬 Push notification received');
  
  let notificationData = {
    title: 'תור רם-אל',
    body: 'תור חדש זמין!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: { url: '/' },
    badgeCount: 1  // iOS 26+ Badge API
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[SW] 📦 Push payload:', payload);
      
      if (payload.notification) {
        notificationData = {
          ...notificationData,
          ...payload.notification
        };
      }
      
      // Extract badge count if provided
      if (payload.badgeCount !== undefined) {
        notificationData.badgeCount = payload.badgeCount;
      }
    } catch (err) {
      console.error('[SW] ❌ Error parsing push data:', err);
      // Fallback to text if JSON parsing fails
      if (event.data.text()) {
        notificationData.body = event.data.text();
      }
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    image: notificationData.image,
    vibrate: [200, 100, 200],
    tag: notificationData.tag || 'appointment-notification',
    requireInteraction: notificationData.requireInteraction || true,
    actions: notificationData.actions || [
      { action: 'view', title: 'צפה בתור' },
      { action: 'dismiss', title: 'בטל' }
    ],
    data: notificationData.data || { url: '/' },
    dir: 'rtl',
    lang: 'he'
  };

  console.log('[SW] 🔔 Showing notification:', notificationData.title);
  
  event.waitUntil(
    Promise.all([
      // Show the notification
      self.registration.showNotification(notificationData.title, options),
      // Update app badge count (iOS 26+)
      updateBadge(notificationData.badgeCount)
    ])
  );
});

// iOS 26+ Badge API helper
async function updateBadge(count) {
  if ('setAppBadge' in navigator) {
    try {
      if (count > 0) {
        await navigator.setAppBadge(count);
        console.log(`[SW] 🔢 Badge set to ${count}`);
      } else {
        await navigator.clearAppBadge();
        console.log('[SW] 🔢 Badge cleared');
      }
    } catch (err) {
      console.error('[SW] ❌ Badge API error:', err);
    }
  }
}

// Notification click handling - Enhanced with smart URL navigation and badge clearing
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 🖱️ Notification clicked:', event.action);
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  // Handle different actions
  if (event.action === 'dismiss') {
    // Just close, no navigation
    console.log('[SW] ❌ Notification dismissed');
    return;
  }
  
  // For 'view' action or general click, open/focus app
  event.waitUntil(
    Promise.all([
      // Clear badge when notification is opened
      updateBadge(0),
      // Open/focus app window
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      }).then(windowClients => {
        // Check if there's already a window open with our app
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            console.log('[SW] ✅ Focusing existing window and navigating to:', urlToOpen);
            // Navigate to the target URL and focus
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // No window open, open a new one
        if (clients.openWindow) {
          console.log('[SW] 🆕 Opening new window:', urlToOpen);
          return clients.openWindow(urlToOpen);
        }
      })
    ])
  );
});

// Broadcast version info to clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    clients.claim().then(() => {
      // Notify all clients about the new version
      return clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: SW_VERSION,
            buildTime: BUILD_TIME
          });
        });
      });
    })
  );
});

// Message handling for skip waiting and cache clearing
self.addEventListener('message', (event) => {
  // Send version info on request
  if (event.data && event.data.type === 'GET_VERSION') {
    event.source.postMessage({
      type: 'VERSION_INFO',
      version: VERSION,
      buildTime: BUILD_TIME
    });
    return;
  }
  
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