import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
        <Link to={user ? '/my-groups' : '/'} className="brand">
          <span className="brand-mark">M</span>
          <span className="brand-text">모임표</span>
        </Link>

        {user && (
          <nav className="site-nav site-nav--desktop" aria-label="주요 메뉴">
            <NavLink to="/groups" className={navClass}>
              모임 찾기
            </NavLink>
            <NavLink to="/my-groups" className={navClass}>
              내 모임
            </NavLink>
            <NavLink to="/calendar" className={navClass}>
              캘린더
            </NavLink>
          </nav>
        )}

        <div className="header-actions">
          {user ? (
            <>
              <span className="user-chip">
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="" />
                ) : (
                  <span className="avatar-fallback">
                    {user.displayName[0]}
                  </span>
                )}
                <span className="user-chip__name">{user.displayName}</span>
              </span>
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
          <NavLink to="/groups" className={tabClass}>
            <span className="tab-bar__label">모임 찾기</span>
          </NavLink>
          <NavLink to="/my-groups" className={tabClass}>
            <span className="tab-bar__label">내 모임</span>
          </NavLink>
          <NavLink to="/calendar" className={tabClass}>
            <span className="tab-bar__label">캘린더</span>
          </NavLink>
        </nav>
      )}
    </div>
  );
}
