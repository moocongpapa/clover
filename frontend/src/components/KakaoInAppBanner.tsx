import { useState, useEffect } from 'react';
import './KakaoInAppBanner.css';

export default function KakaoInAppBanner() {
  const [isKakao, setIsKakao] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent || '';
    const kakaoMatch = /KAKAOTALK/i.test(ua);
    const iosMatch = /iPhone|iPad|iPod/i.test(ua);

    setIsKakao(kakaoMatch);
    setIsIOS(iosMatch);

    // If already dismissed in this session, don't show
    if (sessionStorage.getItem('clover_kakao_banner_dismissed')) {
      setDismissed(true);
    }
  }, []);

  if (!isKakao || dismissed) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleOpenExternal = () => {
    if (isIOS) {
      // iOS KakaoTalk custom scheme to open in external Safari
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(currentUrl)}`;
    } else {
      // Android Intent scheme to open directly in Chrome / system default browser
      const cleanUrl = currentUrl.replace(/https?:\/\//, '');
      window.location.href = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;end`;
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('clover_kakao_banner_dismissed', 'true');
  };

  return (
    <div className="kakao-inapp-banner-overlay">
      <div className="kakao-inapp-banner">
        <div className="kakao-banner-content">
          <div className="kakao-banner-icon">🌐</div>
          <div className="kakao-banner-text">
            <p className="kakao-banner-title">
              {isIOS ? 'Safari 브라우저에서 열기' : '기본 브라우저에서 열기'}
            </p>
            <p className="kakao-banner-desc">
              카카오톡 인앱 브라우저에서는 로그인 및 투표가 제한될 수 있어요.
              {isIOS && ' (우측 하단 [···] ➔ [Safari로 열기])'}
            </p>
          </div>
        </div>

        <div className="kakao-banner-actions">
          <button
            type="button"
            className="kakao-banner-open-btn"
            onClick={handleOpenExternal}
          >
            {isIOS ? 'Safari로 열기' : '브라우저로 열기'}
          </button>
          <button
            type="button"
            className="kakao-banner-close-btn"
            onClick={handleDismiss}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
