import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '24px',
      textAlign: 'center',
      background: 'var(--bg, #f8fafc)',
    }}>
      <div style={{ fontSize: '64px', marginBottom: '12px' }}>🍀</div>
      <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink-dark, #1e293b)', margin: '0 0 8px' }}>
        404
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--ink-muted, #94a3b8)', margin: '0 0 24px', lineHeight: 1.5 }}>
        요청하신 페이지를 찾을 수 없습니다.
      </p>
      <Link
        to="/"
        style={{
          padding: '12px 32px',
          borderRadius: '12px',
          background: 'var(--accent, #10b981)',
          color: '#fff',
          textDecoration: 'none',
          fontSize: '15px',
          fontWeight: 700,
        }}
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
