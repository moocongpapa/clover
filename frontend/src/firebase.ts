import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

// Only initialize Firebase if real keys are provided (prevents 400 bad request in mock mode)
const isFirebaseConfigured = Boolean(
  apiKey &&
  apiKey !== 'MOCK_API_KEY' &&
  projectId &&
  projectId !== 'mock-app'
);

const firebaseConfig = {
  apiKey: apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: projectId || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

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
