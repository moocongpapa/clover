import { useEffect, useState } from 'react';
import CloverLogo from './CloverLogo';
import './SplashScreen.css';

export default function SplashScreen() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !sessionStorage.getItem('clover_splash_shown');
  });
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    if (!visible) return;
    sessionStorage.setItem('clover_splash_shown', 'true');
    // Start fading out at 1.0s
    const fadeTimer = setTimeout(() => {
      setHiding(true);
    }, 1000);

    // Unmount completely at 1.3s
    const removeTimer = setTimeout(() => {
      setVisible(false);
    }, 1300);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className={`splash-screen${hiding ? ' is-hiding' : ''}`} aria-hidden="true">
      <div className="splash-bg-glow" />
      <div className="splash-content">
        <div className="splash-logo-wrap">
          <CloverLogo size={52} className="splash-logo-icon" />
        </div>
        <h1 className="splash-brand-text">Clover</h1>
        <p className="splash-subtitle">모임과 일정의 모든 것</p>
        <div className="splash-loader-bar">
          <div className="splash-loader-progress" />
        </div>
      </div>
    </div>
  );
}
