import { useState } from 'react';
import CloverLogo from './CloverLogo';

type GroupAvatarProps = {
  src?: string | null;
  name?: string;
  className?: string;
  size?: number;
  radius?: number;
};

export default function GroupAvatar({
  src,
  name = '모임',
  className,
  size = 44,
  radius,
}: GroupAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const classes = ['group-avatar', className].filter(Boolean).join(' ');
  const style = {
    width: `${size}px`,
    height: `${size}px`,
    ...(radius !== undefined ? { borderRadius: `${radius}px` } : {}),
  };

  const secureSrc = src ? src.replace(/^http:\/\//i, 'https://') : null;

  if (secureSrc && !hasError) {
    return (
      <img
        src={secureSrc}
        alt={`${name} 대표 이미지`}
        className={classes}
        style={style}
        onError={() => setHasError(true)}
      />
    );
  }

  const fallbackStyle: React.CSSProperties = {
    ...style,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--grey-50, #f8fafc)',
    border: '1px solid var(--border-soft, #e2e8f0)',
    flexShrink: 0,
    boxSizing: 'border-box',
    overflow: 'hidden',
  };

  return (
    <span className={`${classes} group-avatar--fallback`} aria-label={`${name} 기본 이미지`} style={fallbackStyle}>
      <CloverLogo size={Math.round(size * 0.58)} />
    </span>
  );
}
