import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'REDACTED_API_KEY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'clover-e3338.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'clover-e3338',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'clover-e3338.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1085828612485',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1085828612485:web:d28568bed15717d44084ec',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-SJXH7DJWHD',
};

const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'MOCK_API_KEY' &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== 'mock-app'
);

// Initialize Firebase only when configured
export const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const messaging = isFirebaseConfigured && typeof window !== 'undefined' ? getMessaging(app!) : null;

export async function requestFcmToken(): Promise<string | null> {
  if (!isFirebaseConfigured || !messaging) return null;
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

  if (!vapidKey) {
    return null;
  }

  try {
    const currentToken = await getToken(messaging, { vapidKey });
    if (currentToken) {
      return currentToken;
    }
    return null;
  } catch (err) {
    console.debug('FCM token registration unavailable:', err);
    return null;
  }
}
