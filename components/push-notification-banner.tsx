'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/use-push-notifications';

export const PushNotificationBanner = () => {
  const { 
    isSupported, 
    isSubscribed, 
    isLoading, 
    subscribe, 
    permission,
    showIOSInstallPrompt
  } = usePushNotifications();
  
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

  // Don't show if:
  // - Already dismissed
  // - Already subscribed
  // - Not supported
  // - Loading
  // - Permission denied
  // - iOS without PWA installed
  if (
    isDismissed || 
    isSubscribed || 
    !isSupported || 
    isLoading ||
    permission === 'denied' ||
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
      // Check if iOS and not in standalone mode
      if (isIOS && !isPWA) {
        showIOSInstallPrompt();
        return;
      }
      
      await subscribe();
      handleDismiss();
    } catch (err) {
      console.error('❌ Failed to subscribe:', err);
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-40 animate-in slide-in-from-bottom-5 duration-500">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              קבל התראות על תורים חדשים
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              קבל עדכונים בזמן אמת כשיש תורים פנויים
            </p>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
            aria-label="סגור"
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
            {isLoading ? 'מפעיל...' : 'הפעל התראות'}
          </Button>
          <Button
            onClick={handleDismiss}
            size="sm"
            variant="ghost"
          >
            לא עכשיו
          </Button>
        </div>
      </div>
    </div>
  );
};

