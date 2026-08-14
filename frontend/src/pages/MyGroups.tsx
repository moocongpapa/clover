import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ROLE_LABELS, type MyGroup } from '../api';
import GroupAvatar from '../components/GroupAvatar';
import './MyGroups.css';

export default function MyGroups() {
  const [groups, setGroups] = useState<MyGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .myGroups()
      .then(setGroups)
      .finally(() => setLoading(false));
  }, []);

  const getRoleBadgeClass = (role?: string) => {
    if (role === 'PRESIDENT') return 'my-group-role-badge--president';
    if (role === 'OFFICER') return 'my-group-role-badge--officer';
    return 'my-group-role-badge--member';
  };

  return (
    <div className="my-groups-page">
      <div className="my-groups-header">
        <h1 className="my-groups-title">내 가입 모임</h1>
        {groups.length > 0 && (
          <span className="my-groups-count-badge">{groups.length}개</span>
        )}
      </div>

      {loading ? (
        <p className="loading-text" style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          불러오는 중…
        </p>
      ) : groups.length === 0 ? (
        <div className="my-groups-empty">
          <span className="my-groups-empty__icon">👥</span>
          <h2 className="my-groups-empty__title">아직 가입한 모임이 없어요</h2>
          <p className="my-groups-empty__desc">주변의 관심사 모임을 탐색하고 함께 활동해 보세요!</p>
          <Link to="/groups" className="btn-explore-groups">
            모임 찾아보기
          </Link>
        </div>
      ) : (
        <div className="my-groups-list">
          {groups.map((g) => (
            <Link
              key={g.id}
              to={`/groups/${g.id}`}
              className="my-group-card"
            >
              <div className="my-group-card__left">
                <GroupAvatar src={g.profileImageUrl} name={g.name} size={60} radius={14} />
                <div className="my-group-card__info">
                  <div className="my-group-card__title-row">
                    <h3 className="my-group-card__name">{g.name}</h3>
                    <span className={`my-group-role-badge ${getRoleBadgeClass(g.myRole)}`}>
                      {ROLE_LABELS[g.myRole] ?? '회원'}
                    </span>
                  </div>
                  <p className="my-group-card__desc">{g.description}</p>
                  <div className="my-group-card__meta-row">
                    <span className="my-group-card__category">{g.category}</span>
                    {g.activityRegion && (
                      <>
                        <span className="my-group-card__divider">·</span>
                        <span>📍 {g.activityRegion}</span>
                      </>
                    )}
                    <span className="my-group-card__divider">·</span>
                    <span>회원 {g.memberCount}명</span>
                  </div>
                </div>
              </div>
              <div className="my-group-card__right">
                <span className="my-group-card__arrow">›</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Floating Action Button (+) */}
      <div className="home-fab-container app-fab-fixed-container">
        <Link
          to="/groups/new"
          className="home-fab-main-btn"
          title="새 모임 만들기"
          aria-label="새 모임 만들기"
        >
          +
        </Link>
      </div>
    </div>
  );
}
