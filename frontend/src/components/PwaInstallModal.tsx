import { usePwa } from '../context/PwaContext';
import CloverLogo from './CloverLogo';
import './PwaInstallModal.css';

export default function PwaInstallModal() {
  const {
    showInstallModal,
    closeInstallModal,
    isIOS,
    isAndroid,
    isKakao,
    canInstallAndroid,
    triggerInstall,
  } = usePwa();

  if (!showInstallModal) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="pwa-modal-overlay" onClick={closeInstallModal} aria-modal="true" role="dialog">
      <div className="pwa-modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="pwa-modal-close-btn"
          onClick={closeInstallModal}
          aria-label="닫기"
        >
          ✕
        </button>

        <div className="pwa-modal-header">
          <div className="pwa-modal-app-icon">
            <CloverLogo size={32} />
          </div>
          <div className="pwa-modal-title-wrap">
            <h2 className="pwa-modal-title">Clover 앱 설치 안내</h2>
            <p className="pwa-modal-subtitle">모바일 앱처럼 1초 만에 실행하세요 🍀</p>
          </div>
        </div>

        {/* OS Identifier Badge */}
        <div className="pwa-os-badge">
          {isIOS ? '🍎 아이폰 (iOS) 맞춤 가이드' : isAndroid ? '🤖 안드로이드 (Galaxy) 맞춤 가이드' : '📱 모바일 브라우저 연결'}
        </div>

        {/* KakaoTalk In-App Browser Notice */}
        {isKakao && (
          <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '12px', padding: '10px 12px', marginBottom: '14px', fontSize: '12.5px', color: '#854d0e', lineHeight: '1.4' }}>
            ⚠️ 카카오톡 내부 브라우저에서는 앱 설치가 제한됩니다.<br />
            아래 <b>'Safari/외부 브라우저로 열기'</b>를 선택해 주세요!
          </div>
        )}

        {/* Android Direct 1-Click Install or Manual Guide */}
        {isAndroid && canInstallAndroid ? (
          <div className="pwa-modal-actions" style={{ marginBottom: '14px' }}>
            <button type="button" className="pwa-btn-primary" onClick={triggerInstall}>
              📲 1초 만에 앱 자동 설치하기
            </button>
          </div>
        ) : isIOS ? (
          /* iOS Safari Illustrated Guide */
          <div className="pwa-steps-list">
            <div className="pwa-step-item">
              <div className="pwa-step-num">1</div>
              <p className="pwa-step-text">
                Safari 하단 툴바의 <span className="pwa-step-highlight">공유 버튼 (네모+화살표 📤)</span>을 누릅니다.
              </p>
            </div>
            <div className="pwa-step-item">
              <div className="pwa-step-num">2</div>
              <p className="pwa-step-text">
                목록을 아래로 내려 <span className="pwa-step-highlight">[홈 화면에 추가]</span> 메뉴를 선택합니다.
              </p>
            </div>
            <div className="pwa-step-item">
              <div className="pwa-step-num">3</div>
              <p className="pwa-step-text">
                우측 상단 <span className="pwa-step-highlight">[추가]</span>를 누르면 바탕화면에 Clover 앱이 바로 생겨납니다! 🎉
              </p>
            </div>
          </div>
        ) : (
          /* Android Manual Guide / Default Guide */
          <div className="pwa-steps-list">
            <div className="pwa-step-item">
              <div className="pwa-step-num">1</div>
              <p className="pwa-step-text">
                브라우저 우측 상단 메뉴 <span className="pwa-step-highlight">(⋮ 또는 ⋯)</span>를 선택합니다.
              </p>
            </div>
            <div className="pwa-step-item">
              <div className="pwa-step-num">2</div>
              <p className="pwa-step-text">
                <span className="pwa-step-highlight">[앱 설치]</span> 또는 <span className="pwa-step-highlight">[홈 화면에 추가]</span>를 클릭합니다.
              </p>
            </div>
            <div className="pwa-step-item">
              <div className="pwa-step-num">3</div>
              <p className="pwa-step-text">
                확인을 누르면 바탕화면에 앱 아이콘이 바로 생성됩니다! 🎉
              </p>
            </div>
          </div>
        )}

        <div className="pwa-modal-actions">
          {isKakao && (
            <button
              type="button"
              className="pwa-btn-primary"
              onClick={() => {
                window.location.href = `googlechrome://navigate?url=${encodeURIComponent(currentUrl)}`;
              }}
            >
              🌐 Safari / 외부 브라우저로 이동
            </button>
          )}
          <button type="button" className="pwa-btn-secondary" onClick={closeInstallModal}>
            알겠습니다, 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
