import { useCallback, useEffect, useState, useRef, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, CATEGORY_OPTIONS, type Group } from '../api';
import { useAuth } from '../context/AuthContext';
import GroupAvatar from '../components/GroupAvatar';
import './Groups.css';

import { getGroupCoordinates, getDistanceKm } from '../utils/geo';

function GroupCard({
  group,
  onUpdated,
  userCoords,
}: {
  group: Group;
  onUpdated: () => void;
  userCoords: { lat: number; lng: number } | null;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

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
          가입
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
          {busy ? '…' : '신청취소'}
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
        {busy ? '…' : '가입신청'}
      </button>
    );
  };

  const locationText = group.activityDistrict || group.activitySigungu || group.activitySido || '지역 미정';

  const distanceStr = (() => {
    if (!userCoords) return '';
    const groupCoords = getGroupCoordinates(group);
    const d = getDistanceKm(userCoords.lat, userCoords.lng, groupCoords.lat, groupCoords.lng);
    return d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`;
  })();

  return (
    <article className="group-list-row-item">
      <Link to={`/groups/${group.id}`} className="group-list-row-link">
        {/* Left: Square Profile Image */}
        <div className="group-list-thumb-wrapper">
          <GroupAvatar
            src={group.profileImageUrl}
            name={group.name}
            size={92}
            radius={14}
            className="group-list-thumb"
          />
        </div>

        {/* Right: Info */}
        <div className="group-list-info">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="group-list-category-badge">
              {group.category}
            </div>
            {renderAction()}
          </div>

          <h3 className="group-list-title">{group.name}</h3>

          <p className="group-list-desc">{group.description}</p>

          <div className="group-list-meta-line">
            <span className="group-list-location">
              📍 {locationText} {distanceStr ? `(${distanceStr})` : ''}
            </span>
            <span className="group-list-meta-divider">·</span>
            <span className="group-list-status">회원 모집중</span>
            <span className="group-list-count">({group._count?.members ?? 0}명)</span>
          </div>
        </div>
      </Link>
      {error && <p className="group-card__error" style={{ margin: '4px 16px 8px', fontSize: '11px', color: '#ef4444' }}>{error}</p>}
    </article>
  );
}

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const { user } = useAuth();

  const [visibleCount, setVisibleCount] = useState(15);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Automatically fetch geolocation on mount for 20km fixed filtering
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Fallback to Gangnam Station
          setUserCoords({ lat: 37.49808, lng: 127.02797 });
        }
      );
    } else {
      setUserCoords({ lat: 37.49808, lng: 127.02797 });
    }
  }, []);

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

  useEffect(() => {
    setVisibleCount(15);
  }, [search, category]);

  // Fixed 20km distance filtering by default
  const filteredAndSortedGroups = groups.filter((g) => {
    if (userCoords) {
      const groupCoords = getGroupCoordinates(g);
      const distance = getDistanceKm(userCoords.lat, userCoords.lng, groupCoords.lat, groupCoords.lng);
      if (distance > 20) return false;
    }
    return true;
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 15);
        }
      },
      { threshold: 0.1 }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [filteredAndSortedGroups, visibleCount]);

  return (
    <div className="groups-page-screen">
      {/* Top Bar matching screenshot */}
      <header className="groups-top-header">
        <h1 className="groups-top-title">모임 찾기</h1>
        <button
          type="button"
          className="groups-search-toggle-btn"
          onClick={() => setShowSearchInput((prev) => !prev)}
          aria-label="검색"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </header>

      {/* Expandable Search Input */}
      {showSearchInput && (
        <div className="search-bar-dropdown">
          <input
            className="search-bar-input"
            type="search"
            placeholder="모임 이름 또는 관심사 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
      )}

      {/* Horizontal Category Underline Tabs (Matching screenshot) */}
      <nav className="groups-category-tab-bar">
        <button
          type="button"
          className={`category-underline-tab ${category === '' ? 'is-active' : ''}`}
          onClick={() => setCategory('')}
        >
          전체
        </button>
        {CATEGORY_OPTIONS.map((c) => (
          <button
            key={c.value}
            type="button"
            className={`category-underline-tab ${category === c.value ? 'is-active' : ''}`}
            onClick={() => setCategory(c.value)}
          >
            {c.value}
          </button>
        ))}
      </nav>

      {/* Group List Area */}
      {loading ? (
        <div className="groups-loading-state">
          <p>모임을 불러오는 중…</p>
        </div>
      ) : filteredAndSortedGroups.length === 0 ? (
        <div className="groups-empty-state">
          <p>20km 이내에 해당하는 모임이 없습니다.</p>
          <button type="button" className="btn-sm btn-outline" onClick={() => { setSearch(''); setCategory(''); }} style={{ marginTop: '10px' }}>
            전체 모임 보기
          </button>
        </div>
      ) : (
        <div className="groups-list-container">
          {filteredAndSortedGroups.slice(0, visibleCount).map((g) => (
            <GroupCard key={g.id} group={g} onUpdated={load} userCoords={userCoords} />
          ))}
          {visibleCount < filteredAndSortedGroups.length && (
            <div ref={sentinelRef} className="scroll-sentinel" style={{ height: '20px' }} />
          )}
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
