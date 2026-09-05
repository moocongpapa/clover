type CloverLogoProps = {
  size?: number;
  className?: string;
  title?: string;
};

const LEAF =
  'M0 0 l-1.45 -1.32 C-6.6 -5.64 -10 -8.72 -10 -12.5 ' +
  'C-10 -15.58 -7.58 -18 -4.5 -18 c1.74 0 3.41 0.81 4.5 2.09 ' +
  'C1.09 -17.19 2.76 -18 4.5 -18 C7.58 -18 10 -15.58 10 -12.5 ' +
  'c0 3.78 -3.4 6.86 -8.55 11.54 L0 0 z';

export default function CloverLogo({
  size = 24,
  className,
  title = 'Clover',
}: CloverLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
      style={{ display: 'block' }}
    >
      <title>{title}</title>
      <path
        d="M24 24 C 22.6 31 25.4 36 24 44"
        stroke="#0F8F57"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      <g fill="#16B36A">
        <path d={LEAF} transform="translate(24 24) rotate(45) scale(0.92)" />
        <path d={LEAF} transform="translate(24 24) rotate(135) scale(0.92)" />
        <path d={LEAF} transform="translate(24 24) rotate(225) scale(0.92)" />
        <path d={LEAF} transform="translate(24 24) rotate(315) scale(0.92)" />
      </g>
      <circle cx="24" cy="24" r="3" fill="#0F8F57" />
    </svg>
  );
}
