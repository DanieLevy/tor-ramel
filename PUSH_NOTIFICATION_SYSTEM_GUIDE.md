# Push Notification System - Complete Implementation Guide

*A comprehensive guide to implementing a robust PWA push notification system with full iOS/Safari and Android support*

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture & Flow](#architecture--flow)
3. [Prerequisites & Setup](#prerequisites--setup)
4. [Core Components](#core-components)
5. [Client-Side Implementation](#client-side-implementation)
6. [Server-Side Implementation](#server-side-implementation)
7. [Service Worker Implementation](#service-worker-implementation)
8. [iOS/Safari Specific Handling](#iossafari-specific-handling)
9. [Database Schema](#database-schema)
10. [API Endpoints](#api-endpoints)
11. [Testing & Debugging](#testing--debugging)
12. [Production Deployment](#production-deployment)
13. [Troubleshooting](#troubleshooting)

---

## System Overview

### What This System Does

This push notification system provides:
- ✅ **Cross-Platform Support**: Works on iOS (Safari/PWA), Android, and Desktop browsers
- ✅ **Background Notifications**: Delivers notifications even when the app is closed
- ✅ **VAPID Authentication**: Secure server-to-client push using VAPID keys
- ✅ **Anonymous & Authenticated Users**: Supports both visitor and logged-in user subscriptions
- ✅ **Role-Based Targeting**: Send notifications to specific user roles or individuals
- ✅ **Subscription Management**: Full subscribe/unsubscribe flow with UI controls
- ✅ **Notification History**: Track sent notifications and delivery stats
- ✅ **iOS PWA Detection**: Special handling for iOS installation requirements
- ✅ **Offline Support**: Service Worker integration for offline notification handling

### Technology Stack

- **Frontend**: React, TypeScript, Next.js App Router
- **Backend**: Next.js API Routes (Node.js)
- **Push Library**: `web-push` (NPM package)
- **Database**: Supabase (PostgreSQL)
- **Service Worker**: Custom PWA service worker
- **Styling**: TailwindCSS with Shadcn UI components

---

## Architecture & Flow

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PUSH NOTIFICATION FLOW                        │
└─────────────────────────────────────────────────────────────────────┘

1. INITIAL SETUP (One-time)
   ┌──────────────────┐
   │ Generate VAPID   │ → Store in .env.local
   │ Keys (Server)    │   - NEXT_PUBLIC_VAPID_PUBLIC_KEY
   └──────────────────┘   - VAPID_PRIVATE_KEY
                          - VAPID_EMAIL

2. USER SUBSCRIPTION FLOW
   ┌──────────────────┐
   │ User visits PWA  │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ Check if iOS?    │──YES──→ [Show Install Prompt]
   └────────┬─────────┘           (Must install PWA first)
            │ NO
            ▼
   ┌──────────────────┐
   │ Request          │ ← Browser shows permission dialog
   │ Notification     │
   │ Permission       │
   └────────┬─────────┘
            │ (Granted)
            ▼
   ┌──────────────────┐
   │ Fetch VAPID Key  │ ← GET /api/push/vapid-key
   │ from Server      │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ Subscribe to     │ ← navigator.serviceWorker.ready
   │ Push Manager     │   + pushManager.subscribe()
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ Send Subscription│ ← POST /api/push/subscribe
   │ to Server        │   { subscription, userName }
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ Save in Database │ ← Supabase push_subscriptions table
   │ (Endpoint + Keys)│
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ Send Welcome     │ ← Immediate test notification
   │ Notification     │
   └──────────────────┘

3. SENDING NOTIFICATIONS
   ┌──────────────────┐
   │ Admin/System     │
   │ Triggers Send    │ ← POST /api/push/send
   └────────┬─────────┘   { title, body, targetUsers }
            │
            ▼
   ┌──────────────────┐
   │ Query DB for     │ ← Get active subscriptions
   │ Target Subs      │   (filter by role/user)
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ For Each Sub:    │
   │ webpush.send()   │ ← Uses VAPID keys + subscription
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ Push Service     │ ← Google FCM (Android/Chrome)
   │ (FCM/APNs)       │   Apple APNs (iOS/Safari)
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ Service Worker   │ ← 'push' event listener
   │ Receives Push    │   self.registration.showNotification()
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ User Sees        │
   │ Notification     │ ← Even if app is closed!
   └──────────────────┘

4. USER INTERACTION
   ┌──────────────────┐
   │ User Clicks      │
   │ Notification     │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ Service Worker   │ ← 'notificationclick' event
   │ Handles Click    │   clients.openWindow(url)
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────┐
   │ Open/Focus       │
   │ App Window       │
   └──────────────────┘
```

### Key Components Interaction

```
┌───────────────────────────────────────────────────────────────────┐
│                         CLIENT SIDE                               │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ usePushNotifications Hook                                 │   │
│  │ - Check browser support                                   │   │
│  │ - Request permissions                                     │   │
│  │ - Manage subscription state                               │   │
│  │ - Handle iOS detection                                    │   │
│  └────────────┬────────────────────────────────┬─────────────┘   │
│               │                                │                 │
│               ▼                                ▼                 │
│  ┌──────────────────────┐        ┌──────────────────────┐       │
│  │ PushNotificationBanner│       │ PushNotificationSettings│     │
│  │ - Show opt-in prompt  │       │ - Settings UI         │       │
│  │ - Dismissible banner  │       │ - Toggle on/off       │       │
│  └──────────────────────┘        └──────────────────────┘       │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
                                    │
                                    │ API Calls
                                    │
┌───────────────────────────────────▼───────────────────────────────┐
│                         SERVER SIDE                               │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ API Routes                                              │     │
│  │                                                         │     │
│  │  GET  /api/push/vapid-key       → Return public key   │     │
│  │  POST /api/push/subscribe        → Save subscription   │     │
│  │  DELETE /api/push/subscribe      → Remove subscription │     │
│  │  POST /api/push/send             → Send notification   │     │
│  │  POST /api/push/test             → Send test message   │     │
│  └─────────────────┬───────────────────────────────────────┘     │
│                    │                                             │
│                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ pushNotificationService                                 │     │
│  │ - sendNotification(payload, options, sentBy)           │     │
│  │ - sendToUser(userId, payload)                          │     │
│  │ - sendToRoles(roles, payload)                          │     │
│  │ - sendToAll(payload)                                   │     │
│  │ - Uses web-push library with VAPID keys                │     │
│  └─────────────────┬───────────────────────────────────────┘     │
│                    │                                             │
│                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ Supabase Database                                       │     │
│  │ - push_subscriptions (endpoint, keys, user info)       │     │
│  │ - push_notifications (history, stats)                  │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Push Protocol
                                    │
┌───────────────────────────────────▼───────────────────────────────┐
│                    PUSH SERVICES & SERVICE WORKER                 │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐        ┌──────────────────────┐        │
│  │ Google FCM           │        │ Apple Push           │        │
│  │ (Android/Chrome)     │        │ Notification Service │        │
│  │                      │        │ (iOS/Safari)         │        │
│  └──────────┬───────────┘        └────────┬─────────────┘        │
│             │                             │                      │
│             └──────────────┬──────────────┘                      │
│                            ▼                                     │
│              ┌──────────────────────────┐                        │
│              │ Service Worker (sw.js)   │                        │
│              │                          │                        │
│              │ - 'push' event          │                        │
│              │ - 'notificationclick'   │                        │
│              │ - 'notificationclose'   │                        │
│              └──────────────────────────┘                        │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites & Setup

### 1. Install Dependencies

```bash
npm install web-push
```

### 2. Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for secure push notifications.

Create a script: `scripts/generate-vapid-keys.js`

```javascript
const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

console.log('🔑 Generating VAPID keys for push notifications...\n');

// Generate VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ VAPID keys generated successfully!\n');

// Validate key lengths for P-256 curve (iOS requirement)
const publicKeyBytes = Buffer.from(vapidKeys.publicKey, 'base64url');
const privateKeyBytes = Buffer.from(vapidKeys.privateKey, 'base64url');

console.log(`📊 Key Statistics:`);
console.log(`  Public Key Length: ${vapidKeys.publicKey.length} characters (${publicKeyBytes.length} bytes)`);
console.log(`  Private Key Length: ${vapidKeys.privateKey.length} characters (${privateKeyBytes.length} bytes)\n`);

// Check if keys meet P-256 requirements
if (publicKeyBytes.length === 65) {
  console.log('✅ Public key is valid P-256 uncompressed format (65 bytes)');
} else if (publicKeyBytes.length === 33) {
  console.log('✅ Public key is valid P-256 compressed format (33 bytes)');
} else {
  console.log('⚠️  Warning: Public key length unusual for P-256');
}

console.log('\n📝 Add these to your .env.local file:\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_EMAIL=mailto:your-email@example.com\n`);

// Optionally save to a file
const envPath = path.join(__dirname, '..', '.env.vapid');
const envContent = `# Generated VAPID keys for push notifications
# Copy these to your .env.local file

NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
VAPID_PRIVATE_KEY=${vapidKeys.privateKey}
VAPID_EMAIL=mailto:your-email@example.com
`;

fs.writeFileSync(envPath, envContent);
console.log(`💾 Keys also saved to: ${envPath}`);
console.log('\n✨ Done! Your VAPID keys are iOS-compatible.');
```

**Run the script:**

```bash
node scripts/generate-vapid-keys.js
```

### 3. Environment Variables

Add to `.env.local`:

```env
# Push Notifications - VAPID Keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_generated_public_key_here
VAPID_PRIVATE_KEY=your_generated_private_key_here
VAPID_EMAIL=mailto:admin@yourdomain.com
```

**Important Notes:**
- The public key is prefixed with `NEXT_PUBLIC_` so it can be accessed client-side
- The private key must NEVER be exposed to the client
- Use a real email address for VAPID_EMAIL (required by push services)
- Keys should be kept secret and never committed to version control

---

## Core Components

### Component Tree

```
App Layout
└── PushNotificationBanner (Global - shows opt-in prompt)
└── Settings Page
    └── PushNotificationSettings (User controls)

Hooks:
└── usePushNotifications (Core logic)

Services:
└── pushNotificationService (Server-side sending)
```

---

## Client-Side Implementation

### 1. Core Hook: `usePushNotifications`

**Location:** `hooks/usePushNotifications.ts`

This is the heart of the client-side push notification system.

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface PushManagerState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushManagerState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    isLoading: true,
    error: null
  });

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      try {
        const isSupported = 
          'serviceWorker' in navigator &&
          'PushManager' in window &&
          'Notification' in window;

        if (!isSupported) {
          setState(prev => ({
            ...prev,
            isSupported: false,
            isLoading: false,
            error: 'Push notifications are not supported in this browser'
          }));
          return;
        }

        // Check current permission
        const permission = Notification.permission;

        // Check if already subscribed
        if ('serviceWorker' in navigator && permission === 'granted') {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          
          setState(prev => ({
            ...prev,
            isSupported: true,
            permission,
            isSubscribed: !!subscription,
            isLoading: false
          }));
        } else {
          setState(prev => ({
            ...prev,
            isSupported: true,
            permission,
            isSubscribed: false,
            isLoading: false
          }));
        }
      } catch (error) {
        logger.error('Error checking push support', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Error checking push notification support'
        }));
      }
    };

    checkSupport();
  }, []);

  // Request permission and subscribe
  const subscribe = useCallback(async () => {
    if (state.isLoading || state.isSubscribed) return;

    logger.info('Starting subscription process...');
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Check for service worker support
      if (!('serviceWorker' in navigator)) {
        logger.error('Service Worker not supported');
        toast.error('Push notifications are not supported in this browser');
        return;
      }

      // Check for push API support
      if (!('PushManager' in window)) {
        logger.error('Push API not supported');
        toast.error('Push notifications are not supported in this browser');
        return;
      }

      // iOS/Safari specific checks
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      logger.info('Device detection:', { isIOS, isSafari });

      // Request notification permission
      logger.info('Requesting permission...');
      const permission = await Notification.requestPermission();
      logger.info('Permission result:', permission);
      
      if (permission !== 'granted') {
        logger.warn('Permission denied');
        toast.error('Permission denied');
        return;
      }

      setState(prev => ({ ...prev, permission }));

      // Register service worker
      logger.info('Registering service worker...');
      const registration = await navigator.serviceWorker.ready;
      logger.info('Service worker ready');

      // Get VAPID key
      logger.info('Fetching VAPID key...');
      const vapidResponse = await fetch('/api/push/vapid-key');
      if (!vapidResponse.ok) {
        throw new Error('Failed to fetch VAPID key');
      }
      const { publicKey } = await vapidResponse.json();

      // Convert VAPID key
      const applicationServerKey = urlBase64ToUint8Array(publicKey);

      // Subscribe to push
      logger.info('Creating push subscription...');
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });
      logger.info('Push subscription created');

      // Get token (optional)
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      
      // Get user name
      const userName = sessionStorage.getItem('push-subscribe-name') || '';
      
      // Save subscription to server
      logger.info('Saving subscription to server...');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          subscription: pushSubscription.toJSON(),
          userName: userName
        })
      });
      
      sessionStorage.removeItem('push-subscribe-name');

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to save subscription: ${response.status}`);
      }

      const result = await response.json();
      logger.info('Subscription saved successfully:', result);

      // Store userId for later use
      if (result.userId) {
        sessionStorage.setItem('push-subscription-user-id', result.userId);
      }

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        isLoading: false
      }));

      toast.success('Notifications enabled! 🔔');
      
      // Send test notification (if authenticated)
      if (token) {
        setTimeout(() => {
          fetch('/api/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              title: 'Welcome!',
              body: 'Notifications enabled successfully',
              icon: '/icons/icon-192x192.png',
              test: true
            })
          }).catch(err => logger.error('Test notification failed:', err));
        }, 2000);
      }

    } catch (error) {
      logger.error('Subscription error:', error);
      toast.error('Error enabling notifications: ' + (error as Error).message);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.isLoading, state.isSubscribed]);

  // Unsubscribe
  const unsubscribe = useCallback(async () => {
    if (state.isLoading || !state.isSubscribed) return;

    logger.info('Starting unsubscribe process...');
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from server
        const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers,
          body: JSON.stringify({
            endpoint: subscription.endpoint
          })
        });
      }
      
      sessionStorage.removeItem('push-subscription-user-id');
      
      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false
      }));
      toast.success('Notifications disabled');
    } catch (error) {
      logger.error('Unsubscribe error:', error);
      toast.error('Error disabling notifications');
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.isLoading, state.isSubscribed]);

  // Show iOS install prompt
  const showIOSInstallPrompt = useCallback(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               ((window.navigator as unknown) as { standalone?: boolean }).standalone === true;
    
    if (isIOS && !isInStandaloneMode) {
      toast('Install the app to receive notifications:\n1. Tap Share ⬆️\n2. Select "Add to Home Screen"\n3. Tap "Add"', {
        duration: 10000,
      });
      return true;
    }
    return false;
  }, []);

  return {
    isSupported: state.isSupported,
    permission: state.permission,
    isSubscribed: state.isSubscribed,
    isLoading: state.isLoading,
    error: state.error,
    subscribe,
    unsubscribe,
    showIOSInstallPrompt
  };
}

