import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { apiFetch } from './lib/api';
import { getRouter } from './routes';

export default function App() {
  const router = getRouter();

  useEffect(() => {
    // Status bar — transparent overlay (content shows behind it)
    if (Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    }

    // Local notifications (cleanify)
    LocalNotifications.requestPermissions().catch(() => {});
    const localListenerPromise = LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (action: any) => {
        const extra = action.notification?.extra;
        if (extra?.submissionId) {
          router.navigate(`/cleanify-result/${extra.submissionId}`);
        }
      }
    );

    // Push notifications (FCM — only on native iOS/Android)
    let pushListeners: Promise<{ remove: () => void }>[] = [];
    if (Capacitor.isNativePlatform()) {
      PushNotifications.requestPermissions().then((result) => {
        if (result.receive === 'granted') {
          PushNotifications.register();
        }
      }).catch(() => {});

      // Save FCM token to backend
      const regListener = PushNotifications.addListener('registration', async (token) => {
        try {
          await apiFetch('/v1/profile', {
            method: 'PATCH',
            body: JSON.stringify({ fcm_token: token.value }),
          });
        } catch {}
      });

      // Handle notification tap (app in background / closed)
      const actionListener = PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (action: any) => {
          const data = action.notification?.data;
          if (data?.thread_id) {
            router.navigate(`/chat/${data.thread_id}`);
          } else if (data?.submissionId) {
            router.navigate(`/cleanify-result/${data.submissionId}`);
          }
        }
      );

      pushListeners = [regListener, actionListener];
    }

    return () => {
      localListenerPromise.then(l => l.remove());
      pushListeners.forEach(p => p.then(l => l.remove()));
    };
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#14ae5c',
            color: 'white',
            border: 'none',
            borderRadius: '16px',
            padding: '12px 20px',
            fontSize: '13px',
            fontWeight: 500,
            boxShadow: '0 8px 30px rgba(20, 174, 92, 0.25)',
          },
        }}
        offset={60}
      />
    </>
  );
}
