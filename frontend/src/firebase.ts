import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    'AIzaSyAijEwQvY8vgIKxLP9SWLkPZ1XEVzI4Dlk',
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
export const storage = isFirebaseConfigured && app ? getStorage(app) : null;

/**
 * Upload an image file permanently to Firebase Cloud Storage.
 * Generates an immutable, global high-speed CDN URL that never disappears when servers reboot.
 */
export async function uploadToFirebaseStorage(
  file: File,
  folder: 'groups' | 'profiles' | 'gallery' = 'groups',
): Promise<string | null> {
  if (!storage) return null;
  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const storagePath = `${folder}/${uniqueId}.${ext}`;
    const storageRef = ref(storage, storagePath);

    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type || 'image/jpeg',
    });

    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (err) {
    console.warn('Firebase Storage upload failed, falling back to server disk upload:', err);
    return null;
  }
}

export async function requestFcmToken(): Promise<string | null> {
  if (!isFirebaseConfigured || !messaging) return null;
  const vapidKey =
    import.meta.env.VITE_FIREBASE_VAPID_KEY ||
    'BGB4iYanv8gfi03w1owjcQfVLIyMBTuxm1m_6OPjSBz9r_CHP1oUB1Oi2TM3a2KgPUda2ymdlZgidRfM5l40CRg';

  if (!vapidKey) {
    return null;
  }

  try {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return null;
      }
    }

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