// VAPID key conversion (iOS-compatible)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  base64String = base64String.trim();
  
  // Handle URL-safe base64
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  // Decode base64
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
```

**Key Features:**
- ✅ Checks browser support for Service Workers, Push API, and Notifications
- ✅ Manages subscription state (supported, permission, subscribed, loading)
- ✅ Handles iOS device detection
- ✅ Converts VAPID public key to Uint8Array (P-256 format for iOS)
- ✅ Subscribes to push manager with `userVisibleOnly: true`
- ✅ Saves subscription to server with optional authentication
- ✅ Supports anonymous users (no token required)
- ✅ Sends test notification after successful subscription
- ✅ Full unsubscribe flow

### 2. UI Components

#### A. Push Notification Banner

**Location:** `components/PushNotificationBanner.tsx`

Shows a dismissible banner prompting users to enable notifications.

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';

export function PushNotificationBanner() {
  const { 
    isSupported, 
    isSubscribed, 
    isLoading, 
    error, 
    subscribe, 
    permission,
    showIOSInstallPrompt
  } = usePushNotifications();
  const isOffline = useOfflineStatus();
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if iOS and PWA
  const isIOS = typeof window !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isPWA = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );

  useEffect(() => {
    // Check if user previously dismissed
    const dismissed = sessionStorage.getItem('push-banner-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  // Don't show if already dismissed, subscribed, not supported, loading, offline, or iOS without PWA
  if (
    isDismissed || 
    isSubscribed || 
    !isSupported || 
    isLoading || 
    isOffline ||
    (isIOS && !isPWA)
  ) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('push-banner-dismissed', 'true');
  };

  const handleSubscribe = async () => {
    try {
      await subscribe();
      handleDismiss();
    } catch (err) {
      console.error('Failed to subscribe:', err);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-40 animate-in slide-in-from-bottom-5 duration-500">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              Get notifications about new tasks
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Stay updated with real-time alerts
            </p>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-500 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          <Button
            onClick={handleSubscribe}
            size="sm"
            className="flex-1"
            disabled={isLoading}
          >
            Enable Notifications
          </Button>
          <Button
            onClick={handleDismiss}
            size="sm"
            variant="ghost"
          >
            Not Now
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Features:**
- ✅ Shows only when appropriate (supported, not subscribed, not dismissed)
- ✅ Dismissible with session storage memory
- ✅ iOS PWA detection (only shows if PWA is installed)
- ✅ Offline-aware (hides when offline)
- ✅ Auto-dismisses on successful subscription

#### B. Push Notification Settings

**Location:** `components/PushNotificationSettings.tsx`

Provides a settings UI for managing push notifications.

```typescript
'use client';

