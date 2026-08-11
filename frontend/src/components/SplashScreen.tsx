import { useEffect, useState } from 'react';
import CloverLogo from './CloverLogo';
import './SplashScreen.css';

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    // Start fading out at 1.7s
    const fadeTimer = setTimeout(() => {
      setHiding(true);
    }, 1700);

    // Unmount completely at 2.1s
    const removeTimer = setTimeout(() => {
      setVisible(false);
    }, 2100);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

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
