// Import and configure the Firebase SDK (compat versions for service worker importScripts)
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase app in the service worker with the Clover Firebase project settings
firebase.initializeApp({
  authDomain: 'clover-e3338.firebaseapp.com',
  projectId: 'clover-e3338',
  storageBucket: 'clover-e3338.firebasestorage.app',
  messagingSenderId: '1085828612485',
  appId: '1:1085828612485:web:d28568bed15717d44084ec',
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // CRITICAL FIX: If payload already includes a `notification` property,
  // the browser / OS (especially iOS Safari Web Push) natively displays it automatically.
  // Calling self.registration.showNotification here creates an EXACT DUPLICATE banner!
  if (payload.notification) {
    return;
  }

  const notificationTitle = payload.data?.title || 'Clover 알림';
  const notificationOptions = {
    body: payload.data?.body || '새로운 모임 소식이 도착했습니다.',
    icon: payload.data?.icon || '/icons/icon-192x192.png',
    badge: '/icons/badge.png',
    tag: payload.data?.tag || 'clover-notification',
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && targetUrl) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
