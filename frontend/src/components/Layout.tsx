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
            <span className="tab-bar__icon">🏠</span>
            <span className="tab-bar__label">홈</span>
          </NavLink>
          <NavLink to="/my-groups" className={tabClass} aria-label="모임" title="모임">
            <span className="tab-bar__icon">👥</span>
            <span className="tab-bar__label">모임</span>
          </NavLink>
          <NavLink to="/calendar" className={tabClass} aria-label="일정" title="일정">
            <span className="tab-bar__icon">📅</span>
            <span className="tab-bar__label">일정</span>
          </NavLink>
          <NavLink to="/notifications" className={tabClass} aria-label="새소식" title="새소식">
            <span className="tab-bar__icon">🔔</span>
            <span className="tab-bar__label">새소식</span>
          </NavLink>
          <NavLink to="/my" className={tabClass} aria-label="MY" title="MY">
            <span className="tab-bar__icon">👤</span>
            <span className="tab-bar__label">MY</span>
          </NavLink>
        </nav>
      )}
    </div>
  );
}
