import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CloverLogo from './CloverLogo';
import NotificationBell from './NotificationBell';
import './Layout.css';

export default function Layout() {
  const { user } = useAuth();

  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'site-nav__link is-active' : 'site-nav__link';

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'tab-bar__item is-active' : 'tab-bar__item';

  const isKakaoInApp = typeof navigator !== 'undefined' && /KAKAOTALK/i.test(navigator.userAgent);
  const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  const handleOpenExternal = () => {
    const currentUrl = window.location.href;
    if (isIOS) {
      window.location.href = `kakaoweb://openExternal?url=${encodeURIComponent(currentUrl)}`;
    } else {
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(currentUrl)}`;
    }
  };

  return (
    <div className="app-shell">
      {isKakaoInApp && (
        <div style={{
          background: '#fee500',
          color: '#191919',
          padding: '10px 14px',
          fontSize: '13px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e5ce00',
          zIndex: 2000,
        }}>
          <span>📱 {isIOS ? '우측 하단 [···] ➔ [Safari로 열기]를 권장합니다.' : '카카오톡 인앱 브라우저로 접속 중입니다.'}</span>
          <button
            type="button"
            onClick={handleOpenExternal}
            style={{
              background: '#191919',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            {isIOS ? '사파리 열기' : '크롬으로 열기'}
          </button>
        </div>
      )}
      <header className="site-header">
        <div className="site-header-inner">
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
                일정
              </NavLink>
              <NavLink to="/my" className={navClass}>
                MY
              </NavLink>
            </nav>
          )}

          <div className="header-actions">
            {user ? (
              <NotificationBell />
            ) : (
              <Link to="/login" className="btn-primary btn-header-cta">
                시작하기
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      {user && (
        <nav className="tab-bar" aria-label="하단 메뉴">
          <NavLink to="/" end className={tabClass} aria-label="홈" title="홈">
            <span className="tab-bar__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </span>
            <span className="tab-bar__label">홈</span>
          </NavLink>
          <NavLink to="/my-groups" className={tabClass} aria-label="내 모임" title="내 모임">
            <span className="tab-bar__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <span className="tab-bar__label">내 모임</span>
          </NavLink>
          <NavLink to="/calendar" className={tabClass} aria-label="일정" title="일정">
            <span className="tab-bar__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <span className="tab-bar__label">일정</span>
          </NavLink>
          <NavLink to="/my" className={tabClass} aria-label="MY" title="MY">
            <span className="tab-bar__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <span className="tab-bar__label">MY</span>
          </NavLink>
        </nav>
      )}
    </div>
  );
}
