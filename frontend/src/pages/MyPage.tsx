import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { safeImageUrl, formatPhoneNumber } from '../api';
import './MyPage.css';

export default function MyPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const formattedPhone = user.phoneNumber ? formatPhoneNumber(user.phoneNumber) : '연락처 미등록';
  const genderLabel = user.gender === 'MALE' ? '남성' : user.gender === 'FEMALE' ? '여성' : '미설정';

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
          <p className="my-profile-meta">
            {formattedPhone} · {genderLabel}
            {user.birthYear ? ` · ${user.birthYear}년생` : ''}
          </p>
        </div>

        <Link to="/profile/edit" className="btn-edit-profile-chip">
          ✏️ 정보 수정
        </Link>
      </div>

      {/* Main Menu Groups */}
      <div className="my-menu-container">
        <div className="my-menu-group">
          <h2 className="my-menu-group__title">모임 & 일정</h2>
          <Link to="/my-groups" className="my-menu-item">
            <div className="my-menu-item__left">
              <span className="my-menu-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              <span className="my-menu-label">내 가입 모임 목록</span>
            </div>
            <span className="my-menu-arrow">›</span>
          </Link>
          <Link to="/calendar" className="my-menu-item">
            <div className="my-menu-item__left">
              <span className="my-menu-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
              <span className="my-menu-label">전체 일정 달력</span>
            </div>
            <span className="my-menu-arrow">›</span>
          </Link>
        </div>

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
              <span className="my-menu-label">앱 알림 & 데이터 설정</span>
            </div>
            <span className="my-menu-arrow">›</span>
          </Link>
          <Link to="/announcements" className="my-menu-item">
            <div className="my-menu-item__left">
              <span className="my-menu-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <span className="my-menu-label">서비스 공지사항</span>
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
