'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Mail, Smartphone, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { pwaFetch } from '@/lib/utils';
import { motion } from 'framer-motion';

type NotificationMethod = 'email' | 'push' | 'both';

export const PushNotificationPreferences = () => {
  const { 
    isSupported, 
    permission, 
    isSubscribed, 
    isLoading: pushLoading, 
    subscribe, 
    unsubscribe,
    showIOSInstallPrompt 
  } = usePushNotifications();

  const [notificationMethod, setNotificationMethod] = useState<NotificationMethod>('email');
  const [loading, setLoading] = useState(false);
  const [fetchingPrefs, setFetchingPrefs] = useState(true);

  // Check if iOS and PWA
  const isIOS = typeof window !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isPWA = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await pwaFetch('/api/notifications/subscriptions', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const subscriptions = await response.json();
        // Get the notification method from the first active subscription
        const activeSubscription = subscriptions.find((s: any) => s.is_active);
        if (activeSubscription && activeSubscription.notification_method) {
          setNotificationMethod(activeSubscription.notification_method);
        }
      }
    } catch (error) {
      console.error('❌ [Push Prefs] Error fetching preferences:', error);
    } finally {
      setFetchingPrefs(false);
    }
  };

  const updateNotificationMethod = async (method: NotificationMethod) => {
    setLoading(true);
    try {
      // If switching to push or both, need to subscribe first
      if ((method === 'push' || method === 'both') && !isSubscribed) {
        if (isIOS && !isPWA) {
          showIOSInstallPrompt();
          setLoading(false);
          return;
        }
        await subscribe();
      }

      // Update preferences in backend
      const response = await pwaFetch('/api/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify({ notification_method: method })
      });

      if (response.ok) {
        setNotificationMethod(method);
        toast.success('העדפות ההתראות עודכנו בהצלחה');
      } else {
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      console.error('❌ [Push Prefs] Error updating preferences:', error);
      toast.error('שגיאה בעדכון העדפות ההתראות');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePush = async () => {
    if (isSubscribed) {
      // If currently using push or both, switch to email only
      if (notificationMethod === 'push') {
        await updateNotificationMethod('email');
        await unsubscribe();
      } else if (notificationMethod === 'both') {
        await updateNotificationMethod('email');
      }
    } else {
      // If not subscribed, switch to push or both based on current state
      if (notificationMethod === 'email') {
        await updateNotificationMethod('both');
      }
    }
  };

  if (fetchingPrefs) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Don't show push option if not supported
  if (!isSupported) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                העדפות התראות
              </CardTitle>
              <CardDescription>
                בחר איך תרצה לקבל התראות על תורים פנויים
              </CardDescription>
            </div>
            {isSubscribed && (
              <Badge className="bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                פעיל
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Notification Methods */}
          <div className="grid gap-3">
            {[
              { 
                value: 'email' as NotificationMethod, 
                icon: Mail, 
                title: 'מייל בלבד', 
                description: 'קבל התראות במייל',
                color: 'from-blue-500 to-blue-600'
              },
              { 
                value: 'push' as NotificationMethod, 
                icon: Smartphone, 
                title: 'התראות Push בלבד', 
                description: 'קבל התראות במכשיר שלך',
                color: 'from-purple-500 to-purple-600',
                requiresPush: true
              },
              { 
                value: 'both' as NotificationMethod, 
                icon: Bell, 
                title: 'מייל + התראות Push', 
                description: 'קבל התראות בשני הערוצים',
                color: 'from-green-500 to-green-600',
                requiresPush: true
              }
            ].map((method) => (
              <motion.button
                key={method.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (method.requiresPush && (isIOS && !isPWA)) {
                    showIOSInstallPrompt();
                    return;
                  }
                  updateNotificationMethod(method.value);
                }}
                disabled={loading || pushLoading || (method.requiresPush && permission === 'denied')}
                className={`relative p-4 rounded-lg border-2 transition-all text-right ${
                  notificationMethod === method.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                } ${(method.requiresPush && permission === 'denied') ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                    notificationMethod === method.value
                      ? `bg-gradient-to-br ${method.color}`
                      : 'bg-muted'
                  }`}>
                    <method.icon className={`h-5 w-5 ${
                      notificationMethod === method.value ? 'text-white' : 'text-muted-foreground'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 justify-between">
                      <h4 className="font-semibold text-sm">{method.title}</h4>
                      {notificationMethod === method.value && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{method.description}</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          {/* iOS PWA Notice */}
          {isIOS && !isPWA && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-xs text-yellow-800 dark:text-yellow-300">
                💡 <strong>עבור iOS:</strong> יש להתקין את האפליקציה במסך הבית כדי לקבל התראות Push
              </p>
            </div>
          )}

          {/* Permission Denied Notice */}
          {permission === 'denied' && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-xs text-red-800 dark:text-red-300">
                ⚠️ התראות נחסמו. אנא אפשר התראות בהגדרות הדפדפן
              </p>
            </div>
          )}

          {/* Loading State */}
          {(loading || pushLoading) && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>מעדכן...</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