import { useState } from 'react';
import { Bell, BellOff, Smartphone, RefreshCw, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function PushNotificationSettings() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { 
    isSupported, 
    permission, 
    isSubscribed, 
    isLoading, 
    subscribe, 
    unsubscribe,
    showIOSInstallPrompt 
  } = usePushNotifications();

  const handleToggle = async () => {
    setIsProcessing(true);
    
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone === true;
        
        if (isIOS && !isStandalone) {
          showIOSInstallPrompt();
        } else {
          await subscribe();
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = () => {
    if (!isSupported) return <Badge variant="secondary">Not Supported</Badge>;
    if (permission === 'denied') return <Badge variant="destructive">Blocked</Badge>;
    if (isSubscribed) return <Badge className="bg-green-600">Active</Badge>;
    return <Badge variant="outline">Inactive</Badge>;
  };

  const getStatusMessage = () => {
    if (!isSupported) return 'Your browser does not support push notifications';
    if (permission === 'denied') return 'Notifications are blocked. Please enable them in browser settings';
    if (isSubscribed) return 'You are receiving notifications about updates and new tasks';
    return 'Enable notifications to receive updates about new tasks';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Push Notifications
            </CardTitle>
            <CardDescription>
              Manage your notification preferences
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className={isSubscribed ? "border-green-200 bg-green-50" : ""}>
          <div className="flex items-start gap-3">
            {isSubscribed ? (
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            ) : (
              <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
            )}
            <AlertDescription className="text-sm">
              {getStatusMessage()}
            </AlertDescription>
          </div>
        </Alert>

        {isSupported && permission !== 'denied' && (
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Smartphone className="h-4 w-4" />
              <span>Notifications for this device</span>
            </div>
            
            <Button
              onClick={handleToggle}
              disabled={isLoading || isProcessing}
              variant={isSubscribed ? "destructive" : "default"}
              size="sm"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : isSubscribed ? (
                <>
                  <BellOff className="h-4 w-4 mr-2" />
                  Disable
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Enable
                </>
              )}
            </Button>
          </div>
        )}

        {permission === 'denied' && (
          <div className="text-sm text-muted-foreground space-y-2 pt-2">
            <p>To enable notifications:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Open browser settings</li>
              <li>Find site or notification settings</li>
              <li>Allow notifications for this site</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**Features:**
- ✅ Shows current subscription status with badge
- ✅ Toggle button to enable/disable notifications
- ✅ Handles iOS install prompt if needed
- ✅ Shows instructions for denied permissions
- ✅ Visual feedback (loading states, icons)

---

## Server-Side Implementation

### 1. Push Notification Service

**Location:** `lib/services/pushNotificationService.ts`

This is the core server-side service that handles sending push notifications.

```typescript
import webpush from 'web-push';
import { supabaseDb as db } from '@/lib/supabase-database';
import { logger } from '@/lib/logger';

// Initialize web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@example.com';

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
    logger.info('VAPID keys configured successfully');
  } catch (error) {
    logger.error('Failed to configure VAPID keys', error);
  }
} else {
  logger.error('VAPID keys missing');
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  data?: any;
}

export interface SendOptions {
  targetRoles?: string[];
  targetUsers?: string[];
  saveToHistory?: boolean;
}

class PushNotificationService {
  /**
   * Send push notification to specified users
   */
  async sendNotification(
    payload: PushPayload,
    options: SendOptions = {},
    sentBy: string
  ): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let sent = 0;
    let failed = 0;

    try {
      logger.info('Sending push notification', {
        title: payload.title,
        targetRoles: options.targetRoles,
        targetUsers: options.targetUsers,
        sentBy
      });

      // Check VAPID keys
      if (!vapidPublicKey || !vapidPrivateKey) {
        const error = 'VAPID keys not configured';
        logger.error(error);
        errors.push(error);
        return { success: false, sent: 0, failed: 0, errors };
      }

      // Get target subscriptions
      const subscriptions = await db.getActivePushSubscriptions({
        roles: options.targetRoles,
        userIds: options.targetUsers
      });

      if (subscriptions.length === 0) {
        logger.warn('No active subscriptions found');
        return { success: false, sent: 0, failed: 0, errors: ['No active subscriptions found'] };
      }

      // Create notification record
      let notificationId: string | undefined;
      if (options.saveToHistory !== false) {
        notificationId = await db.createPushNotification({
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/icons/icon-192x192.png',
          badge: payload.badge || '/icons/icon-72x72.png',
          image: payload.image || '',
          url: payload.url || '/',
          tag: payload.tag || 'default',
          requireInteraction: payload.requireInteraction || false,
          targetRoles: options.targetRoles || [],
          targetUsers: options.targetUsers || [],
          sentBy
        });
      }

      // Prepare payload
      const notificationPayload = JSON.stringify({
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/icons/icon-192x192.png',
          badge: payload.badge || '/icons/icon-72x72.png',
          image: payload.image,
          tag: payload.tag || 'default',
          requireInteraction: payload.requireInteraction || false,
          actions: payload.actions,
          data: {
            ...payload.data,
            url: payload.url || '/',
            notificationId
          }
        }
      });

      // Send to each subscription
      const sendPromises = subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription as any, notificationPayload);
          sent++;
          logger.info('Push sent successfully', { userId: sub.userId });
        } catch (error: any) {
          failed++;
          errors.push(`Failed to send to ${sub.username}: ${error.message}`);
          logger.error('Push send failed', { userId: sub.userId, error: error.message });

          // Handle subscription errors
          if (error.statusCode === 410) {
            // Subscription expired
            await db.removePushSubscription(sub.subscription.endpoint);
          }
        }
      });

      // Wait for all sends
      await Promise.allSettled(sendPromises);

      // Update stats
      if (notificationId) {
        await db.updatePushNotificationStats(
          notificationId,
          { sent, failed },
          sent > 0 ? 'sent' : 'failed'
        );
      }

      return {
        success: sent > 0,
        sent,
        failed,
        errors
      };
    } catch (error) {
      logger.error('Push notification service error', error);
      return {
        success: false,
        sent,
        failed,
        errors: [...errors, (error as Error).message]
      };
    }
  }

  /**
   * Send notification to specific user
   */
  async sendToUser(userId: string, payload: PushPayload, sentBy: string) {
    return this.sendNotification(payload, { targetUsers: [userId] }, sentBy);
  }

  /**
   * Send notification to specific roles
   */
  async sendToRoles(roles: string[], payload: PushPayload, sentBy: string) {
    return this.sendNotification(payload, { targetRoles: roles }, sentBy);
  }

  /**
   * Send notification to all active users
   */
  async sendToAll(payload: PushPayload, sentBy: string) {
    return this.sendNotification(payload, {}, sentBy);
  }

  /**
   * Get public VAPID key
   */
  getPublicKey() {
    // Clean key of formatting issues
    const cleanedKey = vapidPublicKey.trim().replace(/[\r\n\s]/g, '');
    return cleanedKey;
  }
}

export const pushService = new PushNotificationService();
```

**Key Features:**
- ✅ Initializes web-push library with VAPID keys
- ✅ Validates VAPID configuration on startup
- ✅ Sends notifications to filtered user groups (roles, specific users, or all)
- ✅ Creates notification history records
- ✅ Handles subscription errors (410 = expired, removes from DB)
- ✅ Returns detailed send results (success count, failed count, errors)
- ✅ Cleans VAPID public key (removes whitespace/newlines)

### 2. Database Layer

**Location:** `lib/supabase-database.ts` (excerpts)

```typescript
// Save push subscription
async savePushSubscription(data: {
  userId: string | null;
  username: string;
  email: string;
  role: string;
  subscription: any;
  deviceType: 'ios' | 'android' | 'desktop';
  userAgent: string;
  isActive: boolean;
}): Promise<void> {
  const { data: existing, error: checkError } = await this.supabase
    .from('push_subscriptions')
    .select('id')
    .eq('endpoint', data.subscription.endpoint)
    .single();

  if (existing) {
    // Update existing subscription
    const { error } = await this.supabase
      .from('push_subscriptions')
      .update({
        userId: data.userId,
        username: data.username,
        email: data.email,
        role: data.role,
        p256dh: data.subscription.keys.p256dh,
        auth: data.subscription.keys.auth,
        deviceType: data.deviceType,
        userAgent: data.userAgent,
        isActive: data.isActive,
        lastUsed: new Date().toISOString()
      })
      .eq('endpoint', data.subscription.endpoint);

    if (error) throw error;
  } else {
    // Insert new subscription
    const { error } = await this.supabase
      .from('push_subscriptions')
      .insert({
        userId: data.userId,
        username: data.username,
        email: data.email,
        role: data.role,
        endpoint: data.subscription.endpoint,
        p256dh: data.subscription.keys.p256dh,
        auth: data.subscription.keys.auth,
        deviceType: data.deviceType,
        userAgent: data.userAgent,
        isActive: data.isActive,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString()
      });

    if (error) throw error;
  }
}

// Get active push subscriptions
async getActivePushSubscriptions(filters?: {
  roles?: string[];
  userIds?: string[];
}): Promise<Array<{
  userId: string;
  username: string;
  deviceType: string;
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
}>> {
  let query = this.supabase
    .from('push_subscriptions')
    .select('*')
    .eq('isActive', true);

  if (filters?.roles && filters.roles.length > 0) {
    query = query.in('role', filters.roles);
  }

  if (filters?.userIds && filters.userIds.length > 0) {
    query = query.in('userId', filters.userIds);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map((sub: any) => ({
    userId: sub.userId,
    username: sub.username,
    deviceType: sub.deviceType,
    subscription: {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth
      }
    }
  }));
}

// Remove push subscription
async removePushSubscription(endpoint: string, userId?: string | null): Promise<void> {
  let query = this.supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint);

  if (userId !== undefined) {
    if (userId === null) {
      query = query.is('userId', null);
    } else {
      query = query.eq('userId', userId);
    }
  }

  const { error } = await query;
  if (error) throw error;
}
```

---

## Service Worker Implementation

**Location:** `public/sw.js`

The Service Worker is crucial for receiving push notifications when the app is closed.

```javascript
// Service Worker for Push Notifications

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(clients.claim());
});

// Handle push events
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);
  
  let notificationData = {
    title: 'New Notification',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[Service Worker] Push payload:', payload);
      
      if (payload.notification) {
        notificationData = {
          ...notificationData,
          ...payload.notification
        };
      }
    } catch (err) {
      console.error('[Service Worker] Error parsing push data:', err);
    }
  }

  const promiseChain = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      image: notificationData.image,
      tag: notificationData.tag || 'default',
      requireInteraction: notificationData.requireInteraction || false,
      actions: notificationData.actions || [],
      data: notificationData.data
    }
  );

  event.waitUntil(promiseChain);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.notification);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  })
  .then((windowClients) => {
    // Check if there's already a window open
    for (let i = 0; i < windowClients.length; i++) {
      const client = windowClients[i];
      if (client.url.includes(self.location.origin) && 'focus' in client) {
        // Navigate and focus existing window
        client.navigate(urlToOpen);
        return client.focus();
      }
    }
    // Open new window if none exists
    if (clients.openWindow) {
      return clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed:', event.notification);
});
```

**Key Features:**
- ✅ **Push Event**: Receives push messages even when app is closed
- ✅ **Show Notification**: Displays notification using `showNotification()` API
- ✅ **Notification Click**: Opens/focuses app window and navigates to URL
- ✅ **Notification Close**: Tracks when user dismisses notification
- ✅ **Error Handling**: Gracefully handles malformed push data
- ✅ **Window Management**: Reuses existing window if available

**Critical for iOS:**
- Must use `self.registration.showNotification()` (not `new Notification()`)
- Must show notification on every push event (`userVisibleOnly: true`)
- Service Worker must be registered at root (`/sw.js`)

---

## iOS/Safari Specific Handling

### Why iOS is Different

iOS Safari has specific requirements for push notifications:

1. **PWA Installation Required**: Push notifications ONLY work if the app is installed to the home screen as a PWA
2. **Service Worker Scope**: Must be registered at root level
3. **VAPID Keys**: Must use P-256 elliptic curve keys (65 bytes uncompressed or 33 bytes compressed)
4. **User Visible**: All push messages MUST show a notification (`userVisibleOnly: true`)
5. **APNs**: Uses Apple Push Notification service (APNs) instead of FCM

### iOS Detection

```typescript
// Detect iOS device
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

// Detect if installed as PWA
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                     (window.navigator as any).standalone === true;

// Show install prompt if iOS but not PWA
if (isIOS && !isStandalone) {
  // Show instructions to install PWA
  toast('Install the app to receive notifications:\n1. Tap Share ⬆️\n2. Select "Add to Home Screen"\n3. Tap "Add"');
}
```

### iOS Install Prompt

```typescript
const showIOSInstallPrompt = () => {
  const message = `Install the app to receive notifications:
1. Tap the Share button ⬆️
2. Select "Add to Home Screen"
3. Tap "Add"`;
  
  toast(message, {
    duration: 10000,
    action: {
      label: 'Got it',
      onClick: () => {}
    }
  });
};
```

### Manifest.json for iOS

**Location:** `public/manifest.json`

```json
{
  "name": "Your App Name",
  "short_name": "App",
  "description": "Your app description",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### Service Worker Registration (iOS-Compatible)

```typescript
// In app/layout.tsx or _app.tsx
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered:', registration);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  }
}, []);
```

---

## Database Schema

### push_subscriptions Table

```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  userId UUID REFERENCES users(id) ON DELETE CASCADE, -- Can be NULL for anonymous
  username TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'guest',
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL, -- Public key for encryption
  auth TEXT NOT NULL,   -- Auth secret
  deviceType TEXT NOT NULL CHECK (deviceType IN ('ios', 'android', 'desktop')),
  userAgent TEXT,
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  lastUsed TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_endpoint CHECK (endpoint <> '')
);

-- Indexes
CREATE INDEX idx_push_subscriptions_userId ON push_subscriptions(userId);
CREATE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX idx_push_subscriptions_isActive ON push_subscriptions(isActive);
CREATE INDEX idx_push_subscriptions_role ON push_subscriptions(role);
```

### push_notifications Table (History)

```sql
CREATE TABLE push_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon TEXT,
  badge TEXT,
  image TEXT,
  url TEXT NOT NULL DEFAULT '/',
  tag TEXT NOT NULL DEFAULT 'default',
  requireInteraction BOOLEAN NOT NULL DEFAULT FALSE,
  targetRoles TEXT[] DEFAULT '{}',
  targetUsers UUID[] DEFAULT '{}',
  sentBy UUID REFERENCES users(id) ON DELETE SET NULL,
  sentCount INTEGER NOT NULL DEFAULT 0,
  failedCount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  createdAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_counts CHECK (sentCount >= 0 AND failedCount >= 0)
);

-- Indexes
CREATE INDEX idx_push_notifications_sentBy ON push_notifications(sentBy);
CREATE INDEX idx_push_notifications_createdAt ON push_notifications(createdAt DESC);
CREATE INDEX idx_push_notifications_status ON push_notifications(status);
```

---

## API Endpoints

### 1. GET /api/push/vapid-key

Returns the public VAPID key (public endpoint, no auth required).

```typescript
import { NextRequest, NextResponse } from "next/server";
import { pushService } from "@/lib/services/pushNotificationService";

export async function GET(request: NextRequest) {
  try {
    const publicKey = pushService.getPublicKey();

    if (!publicKey) {
      return NextResponse.json({
        error: "VAPID keys not configured",
        success: false
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      publicKey
    });
  } catch (error) {
    return NextResponse.json({
      error: "Failed to fetch VAPID key",
      success: false
    }, { status: 500 });
  }
}
```

### 2. POST /api/push/subscribe

Saves a push subscription to the database (supports anonymous users).

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { supabaseDb as db } from '@/lib/supabase-database';
import { pushService } from '@/lib/services/pushNotificationService';

export async function POST(request: NextRequest) {
  try {
    // Optional authentication
    const authHeader = request.headers.get('authorization');
    let user = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      user = await authService.getUserFromToken(token);
    }

    // Parse subscription data
    const body = await request.json();
    const { subscription, userName } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
    }

    // Detect device type
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isAndroid = /android/i.test(userAgent);
    
    let deviceType: 'ios' | 'android' | 'desktop' = 'desktop';
    if (isIOS) deviceType = 'ios';
    else if (isAndroid) deviceType = 'android';

    // User data (anonymous or authenticated)
    const userId = user?.id || null;
    const username = userName || user?.username || 'Anonymous User';
    const email = user?.email || '';
    const role = user?.role || 'guest';

    // Save subscription
    await db.savePushSubscription({
      userId,
      username,
      email,
      role,
      subscription,
      deviceType,
      userAgent,
      isActive: true
    });

    // Send welcome notification (only for authenticated users)
    if (userId) {
      await pushService.sendToUser(
        userId,
        {
          title: 'Welcome! 🔔',
          body: `Hi ${username}, notifications are now enabled.`,
          icon: '/icons/icon-192x192.png',
          url: '/'
        },
        'system'
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Subscription saved successfully',
      deviceType,
      userId
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}
```

### 3. DELETE /api/push/subscribe

Removes a push subscription.

```typescript
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    let user = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      user = await authService.getUserFromToken(token);
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'No endpoint provided' }, { status: 400 });
    }

    await db.removePushSubscription(endpoint, user?.id || null);

    return NextResponse.json({ 
      success: true,
      message: 'Subscription removed successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to remove subscription' },
      { status: 500 }
    );
  }
}
```

### 4. POST /api/push/send

Sends a push notification (admin only).

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { authSupabase as authService } from '@/lib/auth-supabase';
import { pushService } from '@/lib/services/pushNotificationService';
import { requireAdmin } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    const authUser = authService.extractUserFromRequest(request);
    const user = requireAdmin(authUser);

    const {
      title,
      body,
      icon,
      image,
      url,
      targetRoles,
      targetUsers
    } = await request.json();

    // Validate
    if (!title || !body) {
      return NextResponse.json({
        error: 'Title and body are required',
        success: false
      }, { status: 400 });
    }

    // Send notification
    const result = await pushService.sendNotification(
      {
        title,
        body,
        icon,
        image,
        url
      },
      {
        targetRoles,
        targetUsers,
        saveToHistory: true
      },
      user.id
    );

    return NextResponse.json({
      success: result.success,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors,
      message: result.success 
        ? `Notification sent to ${result.sent} users`
        : 'Failed to send notification'
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to send push notification',
      success: false
    }, { status: 500 });
  }
}
```

### 5. POST /api/push/test

Sends a test notification (authenticated users).

```typescript
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    let user = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      user = await authService.getUserFromToken(token);
    }
    
    const body = await request.json();
    const { userId } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    const result = await pushService.sendToUser(
      userId,
      {
        title: 'Test Notification 🔔',
        body: 'This is a test notification. If you see this, notifications are working!',
        icon: '/icons/icon-192x192.png',
        url: '/',
        requireInteraction: true
      },
      user?.username || 'system'
    );
    
    return NextResponse.json({
      success: result.success,
      sent: result.sent,
      failed: result.failed,
      message: result.success ? 'Test notification sent' : 'Failed to send'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    );
  }
}
```

---

## Testing & Debugging

### 1. Test Push Notification Flow

```bash
# 1. Generate VAPID keys
node scripts/generate-vapid-keys.js

