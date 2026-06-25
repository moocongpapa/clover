import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CloverLogo from './CloverLogo';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'site-nav__link is-active' : 'site-nav__link';

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'tab-bar__item is-active' : 'tab-bar__item';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

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
            <NavLink to="/my-groups" className={navClass}>
              내 모임
            </NavLink>
            <NavLink to="/groups" className={navClass}>
              모임 찾기
            </NavLink>
            <NavLink to="/calendar" className={navClass}>
              캘린더
            </NavLink>
          </nav>
        )}

        <div className="header-actions">
          {user ? (
            <>
              <Link to="/profile" className="user-chip" aria-label="내 프로필 수정">
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="" />
                ) : (
                  <span className="avatar-fallback">
                    {user.displayName[0]}
                  </span>
                )}
                <span className="user-chip__name">{user.displayName}</span>
              </Link>
              <button
                type="button"
                className="btn-ghost btn-logout"
                onClick={handleLogout}
              >
                로그아웃
              </button>
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
          </NavLink>
          <NavLink to="/my-groups" className={tabClass} aria-label="내 모임" title="내 모임">
            <span className="tab-bar__icon">👥</span>
          </NavLink>
          <NavLink to="/groups" className={tabClass} aria-label="모임 찾기" title="모임 찾기">
            <span className="tab-bar__icon">🔍</span>
          </NavLink>
          <NavLink to="/calendar" className={tabClass} aria-label="캘린더" title="캘린더">
            <span className="tab-bar__icon">📅</span>
          </NavLink>
        </nav>
      )}
    </div>
  );
}
