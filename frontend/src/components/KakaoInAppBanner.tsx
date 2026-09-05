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
    const androidMatch = /Android/i.test(ua);

    setIsKakao(kakaoMatch);
    setIsIOS(iosMatch);

    // If on Android inside KakaoTalk, automatically launch Intent to escape Kakao webview directly into default browser / installed WebAPK
    if (kakaoMatch && androidMatch) {
      const currentUrl = window.location.href;
      const cleanUrl = currentUrl.replace(/^https?:\/\//i, '');
      const intentUrl = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;end`;
      // Trigger intent navigation
      window.location.href = intentUrl;
    }

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
      // Android Intent scheme to open directly in Chrome / system default browser / installed PWA
      const cleanUrl = currentUrl.replace(/^https?:\/\//i, '');
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
          <div className="kakao-banner-icon">🍀</div>
          <div className="kakao-banner-text">
            <p className="kakao-banner-title">
              {isIOS ? '바탕화면 Clover 앱 또는 Safari로 열기' : '바탕화면 앱 / 브라우저로 연결'}
            </p>
            <p className="kakao-banner-desc">
              {isIOS ? (
                <>
                  바탕화면에 <strong>Clover 앱</strong>이 있다면 홈 화면에서 바로 실행해 주세요!
                  <span className="kakao-banner-ios-hint">
                    (Safari로 열기: 우측 하단 <strong>[···]</strong> ➔ <strong>[Safari로 열기]</strong>)
                  </span>
                </>
              ) : (
                '카카오톡 외부 브라우저 또는 설치된 앱으로 자동 연결 중입니다.'
              )}
            </p>
          </div>
        </div>

        <div className="kakao-banner-actions">
          {isIOS ? (
            <button
              type="button"
              className="kakao-banner-open-btn"
              onClick={handleOpenExternal}
            >
              Safari로 열기
            </button>
          ) : (
            <button
              type="button"
              className="kakao-banner-open-btn"
              onClick={handleOpenExternal}
            >
              앱/브라우저로 열기
            </button>
          )}
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
