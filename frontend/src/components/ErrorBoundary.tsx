import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
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
          fontFamily: 'var(--font-main, -apple-system, sans-serif)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>😵</div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink-dark, #1e293b)', margin: '0 0 8px' }}>
            앗, 문제가 발생했어요
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink-muted, #94a3b8)', margin: '0 0 24px', lineHeight: 1.5 }}>
            일시적인 오류가 발생했습니다.<br />
            아래 버튼을 눌러 다시 시도해 주세요.
          </p>
          {this.state.error && (
            <details style={{ textAlign: 'left', marginBottom: '20px', maxWidth: '400px', width: '100%', background: '#fff', border: '1px solid #fed7aa', borderRadius: '8px', padding: '10px', fontSize: '12px', color: '#c2410c' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>오류 상세 정보 보기</summary>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginTop: '8px', fontSize: '11px' }}>
                {this.state.error.message}
                {'\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
          <button
            onClick={this.handleReset}
            style={{
              padding: '12px 32px',
              borderRadius: '12px',
              background: 'var(--accent, #10b981)',
              color: '#fff',
              border: 'none',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            🍀 홈으로 돌아가기
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
