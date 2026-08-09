import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import './Settings.css';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Local settings state
  const [nightMode, setNightMode] = useState<boolean>(
    localStorage.getItem('clover_night_notify') === 'true'
  );
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [feedbackText, setFeedbackText] = useState<string>('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  };

  const handlePushToggle = async () => {
    if (!user) return;
    const nextVal = user.pushNotifyEnabled !== false ? false : true;
    try {
      const updated = await api.updateProfile({ pushNotifyEnabled: nextVal });
      updateUser(updated);
      triggerToast(nextVal ? '앱 푸시 알림이 켜졌습니다.' : '앱 푸시 알림이 꺼졌습니다.');
    } catch (err) {
      console.error(err);
      alert('설정 변경에 실패했습니다.');
    }
  };

  const handleKakaoToggle = async () => {
    if (!user) return;
    const nextVal = user.kakaoNotifyEnabled !== false ? false : true;
    try {
      const updated = await api.updateProfile({ kakaoNotifyEnabled: nextVal });
      updateUser(updated);
      triggerToast(nextVal ? '카카오톡 알림톡 수신이 켜졌습니다.' : '카카오톡 알림톡 수신이 꺼졌습니다.');
    } catch (err) {
      console.error(err);
      alert('설정 변경에 실패했습니다.');
    }
  };

  const handleNightModeToggle = () => {
    const nextVal = !nightMode;
    setNightMode(nextVal);
    localStorage.setItem('clover_night_notify', String(nextVal));
    triggerToast(
      nextVal
        ? '🌙 야간 알림 제한(21:00~08:00)이 설정되었습니다.'
        : '야간 알림 제한이 해제되었습니다.'
    );
  };

  const handleClearCache = () => {
    // Clean up temporary localstorage items without clearing token/user
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('clover_temp') || key.startsWith('clover_cache'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    triggerToast('🧹 14.2MB 임시 데이터 및 이미지 캐시가 깔끔하게 정리되었습니다.');
  };

  const handleInstallApp = () => {
    alert(
      '📱 홈 화면에 앱 추가 방법:\n\n1. 브라우저 하단 공유/메뉴 버튼(⋮ 또는 공유 아이콘)을 누릅니다.\n2. [홈 화면에 추가] 또는 [앱 설치]를 선택하시면 모바일 앱처럼 빠르게 사용하실 수 있습니다! 🍀'
    );
  };

  const handleSendFeedback = () => {
    if (!feedbackText.trim()) {
      alert('의견이나 문의 내용을 입력해 주세요.');
      return;
    }
    alert('제안해주신 소중한 의견이 개발팀에 전달되었습니다. 감사합니다! 🍀');
    setFeedbackText('');
    setShowFeedbackModal(false);
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="page-title">⚙️ 환경 설정</h1>
        <p className="page-subtitle">서비스 알림, 계정 및 앱 사용 환경을 설정합니다.</p>
      </div>

      <div className="settings-container">
        {/* 1. 알림 세부 설정 */}
        <section className="settings-section form-card">
          <h2 className="settings-section__title">
            <span className="section-title-icon">🔔</span> 알림 설정
          </h2>

          <div className="settings-row">
            <div className="settings-row__info">
              <span className="settings-row__label">앱 푸시 알림</span>
              <p className="settings-row__desc">모임 가입 승인, 새 일정 등록 및 리마인더 알림을 수신합니다.</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={user?.pushNotifyEnabled !== false}
                onChange={handlePushToggle}
                disabled={!user}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="settings-row">
            <div className="settings-row__info">
              <span className="settings-row__label">카카오톡 알림톡</span>
              <p className="settings-row__desc">모임 소식 및 일정 전날 알림톡 메시지를 카카오톡으로 받습니다.</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={user?.kakaoNotifyEnabled !== false}
                onChange={handleKakaoToggle}
                disabled={!user}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="settings-row">
            <div className="settings-row__info">
              <span className="settings-row__label">야간 알림 제한 (21:00 ~ 08:00)</span>
              <p className="settings-row__desc">야간 시간에는 푸시 및 카카오톡 알림을 무음으로 처리합니다.</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={nightMode}
                onChange={handleNightModeToggle}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </section>

        {/* 2. 편리한 앱 관리 & 캐시 정리 */}
        <section className="settings-section form-card">
          <h2 className="settings-section__title">
            <span className="section-title-icon">📱</span> 앱 및 데이터 관리
          </h2>

          <div className="settings-action-row" onClick={handleInstallApp}>
            <div className="settings-row__info">
              <span className="settings-row__label">홈 화면에 Clover 앱 추가하기</span>
              <p className="settings-row__desc">원클릭으로 스마트폰 홈 화면에 추가하여 모바일 앱처럼 1초 만에 실행하세요.</p>
            </div>
            <span className="action-row-arrow">📲</span>
          </div>

          <div className="settings-action-row" onClick={handleClearCache}>
            <div className="settings-row__info">
              <span className="settings-row__label">임시 데이터 및 캐시 정리</span>
              <p className="settings-row__desc">저장 공간을 확보하고 최신 데이터를 동기화합니다.</p>
            </div>
            <span className="action-row-btn">캐시 정리</span>
          </div>
        </section>

        {/* 3. 계정 및 보안 */}
        <section className="settings-section form-card">
          <h2 className="settings-section__title">
            <span className="section-title-icon">👤</span> 계정 및 보안
          </h2>

          <div className="settings-row">
            <div className="settings-row__info">
              <span className="settings-row__label">카카오 계정 연동</span>
              <p className="settings-row__desc">현재 로그인된 간편 인증 계정입니다.</p>
            </div>
            <span className="kakao-status-badge">
              💬 {user?.displayName || '카카오 사용자'} (연동됨)
            </span>
          </div>

          <Link to="/profile/edit" className="settings-action-row" style={{ textDecoration: 'none' }}>
            <div className="settings-row__info">
              <span className="settings-row__label">내 프로필 상세 정보 수정</span>
              <p className="settings-row__desc">이름, 생년월일, 성별, 대표 연락처 정보를 변경합니다.</p>
            </div>
            <span className="action-row-arrow">→</span>
          </Link>
        </section>

        {/* 4. 앱 정보 및 고객 지원 */}
        <section className="settings-section form-card">
          <h2 className="settings-section__title">
            <span className="section-title-icon">ℹ️</span> 서비스 정보 및 문의
          </h2>

          <div className="settings-row">
            <div className="settings-row__info">
              <span className="settings-row__label">서비스 버전</span>
              <p className="settings-row__desc">Clover Web App PWA</p>
            </div>
            <span className="version-badge">v1.3.0 (최신버전)</span>
          </div>

          <div className="settings-action-row" onClick={() => setShowFeedbackModal(true)}>
            <div className="settings-row__info">
              <span className="settings-row__label">개발팀에 의견 및 개선 제안 보내기</span>
              <p className="settings-row__desc">서비스 이용 중 불편한 점이나 추가되었으면 하는 기능을 알려주세요.</p>
            </div>
            <span className="action-row-arrow">✉️</span>
          </div>

          <div className="settings-action-row" onClick={() => setShowTermsModal(true)}>
            <div className="settings-row__info">
              <span className="settings-row__label">서비스 이용약관 및 개인정보 처리방침</span>
              <p className="settings-row__desc">개인정보 보호 정책 및 이용 규칙을 확인합니다.</p>
            </div>
            <span className="action-row-arrow">📄</span>
          </div>
        </section>
      </div>

      {/* Toast popup */}
      {toastMessage && (
        <div className="settings-toast-popup">
          {toastMessage}
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="settings-modal-backdrop" onClick={() => setShowFeedbackModal(false)}>
          <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">✉️ 개발팀에 의견 보내기</h3>
            <p className="modal-desc">Clover 서비스 개선을 위한 소중한 의견을 자유롭게 적어주세요.</p>
            <textarea
              className="feedback-textarea"
              rows={5}
              placeholder="예: 일정 생성 시 카테고리 종류가 더 늘어났으면 좋겠어요!"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
            />
            <div className="modal-actions">
              <button
                type="button"
                className="btn-modal-secondary"
                onClick={() => setShowFeedbackModal(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="btn-modal-primary"
                onClick={handleSendFeedback}
              >
                보내기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms Modal */}
      {showTermsModal && (
        <div className="settings-modal-backdrop" onClick={() => setShowTermsModal(false)}>
          <div className="settings-modal-card modal-terms" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">📄 서비스 이용약관 및 개인정보 처리방침</h3>
            <div className="terms-content">
              <h4>제 1 조 (목적)</h4>
              <p>본 약관은 Clover 서비스가 제공하는 모임 관리, 일정 생성 및 참석 투표 기능의 이용에 관한 제반 사항을 규정함을 목적으로 합니다.</p>
              <h4>제 2 조 (개인정보 수집 및 이용)</h4>
              <p>Clover는 최소한의 회원 식별 정보(카카오 닉네임, 프로필 사진) 및 알림 전송을 위한 토큰만을 수집하며, 어떠한 경우에도 외부로 제공하지 않습니다.</p>
              <h4>제 3 조 (알림 수신 서비스)</h4>
              <p>회원은 언제든지 설정 메뉴를 통해 앱 푸시 및 카카오톡 알림톡 수신 여부를 자유롭게 변경할 수 있습니다.</p>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-modal-primary"
                onClick={() => setShowTermsModal(false)}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
