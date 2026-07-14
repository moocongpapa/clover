import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, formatPhoneNumber, type User } from '../api';
import './ProfileDetail.css';

export default function ProfileDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
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
  }, [id]);

  if (loading) {
    return <p className="loading-text">불러오는 중…</p>;
  }

  if (error || !profile) {
    return (
      <div className="profile-detail-error">
        <p className="form-error">{error || '사용자를 찾을 수 없습니다.'}</p>
        <button type="button" className="btn-outline" onClick={() => navigate(-1)}>
          뒤로가기
        </button>
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
            <img
              src={profile.profileImageUrl}
              alt=""
              className="profile-avatar"
            />
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
    </div>
  );
}