# 2. Add keys to .env.local

# 3. Start development server
npm run dev

# 4. Open browser (Chrome or Safari)
# 5. Subscribe to push notifications using the UI
# 6. Send test notification from admin panel or API
```

### 2. Browser DevTools

**Chrome DevTools:**
1. Open DevTools (F12)
2. Go to **Application** tab
3. Under **Service Workers**, verify SW is registered
4. Under **Push Messaging**, check subscription status
5. Check **Console** for push event logs

**Safari DevTools (iOS):**
1. On Mac: Safari > Develop > [Your iPhone] > [Your PWA]
2. Check Console for logs
3. Verify Service Worker registration

### 3. Logging

The system includes comprehensive logging:

```typescript
// Client-side logs
logger.info('[Push Client] Starting subscription...');
logger.error('[Push Client] Subscription failed', error);

// Server-side logs
logger.info('[Push Service] Sending notification', { userId, title });
logger.error('[Push Service] Send failed', { error });

// Service Worker logs
console.log('[Service Worker] Push received:', event);
```

### 4. Common Issues & Fixes

| Issue | Cause | Solution |
|-------|-------|----------|
| "Push not supported" | Browser doesn't support Push API | Use Chrome, Edge, Safari 16.4+, or Firefox |
| "VAPID keys not configured" | Missing env vars | Check `.env.local` has both keys |
| iOS notifications not working | App not installed as PWA | Install app to home screen first |
| "410 Gone" error | Subscription expired/invalidated | System auto-removes, user needs to resubscribe |
| "401 Unauthorized" | Invalid VAPID keys | Regenerate keys and update `.env.local` |
| Notifications not showing | Service Worker not registered | Check `/sw.js` exists and is registered |

---

## Production Deployment

### 1. Environment Variables

Ensure these are set in production:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<your_public_key>
VAPID_PRIVATE_KEY=<your_private_key>
VAPID_EMAIL=mailto:admin@yourdomain.com
```

