import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import BackButton from '../components/BackButton';
import { api, formatUserDisplayName } from '../api';
import { useAuth } from '../context/AuthContext';
import GroupAvatar from '../components/GroupAvatar';
import './InviteJoin.css';

export default function InviteJoin() {
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    setError('');

    api
      .getGroupByInviteCode(code)
      .then((res) => {
        setGroup(res);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '유효하지 않거나 만료된 초대 링크입니다.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [code, user]);

  const handleJoinGroup = async () => {
    if (!user) {
      sessionStorage.setItem('redirectTo', `/invite/${code}`);
      navigate('/login');
      return;
    }

    if (!code || !group) return;

    setJoining(true);
    setError('');

    try {
      await api.joinByInvite(code);
      setJoinSuccess(true);
      setTimeout(() => {
        navigate(`/groups/${group.id}`);
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : '모임 가입에 실패했습니다.');
      setJoining(false);
    }
  };

  const handleGoToLogin = () => {
    sessionStorage.setItem('redirectTo', `/invite/${code}`);
    navigate('/login');
  };

  if (loading || authLoading) {
    return (
      <div className="invite-page-container">
        <div className="invite-card-skeleton">
          <div className="spinner" />
          <p className="loading-text">초대장을 확인하고 있습니다…</p>
        </div>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="invite-page-container">
        <div className="invite-card invite-card--error">
          <div className="invite-card-icon">🚨</div>
          <h2 className="invite-error-title">초대장을 찾을 수 없습니다</h2>
          <p className="invite-error-desc">{error}</p>
          <button type="button" className="invite-btn invite-btn--secondary" onClick={() => navigate('/')}>
            홈으로 이동하기
          </button>
        </div>
      </div>
    );
  }

  const membershipStatus = group?.myMembership?.status;
  const isApprovedMember = membershipStatus === 'APPROVED';
  const isPendingMember = membershipStatus === 'PENDING';

  const formatLeaderName = () => {
    if (!group?.presidentUser) return '리더 없음';
    return formatUserDisplayName(group.presidentUser);
  };

  return (
    <div className="invite-page-container">
      {/* Top Bar */}
      <header className="invite-header-bar">
        <BackButton onClick={() => navigate('/')} label="홈" />
        <span className="invite-brand-logo">🍀 Clover</span>
      </header>

      {/* Main Invite Card */}
      <main className="invite-content">
        <div className="invite-card">
          {/* Card Header Badge */}
          <div className="invite-badge-ribbon">
            <span className="invite-badge-icon">💌</span>
            <span className="invite-badge-text">모임 초대장이 도착했습니다!</span>
          </div>

          {/* Group Profile Header */}
          <div className="invite-group-hero">
            <GroupAvatar
              src={group.profileImageUrl}
              name={group.name}
              size={96}
              radius={28}
              className="invite-group-avatar"
            />
            <h1 className="invite-group-name">{group.name}</h1>

            {/* Badges Row */}
            <div className="invite-tags-row">
              {group.category && <span className="invite-tag-pill">{group.category}</span>}
              {group.regionCity && (
                <span className="invite-tag-pill invite-tag-pill--region">
                  📍 {group.regionCity} {group.regionDistrict || ''}
                </span>
              )}
            </div>
          </div>

          {/* Group Key Stats */}
          <div className="invite-stats-grid">
            <div className="invite-stat-item">
              <span className="stat-label">👥 멤버</span>
              <span className="stat-value">{group.memberCount}명</span>
            </div>
            <div className="invite-stat-divider" />
            <div className="invite-stat-item">
              <span className="stat-label">👑 리더</span>
              <span className="stat-value">{formatLeaderName()}</span>
            </div>
          </div>

          {/* Group Description Box */}
          {group.description && (
            <div className="invite-description-box">
              <p className="invite-description-text">"{group.description}"</p>
            </div>
          )}

          {/* Action Area */}
          <div className="invite-action-area">
            {error && <div className="invite-error-banner">{error}</div>}

            {joinSuccess ? (
              <div className="invite-success-banner">
                <span className="success-icon">🎉</span>
                <span className="success-title">가입이 완료되었습니다!</span>
                <span className="success-desc">잠시 후 모임 페이지로 이동합니다…</span>
              </div>
            ) : !user ? (
              <>
                <button type="button" className="invite-btn invite-btn--login" onClick={handleGoToLogin}>
                  🔑 로그인하고 모임 가입하기
                </button>
                <p className="invite-action-tip">카카오 계정으로 빠르게 시작할 수 있어요!</p>
              </>
            ) : isApprovedMember ? (
              <>
                <div className="invite-status-notice invite-status-notice--success">
                  ✅ 이미 가입되어 있는 모임입니다.
                </div>
                <Link to={`/groups/${group.id}`} className="invite-btn invite-btn--primary">
                  🚀 모임 바로가기
                </Link>
              </>
            ) : isPendingMember ? (
              <>
                <div className="invite-status-notice invite-status-notice--pending">
                  ⏳ 가입 승인 대기 중인 모임입니다.
                </div>
                <Link to={`/groups/${group.id}`} className="invite-btn invite-btn--secondary">
                  👀 모임 둘러보기
                </Link>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="invite-btn invite-btn--primary"
                  onClick={handleJoinGroup}
                  disabled={joining}
                >
                  {joining ? '가입 처리 중…' : '🎉 모임 가입하기'}
                </button>
                <p className="invite-action-tip">가입 시 모임의 게시글, 일정 및 투표에 참여할 수 있습니다.</p>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
