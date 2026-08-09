import { useEffect, useState } from 'react';

interface LoadingIndicatorProps {
  message?: string;
  onRetry?: () => void;
}

export default function LoadingIndicator({
  message = '불러오는 중입니다…',
  onRetry,
}: LoadingIndicatorProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  let statusHint = message;
  if (elapsedSeconds >= 8) {
    statusHint = '⏳ 무료 서버가 절전 모드에서 깨어나는 중입니다 (약 20~30초 소요). 잠시만 기다려 주세요!';
  } else if (elapsedSeconds >= 3) {
    statusHint = '⚡ 서버와 연결하고 있습니다…';
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        textAlign: 'center',
        minHeight: '280px',
      }}
    >
      {/* Clover Pulse Animation */}
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          marginBottom: '16px',
          animation: 'pulse 1.5s infinite ease-in-out',
        }}
      >
        🍀
      </div>

      <p
        style={{
          fontSize: '15px',
          fontWeight: '700',
          color: 'var(--ink-dark, #1e293b)',
          margin: '0 0 6px 0',
          lineHeight: '1.4',
        }}
      >
        {statusHint}
      </p>

      {elapsedSeconds >= 8 && (
        <p
          style={{
            fontSize: '12px',
            color: 'var(--ink-muted, #64748b)',
            margin: '0 0 16px 0',
            maxWidth: '320px',
            lineHeight: '1.4',
          }}
        >
          Render 무료 호스팅 특성상 첫 접속 시 15분 이상 미사용 상태였다면 서버를 준비하는 시간이 필요합니다.
        </p>
      )}

      {elapsedSeconds >= 15 && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            marginTop: '8px',
            padding: '8px 16px',
            backgroundColor: 'var(--surface, #ffffff)',
            border: '1.5px solid var(--border, #cbd5e1)',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '700',
            color: 'var(--brand-primary, #10b981)',
            cursor: 'pointer',
          }}
        >
          🔄 다시 시도
        </button>
      )}
    </div>
  );
}
