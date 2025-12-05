'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface PushManagerState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  badgeCount: number;
}

// ============================================
// iOS 26 App Badge API
// ============================================

/**
 * Check if Badge API is supported
 */
export const isBadgeSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 'setAppBadge' in navigator;
};

/**
 * Set the app badge count on the home screen icon
 * Works on iOS 16.4+ and most modern browsers when installed as PWA
 */
export const setAppBadge = async (count: number): Promise<boolean> => {
  if (!isBadgeSupported()) {
    console.debug('[Badge API] Not supported in this environment');
    return false;
  }
  
  try {
    if (count > 0) {
      await (navigator as any).setAppBadge(count);
      console.log(`[Badge API] Badge set to ${count}`);
    } else {
      await (navigator as any).clearAppBadge();
      console.log('[Badge API] Badge cleared');
    }
    return true;
  } catch (error) {
    console.error('[Badge API] Error setting badge:', error);
    return false;
  }
};

/**
 * Clear the app badge from the home screen icon
 */
export const clearAppBadge = async (): Promise<boolean> => {
  if (!isBadgeSupported()) {
    return false;
  }
  
  try {
    await (navigator as any).clearAppBadge();
    console.log('[Badge API] Badge cleared');
    return true;
  } catch (error) {
    console.error('[Badge API] Error clearing badge:', error);
    return false;
  }
};

/**
 * Update badge count from unread notifications count
 */
export const updateBadgeFromNotifications = async (unreadCount: number): Promise<void> => {
  await setAppBadge(unreadCount);
};

export const usePushNotifications = () => {
  const [state, setState] = useState<PushManagerState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    isLoading: true,
    error: null,
    badgeCount: 0
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
        console.error('❌ [Push Hook] Error checking push support:', error);
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

    console.log('📱 [Push Hook] Starting subscription process...');
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Check for service worker support
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker not supported');
      }

      // Check for push API support
      if (!('PushManager' in window)) {
        throw new Error('Push API not supported');
      }

      // iOS/Safari specific checks
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      console.log(`📱 [Push Hook] Device: iOS=${isIOS}, Safari=${isSafari}`);

      // Request notification permission
      console.log('🔔 [Push Hook] Requesting permission...');
      const permission = await Notification.requestPermission();
      console.log(`📝 [Push Hook] Permission result: ${permission}`);
      
      if (permission !== 'granted') {
        toast.error('התראות נדחו. אנא אפשר התראות בהגדרות הדפדפן.');
        setState(prev => ({ ...prev, isLoading: false, permission }));
        return;
      }

      setState(prev => ({ ...prev, permission }));

      // Register service worker
      console.log('⚙️ [Push Hook] Registering service worker...');
      const registration = await navigator.serviceWorker.ready;
      console.log('✅ [Push Hook] Service worker ready');

      // Get VAPID key
      console.log('🔑 [Push Hook] Fetching VAPID key...');
      const vapidResponse = await fetch('/api/push/vapid-key');
      console.log(`📡 [Push Hook] VAPID response status: ${vapidResponse.status}`);
      
      if (!vapidResponse.ok) {
        const errorText = await vapidResponse.text();
        console.error('❌ [Push Hook] VAPID fetch failed:', errorText.substring(0, 200));
        throw new Error(`Failed to fetch VAPID key: ${vapidResponse.status}`);
      }
      
      const vapidData = await vapidResponse.json();
      const publicKey = vapidData.publicKey;
      
      if (!publicKey) {
        console.error('❌ [Push Hook] No public key in response:', vapidData);
        throw new Error('VAPID public key not found in response');
      }
      
      console.log('✅ [Push Hook] VAPID key received:', publicKey.substring(0, 20) + '...');

      // Convert VAPID key
      const applicationServerKey = urlBase64ToUint8Array(publicKey);

      // Subscribe to push
      console.log('📤 [Push Hook] Creating push subscription...');
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource
      });
      console.log('✅ [Push Hook] Push subscription created');

      // Get token from localStorage
      const token = localStorage.getItem('token');
      console.log('🔐 [Push Hook] Token from localStorage:', token ? `${token.substring(0, 20)}...` : 'NOT FOUND');
      
      // Save subscription to server
      console.log('💾 [Push Hook] Saving subscription to server...');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('✅ [Push Hook] Authorization header added');
      } else {
        console.warn('⚠️ [Push Hook] No token found - using cookies for auth');
      }
      
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers,
        credentials: 'include', // ✅ Send cookies for authentication
        body: JSON.stringify({
          subscription: pushSubscription.toJSON()
        })
      });

      console.log(`📡 [Push Hook] Subscribe response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ [Push Hook] Subscribe failed:', errorData);
        throw new Error(`Failed to save subscription: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('✅ [Push Hook] Subscription saved successfully:', result);

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        isLoading: false
      }));

      toast.success('🔔 התראות הופעלו בהצלחה!');
    } catch (error) {
      console.error('❌ [Push Hook] Subscription error:', error);
      toast.error('שגיאה בהפעלת התראות: ' + (error as Error).message);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.isLoading, state.isSubscribed]);

  // Unsubscribe
  const unsubscribe = useCallback(async () => {
    if (state.isLoading || !state.isSubscribed) return;

    console.log('🗑️ [Push Hook] Starting unsubscribe process...');
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from server
        const token = localStorage.getItem('token');
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
      
      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false
      }));
      
      toast.success('התראות כובו');
      console.log('✅ [Push Hook] Unsubscribed successfully');
    } catch (error) {
      console.error('❌ [Push Hook] Unsubscribe error:', error);
      toast.error('שגיאה בכיבוי התראות');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.isLoading, state.isSubscribed]);

  // Show iOS install prompt
  const showIOSInstallPrompt = useCallback(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               ((window.navigator as any).standalone) === true;
    
    if (isIOS && !isInStandaloneMode) {
      toast('התקן את האפליקציה כדי לקבל התראות:\n1. הקש על שתף ⬆️\n2. בחר "הוסף למסך הבית"\n3. הקש על "הוסף"', {
        duration: 10000,
      });
      return true;
    }
    return false;
  }, []);

  // Badge management
  const setBadge = useCallback(async (count: number) => {
    const success = await setAppBadge(count);
    if (success) {
      setState(prev => ({ ...prev, badgeCount: count }));
    }
    return success;
  }, []);

  const clearBadge = useCallback(async () => {
    const success = await clearAppBadge();
    if (success) {
      setState(prev => ({ ...prev, badgeCount: 0 }));
    }
    return success;
  }, []);

  return {
    // State
    isSupported: state.isSupported,
    permission: state.permission,
    isSubscribed: state.isSubscribed,
    isLoading: state.isLoading,
    error: state.error,
    badgeCount: state.badgeCount,
    
    // Push subscription methods
    subscribe,
    unsubscribe,
    showIOSInstallPrompt,
    
    // Badge API methods (iOS 26+)
    setBadge,
    clearBadge,
    isBadgeSupported: isBadgeSupported(),
  };
};

// VAPID key conversion (iOS-compatible)
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  base64String = base64String.trim();
  
  // Handle URL-safe base64
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  // Decode base64
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

