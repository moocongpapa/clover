import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { requestFcmToken } from '../firebase';
import { api } from '../api';
import './Settings.css';

export default function Settings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser, logout } = useAuth();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Display & UI preferences
  const [nightMode, setNightMode] = useState<boolean>(
    localStorage.getItem('clover_night_notify') === 'true'
  );
  const [startTab, setStartTab] = useState<string>(
    localStorage.getItem('clover_start_tab') || '/'
  );
  const [hapticEnabled, setHapticEnabled] = useState<boolean>(
    localStorage.getItem('clover_haptic') !== 'false'
  );
  const [fontFamily, setFontFamily] = useState<string>(
    localStorage.getItem('clover_font_family') || 'Pretendard Variable, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif'
  );
  const [fontSize, setFontSize] = useState<string>(
    localStorage.getItem('clover_font_size') || '14'
  );

  // Modal states
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(
    Boolean((location.state as any)?.openFeedback)
  );
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState<boolean>(false);
  const [showLicenseModal, setShowLicenseModal] = useState<boolean>(false);

  const [feedbackText, setFeedbackText] = useState<string>('');
  const [deletingAccount, setDeletingAccount] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  const handleFontFamilyChange = (val: string) => {
    setFontFamily(val);
    localStorage.setItem('clover_font_family', val);
    document.documentElement.style.setProperty('--font-body', val);
    triggerToast('🔤 전체 글꼴 서체가 적용되었습니다.');
  };

  const handleFontSizeChange = (val: string) => {
    setFontSize(val);
    localStorage.setItem('clover_font_size', val);
    document.documentElement.style.setProperty('--app-font-size', `${val}px`);
    const sizeNum = parseInt(val, 10);
    if (!isNaN(sizeNum)) {
      const zoomVal = (sizeNum / 14).toFixed(3);
      document.documentElement.style.setProperty('--app-zoom', zoomVal);
    }
    triggerToast(`🔍 폰트 크기가 ${val}px로 설정되었습니다.`);
  };

  const handleRequestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('이 브라우저는 웹 푸시 알림을 지원하지 않습니다.');
      return;
    }

    if (Notification.permission === 'denied') {
      alert(
        '아이폰 알림 권한이 거부(차단)되어 있습니다.\n\n[해결 방법]\n1. 아이폰 설정 ➔ Safari ➔ 고급 ➔ 웹 사이트 데이터에서 clover 삭제 후 접속하시거나,\n2. 홈 화면의 Clover 앱을 삭제하신 후 다시 [홈 화면에 추가] 해주시면 권한 팝업이 다시 작동합니다!'
      );
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        const token = await requestFcmToken();
        if (token) {
          await api.updateFcmToken(token);
        }
        triggerToast('🎉 알림 권한이 허용되었습니다! 이제 휴대폰으로 알림이 옵니다.');
      } else {
        alert('알림 권한 동의가 거부되었습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('알림 권한 요청 중 오류가 발생했습니다.');
    }
  };

  const handlePushToggle = async () => {
    if (!user) return;
    const nextVal = user.pushNotifyEnabled !== false ? false : true;
    try {
      if (nextVal && typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            const token = await requestFcmToken();
            if (token) {
              await api.updateFcmToken(token);
            }
          }
        }
      }
      const updated = await api.updateProfile({ pushNotifyEnabled: nextVal });
      updateUser(updated);
      triggerToast(nextVal ? '🔔 앱 푸시 알림이 켜졌습니다.' : '앱 푸시 알림이 꺼졌습니다.');
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
      triggerToast(nextVal ? '💬 카카오톡 알림톡 수신이 켜졌습니다.' : '카카오톡 알림톡 수신이 꺼졌습니다.');
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

  const handleStartTabChange = (val: string) => {
    setStartTab(val);
    localStorage.setItem('clover_start_tab', val);
    triggerToast('🚀 앱 시작 기본 화면이 변경되었습니다.');
  };

  const handleHapticToggle = () => {
    const nextVal = !hapticEnabled;
    setHapticEnabled(nextVal);
    localStorage.setItem('clover_haptic', String(nextVal));
    if (nextVal && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(40);
    }
    triggerToast(nextVal ? '📳 터치 햅틱 반응이 켜졌습니다.' : '터치 햅틱 반응이 꺼졌습니다.');
  };

  const handleClearCache = () => {
    let clearedCount = 0;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('clover_temp') || key.startsWith('clover_cache') || key.includes('cached_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => {
      localStorage.removeItem(k);
      clearedCount++;
    });
    sessionStorage.clear();
    triggerToast('🧹 임시 데이터 및 이미지 캐시가 깔끔하게 정리되었습니다.');
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    setDeleteError(null);
    try {
      await api.deleteAccount();
      triggerToast('탈퇴 처리가 완료되었습니다. 이용해 주셔서 감사합니다.');
      setTimeout(() => {
        logout();
        window.location.href = '/';
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setDeleteError(err.message || '회원 탈퇴 처리에 실패했습니다.');
      setDeletingAccount(false);
    }
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) {
      alert('의견이나 문의 내용을 입력해 주세요.');
      return;
    }
    try {
      await api.sendFeedback(feedbackText.trim());
      triggerToast('✉️ 소중한 의견이 개발팀에 안전하게 접수되었습니다!');
      setFeedbackText('');
      setShowFeedbackModal(false);
    } catch (err) {
      console.error(err);
      alert('피드백 제출 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="page-title">⚙️ 환경 설정</h1>
        <p className="page-subtitle">서비스 알림, 화면 환경 및 계정 정보를 관리합니다.</p>
      </div>

      <div className="settings-container">
        {/* 1. 알림 설정 */}
        <section className="settings-section form-card">
          <h2 className="settings-section__title">
            <span className="section-title-icon">🔔</span> 알림 설정
          </h2>

          <div className="settings-row">
            <div className="settings-row__info">
              <span className="settings-row__label">앱 푸시 알림</span>
              <p className="settings-row__desc">모임 가입 승인, 새 일정 등록 및 참석 투표 알림을 수신합니다.</p>
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

          {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
            <div style={{ marginTop: '8px', marginBottom: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '13px', color: '#166534', fontWeight: 700, display: 'block' }}>
                  📱 아이폰/모바일 푸시 권한 필요
                </span>
                <span style={{ fontSize: '12px', color: '#15803d', marginTop: '2px', display: 'block' }}>
                  알림을 받으려면 브라우저 알림 권한을 허용해 주세요.
                </span>
              </div>
              <button
                type="button"
                onClick={handleRequestPermission}
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)'
                }}
              >
                🔔 권한 허용
              </button>
            </div>
          )}

          <div className="settings-row">
            <div className="settings-row__info">
              <span className="settings-row__label">카카오톡 알림톡</span>
              <p className="settings-row__desc">일정 하루 전 리마인더 및 주요 공지를 카카오톡으로 받습니다.</p>
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
              <p className="settings-row__desc">야간 시간에는 푸시 및 알림톡을 무음으로 수신합니다.</p>
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

        {/* 2. 화면 및 사용 환경 */}
        <section className="settings-section form-card">
          <h2 className="settings-section__title">
            <span className="section-title-icon">🎨</span> 화면 및 사용 환경
          </h2>

          <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
            <div className="settings-row__info">
              <span className="settings-row__label">글꼴 서체 (Font Family)</span>
              <p className="settings-row__desc">앱 전체에 적용할 폰트 스타일을 선택하세요.</p>
            </div>
            <select
              value={fontFamily}
              onChange={(e) => handleFontFamilyChange(e.target.value)}
              className="profile-field-input"
              style={{ width: '100%', height: '44px', borderRadius: '12px', fontSize: '14px', fontWeight: '700', padding: '0 12px' }}
            >
              <option value="Pretendard Variable, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif">
                ✨ 프리텐다드 (기본 추천)
              </option>
              <option value="'Nanum Gothic', sans-serif">
                📖 나눔고딕 (부드러운 고딕)
              </option>
              <option value="'NanumSquare', sans-serif">
                📐 나눔스퀘어 (모던 스퀘어)
              </option>
              <option value="'Nanum Myeongjo', serif">
                📜 나눔명조 (클래식 명조)
              </option>
              <option value="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
                📱 시스템 기본 서체
              </option>
            </select>
          </div>

          <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px', marginTop: '10px' }}>
            <div className="settings-row__info">
              <span className="settings-row__label">글자 크기 (Font Size)</span>
              <p className="settings-row__desc">앱 화면의 텍스트 크기를 조절합니다.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', width: '100%' }}>
              {[
                { label: '작게', val: '13' },
                { label: '보통', val: '14' },
                { label: '크게', val: '16' },
                { label: '아주 크게', val: '18' },
              ].map((item) => {
                const isActive = fontSize === item.val;
                return (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => handleFontSizeChange(item.val)}
                    style={{
                      padding: '10px 4px',
                      borderRadius: '12px',
                      border: `1.5px solid ${isActive ? '#10b981' : 'var(--border, #e2e8f0)'}`,
                      background: isActive ? 'rgba(16, 185, 129, 0.08)' : 'var(--surface, #ffffff)',
                      color: isActive ? '#10b981' : 'var(--ink-dark, #0f172a)',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px', marginTop: '10px' }}>
            <div className="settings-row__info">
              <span className="settings-row__label">앱 시작 기본 화면</span>
              <p className="settings-row__desc">앱 접속 시 처음으로 보여줄 메뉴를 설정합니다.</p>
            </div>
            <select
              value={startTab}
              onChange={(e) => handleStartTabChange(e.target.value)}
              className="profile-field-input"
              style={{ width: '100%', height: '44px', borderRadius: '12px', fontSize: '14px', fontWeight: '700', padding: '0 12px' }}
            >
              <option value="/">🏠 홈 (전체 대시보드 & 일정 요약)</option>
              <option value="/my-groups">👥 내 모임 목록</option>
              <option value="/calendar">📅 캘린더 일정</option>
              <option value="/groups">🔍 모임 찾기</option>
            </select>
          </div>

          <div className="settings-row" style={{ marginTop: '10px' }}>
            <div className="settings-row__info">
              <span className="settings-row__label">터치 햅틱 반응 (진동 피드백)</span>
              <p className="settings-row__desc">투표 및 주요 버튼 클릭 시 손끝으로 가벼운 터치 진동을 전달합니다.</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={hapticEnabled}
                onChange={handleHapticToggle}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </section>

        {/* 3. 앱 및 데이터 관리 */}
        <section className="settings-section form-card">
          <h2 className="settings-section__title">
            <span className="section-title-icon">📱</span> 앱 및 데이터 관리
          </h2>

          <div className="settings-action-row" onClick={() => setShowInstallModal(true)}>
            <div className="settings-row__info">
              <span className="settings-row__label">홈 화면에 Clover 앱 추가하기</span>
              <p className="settings-row__desc">스마트폰 홈 화면에 바로가기를 추가하여 1초 만에 앱을 실행하세요.</p>
            </div>
            <span className="action-row-arrow">📲</span>
          </div>

          <div className="settings-action-row" onClick={handleClearCache}>
            <div className="settings-row__info">
              <span className="settings-row__label">임시 데이터 및 캐시 정리</span>
              <p className="settings-row__desc">불필요한 임시 저장 공간을 비우고 최신 데이터로 동기화합니다.</p>
            </div>
            <span className="action-row-btn">캐시 정리</span>
          </div>
        </section>

        {/* 4. 계정 및 보안 */}
        <section className="settings-section form-card">
          <h2 className="settings-section__title">
            <span className="section-title-icon">👤</span> 계정 및 보안
          </h2>

          <div className="settings-row">
            <div className="settings-row__info">
              <span className="settings-row__label">카카오 로그인 연동 계정</span>
              <p className="settings-row__desc">현재 로그인된 소셜 인증 계정입니다.</p>
            </div>
            <span className="kakao-status-badge">
              💬 {user?.displayName || '카카오 사용자'}
            </span>
          </div>

          <div className="settings-action-row" onClick={() => navigate('/profile/edit')}>
            <div className="settings-row__info">
              <span className="settings-row__label">내 프로필 정보 수정</span>
              <p className="settings-row__desc">이름, 생년월일, 성별, 활동지역 및 전화번호를 변경합니다.</p>
            </div>
            <span className="action-row-arrow">✏️</span>
          </div>

          <div
            className="settings-action-row"
            onClick={() => setShowLogoutModal(true)}
            style={{ cursor: 'pointer' }}
          >
            <div className="settings-row__info">
              <span className="settings-row__label" style={{ color: '#475569' }}>로그아웃</span>
              <p className="settings-row__desc">현재 기기에서 안전하게 연결을 해제합니다.</p>
            </div>
            <span className="action-row-arrow" style={{ color: '#94a3b8' }}>›</span>
          </div>

          <div
            className="settings-action-row"
            onClick={() => {
              setDeleteError(null);
              setShowDeleteAccountModal(true);
            }}
            style={{ background: '#fef2f2', borderColor: '#fee2e2', cursor: 'pointer' }}
          >
            <div className="settings-row__info">
              <span className="settings-row__label" style={{ color: '#ef4444' }}>회원 탈퇴</span>
              <p className="settings-row__desc" style={{ color: '#991b1b' }}>계정 및 등록된 모든 개인 데이터를 영구 삭제합니다.</p>
            </div>
            <span className="action-row-arrow" style={{ color: '#ef4444' }}>🚪</span>
          </div>
        </section>

        {/* 5. 서비스 정보 및 고객 지원 */}
        <section className="settings-section form-card">
          <h2 className="settings-section__title">
            <span className="section-title-icon">ℹ️</span> 서비스 정보 및 지원
          </h2>

          <div className="settings-row">
            <div className="settings-row__info">
              <span className="settings-row__label">서비스 버전</span>
              <p className="settings-row__desc">Clover Web App (PWA)</p>
            </div>
            <span className="version-badge">v1.3.0 (최신버전)</span>
          </div>

          <div className="settings-action-row" onClick={() => navigate('/announcements')}>
            <div className="settings-row__info">
              <span className="settings-row__label">📢 서비스 공지사항</span>
              <p className="settings-row__desc">클로버의 새로운 기능과 업데이트 소식을 확인합니다.</p>
            </div>
            <span className="action-row-arrow">›</span>
          </div>

          <div className="settings-action-row" onClick={() => setShowFeedbackModal(true)}>
            <div className="settings-row__info">
              <span className="settings-row__label">✉️ 개발팀에 의견 및 문의 보내기</span>
              <p className="settings-row__desc">개선 사항이나 오류 제보를 남겨주시면 개발팀이 실시간으로 확인합니다.</p>
            </div>
            <span className="action-row-arrow">›</span>
          </div>

          <div className="settings-action-row" onClick={() => navigate('/terms')}>
            <div className="settings-row__info">
              <span className="settings-row__label">서비스 이용약관</span>
              <p className="settings-row__desc">모임 관리 및 회비 정산 보조 이용 규정을 확인합니다.</p>
            </div>
            <span className="action-row-arrow">›</span>
          </div>

          <div className="settings-action-row" onClick={() => navigate('/privacy')}>
            <div className="settings-row__info">
              <span className="settings-row__label">개인정보 처리방침</span>
              <p className="settings-row__desc">개인정보 수집 항목 및 권리 보호 정책을 확인합니다.</p>
            </div>
            <span className="action-row-arrow">›</span>
          </div>

          <div className="settings-action-row" onClick={() => setShowLicenseModal(true)}>
            <div className="settings-row__info">
              <span className="settings-row__label">오픈소스 라이선스</span>
              <p className="settings-row__desc">Clover 서비스에 사용된 오픈소스 소프트웨어 라이선스 목록</p>
            </div>
            <span className="action-row-arrow">›</span>
          </div>
        </section>
      </div>

      {/* Toast popup */}
      {toastMessage && (
        <div className="settings-toast-popup">
          {toastMessage}
        </div>
      )}

      {/* Send Feedback Modal */}
      {showFeedbackModal && (
        <div className="settings-modal-backdrop" onClick={() => setShowFeedbackModal(false)}>
          <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">✉️ 개발팀에 의견 보내기</h3>
            <p className="modal-desc">Clover 서비스 개선을 위한 소중한 의견이나 문의를 남겨주세요.</p>
            <textarea
              className="feedback-textarea"
              rows={5}
              placeholder="예: 이런 기능이 추가되었으면 좋겠어요! 또는 발견하신 불편한 점을 자세히 적어주세요."
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
                제출하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Install App Guide Modal */}
      {showInstallModal && (
        <div className="settings-modal-backdrop" onClick={() => setShowInstallModal(false)}>
          <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">📱 홈 화면에 앱 추가 방법</h3>
            <div style={{ fontSize: '14px', color: 'var(--ink-dark, #191f28)', lineHeight: 1.6, padding: '6px 0' }}>
              <p style={{ margin: '0 0 10px 0' }}>
                <strong>1.</strong> 모바일 브라우저(Safari / Chrome) 하단 또는 상단의 <strong>공유 아이콘 또는 메뉴(⋮)</strong>를 누릅니다.
              </p>
              <p style={{ margin: '0 0 10px 0' }}>
                <strong>2.</strong> <strong>[홈 화면에 추가]</strong> 또는 <strong>[앱 설치]</strong>를 선택하시면 스마트폰 홈 화면에서 모바일 앱처럼 1초 만에 실행할 수 있습니다! 🍀
              </p>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-modal-primary"
                onClick={() => setShowInstallModal(false)}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="settings-modal-backdrop" onClick={() => setShowLogoutModal(false)}>
          <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">로그아웃</h3>
            <p className="modal-desc">정말 로그아웃 하시겠습니까?</p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-modal-secondary"
                onClick={() => setShowLogoutModal(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="btn-modal-danger"
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                onClick={handleLogout}
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteAccountModal && (
        <div className="settings-modal-backdrop" onClick={() => !deletingAccount && setShowDeleteAccountModal(false)}>
          <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title" style={{ color: '#ef4444' }}>🚪 회원 탈퇴 안내</h3>
            <div style={{ fontSize: '13.5px', color: 'var(--ink-dark, #191f28)', lineHeight: 1.6, padding: '6px 0' }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: 700, color: '#dc2626' }}>
                탈퇴 시 계정 및 활동 정보가 영구적으로 삭제되며 복구할 수 없습니다.
              </p>
              <ul style={{ margin: '0 0 10px 0', paddingLeft: '20px', color: 'var(--ink-muted)' }}>
                <li>가입된 모든 모임에서 탈퇴 처리됩니다.</li>
                <li>작성하신 일정 투표 내역 및 게시물이 영구 파기됩니다.</li>
                <li>모임의 회장인 경우, 다른 운영진에게 회장 권한을 먼저 위임해 주셔야 탈퇴가 가능합니다.</li>
              </ul>
              {deleteError && (
                <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 12px', borderRadius: '10px', fontSize: '12.5px', marginBottom: '10px', lineHeight: 1.45 }}>
                  ⚠️ {deleteError}
                </div>
              )}
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>
                정말로 Clover 서비스를 탈퇴하시겠습니까?
              </p>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-modal-secondary"
                disabled={deletingAccount}
                onClick={() => setShowDeleteAccountModal(false)}
              >
                취소
              </button>
              <button
                type="button"
                style={{
                  padding: '12px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
                disabled={deletingAccount}
                onClick={handleDeleteAccount}
              >
                {deletingAccount ? '탈퇴 처리 중…' : '네, 탈퇴합니다'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Open Source License Modal */}
      {showLicenseModal && (
        <div className="settings-modal-backdrop" onClick={() => setShowLicenseModal(false)}>
          <div className="settings-modal-card modal-terms" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 className="modal-title" style={{ margin: 0 }}>📜 오픈소스 라이선스</h3>
              <button
                type="button"
                onClick={() => setShowLicenseModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--ink-muted)' }}
              >
                ✕
              </button>
            </div>
            <p className="modal-desc">Clover 서비스는 다음 오픈소스 소프트웨어를 활용하여 제작되었습니다.</p>
            <div style={{ fontSize: '12.5px', color: 'var(--ink-dark)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <strong>React & React DOM</strong> (MIT License)<br />
                <span style={{ color: '#64748b' }}>Copyright (c) Meta Platforms, Inc. and affiliates.</span>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <strong>NestJS Framework</strong> (MIT License)<br />
                <span style={{ color: '#64748b' }}>Copyright (c) 2017-2024 Kamil Mysliwiec</span>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <strong>Prisma ORM</strong> (Apache 2.0 License)<br />
                <span style={{ color: '#64748b' }}>Copyright (c) Prisma Data, Inc.</span>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <strong>Vite</strong> (MIT License)<br />
                <span style={{ color: '#64748b' }}>Copyright (c) 2019-present Evan You & Vite Contributors</span>
              </div>
            </div>
            <div className="modal-actions" style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="btn-modal-primary"
                onClick={() => setShowLicenseModal(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
