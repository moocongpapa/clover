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
              <span className="my-menu-icon">👥</span>
              <span className="my-menu-label">내 가입 모임 목록</span>
            </div>
            <span className="my-menu-arrow">›</span>
          </Link>
          <Link to="/calendar" className="my-menu-item">
            <div className="my-menu-item__left">
              <span className="my-menu-icon">📅</span>
              <span className="my-menu-label">전체 일정 달력</span>
            </div>
            <span className="my-menu-arrow">›</span>
          </Link>
        </div>

        <div className="my-menu-group">
          <h2 className="my-menu-group__title">서비스 & 설정</h2>
          <Link to="/settings" className="my-menu-item">
            <div className="my-menu-item__left">
              <span className="my-menu-icon">⚙️</span>
              <span className="my-menu-label">앱 알림 & 데이터 설정</span>
            </div>
            <span className="my-menu-arrow">›</span>
          </Link>
          <Link to="/announcements" className="my-menu-item">
            <div className="my-menu-item__left">
              <span className="my-menu-icon">📢</span>
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
              <span className="my-menu-icon">🚪</span>
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