### 2. HTTPS Requirement

⚠️ **Push notifications require HTTPS in production!**

- Development: Works on `localhost`
- Production: Must be served over HTTPS
- Service Worker only works on HTTPS domains

### 3. Service Worker Caching

Add SW to cache strategy:

```javascript
// In sw.js
const CACHE_NAME = 'app-v1';
const urlsToCache = [
  '/',
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});
```

### 4. Monitoring

Track push notification metrics:

- Subscription count (active subscriptions)
- Delivery success rate (sent vs failed)
- Click-through rate (notifications clicked)
- Unsubscribe rate

### 5. Rate Limiting

Implement rate limiting for push sends:

```typescript
// Limit: 100 notifications per user per day
const canSendNotification = async (userId: string) => {
  const today = new Date().toISOString().split('T')[0];
  const count = await db.getDailyNotificationCount(userId, today);
  return count < 100;
};
```

---

## Troubleshooting

### iOS-Specific Issues

**Problem:** Notifications not working on iPhone  
**Solutions:**
1. Verify app is installed to home screen (not just Safari tab)
2. Check iOS version (requires iOS 16.4+ for PWA push)
3. Ensure `manifest.json` has `display: "standalone"`
4. Verify service worker is registered at root (`/sw.js`)
5. Check VAPID keys are P-256 format (65 or 33 bytes)

