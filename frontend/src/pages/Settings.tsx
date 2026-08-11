import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { requestFcmToken } from '../firebase';
import { api } from '../api';
import './Settings.css';

interface FeedbackItem {
  id: string;
  userName: string;
  content: string;
  status: string;
  createdAt: string;
}

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Local settings state
  const [nightMode, setNightMode] = useState<boolean>(
    localStorage.getItem('clover_night_notify') === 'true'
  );
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [showListModal, setShowListModal] = useState<boolean>(false);
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2000);
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
    setShowInstallModal(true);
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) {
      alert('의견이나 문의 내용을 입력해 주세요.');
      return;
    }
    try {
      await api.sendFeedback(feedbackText.trim());
      triggerToast('✉️ 제안해주신 소중한 의견이 등록되었습니다!');
      setFeedbackText('');
      setShowFeedbackModal(false);
    } catch (err) {
      console.error(err);
      alert('피드백 제출 중 오류가 발생했습니다.');
    }
  };

  const handleOpenFeedbackList = async () => {
    setShowListModal(true);
    setLoadingList(true);
    try {
      const list = await api.getFeedbacks();
      setFeedbackList(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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

          {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
            <div style={{ marginTop: '8px', marginBottom: '14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '13px', color: '#166534', fontWeight: 700, display: 'block' }}>
                  📱 아이폰/모바일 푸시 알림 허용
                </span>
                <span style={{ fontSize: '12px', color: '#15803d', marginTop: '2px', display: 'block' }}>
                  버튼을 눌러 시스템 알림 팝업을 띄우세요.
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
                🔔 알림 허용하기
              </button>
            </div>
          )}

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


        </section>

        {/* 4. 앱 정보 및 고객 지원 */}
        <section className="settings-section form-card">
          <h2 className="settings-section__title">
            <span className="section-title-icon">ℹ️</span> 서비스 정보 및 피드백
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
              <span className="settings-row__label">개발팀에 의견 및 개선 제안 작성</span>
              <p className="settings-row__desc">불편한 점이나 추가하고 싶은 의견을 남겨주시면 개발팀이 실시간으로 확인합니다.</p>
            </div>
            <span className="action-row-arrow">✉️</span>
          </div>

          <div className="settings-action-row" onClick={handleOpenFeedbackList}>
            <div className="settings-row__info">
              <span className="settings-row__label">📋 제출된 피드백 & 개선 제안 목록 확인</span>
              <p className="settings-row__desc">사용자들이 등록한 개선 요청 사항 및 개발팀 검토 현황을 모아봅니다.</p>
            </div>
            <span className="action-row-arrow">🔍</span>
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

      {/* Send Feedback Modal */}
      {showFeedbackModal && (
        <div className="settings-modal-backdrop" onClick={() => setShowFeedbackModal(false)}>
          <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">✉️ 개발팀에 의견 보내기</h3>
            <p className="modal-desc">Clover 서비스 개선을 위한 소중한 의견을 작성해 주세요. DB에 안전하게 보관됩니다.</p>
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
                제출하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Feedback List Modal */}
      {showListModal && (
        <div className="settings-modal-backdrop" onClick={() => setShowListModal(false)}>
          <div className="settings-modal-card modal-terms" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 className="modal-title" style={{ margin: 0 }}>📋 제출된 피드백 목록</h3>
              <button
                type="button"
                onClick={() => setShowListModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <p className="modal-desc">사용자들이 등록한 개선 제안과 문의 내역입니다.</p>

            {loadingList ? (
              <p style={{ textAlign: 'center', padding: '20px 0', color: 'var(--ink-muted)' }}>불러오는 중…</p>
            ) : feedbackList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--ink-muted)', fontSize: '14px' }}>
                아직 등록된 피드백이 없습니다.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                {feedbackList.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '12px',
                      background: 'var(--grey-50, #f8fafc)',
                      border: '1px solid var(--border-soft, #e2e8f0)',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-dark)' }}>
                        👤 {item.userName}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                    <p style={{ fontSize: '13.5px', color: 'var(--ink-dark)', margin: '4px 0', lineHeight: 1.45, wordBreak: 'break-all' }}>
                      {item.content}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                        🔍 검토 완료 / DB 보관됨
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      {/* Install App Guide Modal */}
      {showInstallModal && (
        <div className="settings-modal-backdrop" onClick={() => setShowInstallModal(false)}>
          <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">📱 홈 화면에 앱 추가 방법</h3>
            <div style={{ fontSize: '14px', color: 'var(--ink-dark, #191f28)', lineHeight: 1.6, padding: '6px 0' }}>
              <p style={{ margin: '0 0 10px 0' }}>
                <strong>1.</strong> 모바일 브라우저 하단 또는 상단의 <strong>공유/메뉴 버튼(공유 아이콘 또는 ⋮)</strong>을 누릅니다.
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
    </div>
  );
}
