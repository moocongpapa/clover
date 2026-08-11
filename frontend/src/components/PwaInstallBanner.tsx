import { useState } from 'react';
import { usePwa } from '../context/PwaContext';
import CloverLogo from './CloverLogo';
import './PwaInstallBanner.css';

export default function PwaInstallBanner() {
  const { isStandalone, triggerInstall } = usePwa();
  const [dismissed, setDismissed] = useState(false);

  // Do not display if user is already running the app in Standalone PWA mode or dismissed
  if (isStandalone || dismissed) return null;

  return (
    <div className="pwa-floating-banner">
      <div className="pwa-banner-left">
        <div className="pwa-banner-icon">
          <CloverLogo size={22} />
        </div>
        <div className="pwa-banner-text-wrap">
          <p className="pwa-banner-title">Clover 모바일 앱 설치</p>
          <p className="pwa-banner-desc">바탕화면 1초 실행 & 푸시 알림 수신</p>
        </div>
      </div>

      <div className="pwa-banner-actions">
        <button type="button" className="pwa-banner-btn" onClick={triggerInstall}>
          앱 설치
        </button>
        <button
          type="button"
          className="pwa-banner-close"
          onClick={() => setDismissed(true)}
          aria-label="닫기"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
