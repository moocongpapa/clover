import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, formatPhoneNumber, safeImageUrl, type User } from '../api';
import './ProfileDetail.css';

export default function ProfileDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showFullPhoto, setShowFullPhoto] = useState(false);

  useEffect(() => {
    if (!id || id === 'edit') {
      navigate('/profile/edit', { replace: true });
      return;
    }
    setLoading(true);
    api
      .getUser(id)
      .then((user) => {
        setProfile(user);
        setError('');
      })
      .catch((e) => {
        setError(e.message || '프로필을 불러오지 못했습니다.');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    if (!showFullPhoto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowFullPhoto(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFullPhoto]);

  if (loading) {
    return <p className="loading-text">불러오는 중…</p>;
  }

  if (error || !profile) {
    return (
      <div className="profile-detail-error" style={{ textAlign: 'center', padding: '60px 24px' }}>
        <p className="form-error" style={{ fontSize: '16px', marginBottom: '20px' }}>
          {error || '존재하지 않는 회원입니다.'}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate('/')}
            style={{
              background: 'var(--brand-primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 20px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            홈으로 이동
          </button>
          <button
            type="button"
            className="btn-outline"
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              navigate('/login');
            }}
            style={{
              background: '#fee500',
              color: '#191919',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 20px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            카카오로 시작하기
          </button>
        </div>
      </div>
    );
  }

  const avatarFallback = profile.displayName[0];
  const formatGender = (gender?: string | null) => {
    if (gender === 'MALE') return '남성';
    if (gender === 'FEMALE') return '여성';
    return '-';
  };

  return (
    <div className="profile-detail-page">
      <div className="profile-card">
        <div className="profile-header">
          {profile.profileImageUrl ? (
            <div
              className="profile-avatar-wrap is-clickable"
              onClick={() => setShowFullPhoto(true)}
              title="사진 크게 보기"
            >
              <img
                src={safeImageUrl(profile.profileImageUrl) || ''}
                alt={profile.displayName}
                className="profile-avatar"
              />
              <span className="profile-avatar-zoom-badge">🔍</span>
            </div>
          ) : (
            <span className="profile-avatar-fallback" aria-hidden>
              {avatarFallback}
            </span>
          )}
          <h1 className="profile-name">{profile.displayName}</h1>
          {profile.bio && <p className="profile-bio">“ {profile.bio} ”</p>}
        </div>

        <div className="profile-info-section">
          <div className="info-row">
            <span className="info-label">성별</span>
            <span className="info-value">{formatGender(profile.gender)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">태어난 연도</span>
            <span className="info-value">
              {profile.birthYear ? `${profile.birthYear}년` : '-'}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">전화번호</span>
            <span className="info-value">
              {profile.phoneNumber ? formatPhoneNumber(profile.phoneNumber) : '-'}
            </span>
          </div>
        </div>

        <div className="profile-actions">
          <button
            type="button"
            className="btn-outline btn-block"
            onClick={() => navigate(-1)}
          >
            뒤로가기
          </button>
        </div>
      </div>

      {/* Fullscreen Photo Lightbox Modal */}
      {showFullPhoto && profile.profileImageUrl && (
        <div
          className="profile-photo-lightbox-overlay"
          onClick={() => setShowFullPhoto(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="profile-photo-lightbox-header" onClick={(e) => e.stopPropagation()}>
            <div className="profile-photo-lightbox-user">
              <span className="profile-photo-lightbox-name">{profile.displayName}</span>
              <span className="profile-photo-lightbox-sub">프로필 사진</span>
            </div>
            <button
              type="button"
              className="profile-photo-lightbox-close"
              onClick={() => setShowFullPhoto(false)}
              title="닫기"
            >
              ✕
            </button>
          </div>
          <div className="profile-photo-lightbox-body" onClick={(e) => e.stopPropagation()}>
            <img
              src={profile.profileImageUrl}
              alt={profile.displayName}
              className="profile-photo-lightbox-img"
            />
          </div>
        </div>
      )}
    </div>
  );
}
