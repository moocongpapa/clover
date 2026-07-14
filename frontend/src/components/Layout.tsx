import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CloverLogo from './CloverLogo';
import NotificationBell from './NotificationBell';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'site-nav__link is-active' : 'site-nav__link';

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'tab-bar__item is-active' : 'tab-bar__item';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDropdownOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleOutsideClick = () => {
      setDropdownOpen(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [dropdownOpen]);

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <CloverLogo size={22} />
          </span>
          <span className="brand-text">Clover</span>
        </Link>

        {user && (
          <nav className="site-nav site-nav--desktop" aria-label="주요 메뉴">
            <NavLink to="/" end className={navClass}>
              홈
            </NavLink>
            <NavLink to="/chat" className={navClass}>
              채팅
            </NavLink>
          </nav>
        )}

        <div className="header-actions">
          {user ? (
            <>
              <NotificationBell />
              <div className="profile-dropdown-container">
                <button
                  type="button"
                  className="user-chip-btn"
                  onClick={toggleDropdown}
                  aria-expanded={dropdownOpen}
                  aria-label="사용자 메뉴"
                >
                  {user.profileImageUrl ? (
                    <img src={user.profileImageUrl} alt="" />
                  ) : (
                    <span className="avatar-fallback">
                      {user.displayName[0]}
                    </span>
                  )}
                  <span className="user-chip__name">{user.displayName}</span>
                  <span className={`dropdown-arrow ${dropdownOpen ? 'is-open' : ''}`}>▼</span>
                </button>

                {dropdownOpen && (
                  <div className="profile-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                    <div className="menu-group">
                      <Link to="/profile" className="menu-item" onClick={() => setDropdownOpen(false)}>
                        내 정보
                      </Link>
                      <Link to="/settings" className="menu-item" onClick={() => setDropdownOpen(false)}>
                        설정
                      </Link>
                    </div>
                    <div className="menu-divider" />
                    <div className="menu-group">
                      <button
                        type="button"
                        className="menu-item menu-item--logout"
                        onClick={() => {
                          setDropdownOpen(false);
                          handleLogout();
                        }}
                      >
                        로그아웃
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link to="/login" className="btn-primary btn-header-cta">
              시작하기
            </Link>
          )}
        </div>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      {user && (
        <nav className="tab-bar" aria-label="하단 메뉴">
          <NavLink to="/" end className={tabClass} aria-label="홈" title="홈">
            <span className="tab-bar__icon">🏠</span>
            <span className="tab-bar__label">홈</span>
          </NavLink>
          <NavLink to="/notifications" className={tabClass} aria-label="새소식" title="새소식">
            <span className="tab-bar__icon">🔔</span>
            <span className="tab-bar__label">새소식</span>
          </NavLink>
          <NavLink to="/calendar" className={tabClass} aria-label="일정" title="일정">
            <span className="tab-bar__icon">📅</span>
            <span className="tab-bar__label">일정</span>
          </NavLink>
          <NavLink to="/chat" className={tabClass} aria-label="채팅" title="채팅">
            <span className="tab-bar__icon">💬</span>
            <span className="tab-bar__label">채팅</span>
          </NavLink>
        </nav>
      )}
    </div>
  );
}
