import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ROLE_LABELS, type MyGroup } from '../api';
import GroupAvatar from '../components/GroupAvatar';
import './Groups.css';

export default function MyGroups() {
  const [groups, setGroups] = useState<MyGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .myGroups()
      .then(setGroups)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="groups-page">
      {loading ? (
        <p className="loading-text">불러오는 중…</p>
      ) : groups.length === 0 ? (
        <div className="empty-state">
          <p>아직 가입한 모임이 없어요.</p>
          <Link to="/groups" className="link-text">모임 찾아보기</Link>
        </div>
      ) : (
        <div className="group-grid">
          {groups.map((g) => (
            <Link
              key={g.id}
              to={`/groups/${g.id}`}
              className="group-card group-card--interactive group-card--row"
            >
              <GroupAvatar src={g.profileImageUrl} name={g.name} size={64} />
              <div className="group-card__body">
                <div className="group-card__header-row">
                  <h3 className="group-name">{g.name}</h3>
                </div>
                <p className="group-description">{g.description}</p>
                <div className="group-card__footer">
                  <span className="category-more-pill">
                    <strong>{g.category}</strong> <span className="more-arrow">모임 더보기 ›</span>
                  </span>
                  <span className="group-meta-info">
                    {g.activityRegion && (
                      <span className="group-meta-info__region">{g.activityRegion}</span>
                    )}
                    <span className="group-meta-info__role">{ROLE_LABELS[g.myRole] ?? '회원'}</span>
                    <span className="group-meta-info__members">회원 {g.memberCount}명</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Link to="/groups/new" className="fab-button" title="모임 만들기">
        <span className="fab-button__icon">＋</span>
        <span className="fab-button__text">모임 만들기</span>
      </Link>
    </div>
  );
}
