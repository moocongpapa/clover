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
      <div className="page-actions">
        <Link to="/groups/new" className="btn-primary">
          모임 만들기
        </Link>
      </div>

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
              className="group-card group-card--row"
            >
              <GroupAvatar
                src={g.profileImageUrl}
                name={g.name}
                className="group-card__avatar"
              />
              <div className="group-card__body">
                <span className="group-category">{g.category}</span>
                <h3>{g.name}</h3>
                <p>{g.description}</p>
                <span className="group-meta">
                  {g.activityRegion && (
                    <span className="group-meta__region">{g.activityRegion}</span>
                  )}
                  {ROLE_LABELS[g.myRole] ?? '회원'} · 회원 {g.memberCount}명
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
