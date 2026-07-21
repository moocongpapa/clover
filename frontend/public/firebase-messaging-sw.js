// Import and configure the Firebase SDK (compat versions for service worker importScripts)
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase app in the service worker
// The values here do not strictly need to be dynamic unless you change active project ID,
// but they can match your console setup. Even mock config enables registration process to load.
firebase.initializeApp({
  apiKey: 'MOCK_API_KEY',
  authDomain: 'mock-app.firebaseapp.com',
  projectId: 'mock-app',
  storageBucket: 'mock-app.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:0000000000000000000000',
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || 'Clover 알림';
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/icons/icon-192x192.png',
    badge: '/icons/badge.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
