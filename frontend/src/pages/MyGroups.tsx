import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, CATEGORY_OPTIONS, type MyGroup } from '../api';
import GroupAvatar from '../components/GroupAvatar';
import './MyGroups.css';

function formatShortRegion(region?: string | null) {
  if (!region) return '';
  const parts = region.trim().split(/\s+/);
  if (parts.length <= 2) return region;
  return parts.slice(-3).join(' ');
}

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
        <div className="my-groups-header-left">
          <h1 className="my-groups-title">내 모임</h1>
          {groups.length > 0 && (
            <span className="my-groups-count-badge">{groups.length}</span>
          )}
        </div>
        <Link to="/groups" className="btn-find-groups-header">
          <span>🔍</span> 모임 찾기
        </Link>
      </div>

      {loading ? (
        <div className="my-groups-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-pulse skeleton-avatar" />
              <div className="skeleton-content">
                <div className="skeleton-pulse skeleton-line skeleton-line--title" />
                <div className="skeleton-pulse skeleton-line skeleton-line--desc" />
                <div className="skeleton-tags">
                  <div className="skeleton-pulse skeleton-tag" />
                  <div className="skeleton-pulse skeleton-tag" />
                </div>
              </div>
            </div>
          ))}
        </div>
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
          {groups.map((g) => {
            const catEmoji = CATEGORY_OPTIONS.find((c) => c.value === g.category)?.emoji || '🌱';
            const roleLabel =
              g.myRole === 'PRESIDENT'
                ? '👑 회장'
                : g.myRole === 'OFFICER'
                ? '⭐ 운영진'
                : '🌱 회원';
            const shortRegion = formatShortRegion(g.activityRegion);

            return (
              <Link key={g.id} to={`/groups/${g.id}`} className="my-group-card">
                {/* Top Header Row inside Card */}
                <div className="my-group-card__header">
                  <span className="my-group-category-pill">
                    {catEmoji} {g.category}
                  </span>
                  <span className={`my-group-role-badge ${getRoleBadgeClass(g.myRole)}`}>
                    {roleLabel}
                  </span>
                </div>

                {/* Main Body */}
                <div className="my-group-card__body">
                  <GroupAvatar
                    src={g.profileImageUrl}
                    name={g.name}
                    size={56}
                    radius={16}
                    className="my-group-card__avatar"
                  />
                  <div className="my-group-card__content">
                    <h3 className="my-group-card__name">{g.name}</h3>
                    {g.description && (
                      <p className="my-group-card__desc">{g.description}</p>
                    )}
                    <div className="my-group-card__meta-line">
                      {shortRegion && (
                        <span className="my-group-meta-loc" title={g.activityRegion || undefined}>
                          📍 {shortRegion}
                        </span>
                      )}
                      {shortRegion && <span className="my-group-meta-sep">·</span>}
                      <span className="my-group-meta-members">
                        👥 멤버 {g.memberCount}명
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Footer Strip */}
                <div className="my-group-card__footer">
                  <span className="my-group-card__footer-hint">
                    {g.myRole === 'PRESIDENT'
                      ? '👑 회장으로 모임 관리 중'
                      : '모임 홈 바로가기'}
                  </span>
                  <span className="my-group-card__footer-action">
                    입장하기 <span className="my-group-card__arrow">›</span>
                  </span>
                </div>
              </Link>
            );
          })}
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
