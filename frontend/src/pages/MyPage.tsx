import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, safeImageUrl, formatPhoneNumber } from '../api';
import GroupAvatar from '../components/GroupAvatar';
import './MyPage.css';

interface DueSummaryItem {
  groupId: string;
  groupName: string;
  profileImageUrl?: string | null;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  monthlyFee?: number | null;
  dueDay?: number | null;
  isPaid: boolean;
  isExempt: boolean;
  year: number;
  month: number;
}

export default function MyPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [duesList, setDuesList] = useState<DueSummaryItem[]>([]);
  const [loadingDues, setLoadingDues] = useState<boolean>(true);
  const [selectedPayGroup, setSelectedPayGroup] = useState<DueSummaryItem | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api
      .getMyDuesSummary()
      .then((res) => setDuesList(res))
      .catch((err) => console.error('Failed to load dues summary:', err))
      .finally(() => setLoadingDues(false));
  }, [user]);

  if (!user) {
    return null;
  }

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 2000);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleCopyAccount = (item: DueSummaryItem) => {
    const text = `${item.bankName} ${item.bankAccountNumber} (예금주: ${item.bankAccountHolder})`;
    navigator.clipboard.writeText(text);
    triggerToast('📋 계좌 정보가 복사되었습니다!');
  };

  const handleTossSend = (item: DueSummaryItem) => {
    const tossUrl = `supertoss://send?bank=${encodeURIComponent(item.bankName)}&accountNo=${item.bankAccountNumber}`;
    window.location.href = tossUrl;
    setTimeout(() => {
      // Fallback if Toss app not installed
      handleCopyAccount(item);
    }, 1200);
  };

  const handleKakaoPaySend = (item: DueSummaryItem) => {
    const kakaoUrl = `kakaotalk://pay`;
    window.location.href = kakaoUrl;
    setTimeout(() => {
      handleCopyAccount(item);
    }, 1200);
  };

  const formattedPhone = user.phoneNumber ? formatPhoneNumber(user.phoneNumber) : null;
  const genderLabel = user.gender === 'MALE' ? '남성' : user.gender === 'FEMALE' ? '여성' : null;
  const birthLabel = user.birthYear ? `${user.birthYear}년생` : user.birthDate ? `${user.birthDate}년생` : null;

  const unpaidCount = duesList.filter((d) => !d.isPaid).length;
  const currentMonth = new Date().getMonth() + 1;

  return (
    <div className="my-page">
      {/* Top Profile Card */}
      <div className="my-profile-card">
        <div className="my-profile-card__avatar-wrapper">
          {safeImageUrl(user.profileImageUrl) ? (
            <img
              src={safeImageUrl(user.profileImageUrl)!}
              alt={user.displayName}
              className="my-profile-avatar"
            />
          ) : (
            <div className="my-profile-avatar-fallback">
              {user.displayName[0] || '유'}
            </div>
          )}
        </div>

        <div className="my-profile-card__info">
          <div className="my-profile-name-row">
            <h1 className="my-profile-name">{user.displayName} 님</h1>
            <span className="my-kakao-badge">💬 카카오 연동</span>
          </div>
          <div className="my-profile-meta-block">
            {formattedPhone && (
              <div className="my-profile-meta-item">
                <span className="my-profile-meta-phone">{formattedPhone}</span>
              </div>
            )}
            {(birthLabel || genderLabel) && (
              <div className="my-profile-meta-item">
                {birthLabel && <span>{birthLabel}</span>}
                {birthLabel && genderLabel && <span className="my-profile-meta-dot">·</span>}
                {genderLabel && <span>{genderLabel}</span>}
              </div>
            )}
            {!formattedPhone && !birthLabel && !genderLabel && (
              <div className="my-profile-meta-item my-profile-meta-item--empty">기본 정보 미등록</div>
            )}
          </div>
        </div>

        <Link to="/profile/edit" className="btn-edit-profile-chip">
          ✏️ 정보 수정
        </Link>
      </div>

      {/* Dues Status Dashboard Card */}
      <div className="my-dues-section">
        <div className="my-dues-header">
          <h2 className="my-dues-title">
            💳 {currentMonth}월 내 회비 납부 현황
          </h2>
          {duesList.length === 0 ? (
            <span className="paid-badge-highlight" style={{ background: 'var(--grey-100, #f1f5f9)', color: 'var(--ink-muted, #64748b)' }}>모임 없음</span>
          ) : unpaidCount > 0 ? (
            <span className="unpaid-badge-highlight">미납 {unpaidCount}건</span>
          ) : (
            <span className="paid-badge-highlight">완납 ✨</span>
          )}
        </div>

        {loadingDues ? (
          <p className="dues-loading-text">회비 내역을 확인하는 중…</p>
        ) : duesList.length === 0 ? (
          <p className="dues-empty-text">가입된 모임이 없습니다.</p>
        ) : (
          <div>
            {unpaidCount === 0 && (
              <div style={{
                background: '#e8f8f0',
                border: '1px solid #10b981',
                borderRadius: '14px',
                padding: '12px 16px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#065f46',
                fontSize: '13px',
                fontWeight: '700'
              }}>
                <span>🎉</span>
                <span>모든 모임의 이번 달 회비를 완납하셨습니다!</span>
              </div>
            )}
            <div className="dues-list">
              {duesList.map((item) => (
                <div key={item.groupId} className={`dues-item-card ${item.isPaid ? 'is-paid' : 'is-unpaid'}`}>
                  <div className="dues-item-left">
                    <GroupAvatar src={item.profileImageUrl} name={item.groupName} size={36} radius={10} />
                    <div className="dues-item-info">
                      <span className="dues-group-name">{item.groupName}</span>
                      <span className="dues-date-label">
                        {item.month}월 정기 회비
                        {item.monthlyFee ? ` (${item.monthlyFee.toLocaleString()}원` : ''}
                        {item.dueDay ? `${item.monthlyFee ? ' · ' : ' ('}${item.dueDay === 31 ? '매월 말일' : `매월 ${item.dueDay}일`} 마감` : ''}
                        {item.monthlyFee || item.dueDay ? ')' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="dues-item-right">
                    {item.isPaid ? (
                      <span className="dues-status-tag dues-status-tag--paid">
                        {item.isExempt ? '임원 면제' : '납부 완료 🟢'}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn-pay-direct"
                        onClick={() => setSelectedPayGroup(item)}
                      >
                        💸 1초 간편 송금
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Menu Groups */}
      <div className="my-menu-container">
        <div className="my-menu-group">
          <h2 className="my-menu-group__title">서비스 & 설정</h2>
          <Link to="/settings" className="my-menu-item">
            <div className="my-menu-item__left">
              <span className="my-menu-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </span>
              <span className="my-menu-label">환경설정</span>
            </div>
            <span className="my-menu-arrow">›</span>
          </Link>
        </div>

        <div className="my-menu-group">
          <h2 className="my-menu-group__title">계정 관리</h2>
          <button
            type="button"
            className="my-menu-item my-menu-item--logout"
            onClick={() => setShowLogoutConfirm(true)}
          >
            <div className="my-menu-item__left">
              <span className="my-menu-icon" style={{ color: '#ef4444' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </span>
              <span className="my-menu-label" style={{ color: '#ef4444' }}>로그아웃</span>
            </div>
            <span className="my-menu-arrow" style={{ color: '#ef4444' }}>›</span>
          </button>
        </div>
      </div>

      {/* 1-Click Pay Modal */}
      {selectedPayGroup && (
        <div className="my-modal-backdrop" onClick={() => setSelectedPayGroup(null)}>
          <div className="my-modal-card pay-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="modal-title" style={{ margin: 0 }}>💸 1초 간편 회비 송금</h3>
              <button
                type="button"
                onClick={() => setSelectedPayGroup(null)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div className="pay-group-summary-box">
              <span className="pay-summary-name">「{selectedPayGroup.groupName}」</span>
              <span className="pay-summary-month">{selectedPayGroup.month}월 정기 회비</span>
              <div className="pay-account-display">
                <span>🏦 {selectedPayGroup.bankName || '등록된 은행 없음'}</span>
                <span className="account-number-text">{selectedPayGroup.bankAccountNumber || '계좌 미등록'}</span>
                {selectedPayGroup.bankAccountHolder && (
                  <span className="account-holder-text">(예금주: {selectedPayGroup.bankAccountHolder})</span>
                )}
              </div>
            </div>

            <div className="pay-action-buttons">
              <button
                type="button"
                className="btn-toss-pay"
                onClick={() => handleTossSend(selectedPayGroup)}
              >
                🔵 토스(Toss) 앱으로 1초 송금
              </button>

              <button
                type="button"
                className="btn-kakao-pay"
                onClick={() => handleKakaoPaySend(selectedPayGroup)}
              >
                🟡 카카오페이 송금하기
              </button>

              <button
                type="button"
                className="btn-copy-account"
                onClick={() => handleCopyAccount(selectedPayGroup)}
              >
                📋 계좌 정보 1초 복사
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="settings-toast-popup">
          {toastMsg}
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="my-modal-backdrop" onClick={() => setShowLogoutConfirm(false)}>
          <div className="my-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">🚪 로그아웃</h3>
            <p className="modal-desc">정말 로그아웃 하시겠습니까?</p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-modal-secondary"
                onClick={() => setShowLogoutConfirm(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="btn-modal-danger"
                onClick={handleLogout}
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
