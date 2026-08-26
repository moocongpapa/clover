import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--ink-muted)' }}>관리자 인증 확인 중…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== 'ADMIN') {
    return (
      <div style={{ maxWidth: '480px', margin: '80px auto', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>접근 권한이 없습니다</h2>
        <p style={{ color: 'var(--ink-muted)', fontSize: '14px', marginBottom: '24px' }}>
          관리자(ADMIN) 권한을 가진 계정으로 로그인해야 이용할 수 있습니다.
        </p>
        <button
          onClick={() => (window.location.href = '/')}
          style={{
            padding: '10px 20px',
            background: 'var(--accent, #10b981)',
            color: '#fff',
            borderRadius: '12px',
            border: 'none',
            fontWeight: '700',
            cursor: 'pointer',
          }}
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