**Problem:** "Add to Home Screen" doesn't show push option  
**Solution:** This is expected. Push permission is requested AFTER installation.

### Android/Chrome Issues

**Problem:** Notifications not showing  
**Solutions:**
1. Check browser notifications are enabled (System Settings > Chrome > Notifications)
2. Verify site notifications aren't blocked (Chrome > Settings > Site Settings > Notifications)
3. Ensure service worker is active (Chrome DevTools > Application > Service Workers)

**Problem:** "Failed to subscribe" error  
**Solutions:**
1. Check VAPID public key is accessible (`/api/push/vapid-key`)
2. Verify no CORS issues in browser console
3. Ensure service worker has `scope: '/'`

### General Issues

**Problem:** 401 Unauthorized from push service  
**Solution:** Regenerate VAPID keys, ensure email format is `mailto:user@domain.com`

**Problem:** Subscriptions not saving  
**Solution:** Check database connection, verify `push_subscriptions` table exists

**Problem:** Service Worker not updating  
**Solution:** 
```javascript
// Force update in development
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});
```

**Problem:** Push events not triggering  
**Solution:** Verify `push` event listener is in service worker, check browser console for errors

---

## Summary

This push notification system provides:

✅ **Full cross-platform support** (iOS, Android, Desktop)  
✅ **Background notifications** (works when app is closed)  
✅ **Anonymous & authenticated users**  
✅ **Role-based targeting**  
✅ **Comprehensive error handling**  
✅ **Notification history & analytics**  
✅ **iOS PWA detection & guidance**  
✅ **Subscription management UI**  
✅ **VAPID authentication** (secure & standards-compliant)

### Key Takeaways

1. **VAPID Keys**: Generate using `web-push`, store securely
2. **Service Worker**: Essential for background notifications
3. **iOS Requirements**: PWA installation mandatory, P-256 keys
4. **Database**: Store subscriptions with endpoint + keys
5. **Server**: Use `web-push` library to send notifications
6. **Client**: Check support, request permission, subscribe to PushManager
7. **Testing**: Test on real devices (iOS especially)
8. **Production**: HTTPS required, monitor metrics

### Next Steps

1. Generate VAPID keys (`node scripts/generate-vapid-keys.js`)
2. Add keys to `.env.local`
3. Copy hook, components, and API routes to your project
4. Create database tables
5. Register service worker
6. Test on localhost
7. Deploy to production (HTTPS)
8. Test on real iOS and Android devices

---

**Questions or issues?** Check the troubleshooting section or review browser console logs for detailed error messages.

Good luck implementing push notifications! 🔔

