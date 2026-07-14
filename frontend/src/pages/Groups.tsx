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

  const distanceStr = (() => {
    if (!userCoords) return '';
    const groupCoords = getGroupCoordinates(group);
    const d = getDistanceKm(userCoords.lat, userCoords.lng, groupCoords.lat, groupCoords.lng);
    return d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`;
  })();

  return (
    <article className="group-card group-card--interactive group-card--row">
      <Link to={`/groups/${group.id}`} className="group-card__main-link">
        <GroupAvatar
          src={group.profileImageUrl}
          name={group.name}
          className="group-card__avatar"
        />
        <div className="group-card__content">
          <h3 className="group-card__title">{group.name}</h3>
          <p className="group-card__desc">{group.description}</p>
          <div className="group-card__footer">
            <span className="category-more-pill">
              <strong>{group.category}</strong> <span className="more-arrow">모임 더보기 ›</span>
            </span>
            <span className="group-meta-info">
              {group.activityRegion && (
                <span className="group-meta-info__region">{group.activityRegion}</span>
              )}
              {distanceStr && (
                <span className="group-meta-info__distance">📍 {distanceStr}</span>
              )}
              <span className="group-meta-info__members">회원 {group._count?.members ?? 0}명</span>
            </span>
          </div>
        </div>
      </Link>
      <div className="group-card__side">
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
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState('');
  const { user } = useAuth();

  const [visibleCount, setVisibleCount] = useState(10);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

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
    setVisibleCount(10);
  }, [search, category, maxDistance]);

  const handleGeoToggle = (distance: number) => {
    if (maxDistance === distance) {
      setMaxDistance(null);
      setGeoError('');
      return;
    }

    const requestLocationAndSet = () => {
      if (userCoords) {
        setMaxDistance(distance);
        return;
      }

      if (!navigator.geolocation) {
        setGeoError('이 브라우저는 위치 정보를 지원하지 않습니다.');
        setUserCoords({ lat: 37.49808, lng: 127.02797 }); // Fallback to Gangnam Station
        setMaxDistance(distance);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setMaxDistance(distance);
          setGeoError('');
        },
        (err) => {
          console.warn('Geolocation failed, using Gangnam fallback:', err);
          setUserCoords({ lat: 37.49808, lng: 127.02797 }); // Fallback to Gangnam
          setMaxDistance(distance);
          setGeoError('위치 정보를 가져올 수 없어 기본 위치(강남역) 기준으로 조회합니다.');
        }
      );
    };

    requestLocationAndSet();
  };

  const displayedGroups = groups.filter((g) => {
    if (!maxDistance || !userCoords) return true;
    const groupCoords = getGroupCoordinates(g);
    const distance = getDistanceKm(userCoords.lat, userCoords.lng, groupCoords.lat, groupCoords.lng);
    return distance <= maxDistance;
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 10);
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
  }, [displayedGroups, visibleCount]);

  return (
    <div className="groups-page groups-browse">
      <div className="groups-filters-section">
        <div className="category-filter-container">
          <div className="category-filter-scroll" ref={scrollRef}>
            <button
              type="button"
              className={`category-filter-chip ${category === '' ? 'is-active' : ''}`}
              onClick={() => setCategory('')}
            >
              전체
            </button>
            {CATEGORY_OPTIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`category-filter-chip ${category === c.value ? 'is-active' : ''}`}
                onClick={() => setCategory(c.value)}
              >
                <span className="category-filter-chip__emoji">{c.emoji}</span>
                <span className="category-filter-chip__text">{c.value}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="category-filter-scroll-right"
            onClick={scrollRight}
            aria-label="카테고리 더보기"
          >
            ❯
          </button>
        </div>

        <div className="filters">
          <input
            className="filters__search"
            type="search"
            placeholder="모임 이름 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="geo-filters-row">
            <button
              type="button"
              className={`filters__geo ${maxDistance === 10 ? 'is-active' : ''}`}
              onClick={() => handleGeoToggle(10)}
            >
              📍 내 주변 10km
            </button>
            <button
              type="button"
              className={`filters__geo ${maxDistance === 20 ? 'is-active' : ''}`}
              onClick={() => handleGeoToggle(20)}
            >
              📍 내 주변 20km
            </button>
          </div>
        </div>
      </div>

      {geoError && <p className="geo-error">{geoError}</p>}

      {loading ? (
        <p className="loading-text">불러오는 중…</p>
      ) : displayedGroups.length === 0 ? (
        <div className="empty-state">
          <p>{maxDistance ? `주변 ${maxDistance}km 이내에 모임이 없어요.` : '공개된 모임이 없어요.'}</p>
        </div>
      ) : (
        <>
          <div className="group-grid">
            {displayedGroups.slice(0, visibleCount).map((g) => (
              <GroupCard key={g.id} group={g} onUpdated={load} userCoords={maxDistance ? userCoords : null} />
            ))}
          </div>
          {visibleCount < displayedGroups.length && (
            <div ref={sentinelRef} className="scroll-sentinel" style={{ height: '20px', margin: '10px 0' }} />
          )}
        </>
      )}

      <Link to="/groups/new" className="fab-button" title="모임 만들기">
        <span className="fab-button__icon">＋</span>
        <span className="fab-button__text">모임 만들기</span>
      </Link>
    </div>
  );
}
