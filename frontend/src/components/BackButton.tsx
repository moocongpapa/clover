import { useNavigate } from 'react-router-dom';
import './BackButton.css';

interface BackButtonProps {
  onClick?: () => void;
  label?: string;
  className?: string;
}

export default function BackButton({ onClick, label = '뒤로', className = '' }: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      type="button"
      className={`unified-back-btn ${className}`}
      onClick={handleClick}
      title="뒤로 가기"
    >
      <span className="back-btn-icon">〈</span>
      {label && <span className="back-btn-label">{label}</span>}
    </button>
  );
}
