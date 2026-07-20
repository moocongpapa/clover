import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  api,
  formatDateTime,
  formatEventTimeRange,
  formatTeamLabel,
  VOTE_CHOICES,
  VOTE_LABELS,
  type CalendarEvent,
  type VoteChoice,
} from '../api';
import { useAuth } from '../context/AuthContext';
import GroupAvatar from '../components/GroupAvatar';
import SegmentedControl from '../components/SegmentedControl';
import './Home.css';

function formatEventDate(
  date: string,
  startTime: string,
  endTime?: string | null,
) {
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const eventDay = new Date(d);
  eventDay.setHours(0, 0, 0, 0);

  let label = d.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
  if (eventDay.getTime() === today.getTime()) label = '오늘';
  else if (eventDay.getTime() === tomorrow.getTime()) label = '내일';

  return `${label} ${formatEventTimeRange(startTime, endTime)}`;
}

function eventEndAt(ev: CalendarEvent) {
  const d = new Date(ev.date);
  const [h, m] = (ev.endTime ?? ev.startTime).split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

function isUpcoming(ev: CalendarEvent) {
  return !ev.isPast;
}

function HomeVoteCounts({ event }: { event: CalendarEvent }) {
  return (
    <div className="home-vote-row" aria-label="투표 현황">
      {VOTE_CHOICES.map((c) => (
        <span
          key={c}
          className={`home-vote-btn home-vote-btn--${c.toLowerCase()}${
            event.myVote === c ? ' is-selected' : ''
          }`}
          style={{ cursor: 'default' }}
        >
          <span className="home-vote-btn__label">{VOTE_LABELS[c]}</span>
          <span className="home-vote-btn__count">({event.voteCounts[c]})</span>
        </span>
      ))}
    </div>
  );
}

function HomeEventCard({
  event,
  onVoted,
  votable = false,
}: {
  event: CalendarEvent;
  onVoted?: () => void;
  votable?: boolean;
}) {
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<VoteChoice | null>(event.myVote);

  useEffect(() => {
    setSelected(event.myVote);
  }, [event.myVote, event.id]);

  const handleVote = async (choice: VoteChoice) => {
    setVoting(true);
    setError('');
    try {
      if (selected === choice) {
        await api.cancelVote(event.id);
        setSelected(null);
      } else {
        await api.castVote(event.id, choice);
        setSelected(choice);
      }
      onVoted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : '투표 실패');
    } finally {
      setVoting(false);
    }
  };

  const badge =
    event.status === 'CANCELLED' ? (
      <span className="home-badge home-badge--cancel">취소</span>
    ) : votable && !event.myVote && !event.voteLocked ? (
      <span className="home-badge home-badge--warn">투표 필요</span>
    ) : event.myVote ? (
      <span className={`home-badge home-badge--${event.myVote.toLowerCase()}`}>
        {VOTE_LABELS[event.myVote]}
      </span>
    ) : null;

  const isEdited = event.updatedAt !== event.createdAt;
  const stampValue = formatDateTime(isEdited ? event.updatedAt : event.createdAt);

  return (
    <article
      className={`home-event-card${votable && !event.myVote && !event.voteLocked ? ' home-event-card--action' : ''}`}
    >
      <div className="home-event-card__header-top">
        <span className="home-event-card__group">{event.group.name}</span>
        <div className="home-event-card__stamp-badge">
          {stampValue && (
            <span className="home-event-card__stamp">
              {stampValue}
            </span>
          )}
          {badge}
        </div>
      </div>

      <div className="home-event-card__body-main">
        <GroupAvatar
          src={event.group.profileImageUrl}
          name={event.group.name}
          className="home-event-card__avatar"
          size={52}
        />
        <div className="home-event-card__content-right">
          <h3>
            <Link to={`/events/${event.id}`}>{event.title}</Link>
          </h3>
          <div className="home-event-card__meta">
            <div className="home-event-card__meta-date">
              {formatEventDate(event.date, event.startTime, event.endTime)}
            </div>
            <div className="home-event-card__meta-location">
              {event.location}
              {event.myTeam && (
                <span className="home-event-card__team">
                  {' '}
                  · {formatTeamLabel(event.myTeam)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {votable && event.status !== 'CANCELLED' && !event.voteLocked ? (
        <>
          <div className="home-vote-row">
            {VOTE_CHOICES.map((c) => (
              <button
                key={c}
                type="button"
                className={`home-vote-btn home-vote-btn--${c.toLowerCase()}${selected === c ? ' is-selected' : ''}`}
                disabled={voting}
                onClick={() => handleVote(c)}
              >
                <span className="home-vote-btn__label">{VOTE_LABELS[c]}</span>
                <span className="home-vote-btn__count">({event.voteCounts[c]})</span>
              </button>
            ))}
          </div>
          {error && <p className="home-event-card__error">{error}</p>}
        </>
      ) : (
        event.status !== 'CANCELLED' && <HomeVoteCounts event={event} />
      )}
    </article>
  );
}

function GuestLanding() {
  return (
    <div className="home-guest">
      <section className="hero">
        <p className="hero-eyebrow">Clover</p>
        <h1>
          모임 일정은 모이고,
          <br />
          <em>참석 여부는 자동으로</em> 알려줘요
        </h1>
        <p className="hero-desc">
          이벤트를 등록하면 회원 전체에 알림이 가고, 하루 전에는 미투표자에게만
          카카오로 리마인더가 전송돼요.
        </p>
        <div className="hero-actions">
          <Link to="/login" className="btn-primary">
            시작하기
          </Link>
          <Link to="/groups" className="btn-outline">
            모임 둘러보기
          </Link>
        </div>
      </section>
    </div>
  );
}

type HomeTab = 'upcoming' | 'past';

function MiniCalendar({
  events,
  selectedDate,
  onSelectDate,
}: {
  events: CalendarEvent[];
  selectedDate: string | null;
  onSelectDate: (dateStr: string | null) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = firstDay.getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    days.push(d);
  }

  const dateEventMap = new Map<string, { hasUpcoming: boolean; hasPast: boolean }>();
  events.forEach((e) => {
    const d = new Date(e.date);
    const yStr = d.getFullYear();
    const mStr = String(d.getMonth() + 1).padStart(2, '0');
    const dStr = String(d.getDate()).padStart(2, '0');
    const dateKey = `${yStr}-${mStr}-${dStr}`;
    
    const isEventUpcoming = !e.isPast;
    
    const existing = dateEventMap.get(dateKey) || { hasUpcoming: false, hasPast: false };
    if (isEventUpcoming) {
      existing.hasUpcoming = true;
    } else {
      existing.hasPast = true;
    }
    dateEventMap.set(dateKey, existing);
  });

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  return (
    <div className="mini-calendar">
      <div className="mini-calendar__header">
        <button type="button" onClick={handlePrevMonth} className="calendar-nav-btn">◀</button>
        <span className="mini-calendar__title">
          {year}년 {month + 1}월
        </span>
        <button type="button" onClick={handleNextMonth} className="calendar-nav-btn">▶</button>
      </div>

      <div className="mini-calendar__weekdays">
        {['일', '월', '화', '수', '목', '금', '토'].map((w) => (
          <span key={w} className="weekday-label">{w}</span>
        ))}
      </div>

      <div className="mini-calendar__days">
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="calendar-day-empty" />;
          }

          const yStr = year;
          const mStr = String(month + 1).padStart(2, '0');
          const dStr = String(day).padStart(2, '0');
          const targetDateStr = `${yStr}-${mStr}-${dStr}`;
          const eventStatus = dateEventMap.get(targetDateStr);
          const hasEvent = !!eventStatus;
          const isSelected = selectedDate === targetDateStr;
          
          return (
            <button
              key={`day-${day}`}
              type="button"
              className={`calendar-day-btn${hasEvent ? ' has-event' : ''}${isSelected ? ' is-selected' : ''}`}
              onClick={() => onSelectDate(isSelected ? null : targetDateStr)}
            >
              <span className="day-number">{day}</span>
              {hasEvent && (
                <div className="calendar-day-dots">
                  {eventStatus.hasUpcoming && <span className="event-dot event-dot--upcoming" />}
                  {eventStatus.hasPast && <span className="event-dot event-dot--past" />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="mini-calendar__filter-bar">
          <span>선택된 날짜: {selectedDate}</span>
          <button type="button" className="clear-filter-btn" onClick={() => onSelectDate(null)}>
            전체 보기
          </button>
        </div>
      )}
    </div>
  );
}

function HomeDashboard() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<HomeTab>('upcoming');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [pastFilter, setPastFilter] = useState<'1w' | '1m'>('1m');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [showPastEventsPopup, setShowPastEventsPopup] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.getCalendar(),
      api.myGroups(),
    ])
      .then(([calendarEvents, myGroups]) => {
        setEvents(calendarEvents);
        setGroups(myGroups);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Filter events by calendar date selection only in calendar view mode
  const filteredEvents = (viewMode === 'calendar' && selectedDate)
    ? events.filter((e) => {
        const d = new Date(e.date);
        const yStr = d.getFullYear();
        const mStr = String(d.getMonth() + 1).padStart(2, '0');
        const dStr = String(d.getDate()).padStart(2, '0');
        return `${yStr}-${mStr}-${dStr}` === selectedDate;
      })
    : events;

  const upcoming = filteredEvents.filter(isUpcoming);
  const needsVote = upcoming.filter((e) => !e.myVote && !e.voteLocked);
  const voted = upcoming.filter((e) => e.myVote || e.voteLocked);

  // Past events filtering
  const allPastEvents = filteredEvents
    .filter((e) => !isUpcoming(e))
    .sort((a, b) => eventEndAt(b).getTime() - eventEndAt(a).getTime());

  let past = allPastEvents;

  if (pastFilter === '1w') {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    past = past.filter((e) => new Date(e.date) >= oneWeekAgo);
  } else if (pastFilter === '1m') {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    past = past.filter((e) => new Date(e.date) >= oneMonthAgo);
  }


  return (
    <div className="home-dashboard">
      {/* Naver Band Style My Groups Grid */}
      <section className="home-groups-section">
        <div className="home-groups-header">
          <h2 className="home-section__title">내 모임</h2>
          <div className="home-groups-header-actions">
            <Link to="/groups/new" className="home-groups-action-link">모임 만들기</Link>
            <span className="home-groups-action-space" />
            <Link to="/groups" className="home-groups-action-link">전체보기</Link>
          </div>
        </div>
        <div className="home-groups-grid">
          {groups.map((group) => (
            <Link key={group.id} to={`/groups/${group.id}`} className="grid-group-card">
              <GroupAvatar
                src={group.profileImageUrl}
                name={group.name}
                size={76}
                radius={22}
                className="grid-group-avatar"
              />
              <span className="grid-group-name">{group.name}</span>
            </Link>
          ))}
          <Link to="/groups/new" className="grid-group-card">
            <div className="grid-group-squircle-plus">
              <span className="grid-group-plus-icon">+</span>
            </div>
            <span className="grid-group-name">모임 만들기</span>
          </Link>
        </div>
      </section>

      {/* View Toggle Bar */}
      <div className="home-view-toggle-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 4px 16px 4px' }}>
        <h2 className="home-section__title" style={{ margin: 0 }}>일정</h2>
        <div className="view-toggle-buttons" style={{ display: 'flex', gap: '4px', background: 'var(--grey-100)', padding: '4px', borderRadius: '10px' }}>
          <button
            type="button"
            className={`view-toggle-btn${viewMode === 'list' ? ' is-active' : ''}`}
            onClick={() => setViewMode('list')}
            style={{
              border: 'none',
              background: viewMode === 'list' ? 'var(--surface)' : 'transparent',
              padding: '6px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 700,
              color: viewMode === 'list' ? 'var(--accent)' : 'var(--ink-muted)',
              boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease'
            }}
          >
            📋 리스트
          </button>
          <button
            type="button"
            className={`view-toggle-btn${viewMode === 'calendar' ? ' is-active' : ''}`}
            onClick={() => setViewMode('calendar')}
            style={{
              border: 'none',
              background: viewMode === 'calendar' ? 'var(--surface)' : 'transparent',
              padding: '6px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 700,
              color: viewMode === 'calendar' ? 'var(--accent)' : 'var(--ink-muted)',
              boxShadow: viewMode === 'calendar' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease'
            }}
          >
            📅 캘린더
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        /* Calendar View Mode */
        <section className="home-calendar-section">
          <MiniCalendar
            events={events}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
          
          <div style={{ marginTop: '20px' }}>
            <h3 className="home-section__title" style={{ marginBottom: '12px' }}>
              {selectedDate ? `${selectedDate} 일정` : '전체 일정'}
            </h3>
            {loading ? (
              <p className="loading-text">불러오는 중…</p>
            ) : upcoming.length === 0 && past.length === 0 ? (
              <div className="home-empty">
                <p>선택한 날짜에는 일정이 없어요.</p>
              </div>
            ) : (
              <div>
                {upcoming.length > 0 && (
                  <section className="home-section" style={{ marginBottom: '24px' }}>
                    <h4 className="home-section__title" style={{ fontSize: '14px', color: 'var(--accent)', marginBottom: '8px' }}>
                      진행 중 일정
                      <span className="home-section__count" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', marginLeft: '6px' }}>
                        {upcoming.length}
                      </span>
                    </h4>
                    <div className="home-event-list">
                      {upcoming.map((ev) => (
                        <HomeEventCard key={ev.id} event={ev} votable={!ev.isPast} onVoted={load} />
                      ))}
                    </div>
                  </section>
                )}

                {past.length > 0 && (
                  <section className="home-section">
                    <h4 className="home-section__title" style={{ fontSize: '14px', color: 'var(--ink-muted)', marginBottom: '8px' }}>
                      지난 일정
                      <span className="home-section__count" style={{ background: 'var(--grey-100)', color: 'var(--ink-muted)', marginLeft: '6px' }}>
                        {past.length}
                      </span>
                    </h4>
                    <div className="home-event-list">
                      {past.map((ev) => (
                        <HomeEventCard key={ev.id} event={ev} votable={!ev.isPast} onVoted={load} />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </section>
      ) : (
        /* Card List View Mode */
        <>
          <div className="home-tabs">
            <SegmentedControl<HomeTab>
              name="홈 일정 보기"
              options={[
                { value: 'upcoming', label: '진행 중 일정' },
                { value: 'past', label: `지난 일정${allPastEvents.length ? ` (${allPastEvents.length})` : ''}` },
              ]}
              value={tab}
              onChange={setTab}
            />
          </div>

          {loading ? (
            <p className="loading-text">불러오는 중…</p>
          ) : filteredEvents.length === 0 ? (
            <div className="home-empty">
              <p>일정이 없어요.</p>
              <Link to="/groups" className="link-text">
                모임 찾아보기
              </Link>
            </div>
          ) : tab === 'upcoming' ? (
            needsVote.length === 0 && voted.length === 0 ? (
              <div className="home-empty">
                <p>진행 중인 일정이 없어요.</p>
                {past.length > 0 && (
                  <button
                    type="button"
                    className="link-text"
                    onClick={() => setTab('past')}
                  >
                    지난 일정 보기
                  </button>
                )}
              </div>
            ) : (
              <>
                {needsVote.length > 0 && (
                  <section className="home-section">
                    <h2 className="home-section__title">
                      투표가 필요해요
                      <span className="home-section__count">{needsVote.length}</span>
                    </h2>
                    <div className="home-event-list">
                      {needsVote.map((ev) => (
                        <HomeEventCard key={ev.id} event={ev} votable onVoted={load} />
                      ))}
                    </div>
                  </section>
                )}

                {voted.length > 0 && (
                  <section className="home-section">
                    <h2 className="home-section__title">투표 완료 · 진행 예정</h2>
                    <div className="home-event-list">
                      {voted.map((ev) => (
                        <HomeEventCard key={ev.id} event={ev} votable onVoted={load} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )
          ) : (
            <>
              {/* Past Filters */}
              <div className="past-filter-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className={`filter-btn${pastFilter === '1w' ? ' is-active' : ''}`}
                    onClick={() => setPastFilter('1w')}
                  >
                    최근 1주일
                  </button>
                  <button
                    type="button"
                    className={`filter-btn${pastFilter === '1m' ? ' is-active' : ''}`}
                    onClick={() => setPastFilter('1m')}
                  >
                    최근 1개월
                  </button>
                </div>
                <button
                  type="button"
                  className="past-view-all-btn"
                  onClick={() => setShowPastEventsPopup(true)}
                  style={{
                    background: 'none',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--ink-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  전체보기 ↗
                </button>
              </div>

              {past.length === 0 ? (
                <div className="home-empty">
                  <p>조건에 맞는 지난 일정이 없어요.</p>
                </div>
              ) : (
                <section className="home-section">
                  <div className="home-event-list">
                    {past.map((ev) => (
                      <HomeEventCard key={ev.id} event={ev} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}

      {showPastEventsPopup && (
        <div className="past-events-modal-overlay" onClick={() => setShowPastEventsPopup(false)}>
          <div className="past-events-modal" onClick={(e) => e.stopPropagation()}>
            <div className="past-events-modal__header">
              <h3>지난 일정 전체보기</h3>
              <button
                type="button"
                className="past-events-modal__close-btn"
                onClick={() => setShowPastEventsPopup(false)}
              >
                ✕
              </button>
            </div>
            <div className="past-events-modal__body">
              {allPastEvents.length === 0 ? (
                <p className="past-events-modal__empty">지난 일정이 없습니다.</p>
              ) : (
                <div className="past-events-modal__list">
                  {allPastEvents.map((ev) => (
                    <Link
                      key={ev.id}
                      to={`/events/${ev.id}`}
                      className="past-events-modal__item"
                      onClick={() => setShowPastEventsPopup(false)}
                    >
                      <div className="past-events-modal__item-group">{ev.group.name}</div>
                      <div className="past-events-modal__item-title">{ev.title}</div>
                      <div className="past-events-modal__item-time">
                        {formatEventDate(ev.date, ev.startTime, ev.endTime)}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) return <p className="loading-text">불러오는 중…</p>;
  if (!user) return <GuestLanding />;
  return <HomeDashboard />;
}
