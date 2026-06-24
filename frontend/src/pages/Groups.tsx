import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, CATEGORIES, type Group } from '../api';
import { useAuth } from '../context/AuthContext';
import './Groups.css';

function GroupCard({
  group,
  onUpdated,
}: {
  group: Group;
  onUpdated: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const status = group.myMembership?.status;
  const isPresident = group.myMembership?.role === 'PRESIDENT';

  const handleJoin = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.joinGroup(group.id);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : '가입 신청 실패');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    setError('');
    try {
      await api.cancelJoinGroup(group.id);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : '취소 실패');
    } finally {
      setBusy(false);
    }
  };

  const renderAction = () => {
    if (!user) {
      return (
        <Link
          to="/login"
          className="btn-sm btn-outline group-card__action"
          onClick={(e) => e.stopPropagation()}
        >
          로그인 후 가입
        </Link>
      );
    }

    if (status === 'APPROVED') {
      return (
        <span className="group-card__badge group-card__badge--joined">
          {isPresident ? '회장' : '가입됨'}
        </span>
      );
    }

    if (status === 'PENDING') {
      return (
        <button
          type="button"
          className="btn-sm btn-ghost group-card__action"
          disabled={busy}
          onClick={handleCancel}
        >
          {busy ? '처리 중…' : '신청 취소'}
        </button>
      );
    }

    if (status === 'REJECTED') {
      return (
        <button
          type="button"
          className="btn-sm btn-outline group-card__action"
          disabled={busy}
          onClick={handleJoin}
        >
          {busy ? '처리 중…' : '다시 신청'}
        </button>
      );
    }

    return (
      <button
        type="button"
        className="btn-sm btn-primary group-card__action"
        disabled={busy}
        onClick={handleJoin}
      >
        {busy ? '처리 중…' : '가입 신청'}
      </button>
    );
  };

  return (
    <article className="group-card group-card--interactive">
      <Link to={`/groups/${group.id}`} className="group-card__link">
        <span className="group-category">{group.category}</span>
        <h3>{group.name}</h3>
        <p>{group.description}</p>
        <span className="group-meta">
          회원 {group._count?.members ?? 0}명
        </span>
      </Link>
      <div className="group-card__footer">
        {renderAction()}
        {error && <p className="group-card__error">{error}</p>}
      </div>
    </article>
  );
}

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const load = useCallback(() => {
    setLoading(true);
    api
      .listGroups(search || undefined, category || undefined)
      .then(setGroups)
      .finally(() => setLoading(false));
  }, [search, category]);

  useEffect(() => {
    load();
  }, [load, user?.id]);

  return (
    <div className="groups-page">
      <div className="page-header">
        <h1>모임 찾기</h1>
        {user ? (
          <Link to="/groups/new" className="btn-primary">
            모임 만들기
          </Link>
        ) : (
          <Link to="/login" className="btn-primary">
            로그인
          </Link>
        )}
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
          {user && (
            <Link to="/groups/new" className="link-text">
              첫 모임 만들기
            </Link>
          )}
        </div>
      ) : (
        <div className="group-grid">
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} onUpdated={load} />
          ))}
        </div>
      )}
    </div>
  );
}
