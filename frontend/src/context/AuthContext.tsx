import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  api,
  clearToken,
  getStoredUser,
  setStoredUser,
  setToken,
  type User,
} from '../api';
import { requestFcmToken } from '../firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (displayName: string) => Promise<void>;
  loginWithToken: (token: string, user: User) => void;
  updateUser: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = getStoredUser();
  const [user, setUser] = useState<User | null>(stored);
  // Do not block cached users from viewing UI immediately
  const [loading, setLoading] = useState(!stored && Boolean(localStorage.getItem('token')));

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .getMe()
      .then((me: User) => {
        setUser(me);
        setStoredUser(me);
      })
      .catch((err) => {
        // Only clear if strictly unauthorized (401), not network timeouts
        if (err?.message?.includes('401') || err?.message?.includes('인증')) {
          clearToken();
          setUser(null);
        }
      })
      .finally(() => setLoading(false));

    const handleUnauthorized = () => {
      setUser(null);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' && !e.newValue) {
        setUser(null);
      }
    };

    window.addEventListener('clover-auth-unauthorized', handleUnauthorized);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('clover-auth-unauthorized', handleUnauthorized);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const syncFcmToken = async () => {
    if (typeof window === 'undefined') return;
    // Skip push notification prompt in Kakao in-app browser or unsupported webviews
    const isKakao = /KAKAOTALK/i.test(navigator.userAgent);
    if (isKakao) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    
    try {
      if (Notification.permission === 'granted' || Notification.permission === 'default') {
        const token = await requestFcmToken();
        if (token) {
          await api.updateFcmToken(token);
        }
      }
    } catch (err) {
      console.debug('FCM sync skipped on this mobile environment:', err);
    }
  };

  useEffect(() => {
    if (user) {
      syncFcmToken();
    }
  }, [user]);

  const login = async (displayName: string) => {
    const res = await api.devLogin(displayName);
    setToken(res.accessToken);
    setStoredUser(res.user);
    setUser(res.user);
  };

  const loginWithToken = (token: string, u: User) => {
    setToken(token);
    setStoredUser(u);
    setUser(u);
  };

  const updateUser = (u: User) => {
    setStoredUser(u);
    setUser(u);
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, loginWithToken, updateUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
