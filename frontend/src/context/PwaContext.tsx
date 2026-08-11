import React, { createContext, useContext, useEffect, useState } from 'react';

interface PwaContextType {
  isStandalone: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isKakao: boolean;
  canInstallAndroid: boolean;
  showInstallModal: boolean;
  openInstallModal: () => void;
  closeInstallModal: () => void;
  triggerInstall: () => Promise<void>;
}

const PwaContext = createContext<PwaContextType>({
  isStandalone: false,
  isIOS: false,
  isAndroid: false,
  isKakao: false,
  canInstallAndroid: false,
  showInstallModal: false,
  openInstallModal: () => {},
  closeInstallModal: () => {},
  triggerInstall: async () => {},
});

export const PwaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isKakao = /KAKAOTALK/i.test(ua);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkStandalone = () => {
      const isStandaloneMode =
        (navigator as any).standalone ||
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches;
      setIsStandalone(Boolean(isStandaloneMode));
    };

    checkStandalone();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const openInstallModal = () => setShowInstallModal(true);
  const closeInstallModal = () => setShowInstallModal(false);

  const triggerInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setDeferredPrompt(null);
          setShowInstallModal(false);
        }
      } catch (err) {
        console.error('Android PWA prompt failed:', err);
        setShowInstallModal(true);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  return (
    <PwaContext.Provider
      value={{
        isStandalone,
        isIOS,
        isAndroid,
        isKakao,
        canInstallAndroid: Boolean(deferredPrompt),
        showInstallModal,
        openInstallModal,
        closeInstallModal,
        triggerInstall,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
};

export const usePwa = () => useContext(PwaContext);
