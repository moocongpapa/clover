import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, CATEGORIES, type Group } from '../api';
import './Groups.css';

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .listGroups(search || undefined, category || undefined)
      .then(setGroups)
      .finally(() => setLoading(false));
  }, [search, category]);

  return (
    <div className="groups-page">
      <div className="page-header">
        <h1>모임 찾기</h1>
        <Link to="/groups/new" className="btn-primary">
          모임 만들기
        </Link>
      </div>

      <div className="filters">
        <input
          type="search"
          placeholder="모임 이름 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">전체 카테고리</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="loading-text">불러오는 중…</p>
      ) : groups.length === 0 ? (
        <div className="empty-state">
          <p>공개된 모임이 없어요.</p>
          <Link to="/groups/new" className="link-text">첫 모임 만들기</Link>
        </div>
      ) : (
        <div className="group-grid">
          {groups.map((g) => (
            <Link key={g.id} to={`/groups/${g.id}`} className="group-card">
              <span className="group-category">{g.category}</span>
              <h3>{g.name}</h3>
              <p>{g.description}</p>
              <span className="group-meta">
                회원 {g._count?.members ?? 0}명
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
