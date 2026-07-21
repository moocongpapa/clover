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
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [loading, setLoading] = useState(true);

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
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const syncFcmToken = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    
    try {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
      }
      
      if (Notification.permission === 'granted') {
        const token = await requestFcmToken();
        if (token) {
          await api.updateFcmToken(token);
          console.log('FCM token synchronized successfully.');
        }
      }
    } catch (err) {
      console.warn('FCM token synchronization failed: ', err);
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
