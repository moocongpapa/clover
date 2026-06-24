import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type MyGroup } from '../api';
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
      <div className="page-header">
        <h1>내 모임</h1>
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
            <Link key={g.id} to={`/groups/${g.id}`} className="group-card">
              <span className="group-category">{g.category}</span>
              <h3>{g.name}</h3>
              <p>{g.description}</p>
              <span className="group-meta">
                {g.myRole === 'PRESIDENT'
                  ? '회장'
                  : g.myRole === 'OFFICER'
                    ? '운영진'
                    : '회원'}{' '}
                · 회원 {g.memberCount}명
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
