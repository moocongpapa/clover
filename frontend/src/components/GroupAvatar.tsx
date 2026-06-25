import CloverLogo from './CloverLogo';

type GroupAvatarProps = {
  src?: string | null;
  name?: string;
  className?: string;
};

export default function GroupAvatar({
  src,
  name = '모임',
  className,
}: GroupAvatarProps) {
  const classes = ['group-avatar', className].filter(Boolean).join(' ');

  if (src) {
    return <img src={src} alt={`${name} 대표 이미지`} className={classes} />;
  }

  return (
    <span className={`${classes} group-avatar--fallback`} aria-label={`${name} 기본 이미지`}>
      <CloverLogo size={28} />
    </span>
  );
}
