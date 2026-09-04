import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminLayout.css';

const NAV_ITEMS = [
  { path: '/admin', label: '대시보드', icon: '📊', end: true },
  { path: '/admin/categories', label: '카테고리 관리', icon: '📁' },
  { path: '/admin/roles', label: '직책/운영진 관리', icon: '🎖️' },
  { path: '/admin/users', label: '사용자 관리', icon: '👥' },
  { path: '/admin/groups', label: '모임 관리', icon: '🏠' },
  { path: '/admin/feedback', label: '피드백 관리', icon: '📩' },
  { path: '/admin/announcements', label: '시스템 공지', icon: '📢' },
  { path: '/admin/settings', label: '앱 설정 & 푸시', icon: '⚙️' },
];

export default function AdminLayout() {
  const { user } = useAuth();

  return (
    <div className="admin-shell">
      {/* Top Header */}
      <header className="admin-header">
        <div className="admin-header-inner">
          <Link to="/admin" className="admin-logo-wrap">
            <span className="admin-logo-badge">🍀</span>
            <span className="admin-logo-title">Clover</span>
            <span className="admin-logo-tag">Admin Console</span>
          </Link>

          <div className="admin-header-right">
            <span style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>
              👤 {user?.displayName || '관리자'}
            </span>
            <Link to="/" className="admin-back-to-app-btn">
              서비스로 이동 ›
            </Link>
          </div>
        </div>
      </header>

      {/* Navigation Sub-Tabs */}
      <nav className="admin-nav-bar" aria-label="관리자 메뉴">
        <div className="admin-nav-tabs">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `admin-nav-tab ${isActive ? 'is-active' : ''}`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Main Page Area */}
      <main className="admin-main-container">
        <Outlet />
      </main>
    </div>
  );
}
